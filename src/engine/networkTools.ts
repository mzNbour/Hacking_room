import {
  ServerConfig,
  ServerRuntimeState,
  ShellContext,
  TerminalLine,
  TerminalSegment,
  VirtualFile,
} from '../types/game';
import { findServerByTarget, getEffectiveFiles } from './virtualFs';

let lineCounter = 0;
export function mkLine(segments: TerminalSegment[]): TerminalLine {
  lineCounter += 1;
  return { id: `ln-${Date.now()}-${lineCounter}`, segments };
}

export function txt(text: string, color?: TerminalSegment['color'], bold?: boolean): TerminalLine {
  return mkLine([{ text, color, bold }]);
}

export function tokenizeArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) args.push(current);
  return args;
}

export interface ToolContext {
  shell: ShellContext;
  servers: ServerConfig[];
  runtimeMap: Record<string, ServerRuntimeState>;
  updateRuntime: (serverId: string, updater: (prev: ServerRuntimeState) => ServerRuntimeState) => void;
  pushShell: (next: ShellContext) => void;
  saveLocalFile: (file: VirtualFile) => void;
}

export function checkFirewallBlock(
  server: ServerConfig,
  runtime: ServerRuntimeState,
  isAggressive: boolean,
  isStealthOrTargeted: boolean,
  ctx: ToolContext
): { blocked: boolean; reason?: string } {
  const now = Date.now();
  if (runtime.blockedUntil && runtime.blockedUntil > now) {
    const sec = Math.ceil((runtime.blockedUntil - now) / 1000);
    return {
      blocked: true,
      reason: `IDS/Firewall: あなたの送信元IPは一時遮断されています (残り約 ${sec}秒)。ステルス設定 (-sS -T2) または対象ポート指定 (-p) をお試しください。`,
    };
  }

  if (server.firewall.idsEnabled && server.firewall.blockAggressiveScans && isAggressive) {
    const nextAlerts = runtime.idsAlerts + 2;
    const tripped = nextAlerts >= server.firewall.rateLimitThreshold;
    ctx.updateRuntime(server.id, (prev) => ({
      ...prev,
      idsAlerts: tripped ? 0 : nextAlerts,
      blockedUntil: tripped ? now + 18000 : prev.blockedUntil,
    }));
    return {
      blocked: true,
      reason: tripped
        ? `IDS ALERT: 激しいスキャン(-T4/-T5/-A)を検知し、ターゲット側ファイアウォールが18秒間アクセスを遮断しました！`
        : `IDS WARNING: 高速/攻撃的スキャンを検知。ポートが filtered として応答しています (-sS -T2 を推奨)。`,
    };
  }

  if (server.firewall.requireStealthOrTargeted && !isStealthOrTargeted) {
    ctx.updateRuntime(server.id, (prev) => ({
      ...prev,
      idsAlerts: prev.idsAlerts + 1,
    }));
    return {
      blocked: false,
      reason: 'FILTERED_ONLY',
    };
  }

  return { blocked: false };
}

export function runNmap(args: string[], ctx: ToolContext): TerminalLine[] {
  const lines: TerminalLine[] = [];
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return [
      txt('Nmap 7.94 ( https://nmap.org ) - 擬似ネットワークスキャナ'),
      txt('使用法: nmap [スキャンタイプ] [オプション] {ターゲットIP/ホスト}'),
      txt('主なオプション:'),
      txt('  -sS          TCP SYN ステルススキャン (IDS回避に有効)'),
      txt('  -sT          TCP Connect スキャン'),
      txt('  -sV          サービス・バージョン検出'),
      txt('  -O           OSフィンガープリント検出'),
      txt('  -A           OS検出・バージョン検出・NSEスクリプト・Traceroute'),
      txt('  -sC          デフォルトNSEスクリプト実行 (ftp-anon, http-robots等)'),
      txt('  -p <ports>   ポート指定 (例: -p 22,80,443 または -p-)'),
      txt('  -T1..-T5     タイミングテンプレート (-T2: 慎重, -T5: 高速/検知されやすい)'),
      txt('  -sn          Pingホスト探索 (例: nmap -sn 10.10.1.0/24)'),
    ];
  }

  const isSyn = args.includes('-sS');
  const isVersion = args.includes('-sV') || args.includes('-A');
  const isOs = args.includes('-O') || args.includes('-A');
  const isScript = args.includes('-sC') || args.includes('-A') || args.some((a) => a.startsWith('--script'));
  const isAggressive = args.includes('-A') || args.includes('-T4') || args.includes('-T5');
  const isSlowTiming = args.includes('-T1') || args.includes('-T2');
  const isPingSweep = args.includes('-sn');

  let portSpec = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' && args[i + 1]) {
      portSpec = args[i + 1];
    } else if (args[i].startsWith('-p') && args[i].length > 2) {
      portSpec = args[i].slice(2);
    }
  }

  const targetArg = [...args].reverse().find((a) => !a.startsWith('-') && a !== portSpec);
  if (!targetArg) {
    return [txt('nmap: ターゲットIPまたはホストを指定してください。', 'red')];
  }

  // Subnet discovery (-sn)
  if (isPingSweep || targetArg.includes('/24')) {
    const prefix = targetArg.split('.').slice(0, 3).join('.');
    lines.push(txt(`Starting Nmap 7.94 at ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`));
    const visible = ctx.servers.filter((s) => {
      if (s.requiresPivotFrom && s.requiresPivotFrom !== ctx.shell.hostId) return false;
      return s.ip.startsWith(prefix + '.');
    });
    for (const s of visible) {
      lines.push(txt(`Nmap scan report for ${s.hostname}.lab (${s.ip})`, 'bright-green'));
      lines.push(txt(`Host is up (0.0084s latency).`));
      lines.push(txt(`MAC Address: ${s.macAddress} (VMware)`));
    }
    lines.push(txt(`Nmap done: 256 IP addresses (${visible.length} hosts up) scanned in 1.42 seconds`));
    return lines;
  }

  const server = findServerByTarget(targetArg, ctx.servers, ctx.shell.hostId);
  if (!server) {
    return [
      txt(`Starting Nmap 7.94`),
      txt(`Note: Host seems down or unreachable from ${ctx.shell.hostname} (${targetArg}).`, 'yellow'),
      txt(`Nmap done: 1 IP address (0 hosts up) scanned in 2.04 seconds`),
    ];
  }

  const runtime = ctx.runtimeMap[server.id];
  const hasSpecificPorts = Boolean(portSpec && portSpec !== '-');
  const isStealthOrTargeted = isSyn || isSlowTiming || hasSpecificPorts;

  const fw = checkFirewallBlock(server, runtime, isAggressive, isStealthOrTargeted, ctx);

  lines.push(txt(`Starting Nmap 7.94 ( https://nmap.org )`));
  lines.push(txt(`Nmap scan report for ${server.hostname}.lab (${server.ip})`, 'cyan', true));
  lines.push(txt(`Host is up (0.0091s latency).`));

  if (fw.blocked) {
    lines.push(txt(fw.reason || 'Host blocked by firewall.', 'red'));
    lines.push(txt(`All scanned ports on ${server.ip} are in ignored states (filtered).`, 'yellow'));
    lines.push(txt(`Nmap done: 1 IP address (1 host up) scanned in 3.10 seconds`));
    return lines;
  }

  let requestedPorts: number[] | null = null;
  if (portSpec && portSpec !== '-') {
    requestedPorts = [];
    for (const part of portSpec.split(',')) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = start; p <= Math.min(end, start + 200); p++) requestedPorts.push(p);
        }
      } else {
        const n = Number(part);
        if (!isNaN(n)) requestedPorts.push(n);
      }
    }
  }

  const discovered: number[] = [];
  lines.push(txt('PORT      STATE    SERVICE      VERSION', 'white', true));

  const servicesToShow = server.services.filter((svc) => {
    if (requestedPorts) return requestedPorts.includes(svc.port);
    return true;
  });

  if (fw.reason === 'FILTERED_ONLY') {
    lines.push(
      txt(
        `[IDS Notice] 通常スキャンが制限されました。-sS (SYNステルス) や -T2 または -p <ポート> を使用してください。`,
        'yellow'
      )
    );
  }

  for (const svc of servicesToShow) {
    const unlocked = svc.knockSequence ? runtime.unlockedByKnock : svc.state === 'open';
    const effectiveState =
      fw.reason === 'FILTERED_ONLY' ? 'filtered' : unlocked ? 'open' : svc.state;

    if (effectiveState === 'open') discovered.push(svc.port);

    const portCol = `${svc.port}/${svc.protocol}`.padEnd(10, ' ');
    const stateCol = effectiveState.padEnd(9, ' ');
    const nameCol = svc.name.padEnd(13, ' ');
    const verCol = isVersion && effectiveState === 'open' ? svc.version : '';

    const color = effectiveState === 'open' ? 'bright-green' : 'yellow';
    lines.push(txt(`${portCol}${stateCol}${nameCol}${verCol}`, color));

    if (isScript && effectiveState === 'open') {
      if (svc.ftpAnonymous) {
        lines.push(txt(`| ftp-anon: Anonymous FTP login allowed (FTP code 230)`, 'cyan'));
      }
      if (svc.vulnerabilities.includes('http_robots_leak')) {
        lines.push(txt(`| http-robots.txt: 2 disallowed entries (/admin-backup/, /internal/)`, 'cyan'));
      }
      if (svc.vulnerabilities.includes('http_git_leak')) {
        lines.push(txt(`| http-git: Potential Git repository found (/.git/HEAD)`, 'cyan'));
      }
      if (svc.dnsZoneTransfer) {
        lines.push(txt(`| dns-zone-transfer: Zone transfer (AXFR) enabled!`, 'cyan'));
      }
      if (svc.vulnerabilities.includes('redis_unauth')) {
        lines.push(txt(`|_redis-info: Unauthenticated Redis instance detected`, 'cyan'));
      }
    }
  }

  if (server.firewall.decoyFilteredPorts && (!requestedPorts || portSpec === '-')) {
    for (const dp of server.firewall.decoyFilteredPorts) {
      const portCol = `${dp}/tcp`.padEnd(10, ' ');
      lines.push(txt(`${portCol}filtered unknown`, 'dim'));
    }
  }

  if (isOs) {
    lines.push(txt(`MAC Address: ${server.macAddress}`));
    lines.push(txt(`OS details: ${server.os} (${server.kernel})`, 'cyan'));
    lines.push(txt(`Network Distance: 1 hop (TTL=${server.ttl})`));
  }

  if (discovered.length > 0) {
    ctx.updateRuntime(server.id, (prev) => ({
      ...prev,
      discoveredPorts: Array.from(new Set([...prev.discoveredPorts, ...discovered])).sort((a, b) => a - b),
    }));
  }

  const scanSec = isSlowTiming ? '2.84' : isSyn ? '0.62' : '0.94';
  lines.push(txt(`Nmap done: 1 IP address (1 host up) scanned in ${scanSec} seconds`));
  return lines;
}

export function runPing(args: string[], ctx: ToolContext): TerminalLine[] {
  const target = args.find((a) => !a.startsWith('-'));
  if (!target) return [txt('使用法: ping [-c count] <ホスト>', 'red')];
  const server = findServerByTarget(target, ctx.servers, ctx.shell.hostId);
  if (!server) {
    return [
      txt(`PING ${target} (${target}) 56(84) bytes of data.`),
      txt(`From ${ctx.shell.ip} icmp_seq=1 Destination Host Unreachable`, 'red'),
      txt(`--- ${target} ping statistics ---`),
      txt(`1 packets transmitted, 0 received, 100% packet loss`),
    ];
  }
  return [
    txt(`PING ${server.ip} (${server.ip}) 56(84) bytes of data.`),
    txt(`64 bytes from ${server.ip}: icmp_seq=1 ttl=${server.ttl} time=0.84 ms`, 'green'),
    txt(`64 bytes from ${server.ip}: icmp_seq=2 ttl=${server.ttl} time=0.79 ms`, 'green'),
    txt(`64 bytes from ${server.ip}: icmp_seq=3 ttl=${server.ttl} time=0.81 ms`, 'green'),
    txt(`--- ${server.ip} ping statistics ---`),
    txt(`3 packets transmitted, 3 received, 0% packet loss, time 2003ms`),
  ];
}

export function runDig(args: string[], ctx: ToolContext): TerminalLine[] {
  let serverIp = '';
  let queryType = 'A';
  let domain = '';

  for (const a of args) {
    if (a.startsWith('@')) {
      serverIp = a.slice(1);
    } else if (['A', 'TXT', 'MX', 'CNAME', 'NS', 'AXFR', 'ANY'].includes(a.toUpperCase())) {
      queryType = a.toUpperCase();
    } else if (!a.startsWith('-')) {
      domain = a;
    }
  }

  if (!serverIp && domain) {
    const guess = ctx.servers.find((s) => domain.includes(s.hostname) || s.ip === domain);
    if (guess) serverIp = guess.ip;
  }

  const server = serverIp ? findServerByTarget(serverIp, ctx.servers, ctx.shell.hostId) : undefined;
  const dnsSvc = server?.services.find((s) => s.type === 'dns' && s.state === 'open');

  if (!server || !dnsSvc) {
    return [txt(`;; connection timed out; no DNS servers could be reached`, 'red')];
  }

  const lines: TerminalLine[] = [
    txt(`; <<>> DiG 9.18.18 <<>> @${server.ip} ${queryType} ${domain || ''}`, 'cyan'),
  ];

  const records = dnsSvc.dnsRecords || [];
  if (queryType === 'AXFR') {
    if (!dnsSvc.dnsZoneTransfer) {
      lines.push(txt(`; Transfer failed (REFUSED - AXFR restricted).`, 'yellow'));
      return lines;
    }
    lines.push(txt(`;; ZONE TRANSFER (AXFR) SUCCESSFUL:`, 'bright-green'));
    for (const r of records) {
      lines.push(txt(`${r.name.padEnd(28, ' ')} 300 IN ${r.type.padEnd(6, ' ')} ${r.value}`, 'green'));
    }
    return lines;
  }

  const matched = records.filter(
    (r) =>
      (queryType === 'ANY' || r.type === queryType) &&
      (!domain || r.name.toLowerCase() === domain.toLowerCase() || domain === 'any')
  );

  if (matched.length === 0) {
    lines.push(txt(`;; ANSWER SECTION: (0 records found for ${queryType} ${domain})`, 'yellow'));
  } else {
    lines.push(txt(`;; ANSWER SECTION:`, 'white', true));
    for (const r of matched) {
      lines.push(txt(`${r.name.padEnd(28, ' ')} 300 IN ${r.type.padEnd(6, ' ')} ${r.value}`, 'bright-green'));
    }
  }
  return lines;
}

export function runCurl(args: string[], ctx: ToolContext): TerminalLine[] {
  let includeHeaders = false;
  let headOnly = false;
  let customHeaders: Record<string, string> = {};
  let urlArg = '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-i') includeHeaders = true;
    else if (a === '-I') headOnly = true;
    else if (a === '-H' && args[i + 1]) {
      const h = args[++i];
      const idx = h.indexOf(':');
      if (idx > 0) {
        customHeaders[h.slice(0, idx).trim().toLowerCase()] = h.slice(idx + 1).trim();
      }
    } else if (['-s', '-k', '-L', '--path-as-is'].includes(a)) {
      continue;
    } else if (a === '-X' || a === '-d') {
      i++;
    } else if (!a.startsWith('-')) {
      urlArg = a;
    }
  }

  if (!urlArg) return [txt('curl: URLを指定してください (例: curl http://10.10.1.10/)', 'red')];

  const normalizedUrl = urlArg.startsWith('http') ? urlArg : `http://${urlArg}`;
  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return [txt(`curl: (3) URL using bad/illegal format: ${urlArg}`, 'red')];
  }

  const server = findServerByTarget(parsed.hostname, ctx.servers, ctx.shell.hostId);
  if (!server) {
    return [txt(`curl: (7) Failed to connect to ${parsed.hostname}: Network unreachable`, 'red')];
  }

  const runtime = ctx.runtimeMap[server.id];
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  const webSvc = server.services.find(
    (s) => s.port === port && (s.type === 'http' || s.type === 'https' || s.type === 'custom')
  );

  if (!webSvc) {
    return [txt(`curl: (7) Failed to connect to ${server.ip} port ${port}: Connection refused`, 'red')];
  }

  const isOpen = webSvc.knockSequence ? runtime.unlockedByKnock : webSvc.state === 'open';
  if (!isOpen) {
    return [txt(`curl: (28) Connection timed out after 3000ms (port ${port} filtered)`, 'yellow')];
  }

  const routePath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
  const routes = webSvc.webRoutes || [];
  const route = routes.find((r) => r.path === routePath || r.path === parsed.pathname);

  const lines: TerminalLine[] = [];
  const pushHeaders = (status: number, ct: string) => {
    if (includeHeaders || headOnly) {
      lines.push(txt(`HTTP/1.1 ${status} ${status === 200 ? 'OK' : status === 401 ? 'Unauthorized' : 'Not Found'}`, 'cyan'));
      lines.push(txt(`Server: ${webSvc.banner || webSvc.version}`, 'cyan'));
      lines.push(txt(`Content-Type: ${ct}`, 'cyan'));
      lines.push(txt(''));
    }
  };

  // Check special path traversal on Apache 2.4.49
  if (
    webSvc.vulnerabilities.includes('http_path_traversal_2449') &&
    urlArg.includes('.%2e')
  ) {
    const targetFile = urlArg.split('.%2e').pop()?.replace(/^\/+/, '/') || '/etc/passwd';
    const files = getEffectiveFiles(server.files, runtime);
    const f = files.find((item) => item.path === targetFile);
    if (f) {
      pushHeaders(200, 'text/plain');
      if (!headOnly) f.content.split('\n').forEach((l) => lines.push(txt(l)));
      return lines;
    }
  }

  if (!route) {
    pushHeaders(404, 'text/html');
    if (!headOnly) lines.push(txt(`404 Not Found: ${routePath}`, 'yellow'));
    return lines;
  }

  // Auth check (Bearer JWT)
  if (route.requiresAuth?.type === 'bearer_jwt') {
    const auth = customHeaders['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      pushHeaders(401, 'application/json');
      if (!headOnly) lines.push(txt(`{"error":"Authorization Bearer JWT token required"}`, 'red'));
      return lines;
    }
    const parts = token.split('.');
    let validAdmin = false;
    if (parts.length >= 2) {
      try {
        const hdr = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role === 'admin') {
          if (hdr.alg === 'none' || parts[2] === `sig_${route.requiresAuth.secret}_admin`) {
            validAdmin = true;
          }
        }
      } catch {
        validAdmin = false;
      }
    }
    if (!validAdmin) {
      pushHeaders(403, 'application/json');
      if (!headOnly) lines.push(txt(`{"error":"Forbidden: admin role JWT required"}`, 'red'));
      return lines;
    }
  }

  ctx.updateRuntime(server.id, (prev) => ({
    ...prev,
    discoveredPaths: Array.from(new Set([...prev.discoveredPaths, routePath])),
  }));

  pushHeaders(route.status, route.contentType);
  if (headOnly) return lines;

  // Dynamic vulnerability handlers
  if (route.sqliResponse) {
    const q = parsed.searchParams.get(route.sqliResponse.vulnerableParam) || '';
    if (q.includes("'") || q.toUpperCase().includes('OR 1=1') || q.toUpperCase().includes('UNION')) {
      const dbSvc = server.services.find((s) => s.dbTables && s.dbTables.length > 0);
      if (dbSvc?.dbTables) {
        lines.push(txt(`[SQLi Dump - Table: ${route.sqliResponse.dumpTable}]`, 'bright-green'));
        lines.push(txt(JSON.stringify(dbSvc.dbTables, null, 2), 'green'));
        return lines;
      }
    }
  }

  if (route.lfiEnabled) {
    const fileParam = parsed.searchParams.get('file');
    if (fileParam && (fileParam.includes('..') || fileParam.startsWith('/'))) {
      const cleaned = '/' + fileParam.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
      const files = getEffectiveFiles(server.files, runtime);
      const found = files.find((f) => f.path === cleaned);
      if (found) {
        found.content.split('\n').forEach((l) => lines.push(txt(l, 'bright-green')));
        return lines;
      }
      lines.push(txt(`Warning: include(${fileParam}): failed to open stream: No such file`, 'yellow'));
      return lines;
    }
  }

  if (route.ssrfInternalTarget) {
    const targetUrl = parsed.searchParams.get('url') || '';
    if (targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
      route.ssrfInternalTarget.split('\n').forEach((l) => lines.push(txt(l, 'bright-green')));
      return lines;
    }
  }

  if (route.cmdInjEnabled) {
    const hostParam = parsed.searchParams.get('host') || '';
    if (hostParam.includes(';') || hostParam.includes('|') || hostParam.includes('&&')) {
      const injected = hostParam.split(/;|&&|\|/).slice(1).join(';').trim();
      lines.push(txt(route.body));
      if (injected.startsWith('id')) {
        lines.push(txt(`uid=33(www-data) gid=33(www-data) groups=33(www-data)`, 'bright-green'));
      } else if (injected.startsWith('cat ')) {
        const p = injected.slice(4).trim();
        const f = getEffectiveFiles(server.files, runtime).find((x) => x.path === p);
        if (f) f.content.split('\n').forEach((l) => lines.push(txt(l, 'bright-green')));
      } else {
        lines.push(txt(`[Command Output]: executed '${injected}' as www-data`, 'bright-green'));
      }
      return lines;
    }
  }

  if (route.idorConfig) {
    const idVal = parsed.searchParams.get(route.idorConfig.param) || '';
    if (idVal && idVal in route.idorConfig.records) {
      route.idorConfig.records[idVal]
        .split('\n')
        .forEach((l) => lines.push(txt(l, 'bright-green')));
      return lines;
    }
    if (idVal) {
      lines.push(txt(`{"error":"Record id=${idVal} not found"}`, 'yellow'));
      return lines;
    }
  }

  route.body.split('\n').forEach((l) => lines.push(txt(l)));
  return lines;
}

export function runGobuster(args: string[], ctx: ToolContext): TerminalLine[] {
  let urlArg = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-u' && args[i + 1]) {
      urlArg = args[++i];
    }
  }
  if (!urlArg) {
    return [txt('使用法: gobuster dir -u http://<ターゲットIP> [-w /usr/share/wordlists/common.txt]', 'red')];
  }
  const normalizedUrl = urlArg.startsWith('http') ? urlArg : `http://${urlArg}`;
  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return [txt(`gobuster: 無効なURL: ${urlArg}`, 'red')];
  }

  const server = findServerByTarget(parsed.hostname, ctx.servers, ctx.shell.hostId);
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  const webSvc = server?.services.find(
    (s) => s.port === port && (s.type === 'http' || s.type === 'https' || s.type === 'custom')
  );

  if (!server || !webSvc) {
    return [txt(`Error: unable to connect to ${normalizedUrl}`, 'red')];
  }

  const lines: TerminalLine[] = [
    txt(`===============================================================`),
    txt(`Gobuster v3.6 | Target: ${normalizedUrl}`, 'cyan'),
    txt(`Wordlist: /usr/share/wordlists/common.txt`),
    txt(`===============================================================`),
  ];

  const foundPaths: string[] = [];
  for (const r of webSvc.webRoutes || []) {
    if (r.path === '/') continue;
    foundPaths.push(r.path);
    const padPath = r.path.padEnd(24, ' ');
    lines.push(
      txt(
        `${padPath} (Status: ${r.status}) [Size: ${r.body.length}]`,
        r.status === 200 ? 'bright-green' : 'yellow'
      )
    );
  }

  ctx.updateRuntime(server.id, (prev) => ({
    ...prev,
    discoveredPaths: Array.from(new Set([...prev.discoveredPaths, ...foundPaths])),
  }));

  lines.push(txt(`===============================================================`));
  lines.push(txt(`Finished: ${foundPaths.length} paths discovered.`));
  return lines;
}

export function runArpScan(args: string[], ctx: ToolContext): TerminalLine[] {
  const visible = ctx.servers.filter((s) => {
    if (s.requiresPivotFrom) return s.requiresPivotFrom === ctx.shell.hostId;
    return ctx.shell.hostId === 'local';
  });

  const lines: TerminalLine[] = [
    txt(`Interface: ${ctx.shell.hostId === 'local' ? 'eth0' : 'eth1'}, type: EN10MB`),
    txt(`Starting arp-scan 1.10.0 on ${args[0] || 'local subnet'}...`, 'cyan'),
  ];

  for (const s of visible) {
    lines.push(txt(`${s.ip.padEnd(18, ' ')}${s.macAddress}   (${s.hostname})`, 'bright-green'));
  }
  lines.push(txt(`${visible.length} packets received by filter, 0 packets dropped by kernel.`));
  return lines;
}

export function runJwtTool(args: string[]): TerminalLine[] {
  const token = args.find((a) => !a.startsWith('-'));
  if (!token) {
    return [
      txt('使用法: jwt-tool <JWT> [--forge-none] [--sign <secret>]'),
      txt('  JWTの中身をデコードし、alg:none や脆弱秘密鍵での管理者トークン生成を行います。'),
    ];
  }

  const parts = token.split('.');
  if (parts.length < 2) return [txt('jwt-tool: 無効なJWT形式です。', 'red')];

  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    const lines: TerminalLine[] = [
      txt('[+] Decoded Header:', 'cyan'),
      txt(`    ${JSON.stringify(header)}`),
      txt('[+] Decoded Payload:', 'cyan'),
      txt(`    ${JSON.stringify(payload)}`),
    ];

    if (args.includes('--forge-none')) {
      const forgedHdr = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
      const forgedPay = btoa(JSON.stringify({ ...payload, role: 'admin' })).replace(/=/g, '');
      lines.push(txt('[!] Forged alg:none Admin JWT:', 'bright-green'));
      lines.push(txt(`${forgedHdr}.${forgedPay}.`, 'yellow'));
    } else if (args.includes('--sign')) {
      const idx = args.indexOf('--sign');
      const sec = args[idx + 1] || 'secret99';
      const forgedHdr = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
      const forgedPay = btoa(JSON.stringify({ ...payload, role: 'admin' })).replace(/=/g, '');
      lines.push(txt(`[!] Signed Admin JWT (secret=${sec}):`, 'bright-green'));
      lines.push(txt(`${forgedHdr}.${forgedPay}.sig_${sec}_admin`, 'yellow'));
    }
    return lines;
  } catch {
    return [txt('jwt-tool: Base64デコードに失敗しました。', 'red')];
  }
}
