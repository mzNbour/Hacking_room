export type SecurityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ServiceProtocol = 'tcp' | 'udp';

export type ServiceType =
  | 'ftp'
  | 'ssh'
  | 'dns'
  | 'http'
  | 'https'
  | 'mysql'
  | 'redis'
  | 'smb'
  | 'backdoor'
  | 'custom';

export type VulnerabilityId =
  | 'ftp_anon'
  | 'vsftpd_234_backdoor'
  | 'http_dir_listing'
  | 'http_robots_leak'
  | 'http_git_leak'
  | 'http_env_leak'
  | 'http_sqli'
  | 'http_lfi'
  | 'http_cmd_inj'
  | 'http_path_traversal_2449'
  | 'http_ssrf'
  | 'http_jwt_weak'
  | 'http_ssti'
  | 'http_log4j_rce'
  | 'ssh_weak_password'
  | 'ssh_key_auth'
  | 'dns_axfr'
  | 'dns_txt_secret'
  | 'mysql_weak_auth'
  | 'redis_unauth'
  | 'suid_privesc'
  | 'sudo_nopasswd'
  | 'sudo_cve_2021_3156'
  | 'cron_writable'
  | 'cap_setuid_privesc'
  | 'bind_shell';

export type SiteTemplate =
  | 'university'
  | 'corporate'
  | 'ecommerce'
  | 'bank'
  | 'medical'
  | 'devops'
  | 'logistics'
  | 'gov'
  | 'bastion'
  | 'exchange'
  | 'realestate'
  | 'hotel'
  | 'media'
  | 'retail'
  | 'factory'
  | 'aviation'
  | 'telecom'
  | 'energy'
  | 'custom';

export interface WebRoute {
  path: string;
  status: number;
  contentType: 'text/html' | 'application/json' | 'text/plain';
  body: string;
  headers?: Record<string, string>;
  requiresAuth?: {
    type: 'basic' | 'bearer_jwt' | 'cookie';
    secret?: string;
    tokenValue?: string;
    username?: string;
    password?: string;
  };
  /** Optional dynamic behaviors */
  sqliResponse?: {
    vulnerableParam: string;
    dumpTable: string;
  };
  lfiEnabled?: boolean;
  cmdInjEnabled?: boolean;
  ssrfInternalTarget?: string;
  sstiEnabled?: boolean;
  idorConfig?: {
    param: string;
    records: Record<string, string>;
  };
  hiddenFromRobots?: boolean;
}

export interface DnsRecord {
  type: 'A' | 'TXT' | 'MX' | 'CNAME' | 'NS';
  name: string;
  value: string;
}

export interface DbTable {
  name: string;
  columns: string[];
  rows: Record<string, string>[];
}

export interface ServiceConfig {
  id: string;
  port: number;
  protocol: ServiceProtocol;
  type: ServiceType;
  name: string;
  version: string;
  state: 'open' | 'filtered' | 'closed';
  banner?: string;
  /** Vulnerability flags attached to this service */
  vulnerabilities: VulnerabilityId[];
  /** FTP specific */
  ftpAnonymous?: boolean;
  ftpRoot?: string;
  /** HTTP/HTTPS specific */
  webRoutes?: WebRoute[];
  /** DNS specific */
  dnsRecords?: DnsRecord[];
  dnsZoneTransfer?: boolean;
  /** DB specific */
  dbUser?: string;
  dbPassword?: string;
  dbTables?: DbTable[];
  /** Redis specific */
  redisKeys?: Record<string, string>;
  redisAuth?: string;
  /** Bind shell / backdoor user */
  shellUser?: string;
  /** Port knock sequence required before opening */
  knockSequence?: number[];
}

export interface VirtualFile {
  path: string;
  content: string;
  owner: string;
  group: string;
  permissions: string; // e.g., "-rw-r--r--", "-rwsr-xr-x", "-rw-------"
  isDirectory?: boolean;
  /** Optional executable simulation output */
  execHint?: string;
}

export interface VirtualUser {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  password?: string;
  passwordHash?: string; // e.g., MD5 or SHA256 or $6$...
  sshAuthorizedKeys?: string[];
  sudoRules?: string[]; // e.g. ["(ALL) NOPASSWD: /usr/bin/vim"]
  groups?: string[];
}

export interface FirewallConfig {
  idsEnabled: boolean;
  /** Block noisy scans like -T4 / -T5 / -A */
  blockAggressiveScans: boolean;
  /** Max requests/scans before temporary IP lockout */
  rateLimitThreshold: number;
  /** Require stealth SYN scan (-sS) or specific port targeting (-p) */
  requireStealthOrTargeted: boolean;
  /** Decoy/filtered ports shown on standard scan */
  decoyFilteredPorts?: number[];
  /** Port knocking required ports */
  knockPorts?: number[];
}

export interface ServerConfig {
  id: string;
  level: SecurityLevel;
  isCustom?: boolean;
  siteTemplate?: SiteTemplate;
  siteBrand?: {
    title: string;
    subtitle: string;
  };
  name: string;
  hostname: string;
  ip: string;
  os: string;
  kernel: string;
  ttl: number;
  macAddress: string;
  /** Brief scenario description */
  summary: string;
  /** Detailed mission objective */
  objective: string;
  /** Recommended tools tags */
  toolsUsed: string[];
  /** Hints revealed progressively */
  hints: string[];
  /** The target flag (e.g. FLAG{...}) */
  flag: string;
  /** Optional secondary/pivot IP unlocked when inside this server */
  internalNetwork?: {
    subnet: string;
    gateway: string;
    targetServerId: string;
  };
  /** Requires pivoting from another server to reach */
  requiresPivotFrom?: string;
  firewall: FirewallConfig;
  services: ServiceConfig[];
  users: VirtualUser[];
  files: VirtualFile[];
  /** Available privesc mechanisms on this host */
  privescVectors: {
    suidBinaries?: { path: string; exploitCmd: string }[];
    sudoAbuse?: { binary: string; exploitCmd: string }[];
    cronWritable?: { path: string; targetScript: string }[];
    capabilities?: { binary: string; cap: string; exploitCmd: string }[];
    sudoCve20213156?: boolean;
  };
  /** Custom server author notes */
  createdAt?: number;
}

export interface TerminalSegment {
  text: string;
  color?:
    | 'default'
    | 'green'
    | 'bright-green'
    | 'blue'
    | 'bright-blue'
    | 'cyan'
    | 'yellow'
    | 'red'
    | 'magenta'
    | 'dim'
    | 'white'
    | 'inverse';
  bold?: boolean;
}

export interface TerminalLine {
  id: string;
  segments: TerminalSegment[];
}

export interface ShellContext {
  hostId: string; // 'local' or server.id
  hostname: string;
  ip: string;
  user: string;
  uid: number;
  cwd: string;
  env: Record<string, string>;
}

export interface ServerRuntimeState {
  idsAlerts: number;
  blockedUntil?: number;
  knockedPorts: number[];
  unlockedByKnock: boolean;
  compromisedServices: string[];
  /** Dynamic files created or modified by user on this server */
  dynamicFiles: Record<string, VirtualFile>;
  deletedPaths: string[];
  discoveredPorts: number[];
  discoveredPaths: string[];
  notes: string[];
}

export interface GameProgress {
  capturedFlags: Record<string, { flag: string; capturedAt: number; method?: string }>;
  revealedHints: Record<string, number>;
}
