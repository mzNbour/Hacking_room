import { VirtualFile } from '../types/game';

export const COMMON_WORDLIST = [
  'admin',
  'administrator',
  'api',
  'api/v1/debug',
  'api/v1/users',
  'api/internal',
  'assets',
  'backup',
  'backups',
  'config',
  'console',
  'dashboard',
  'db',
  'debug',
  'dev',
  'diag',
  'download',
  '.env',
  '.git',
  '.git/config',
  '.git/HEAD',
  'health',
  'hidden',
  'index.html',
  'internal',
  'login',
  'logs',
  'metrics',
  'notes.txt',
  'ping',
  'portal',
  'private',
  'robots.txt',
  'secret',
  'secret_portal',
  'server-status',
  'shop',
  'status',
  'upload',
  'uploads',
  'users',
  'vault',
  'admin-backup',
  'admin-backup/.env',
];

export const ROCKYOU_WORDLIST = [
  '123456',
  'password',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'monkey',
  'dragon',
  'baseball',
  'football',
  'iloveyou',
  'trustno1',
  'sunshine',
  'princess',
  'admin123',
  'welcome',
  'shadow',
  'ashley',
  'passw0rd',
  'michael',
  'superman',
  'master',
  'summer2024',
  'winter2025',
  'P@ssw0rd!',
  'devbox99',
  'toor',
  'alpine',
  'secret99',
  'cyberlab',
  'hunter2',
  'vagrant',
  'kali',
  'raspberry',
  'chocolate',
  'guitar',
  'matrix',
  'phantom',
  'phoenix',
];

export const LOCAL_INITIAL_FILES: VirtualFile[] = [
  {
    path: '/home/user01',
    content: '',
    owner: 'user01',
    group: 'user01',
    permissions: 'drwxr-xr-x',
    isDirectory: true,
  },
  {
    path: '/home/user01/.bashrc',
    content: `# ~/.bashrc: executed by bash(1) for non-login shells.
export PS1="\\[\\e[32m\\]\\u@\\h\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]\\$ "
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
alias ll='ls -alF'
alias la='ls -A'
`,
    owner: 'user01',
    group: 'user01',
    permissions: '-rw-r--r--',
  },
  {
    path: '/home/user01/README.txt',
    content: `NetStrike Lab ワークステーション (user01@user-PC)
=================================================
利用可能な主要セキュリティツール:
  nmap          ポートスキャン / サービス検出 / NSEスクリプト
  ping          ICMP疎通確認 / TTLによるOS推定
  traceroute    ネットワーク経路トレース
  dig           DNSレコード照会 / ゾーン転送 (AXFR)
  curl          HTTP/HTTPSリクエスト送信・ヘッダ確認・インジェクション検証
  gobuster      Webディレクトリ・隠しパス総当たり探索
  ftp           FTP接続 (anonymousログイン / ファイル取得)
  ssh           リモートシェル接続 (パスワード / 秘密鍵認証)
  nc            Netcat (バナー取得 / ポート接続 / リバースシェル待受)
  hydra         SSH / HTTP ログインパスワード辞書攻撃
  john          ハッシュクラッカー (MD5 / SHA256 / shadow)
  mysql         MySQLデータベースクライアント
  redis-cli     RedisインメモリDBクライアント
  searchsploit  サービスバージョンから既知CVE・エクスプロイト検索
  exploit       既知脆弱性 (CVE) の検証・実行モジュール
  jwt-tool      JWTトークンのデコード・署名改ざん (alg:none / 秘密鍵検証)
  arp-scan      ローカルサブネット上のホスト探索
  stty          端末ライン設定の表示・変更 (stty -a)
`,
    owner: 'user01',
    group: 'user01',
    permissions: '-rw-r--r--',
  },
  {
    path: '/home/user01/.ssh',
    content: '',
    owner: 'user01',
    group: 'user01',
    permissions: 'drwx------',
    isDirectory: true,
  },
  {
    path: '/usr/share/wordlists',
    content: '',
    owner: 'root',
    group: 'root',
    permissions: 'drwxr-xr-x',
    isDirectory: true,
  },
  {
    path: '/usr/share/wordlists/common.txt',
    content: COMMON_WORDLIST.join('\n') + '\n',
    owner: 'root',
    group: 'root',
    permissions: '-rw-r--r--',
  },
  {
    path: '/usr/share/wordlists/rockyou.txt',
    content: ROCKYOU_WORDLIST.join('\n') + '\n',
    owner: 'root',
    group: 'root',
    permissions: '-rw-r--r--',
  },
  {
    path: '/etc/hosts',
    content: `127.0.0.1       localhost
127.0.1.1       user-PC
10.10.1.10      devbox-01.lab
10.10.1.20      portal-02.lab
10.10.1.30      shop-03.lab
10.10.1.40      legacy-04.lab
10.10.1.50      webapp-05.lab
10.10.1.60      cache-06.lab
10.10.1.70      corp-07.lab
10.10.1.80      diag-08.lab
10.10.2.10      bastion-09.lab
10.10.10.10     sovereign-10.lab
`,
    owner: 'root',
    group: 'root',
    permissions: '-rw-r--r--',
  },
];

export const EXPLOIT_DB = [
  {
    cve: 'CVE-2011-2523',
    title: 'vsftpd 2.3.4 - Backdoor Command Execution',
    match: 'vsftpd 2.3.4',
    type: 'remote',
    description: 'vsftpd 2.3.4 に仕込まれたバックドアによりポート6200または直接シェルを起動します。',
    usage: 'exploit CVE-2011-2523 <target_ip>',
  },
  {
    cve: 'CVE-2021-41773',
    title: 'Apache HTTP Server 2.4.49 - Path Traversal & RCE',
    match: 'Apache/2.4.49',
    type: 'remote',
    description: 'URL正規化の不備を突き /cgi-bin/.%2e/%2e%2e/... で任意ファイル読み取りやRCEが可能。',
    usage: 'exploit CVE-2021-41773 <target_ip> [port]',
  },
  {
    cve: 'CVE-2020-1472',
    title: 'Redis 6.0.x - Unauthenticated Sandbox Escape / Config Write',
    match: 'Redis 6.0.9',
    type: 'remote',
    description: '認証なしのRedisインスタンスに対しSSH公開鍵書き込みまたは設定改ざんを実行します。',
    usage: 'exploit CVE-2020-1472 <target_ip> (または redis-cli -h <ip>)',
  },
  {
    cve: 'CVE-2021-44228',
    title: 'Apache Log4j2 2.14.1 (Log4Shell) - JNDI Remote Code Execution',
    match: 'Log4j 2.14.1',
    type: 'remote',
    description: 'X-Api-Version や User-Agent ヘッダに ${jndi:ldap://...} を注入しRCEを実行します。',
    usage: 'exploit CVE-2021-44228 <target_ip> [port]',
  },
  {
    cve: 'CVE-2021-3156',
    title: 'Sudo 1.8.31 (Baron Samedit) - Heap-Based Buffer Overflow PrivEsc',
    match: 'sudo 1.8.31',
    type: 'local',
    description: 'ローカルシェル上で sudoedit -s のヒープオーバーフローを悪用し root 権限を取得します。',
    usage: 'exploit CVE-2021-3156 (ターゲットのシェル内で実行)',
  },
];

export const HASH_CRACK_DICT: Record<string, string> = {
  // MD5
  'e10adc3949ba59abbe56e057f20f883e': '123456',
  '5f4dcc3b5aa765d61d8327deb882cf99': 'password',
  '21232f297a57a5a743894a0e4a801fc3': 'admin',
  '0192023a7bbd73250516f069df18b500': 'admin123',
  '482c811da5d5b4bc6d497ffa98491e38': 'password123',
  '202cb962ac59075b964b07152d234b70': '123',
  '7b902e6ff1db9f560443f2048974fd7d': 'letmein',
  'd0763edaa9d9bd2a9516280e9044d885': 'monkey',
  '827ccb0eea8a706c4c34a16891f84e7b': '12345',
  'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3': 'test',
  '40be4e59b9a2a2b5dffb918c0e86b3d7': 'welcome',
  '0571749e2ac330a7455809c6b0e7af90': 'sunshine',
  'b89749505e144b564adfe3ea8fc394aa': 'raspberry',
  'b3d97746dbb45e92dc083db205e1fd14': 'phoenix',
  // SHA256
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8': 'password',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918': 'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9': 'admin123',
  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f': 'P@ssw0rd!',
  // Shadow $6$ hashes
  '$6$salt123$Kx9vQ2mNpL8rT5wYz1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789': 'winter2025',
  '$6$diag88$9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b': 'cyberlab',
  '$6$sec77$a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0': 'secret99',
  // JWT secrets
  'supersecretkey': 'supersecretkey',
  'jwt-secret-2025': 'jwt-secret-2025',
  'secret99': 'secret99',
};
