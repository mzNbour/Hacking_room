import { ServerConfig, ServiceConfig, TerminalLine } from '../types/game';
import { ToolContext, txt } from './networkTools';
import { findServerByTarget } from './virtualFs';

function resolveWebTarget(
  args: string[],
  ctx: ToolContext
): { server?: ServerConfig; svc?: ServiceConfig; url?: URL; error?: string } {
  let rawUrl = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '-u' || a === '--url' || a === '-h') && args[i + 1]) {
      rawUrl = args[++i];
      break;
    }
    if (!a.startsWith('-') && (a.includes('.') || a.startsWith('http'))) {
      rawUrl = a;
    }
  }
  if (!rawUrl) {
    return { error: 'ターゲットURLまたはIPを指定してください (例: -u http://10.10.1.10)' };
  }

  const normalized = rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { error: `無効なURL形式です: ${rawUrl}` };
  }

  const server = findServerByTarget(parsed.hostname, ctx.servers, ctx.shell.hostId);
  if (!server) {
    return { error: `ターゲット ${parsed.hostname} に到達できません。` };
  }

  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  const svc = server.services.find(
    (s) => s.port === port && (s.type === 'http' || s.type === 'https' || s.type === 'custom')
  );
  if (!svc) {
    return { error: `${server.ip}:${port} でHTTP/HTTPSサービスが応答しません。` };
  }
  const runtime = ctx.runtimeMap[server.id];
  const isOpen = svc.knockSequence ? runtime.unlockedByKnock : svc.state === 'open';
  if (!isOpen) {
    return { error: `${server.ip}:${port} はファイアウォールによりフィルタリングされています。` };
  }

  return { server, svc, url: parsed };
}

export function runWebSecTool(
  cmdLower: string,
  args: string[],
  ctx: ToolContext
): TerminalLine[] | null {
  switch (cmdLower) {
    case 'ffuf':
    case 'wfuzz':
    case 'dirbuster': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`${cmdLower}: ${error || 'ターゲット未指定'}`, 'red')];
      }
      const routes = svc.webRoutes || [];
      const found: string[] = [];
      const lines: TerminalLine[] = [
        txt(`${cmdLower.toUpperCase()} - Web Fuzzer / Directory Scanner`, 'cyan'),
        txt(`Target: ${url.origin} | Wordlist: /usr/share/wordlists/common.txt`),
        txt('------------------------------------------------------------'),
      ];
      for (const r of routes) {
        if (r.path === '/') continue;
        found.push(r.path);
        lines.push(
          txt(
            `${r.path.padEnd(24)} [Status: ${r.status}, Size: ${r.body.length}]`,
            r.status === 200 ? 'bright-green' : 'yellow'
          )
        );
      }
      ctx.updateRuntime(server.id, (prev) => ({
        ...prev,
        discoveredPaths: Array.from(new Set([...prev.discoveredPaths, ...found])),
      }));
      lines.push(txt(`Done. Discovered ${found.length} paths.`));
      return lines;
    }

    case 'nikto': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`nikto: ${error || '使用法: nikto -h http://<ip>'}`, 'red')];
      }
      const lines: TerminalLine[] = [
        txt(`- Nikto v2.5.0`),
        txt(`+ Target IP:          ${server.ip}`),
        txt(`+ Target Hostname:    ${server.hostname}`),
        txt(`+ Target Port:        ${svc.port}`),
        txt(`+ Server:             ${svc.banner || svc.version}`, 'cyan'),
      ];
      for (const r of svc.webRoutes || []) {
        if (r.path === '/robots.txt') {
          lines.push(txt(`+ /robots.txt: Entry found`, 'bright-green'));
        } else if (r.path.includes('.env')) {
          lines.push(txt(`+ ${r.path}: Exposed environment config file detected!`, 'bright-green'));
        } else if (r.path.includes('.git')) {
          lines.push(txt(`+ ${r.path}: Git repository metadata exposed!`, 'bright-green'));
        } else if (r.path === '/backup') {
          lines.push(txt(`+ /backup: Directory indexing found.`, 'bright-green'));
        }
      }
      if (svc.vulnerabilities.includes('http_path_traversal_2449')) {
        lines.push(txt(`+ Apache/2.4.49: Vulnerable to path traversal (CVE-2021-41773).`, 'yellow'));
      }
      if (svc.vulnerabilities.includes('http_log4j_rce')) {
        lines.push(txt(`+ Log4j 2.14.1: Vulnerable to JNDI injection (CVE-2021-44228).`, 'yellow'));
      }
      lines.push(txt(`+ Scan terminated: 1 host(s) tested`));
      return lines;
    }

    case 'nuclei': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`nuclei: ${error || '使用法: nuclei -u http://<ip>'}`, 'red')];
      }
      const lines: TerminalLine[] = [
        txt(`Nuclei v3.1.0 - Template Vulnerability Scanner`, 'cyan'),
        txt(`[INF] Target: ${url.origin}`),
      ];
      const vulns = svc.vulnerabilities;
      if (vulns.length === 0) {
        lines.push(txt(`[INF] No template matches found on ${url.origin}.`));
      } else {
        for (const v of vulns) {
          const sev =
            v.includes('rce') || v.includes('sqli') || v.includes('cmd') || v.includes('traversal')
              ? 'critical'
              : v.includes('ssrf') || v.includes('lfi') || v.includes('jwt')
              ? 'high'
              : 'medium';
          lines.push(
            txt(`[${v}] [http] [${sev}] ${url.origin}`, sev === 'critical' ? 'red' : 'bright-green')
          );
        }
      }
      return lines;
    }

    case 'whatweb':
    case 'wappalyzer': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`${cmdLower}: ${error || `使用法: ${cmdLower} http://<ip>`}`, 'red')];
      }
      return [
        txt(`${url.origin} [200 OK]`, 'bright-green'),
        txt(`  WebServer   : ${svc.banner || svc.version}`, 'cyan'),
        txt(`  OS          : ${server.os}`),
        txt(`  IP          : ${server.ip}`),
        txt(`  Routes      : ${(svc.webRoutes || []).length} endpoints mapped`),
      ];
    }

    case 'sqlmap': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`sqlmap: ${error || '使用法: sqlmap -u "http://<ip>/search?q=test" --dump'}`, 'red')];
      }
      const route = (svc.webRoutes || []).find((r) => r.path === url.pathname && r.sqliResponse);
      if (!route || !route.sqliResponse) {
        return [
          txt(`[*] starting sqlmap against ${url.href}`),
          txt(`[WARNING] parameter does not appear to be injectable.`, 'yellow'),
        ];
      }
      const dbSvc = server.services.find((s) => s.dbTables && s.dbTables.length > 0);
      const lines: TerminalLine[] = [
        txt(`[*] starting sqlmap against ${url.href}`, 'cyan'),
        txt(`[+] GET parameter '${route.sqliResponse.vulnerableParam}' is vulnerable!`, 'bright-green'),
        txt(`[+] backend DBMS: MySQL`),
      ];
      if (dbSvc?.dbTables) {
        for (const tbl of dbSvc.dbTables) {
          lines.push(txt(`Table: ${tbl.name}`, 'white', true));
          lines.push(txt(`| ${tbl.columns.join(' | ')} |`, 'cyan'));
          for (const row of tbl.rows) {
            lines.push(txt(`| ${tbl.columns.map((c) => row[c] || '').join(' | ')} |`, 'bright-green'));
          }
        }
      }
      return lines;
    }

    case 'commix': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`commix: ${error || '使用法: commix -u "http://<ip>/diag?host=127.0.0.1"'}`, 'red')];
      }
      const route = (svc.webRoutes || []).find((r) => r.path === url.pathname && r.cmdInjEnabled);
      if (!route) {
        return [txt(`[!] No command injection point found at ${url.pathname}`, 'yellow')];
      }
      const u = svc.shellUser || 'www-data';
      const uObj = server.users.find((x) => x.username === u) || {
        username: u,
        uid: 33,
        home: '/var/www',
        shell: '/bin/sh',
      };
      ctx.pushShell({
        hostId: server.id,
        hostname: server.hostname,
        ip: server.ip,
        user: uObj.username,
        uid: uObj.uid,
        cwd: uObj.home,
        env: { USER: uObj.username, HOME: uObj.home, SHELL: uObj.shell, TERM: 'xterm-256color' },
      });
      return [
        txt(`[*] Commix testing ${url.href}...`, 'cyan'),
        txt(`[+] Parameter appears injectable! Pseudo-terminal spawned as ${u}@${server.hostname}.`, 'bright-green'),
      ];
    }

    case 'weevely': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`weevely: ${error || '使用法: weevely http://<ip>/shell.php <password>'}`, 'red')];
      }
      if (!svc.vulnerabilities.includes('http_cmd_inj') && svc.type !== 'backdoor') {
        return [txt(`[-] No compatible web shell endpoint active on ${url.origin}.`, 'yellow')];
      }
      const u = svc.shellUser || 'www-data';
      ctx.pushShell({
        hostId: server.id,
        hostname: server.hostname,
        ip: server.ip,
        user: u,
        uid: 33,
        cwd: '/var/www',
        env: { USER: u, HOME: '/var/www', SHELL: '/bin/sh', TERM: 'xterm-256color' },
      });
      return [txt(`[+] Weevely session connected to ${url.origin} as ${u}.`, 'bright-green')];
    }

    case 'wpscan':
      return [
        txt(`_______________________________________________________________`),
        txt(`         __          _______   _____`),
        txt(`         \\ \\        / /  __ \\ / ____|`),
        txt(`          \\ \\  /\\  / /| |__) | (___   ___  __ _ _ __`),
        txt(`           \\ \\/  \\/ / |  ___/ \\___ \\ / __|/ _\` | '_ \\`),
        txt(`            \\  /\\  /  | |     ____) | (__| (_| | | | |`),
        txt(`             \\/  \\/   |_|    |_____/ \\___|\\__,_|_| |_|`),
        txt(`[i] Target checked: WordPress CMS signature not detected on target.`),
      ];

    case 'joomscan':
      return [
        txt(`OWASP JoomScan - Joomla Vulnerability Scanner`, 'cyan'),
        txt(`[!] Target does not appear to be running Joomla CMS.`),
      ];

    case 'wapiti':
    case 'skipfish':
    case 'xsser': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      if (error || !server || !svc || !url) {
        return [txt(`${cmdLower}: ${error || `使用法: ${cmdLower} -u http://<ip>`}`, 'red')];
      }
      return [
        txt(`${cmdLower.toUpperCase()} Audit Report for ${url.origin}`, 'cyan'),
        txt(`  Crawled endpoints: ${(svc.webRoutes || []).map((r) => r.path).join(', ')}`),
        txt(`  Identified flags : ${svc.vulnerabilities.join(', ') || 'None'}`, 'bright-green'),
      ];
    }

    case 'burp':
    case 'burpsuite':
    case 'zap':
    case 'zaproxy':
    case 'owasp-zap':
    case 'caido': {
      const { server, svc, url, error } = resolveWebTarget(args, ctx);
      const targetSrv = server || ctx.servers.find((s) => s.id === ctx.shell.hostId);
      if (error && args.length > 0) {
        return [txt(`${cmdLower}: ${error}`, 'red')];
      }
      const webSvc =
        svc ||
        targetSrv?.services.find(
          (s) => s.type === 'http' || s.type === 'https' || s.type === 'custom'
        );
      if (!webSvc) {
        return [
          txt(`${cmdLower.toUpperCase()} Proxy Monitor (127.0.0.1:8080)`, 'cyan'),
          txt(`Use: ${cmdLower} -u http://<target_ip> to inspect target HTTP endpoints.`),
        ];
      }
      const lines: TerminalLine[] = [
        txt(`${cmdLower.toUpperCase()} HTTP Site Map (${url?.origin || targetSrv?.ip})`, 'cyan'),
        txt(`Server: ${webSvc.banner || webSvc.version}`),
      ];
      for (const r of webSvc.webRoutes || []) {
        lines.push(txt(`  GET ${r.path.padEnd(22)} -> HTTP ${r.status} (${r.contentType})`, 'bright-green'));
      }
      return lines;
    }

    default:
      return null;
  }
}
