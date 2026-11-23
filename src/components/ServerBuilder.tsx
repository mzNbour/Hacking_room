import React, { useState } from 'react';
import { Play, Plus, RotateCcw, Server, Shield, Trash2 } from 'lucide-react';
import { createCustomServerTemplate, SECURITY_LEVEL_DESCRIPTIONS } from '../data/levels';
import {
  SecurityLevel,
  ServerConfig,
  ServiceConfig,
  ServiceType,
  VulnerabilityId,
} from '../types/game';

interface ServerBuilderProps {
  existingCustomCount: number;
  onSaveAndDeploy: (server: ServerConfig) => void;
}

const SERVICE_PRESETS: Record<
  ServiceType,
  { port: number; name: string; defaultVersion: string; banner: string }
> = {
  ftp: { port: 21, name: 'ftp', defaultVersion: 'vsftpd 3.0.5', banner: '220 (vsFTPd 3.0.5)' },
  ssh: { port: 22, name: 'ssh', defaultVersion: 'OpenSSH 8.9p1', banner: 'SSH-2.0-OpenSSH_8.9p1' },
  dns: { port: 53, name: 'domain', defaultVersion: 'ISC BIND 9.18.18', banner: 'BIND 9.18.18' },
  http: { port: 80, name: 'http', defaultVersion: 'nginx 1.24.0', banner: 'nginx/1.24.0' },
  https: { port: 443, name: 'https', defaultVersion: 'nginx 1.24.0 (TLS)', banner: 'nginx/1.24.0' },
  mysql: { port: 3306, name: 'mysql', defaultVersion: 'MySQL 8.0.34', banner: '8.0.34-MySQL' },
  redis: { port: 6379, name: 'redis', defaultVersion: 'Redis 6.0.9', banner: '+PONG' },
  smb: { port: 445, name: 'microsoft-ds', defaultVersion: 'Samba 4.15', banner: 'Samba 4.15' },
  backdoor: { port: 4444, name: 'shell', defaultVersion: 'Custom Bind Shell', banner: 'Bind Shell Ready' },
  custom: { port: 9000, name: 'http', defaultVersion: 'Java SpringBoot / Log4j 2.14.1', banner: 'Custom App' },
};

export const ServerBuilder: React.FC<ServerBuilderProps> = ({
  existingCustomCount,
  onSaveAndDeploy,
}) => {
  const [draft, setDraft] = useState<ServerConfig>(() =>
    createCustomServerTemplate(3, existingCustomCount + 1)
  );
  const [sshUser, setSshUser] = useState('operator');
  const [sshPass, setSshPass] = useState('cyberlab');
  const [privescMode, setPrivescMode] = useState<'none' | 'sudo_find' | 'suid_python' | 'cve_3156' | 'cron'>(
    'none'
  );
  const [knockSeqText, setKnockSeqText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyLevelPreset = (lvl: SecurityLevel) => {
    const tpl = createCustomServerTemplate(lvl, existingCustomCount + 1);
    setDraft(tpl);
    setSshUser(tpl.users[0]?.username || 'operator');
    setSshPass(tpl.users[0]?.password || 'cyberlab');
    setPrivescMode(lvl >= 4 ? 'sudo_find' : 'none');
    setKnockSeqText(tpl.firewall.knockPorts ? tpl.firewall.knockPorts.join(',') : '');
  };

  const addService = (type: ServiceType) => {
    const preset = SERVICE_PRESETS[type];
    const usedPorts = new Set(draft.services.map((s) => s.port));
    let port = preset.port;
    while (usedPorts.has(port)) port += 1;

    const newSvc: ServiceConfig = {
      id: `cs-${type}-${Date.now()}`,
      port,
      protocol: 'tcp',
      type,
      name: preset.name,
      version: preset.defaultVersion,
      state: 'open',
      banner: preset.banner,
      vulnerabilities:
        type === 'ftp'
          ? ['ftp_anon']
          : type === 'http'
          ? ['http_robots_leak', 'http_env_leak']
          : type === 'redis'
          ? ['redis_unauth']
          : type === 'dns'
          ? ['dns_axfr']
          : type === 'mysql'
          ? ['mysql_weak_auth']
          : [],
      ftpAnonymous: type === 'ftp',
      ftpRoot: type === 'ftp' ? '/srv/ftp' : undefined,
      dnsZoneTransfer: type === 'dns',
      dnsRecords:
        type === 'dns'
          ? [
              { type: 'A', name: `${draft.hostname}.lab`, value: draft.ip },
              { type: 'TXT', name: `${draft.hostname}.lab`, value: `user=${sshUser} pass=${sshPass}` },
            ]
          : undefined,
      dbUser: type === 'mysql' ? 'dbuser' : undefined,
      dbPassword: type === 'mysql' ? 'admin123' : undefined,
      dbTables:
        type === 'mysql'
          ? [
              {
                name: 'secrets',
                columns: ['id', 'label', 'value'],
                rows: [{ id: '1', label: 'flag', value: draft.flag }],
              },
            ]
          : undefined,
      redisKeys:
        type === 'redis'
          ? {
              'server:flag': draft.flag,
              'ssh:cred': `${sshUser}:${sshPass}`,
            }
          : undefined,
      webRoutes:
        type === 'http' || type === 'https' || type === 'custom'
          ? [
              {
                path: '/',
                status: 200,
                contentType: 'text/html',
                body: `<html><body><h1>${draft.name}</h1><p>Custom target ready.</p></body></html>`,
              },
              {
                path: '/robots.txt',
                status: 200,
                contentType: 'text/plain',
                body: `User-agent: *\nDisallow: /secret/\nDisallow: /.env\n`,
              },
              {
                path: '/.env',
                status: 200,
                contentType: 'text/plain',
                body: `SSH_USER=${sshUser}\nSSH_PASS=${sshPass}\n`,
              },
            ]
          : undefined,
    };

    setDraft((prev) => ({
      ...prev,
      services: [...prev.services, newSvc],
    }));
  };

  const removeService = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
  };

  const toggleServiceVuln = (svcId: string, vuln: VulnerabilityId) => {
    setDraft((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        if (s.id !== svcId) return s;
        const has = s.vulnerabilities.includes(vuln);
        const nextVulns = has
          ? s.vulnerabilities.filter((v) => v !== vuln)
          : [...s.vulnerabilities, vuln];

        const updated: ServiceConfig = { ...s, vulnerabilities: nextVulns };
        if (vuln === 'ftp_anon') updated.ftpAnonymous = !has;
        if (vuln === 'vsftpd_234_backdoor' && !has) {
          updated.version = 'vsftpd 2.3.4';
          updated.banner = '220 (vsFTPd 2.3.4)';
          updated.shellUser = sshUser;
        }
        if (vuln === 'http_path_traversal_2449' && !has) {
          updated.version = 'Apache httpd 2.4.49';
          updated.banner = 'Apache/2.4.49';
        }
        if (vuln === 'http_cmd_inj' && !has) {
          updated.shellUser = sshUser;
          const existingRoutes = updated.webRoutes || [];
          if (!existingRoutes.some((r) => r.path === '/diag')) {
            updated.webRoutes = [
              ...existingRoutes,
              {
                path: '/diag',
                status: 200,
                contentType: 'text/plain',
                body: 'PING 127.0.0.1: 64 bytes ttl=64 time=0.05 ms',
                cmdInjEnabled: true,
              },
            ];
          }
        }
        if (vuln === 'http_sqli' && !has) {
          const existingRoutes = updated.webRoutes || [];
          if (!existingRoutes.some((r) => r.path === '/search')) {
            updated.webRoutes = [
              ...existingRoutes,
              {
                path: '/search',
                status: 200,
                contentType: 'application/json',
                body: '{"results":[]}',
                sqliResponse: { vulnerableParam: 'q', dumpTable: 'users' },
              },
            ];
          }
          updated.dbTables = [
            {
              name: 'users',
              columns: ['username', 'password', 'note'],
              rows: [{ username: sshUser, password: sshPass, note: 'SSH credential' }],
            },
          ];
        }
        if (vuln === 'http_lfi' && !has) {
          const existingRoutes = updated.webRoutes || [];
          if (!existingRoutes.some((r) => r.path === '/view')) {
            updated.webRoutes = [
              ...existingRoutes,
              {
                path: '/view',
                status: 200,
                contentType: 'text/plain',
                body: 'File viewer ready. Try ?file=...',
                lfiEnabled: true,
              },
            ];
          }
        }
        return updated;
      }),
    }));
  };

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.ip.trim() || !draft.flag.trim()) {
      setErrorMsg('サーバー名、IPアドレス、フラグは必須です。');
      return;
    }

    const parsedKnock = knockSeqText
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const hasPrivesc = privescMode !== 'none';
    const finalFiles = [
      { path: `/home/${sshUser}`, content: '', owner: sshUser, group: sshUser, permissions: 'drwxr-xr-x', isDirectory: true },
      ...(!hasPrivesc
        ? [
            {
              path: `/home/${sshUser}/flag.txt`,
              content: draft.flag + '\n',
              owner: sshUser,
              group: sshUser,
              permissions: '-rw-r--r--',
            },
          ]
        : [
            {
              path: `/home/${sshUser}/note.txt`,
              content: `Privilege escalation configured (${privescMode}). Find your path to /root/flag.txt!\n`,
              owner: sshUser,
              group: sshUser,
              permissions: '-rw-r--r--',
            },
          ]),
      { path: '/srv/ftp', content: '', owner: 'ftp', group: 'ftp', permissions: 'drwxr-xr-x', isDirectory: true },
      { path: '/srv/ftp/pub', content: '', owner: 'ftp', group: 'ftp', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/srv/ftp/pub/flag.txt',
        content: draft.flag + '\n',
        owner: 'ftp',
        group: 'ftp',
        permissions: '-rw-r--r--',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: draft.flag + '\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ];

    if (privescMode === 'suid_python') {
      finalFiles.push({
        path: '/usr/bin/python3',
        content: '[ELF binary]',
        owner: 'root',
        group: 'root',
        permissions: '-rwsr-xr-x',
      });
    }

    const finalServer: ServerConfig = {
      ...draft,
      id: `custom-${Date.now()}`,
      isCustom: true,
      firewall: {
        ...draft.firewall,
        knockPorts: parsedKnock.length >= 2 ? parsedKnock : undefined,
      },
      users: [
        {
          username: sshUser,
          uid: 1000,
          gid: 1000,
          home: `/home/${sshUser}`,
          shell: '/bin/bash',
          password: sshPass,
          sudoRules: privescMode === 'sudo_find' ? ['(ALL) NOPASSWD: /usr/bin/find'] : [],
        },
        {
          username: 'root',
          uid: 0,
          gid: 0,
          home: '/root',
          shell: '/bin/bash',
        },
      ],
      files: finalFiles,
      privescVectors: {
        sudoAbuse:
          privescMode === 'sudo_find'
            ? [{ binary: '/usr/bin/find', exploitCmd: 'sudo find . -exec /bin/sh \\;' }]
            : undefined,
        suidBinaries:
          privescMode === 'suid_python'
            ? [{ path: '/usr/bin/python3', exploitCmd: 'python3 -c "import os; os.setuid(0)"' }]
            : undefined,
        sudoCve20213156: privescMode === 'cve_3156',
        cronWritable:
          privescMode === 'cron'
            ? [{ path: '/etc/cron.d/custom', targetScript: '/opt/scripts/job.sh' }]
            : undefined,
      },
    };

    setErrorMsg(null);
    onSaveAndDeploy(finalServer);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232A3B] pb-5 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            カスタムサーバー作成スタジオ
          </h1>
          <p className="text-sm text-slate-400">
            ポート・サービス・脆弱性・IDSファイアウォール・権限昇格経路を自由に設計し、ターミナルで即座に攻撃検証できます。
          </p>
        </div>

        <button
          type="button"
          onClick={() => applyLevelPreset(draft.level)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#131720] hover:bg-[#1D2433] border border-[#2A3244] text-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Lv.{draft.level} テンプレートに戻す
        </button>
      </div>

      <form onSubmit={handleDeploy} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Configuration Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Identity & Security Level */}
          <section className="bg-[#131720] border border-[#232A3B] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              01. 基本構成とセキュリティレベル (1〜10)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">サーバー名</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">IPアドレス</label>
                <input
                  type="text"
                  value={draft.ip}
                  onChange={(e) => setDraft({ ...draft, ip: e.target.value })}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ホスト名</label>
                <input
                  type="text"
                  value={draft.hostname}
                  onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">OS</label>
                <select
                  value={draft.os}
                  onChange={(e) => setDraft({ ...draft, os: e.target.value })}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</option>
                  <option value="Debian GNU/Linux 12">Debian GNU/Linux 12</option>
                  <option value="Alpine Linux 3.19">Alpine Linux 3.19</option>
                  <option value="Hardened Debian 12">Hardened Debian 12</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-300">
                  セキュリティレベルプリセット: Level {draft.level} / 10 (
                  {SECURITY_LEVEL_DESCRIPTIONS[draft.level].label})
                </label>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as SecurityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => applyLevelPreset(lvl)}
                    className={`py-2 text-xs font-mono font-medium rounded border transition-colors ${
                      draft.level === lvl
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-[#0B0E14] border-[#2A3244] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Lv.{lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                取得対象フラグ (FLAG&#123;...&#125;)
              </label>
              <input
                type="text"
                value={draft.flag}
                onChange={(e) => setDraft({ ...draft, flag: e.target.value })}
                className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </section>

          {/* 2. Firewall & IDS */}
          <section className="bg-[#131720] border border-[#232A3B] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              02. ファイアウォール・IDS防御設定
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 bg-[#0B0E14] border border-[#232A3B] rounded-md px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.firewall.idsEnabled}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      firewall: { ...draft.firewall, idsEnabled: e.target.checked },
                    })
                  }
                  className="accent-sky-500"
                />
                <span className="text-xs text-slate-200">IDS侵入検知を有効化</span>
              </label>

              <label className="flex items-center gap-2.5 bg-[#0B0E14] border border-[#232A3B] rounded-md px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.firewall.blockAggressiveScans}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      firewall: { ...draft.firewall, blockAggressiveScans: e.target.checked },
                    })
                  }
                  className="accent-sky-500"
                />
                <span className="text-xs text-slate-200">-T4/-T5/-A スキャン遮断</span>
              </label>

              <label className="flex items-center gap-2.5 bg-[#0B0E14] border border-[#232A3B] rounded-md px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.firewall.requireStealthOrTargeted}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      firewall: { ...draft.firewall, requireStealthOrTargeted: e.target.checked },
                    })
                  }
                  className="accent-sky-500"
                />
                <span className="text-xs text-slate-200">ステルス(-sS/-T2)必須</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Port Knocking シーケンス (任意・カンマ区切り、例: 7001,8002,9003)
              </label>
              <input
                type="text"
                value={knockSeqText}
                onChange={(e) => setKnockSeqText(e.target.value)}
                placeholder="空欄で無効"
                className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </section>

          {/* 3. Services & Vulnerabilities */}
          <section className="bg-[#131720] border border-[#232A3B] rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                03. 公開サービスと脆弱性モジュール
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(['ftp', 'ssh', 'http', 'dns', 'mysql', 'redis'] as ServiceType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addService(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-[#0B0E14] hover:bg-[#1E2534] border border-[#2A3244] rounded text-slate-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {draft.services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-[#0B0E14] border border-[#232A3B] rounded-md p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={svc.port}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            services: draft.services.map((x) =>
                              x.id === svc.id ? { ...x, port: Number(e.target.value) || 80 } : x
                            ),
                          })
                        }
                        className="w-20 bg-[#131720] border border-[#2A3244] rounded px-2 py-1 text-xs font-mono text-sky-400"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-200 uppercase">
                        {svc.type}
                      </span>
                      <input
                        type="text"
                        value={svc.version}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            services: draft.services.map((x) =>
                              x.id === svc.id ? { ...x, version: e.target.value } : x
                            ),
                          })
                        }
                        className="bg-[#131720] border border-[#2A3244] rounded px-2 py-1 text-xs font-mono text-slate-300 w-52"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeService(svc.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Relevant vulnerability toggles per service type */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {svc.type === 'ftp' && (
                      <>
                        <VulnCheck
                          label="Anonymous FTP"
                          checked={svc.vulnerabilities.includes('ftp_anon')}
                          onToggle={() => toggleServiceVuln(svc.id, 'ftp_anon')}
                        />
                        <VulnCheck
                          label="vsftpd 2.3.4 バックドア"
                          checked={svc.vulnerabilities.includes('vsftpd_234_backdoor')}
                          onToggle={() => toggleServiceVuln(svc.id, 'vsftpd_234_backdoor')}
                        />
                      </>
                    )}
                    {svc.type === 'ssh' && (
                      <>
                        <VulnCheck
                          label="脆弱パスワード (Hydra対象)"
                          checked={svc.vulnerabilities.includes('ssh_weak_password')}
                          onToggle={() => toggleServiceVuln(svc.id, 'ssh_weak_password')}
                        />
                        <VulnCheck
                          label="公開鍵認証"
                          checked={svc.vulnerabilities.includes('ssh_key_auth')}
                          onToggle={() => toggleServiceVuln(svc.id, 'ssh_key_auth')}
                        />
                      </>
                    )}
                    {(svc.type === 'http' || svc.type === 'https') && (
                      <>
                        <VulnCheck
                          label="robots.txt / .env 漏洩"
                          checked={svc.vulnerabilities.includes('http_env_leak')}
                          onToggle={() => toggleServiceVuln(svc.id, 'http_env_leak')}
                        />
                        <VulnCheck
                          label="SQLインジェクション (/search)"
                          checked={svc.vulnerabilities.includes('http_sqli')}
                          onToggle={() => toggleServiceVuln(svc.id, 'http_sqli')}
                        />
                        <VulnCheck
                          label="LFI (/view)"
                          checked={svc.vulnerabilities.includes('http_lfi')}
                          onToggle={() => toggleServiceVuln(svc.id, 'http_lfi')}
                        />
                        <VulnCheck
                          label="コマンドインジェクション (/diag)"
                          checked={svc.vulnerabilities.includes('http_cmd_inj')}
                          onToggle={() => toggleServiceVuln(svc.id, 'http_cmd_inj')}
                        />
                        <VulnCheck
                          label="Apache 2.4.49 トラバーサル"
                          checked={svc.vulnerabilities.includes('http_path_traversal_2449')}
                          onToggle={() => toggleServiceVuln(svc.id, 'http_path_traversal_2449')}
                        />
                      </>
                    )}
                    {svc.type === 'dns' && (
                      <VulnCheck
                        label="DNSゾーン転送 (AXFR)"
                        checked={svc.vulnerabilities.includes('dns_axfr')}
                        onToggle={() => toggleServiceVuln(svc.id, 'dns_axfr')}
                      />
                    )}
                    {svc.type === 'redis' && (
                      <VulnCheck
                        label="認証なしRedis"
                        checked={svc.vulnerabilities.includes('redis_unauth')}
                        onToggle={() => toggleServiceVuln(svc.id, 'redis_unauth')}
                      />
                    )}
                    {svc.type === 'mysql' && (
                      <VulnCheck
                        label="弱認証MySQL (dbuser/admin123)"
                        checked={svc.vulnerabilities.includes('mysql_weak_auth')}
                        onToggle={() => toggleServiceVuln(svc.id, 'mysql_weak_auth')}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Users & Privilege Escalation */}
          <section className="bg-[#131720] border border-[#232A3B] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              04. ユーザーアカウントと権限昇格 (PrivEsc)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">一般ユーザー名</label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">パスワード</label>
                <input
                  type="text"
                  value={sshPass}
                  onChange={(e) => setSshPass(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Root権限昇格経路</label>
                <select
                  value={privescMode}
                  onChange={(e) => setPrivescMode(e.target.value as typeof privescMode)}
                  className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-xs text-slate-100"
                >
                  <option value="none">なし (一般ユーザー内にフラグ)</option>
                  <option value="sudo_find">sudo NOPASSWD (/usr/bin/find)</option>
                  <option value="suid_python">SUID Python3 (/usr/bin/python3)</option>
                  <option value="cve_3156">Sudo 1.8.31 (CVE-2021-3156)</option>
                  <option value="cron">書き込み可能Cronジョブ</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right Preview & Deploy Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#131720] border border-[#232A3B] rounded-lg p-5 space-y-4 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-100">サーバー構成サマリー</h3>
            <div className="text-xs font-mono space-y-1.5 text-slate-300 bg-[#0B0E14] border border-[#232A3B] rounded p-3">
              <div>Name: {draft.name}</div>
              <div>Host: {draft.hostname} ({draft.ip})</div>
              <div>Level: {draft.level} / 10</div>
              <div>IDS: {draft.firewall.idsEnabled ? 'ON' : 'OFF'}</div>
              <div>
                Ports: {draft.services.map((s) => `${s.port}/${s.name}`).join(', ') || 'None'}
              </div>
              <div>
                Flag Path:{' '}
                {privescMode === 'none' ? `/home/${sshUser}/flag.txt` : `/root/flag.txt`}
              </div>
            </div>

            {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
            >
              <Play className="w-4 h-4" />
              サーバーを作成して攻撃開始
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const VulnCheck: React.FC<{ label: string; checked: boolean; onToggle: () => void }> = ({
  label,
  checked,
  onToggle,
}) => (
  <label
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border transition-colors ${
      checked
        ? 'bg-sky-950/60 border-sky-600/60 text-sky-300'
        : 'bg-[#131720] border-[#232A3B] text-slate-400 hover:text-slate-200'
    }`}
  >
    <input type="checkbox" checked={checked} onChange={onToggle} className="accent-sky-500" />
    <span>{label}</span>
  </label>
);
