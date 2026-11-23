import React from 'react';
import { Eye, HelpCircle, Terminal } from 'lucide-react';
import { SECURITY_LEVEL_DESCRIPTIONS } from '../data/levels';
import { GameProgress, ServerConfig } from '../types/game';

interface HintsViewProps {
  servers: ServerConfig[];
  selectedServer: ServerConfig;
  onSelectServer: (id: string) => void;
  progress: GameProgress;
  onRevealHint: (serverId: string) => void;
  onRevealAllHints: (serverId: string, total: number) => void;
  onInsertToTerminal: (cmd: string) => void;
}

const COMMAND_TIPS = [
  {
    title: 'ポート・サービス偵察',
    items: [
      { label: '基本スキャン', cmd: 'nmap -sV -sC <IP>' },
      { label: 'IDS回避ステルススキャン', cmd: 'nmap -sS -T2 -sV -p 22,53,80,443,6379,8080,9000 <IP>' },
      { label: 'Webディレクトリ列挙', cmd: 'gobuster dir -u http://<IP>' },
      { label: 'Web脆弱性診断', cmd: 'nuclei -u http://<IP>' },
    ],
  },
  {
    title: 'Web・DNS・DB調査',
    items: [
      { label: 'HTTPレスポンス確認', cmd: 'curl -i http://<IP>/robots.txt' },
      { label: 'SQLi自動ダンプ', cmd: 'sqlmap -u "http://<IP>/search?q=test" --dump' },
      { label: 'DNSゾーン転送', cmd: 'dig @<IP> axfr corp.local' },
      { label: 'Redisキー確認', cmd: 'redis-cli -h <IP> KEYS *' },
    ],
  },
  {
    title: '侵入・権限昇格',
    items: [
      { label: 'SSHログイン (パスワード/鍵)', cmd: 'ssh user@<IP> -P pass  /  ssh -i id_rsa user@<IP>' },
      { label: 'SSHパスワード監査', cmd: 'hydra -l worker -P /usr/share/wordlists/rockyou.txt ssh://<IP>' },
      { label: 'sudo / SUID / Capabilities確認', cmd: 'sudo -l  /  find / -perm -4000  /  getcap -r /' },
      { label: '既知CVE検索・実行', cmd: 'searchsploit <サービス名>  /  exploit <CVE-ID> <IP>' },
    ],
  },
];

export const HintsView: React.FC<HintsViewProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  progress,
  onRevealHint,
  onRevealAllHints,
  onInsertToTerminal,
}) => {
  const visibleTargets = servers.filter((s) => !s.requiresPivotFrom);
  const revealedCount = progress.revealedHints[selectedServer.id] || 0;
  const totalHints = selectedServer.hints.length;
  const levelInfo = SECURITY_LEVEL_DESCRIPTIONS[selectedServer.level];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232A3B] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            攻略ヒント & コマンドリファレンス
          </h1>
          <p className="text-sm text-slate-400">
            選択中のサーバーに対する段階的な攻略ヒントを確認できます。
          </p>
        </div>

        <div className="w-full sm:w-72 shrink-0">
          <label htmlFor="hint-target-select" className="block text-xs text-slate-400 mb-1">
            対象サーバー
          </label>
          <select
            id="hint-target-select"
            value={selectedServer.id}
            onChange={(e) => onSelectServer(e.target.value)}
            className="w-full bg-[#131720] border border-[#2A3244] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
          >
            {visibleTargets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ip})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Target Progressive Hints */}
      <section className="bg-[#131720] border border-[#232A3B] rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-sky-400 font-medium">{levelInfo.label}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedServer.ip}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedServer.os}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">{selectedServer.name}</h2>
            <p className="text-xs text-slate-300">{selectedServer.objective}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {revealedCount < totalHints && (
              <>
                <button
                  type="button"
                  onClick={() => onRevealHint(selectedServer.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  次のヒントを表示 ({revealedCount}/{totalHints})
                </button>
                <button
                  type="button"
                  onClick={() => onRevealAllHints(selectedServer.id, totalHints)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0B0E14] hover:bg-[#1C2230] border border-[#2A3244] text-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  すべて表示
                </button>
              </>
            )}
          </div>
        </div>

        {revealedCount === 0 ? (
          <div className="bg-[#0B0E14] border border-[#232A3B] rounded-md p-5 text-xs text-slate-400">
            ヒントはまだ表示されていません。「次のヒントを表示」を押すとステップごとに攻略手順を確認できます。
          </div>
        ) : (
          <ol className="space-y-3">
            {selectedServer.hints.slice(0, revealedCount).map((hint, idx) => (
              <li
                key={idx}
                className="bg-[#0B0E14] border border-[#232A3B] rounded-md p-4 text-sm text-slate-200 leading-relaxed"
              >
                <span className="font-mono text-sky-400 font-semibold mr-2">Step {idx + 1}.</span>
                {hint}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Command Reference */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-100">主要コマンド構文ガイド</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMMAND_TIPS.map((group) => (
            <div
              key={group.title}
              className="bg-[#131720] border border-[#232A3B] rounded-lg p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-slate-200">{group.title}</h3>
              <div className="space-y-2.5">
                {group.items.map((item) => {
                  const concreteCmd = item.cmd.replace(/<IP>/g, selectedServer.ip);
                  return (
                    <div
                      key={item.label}
                      className="bg-[#0B0E14] border border-[#232A3B] rounded p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">{item.label}</span>
                        {!concreteCmd.includes('/') && (
                          <button
                            type="button"
                            onClick={() => onInsertToTerminal(concreteCmd)}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                          >
                            <Terminal className="w-3 h-3" />
                            入力
                          </button>
                        )}
                      </div>
                      <code className="block text-xs font-mono text-emerald-400 break-all">
                        {concreteCmd}
                      </code>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
