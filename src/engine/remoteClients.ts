import { EXPLOIT_DB, HASH_CRACK_DICT, LOCAL_INITIAL_FILES, ROCKYOU_WORDLIST } from '../data/localFs';
import { ServerConfig, ShellContext, TerminalLine } from '../types/game';
import { mkLine, ToolContext, txt } from './networkTools';
import { findServerByTarget, getEffectiveFiles, normalizePath } from './virtualFs';

export function runFtp(args: string[], ctx: ToolContext): TerminalLine[] {
  const target = args.find((a) => !a.startsWith('-'));
  if (!target) {
    return [txt('使用法: ftp <ターゲットIP> [コマンド] (例: ftp 10.10.1.10 または ftp 10.10.1.10 get /pub/flag.txt)', 'red')];
  }

  const server = findServerByTarget(target, ctx.servers, ctx.shell.hostId);
  const ftpSvc = server?.services.find((s) => s.type === 'ftp' && s.state === 'open');
  if (!server || !ftpSvc) {
    return [txt(`ftp: connect to ${target}: Connection refused`, 'red')];
  }

  if (!ftpSvc.ftpAnonymous) {
    return [
      txt(`Connected to ${server.ip}.`),
      txt(ftpSvc.banner || '220 FTP Service Ready'),
      txt(`530 Login incorrect. Anonymous login is disabled on this server.`, 'yellow'),
    ];
  }

  const root = ftpSvc.ftpRoot || '/srv/ftp';
  const files = getEffectiveFiles(server.files, ctx.runtimeMap[server.id]).filter((f) =>
    f.path.startsWith(root)
  );

  const subCmd = args[1]?.toLowerCase();
  const subArg = args[2];

  if (subCmd === 'get' && subArg) {
    const cleanName = subArg.replace(/^\/+/, '');
    const match = files.find(
      (f) => !f.isDirectory && (f.path.endsWith('/' + cleanName) || f.path === `${root}/${cleanName}`)
    );
    if (!match) {
      return [txt(`550 Failed to open file '${subArg}'.`, 'red')];
    }
    const fileName = match.path.split('/').pop() || 'downloaded.txt';
    ctx.saveLocalFile({
      path: `${ctx.shell.cwd === '/' ? '' : ctx.shell.cwd}/${fileName}`,
      content: match.content,
      owner: ctx.shell.user,
      group: ctx.shell.user,
      permissions: '-rw-r--r--',
    });
    return [
      txt(`200 PORT command successful.`),
      txt(`150 Opening BINARY mode data connection for ${fileName}.`),
      txt(`226 Transfer complete. Saved to ${ctx.shell.cwd}/${fileName}`, 'bright-green'),
      ...match.content.split('\n').filter(Boolean).map((l) => txt(`  ${l}`, 'cyan')),
    ];
  }

  const lines: TerminalLine[] = [
    txt(`Connected to ${server.ip}.`),
    txt(ftpSvc.banner || '220 FTP Service Ready'),
    txt(`Name (${server.ip}:${ctx.shell.user}): anonymous`, 'cyan'),
    txt(`230 Login successful. (Anonymous FTP enabled)`, 'bright-green'),
    txt(`ftp> ls -R ${root}`),
  ];

  for (const f of files) {
    const rel = f.path.slice(root.length) || '/';
    lines.push(txt(`${f.permissions}  ${f.owner.padEnd(8)} ${rel}`, f.isDirectory ? 'bright-blue' : 'default'));
  }
  return lines;
}

export function runSsh(args: string[], ctx: ToolContext): TerminalLine[] {
  let keyFile = '';
  let port = 22;
  let passwordArg = '';
  let targetStr = '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-i' && args[i + 1]) keyFile = args[++i];
    else if (a === '-p' && args[i + 1]) port = Number(args[++i]) || 22;
    else if (a === '-P' && args[i + 1]) passwordArg = args[++i];
    else if (!a.startsWith('-')) targetStr = a;
  }

  if (!targetStr || !targetStr.includes('@')) {
    return [
      txt('使用法: ssh <user>@<ip> [-p port] [-i key_file] [-P password]', 'red'),
      txt('  例: ssh devuser@10.10.1.20 -P devbox99', 'dim'),
      txt('  例: ssh -i id_rsa deploy@10.10.1.50', 'dim'),
    ];
  }

  const [username, host] = targetStr.split('@');
  const server = findServerByTarget(host, ctx.servers, ctx.shell.hostId);
  const sshSvc = server?.services.find((s) => s.type === 'ssh' && s.port === port && s.state === 'open');

  if (!server || !sshSvc) {
    return [txt(`ssh: connect to host ${host} port ${port}: Connection refused`, 'red')];
  }

  const userObj = server.users.find((u) => u.username === username);
  if (!userObj) {
    return [txt(`Permission denied (publickey,password) for ${username}@${server.ip}.`, 'red')];
  }

  // Check key auth
  let authed = false;
  if (keyFile) {
    const baseFiles =
      ctx.shell.hostId === 'local'
        ? LOCAL_INITIAL_FILES
        : ctx.servers.find((s) => s.id === ctx.shell.hostId)?.files || [];
    const currentFiles = getEffectiveFiles(baseFiles, ctx.runtimeMap[ctx.shell.hostId]);
    const home = ctx.shell.uid === 0 ? '/root' : `/home/${ctx.shell.user}`;
    const resolvedKeyPath = normalizePath(ctx.shell.cwd, keyFile, home);
    const kf = currentFiles.find((f) => f.path === resolvedKeyPath);
    if (kf && userObj.sshAuthorizedKeys?.some((k) => kf.content.includes(k))) {
      authed = true;
    } else {
      return [txt(`ssh: key '${keyFile}' invalid or rejected by ${server.ip}.`, 'red')];
    }
  } else if (passwordArg) {
    if (userObj.password && userObj.password === passwordArg) {
      authed = true;
    } else {
      return [txt(`Permission denied, please try again. (Invalid password)`, 'red')];
    }
  } else if (userObj.password) {
    return [
      txt(`${username}@${server.ip}'s password: Authentication required (-P <password>)`, 'yellow'),
    ];
  } else {
    return [
      txt(`Permission denied (publickey).`, 'red'),
    ];
  }

  if (!authed) {
    return [txt(`Permission denied.`, 'red')];
  }

  ctx.pushShell({
    hostId: server.id,
    hostname: server.hostname,
    ip: server.ip,
    user: userObj.username,
    uid: userObj.uid,
    cwd: userObj.home,
    env: {
      USER: userObj.username,
      HOME: userObj.home,
      SHELL: userObj.shell,
      TERM: 'xterm-256color',
    },
  });

  return [
    txt(`Welcome to ${server.os} (${server.kernel})`, 'bright-green'),
    txt(`Connected to ${server.hostname} (${server.ip}) as ${userObj.username}. ('exit' で切断)`),
  ];
}

export function runNc(args: string[], ctx: ToolContext): TerminalLine[] {
  const isZero = args.includes('-z');
  const nums = args.filter((a) => !a.startsWith('-'));
  const target = nums[0];
  const port = Number(nums[1]);

  if (!target || isNaN(port)) {
    return [txt('使用法: nc [-z] <host> <port>', 'red')];
  }

  const server = findServerByTarget(target, ctx.servers, ctx.shell.hostId);
  if (!server) {
    return [txt(`nc: ${target}: Name or service not known`, 'red')];
  }

  const runtime = ctx.runtimeMap[server.id];

  // Port Knocking support
  if (isZero && server.firewall.knockPorts && server.firewall.knockPorts.length > 0) {
    const seq = server.firewall.knockPorts;
    const nextKnocked = [...runtime.knockedPorts, port].slice(-seq.length);
    const matches =
      nextKnocked.length === seq.length && nextKnocked.every((p, idx) => p === seq[idx]);

    ctx.updateRuntime(server.id, (prev) => ({
      ...prev,
      knockedPorts: nextKnocked,
      unlockedByKnock: prev.unlockedByKnock || matches,
    }));

    const lines = [txt(`Connection check to ${server.ip} ${port} port [tcp/*] sent.`)];
    if (matches) {
      lines.push(
        txt(`[Port Knocking] シーケンス (${seq.join(' -> ')}) が完了！保護ポートが開放されました。`, 'bright-green')
      );
    }
    return lines;
  }

  const svc = server.services.find((s) => s.port === port);
  const isOpen = svc && (svc.knockSequence ? runtime.unlockedByKnock : svc.state === 'open');
  if (!isOpen || !svc) {
    return [txt(`nc: connect to ${server.ip} port ${port} (tcp) failed: Connection refused`, 'red')];
  }

  return [
    txt(`Connection to ${server.ip} ${port} port [tcp/${svc.name}] succeeded!`, 'bright-green'),
    txt(svc.banner || `${svc.version} Ready`),
  ];
}

export function runMysql(args: string[], ctx: ToolContext): TerminalLine[] {
  let host = '';
  let user = 'root';
  let pass = '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' && args[i + 1]) host = args[++i];
    else if (a === '-u' && args[i + 1]) user = args[++i];
    else if (a.startsWith('-p')) pass = a.length > 2 ? a.slice(2) : args[++i] || '';
  }

  if (!host) return [txt('使用法: mysql -h <host> -u <user> -p<password>', 'red')];

  const server = findServerByTarget(host, ctx.servers, ctx.shell.hostId);
  const dbSvc = server?.services.find((s) => s.type === 'mysql' && s.state === 'open');
  if (!server || !dbSvc) {
    return [txt(`ERROR 2003 (HY000): Can't connect to MySQL server on '${host}:3306'`, 'red')];
  }

  if (dbSvc.dbUser !== user || (dbSvc.dbPassword && dbSvc.dbPassword !== pass)) {
    return [txt(`ERROR 1045 (28000): Access denied for user '${user}'@'${ctx.shell.ip}'`, 'red')];
  }

  const lines: TerminalLine[] = [
    txt(`Welcome to the MySQL monitor. Server version: ${dbSvc.version}`, 'bright-green'),
    txt(`Database tables dumped for learning lab:`, 'cyan'),
  ];

  for (const tbl of dbSvc.dbTables || []) {
    lines.push(txt(`\nmysql> SELECT * FROM ${tbl.name};`, 'white', true));
    lines.push(txt(`| ${tbl.columns.join(' | ')} |`, 'cyan'));
    for (const row of tbl.rows) {
      lines.push(txt(`| ${tbl.columns.map((c) => row[c] || '').join(' | ')} |`));
    }
  }
  return lines;
}

export function runRedisCli(args: string[], ctx: ToolContext): TerminalLine[] {
  let host = '';
  const cmdParts: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-h' && args[i + 1]) host = args[++i];
    else cmdParts.push(args[i]);
  }
  if (!host) return [txt('使用法: redis-cli -h <host> [KEYS * | GET <key>]', 'red')];

  const server = findServerByTarget(host, ctx.servers, ctx.shell.hostId);
  const rSvc = server?.services.find((s) => s.type === 'redis' && s.state === 'open');
  if (!server || !rSvc) {
    return [txt(`Could not connect to Redis at ${host}:6379: Connection refused`, 'red')];
  }

  const keys = rSvc.redisKeys || {};
  const cmd = cmdParts.join(' ').trim().toUpperCase();

  if (!cmd || cmd === 'KEYS *') {
    const keyList = Object.keys(keys);
    const lines = [txt(`Connected to ${server.ip}:6379 (${rSvc.version})`, 'bright-green')];
    keyList.forEach((k, idx) => lines.push(txt(`${idx + 1}) "${k}"`, 'cyan')));
    return lines;
  }

  if (cmd.startsWith('GET ')) {
    const reqKey = cmdParts.slice(1).join(' ');
    if (reqKey in keys) {
      const lines = [txt(`"${keys[reqKey]}"`, 'bright-green')];
      if (keys[reqKey].includes('PRIVATE KEY')) {
        ctx.saveLocalFile({
          path: `${ctx.shell.cwd === '/' ? '' : ctx.shell.cwd}/id_rsa`,
          content: keys[reqKey] + '\n',
          owner: ctx.shell.user,
          group: ctx.shell.user,
          permissions: '-rw-------',
        });
        lines.push(txt(`[+] 秘密鍵を ${ctx.shell.cwd}/id_rsa に保存しました。`, 'cyan'));
      }
      return lines;
    }
    return [txt(`(nil)`, 'yellow')];
  }

  return [txt(`+OK (${rSvc.version})`)];
}

export function runHydra(args: string[], ctx: ToolContext): TerminalLine[] {
  let user = '';
  let targetArg = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-l' && args[i + 1]) user = args[++i];
    else if (args[i] === '-P' && args[i + 1]) i++;
    else if (!args[i].startsWith('-')) targetArg = args[i];
  }

  if (!user || !targetArg) {
    return [txt('使用法: hydra -l <user> -P /usr/share/wordlists/rockyou.txt ssh://<target_ip>', 'red')];
  }

  const cleanHost = targetArg.replace(/^ssh:\/\//, '');
  const server = findServerByTarget(cleanHost, ctx.servers, ctx.shell.hostId);
  const sshSvc = server?.services.find((s) => s.type === 'ssh' && s.state === 'open');
  if (!server || !sshSvc) {
    return [txt(`[ERROR] target ${cleanHost} SSH service unreachable.`, 'red')];
  }

  if (server.firewall.idsEnabled && server.firewall.blockAggressiveScans) {
    return [
      txt(`Hydra v9.5 starting at ${new Date().toISOString().slice(11, 19)}`),
      txt(`[ERROR] Target IDS detected dictionary test and reset connection.`, 'red'),
    ];
  }

  const u = server.users.find((x) => x.username === user);
  const found = u?.password && ROCKYOU_WORDLIST.includes(u.password) ? u.password : null;

  const lines = [
    txt(`Hydra v9.5 (educational password audit simulation)`),
    txt(`[DATA] attacking ssh://${server.ip}:22/ (${ROCKYOU_WORDLIST.length} candidates)`),
  ];

  if (found) {
    lines.push(
      mkLine([
        { text: `[22][ssh] host: ${server.ip}   `, color: 'white' },
        { text: `login: ${user}   password: ${found}`, color: 'bright-green', bold: true },
      ])
    );
    lines.push(txt(`1 of 1 target successfully completed, 1 valid password found`));
  } else {
    lines.push(txt(`0 valid passwords found in wordlist.`, 'yellow'));
  }
  return lines;
}

export function runJohn(args: string[], ctx: ToolContext): TerminalLine[] {
  const targetArg = args.find((a) => !a.startsWith('-'));
  if (!targetArg) {
    return [txt('使用法: john <ハッシュ文字列 または ファイルパス>', 'red')];
  }

  let content = targetArg;
  const baseFiles =
    ctx.shell.hostId === 'local'
      ? LOCAL_INITIAL_FILES
      : ctx.servers.find((s) => s.id === ctx.shell.hostId)?.files || [];
  const files = getEffectiveFiles(baseFiles, ctx.runtimeMap[ctx.shell.hostId]);
  const home = ctx.shell.uid === 0 ? '/root' : `/home/${ctx.shell.user}`;
  const path = normalizePath(ctx.shell.cwd, targetArg, home);
  const file = files.find((f) => f.path === path);
  if (file) content = file.content;

  const lines: TerminalLine[] = [txt(`Using default input encoding: UTF-8`)];
  let cracked = 0;

  for (const [hash, plain] of Object.entries(HASH_CRACK_DICT)) {
    if (content.includes(hash)) {
      cracked++;
      lines.push(txt(`${plain.padEnd(18, ' ')} (${hash.slice(0, 20)}...)`, 'bright-green', true));
    }
  }

  if (cracked === 0) {
    lines.push(txt(`0 password hashes cracked, no matches in local dictionary.`, 'yellow'));
  } else {
    lines.push(txt(`${cracked} password hash(es) cracked!`, 'cyan'));
  }
  return lines;
}

export function runSearchsploit(args: string[]): TerminalLine[] {
  const query = args.join(' ').toLowerCase();
  if (!query) {
    return [txt('使用法: searchsploit <サービス名やバージョン> (例: searchsploit vsftpd 2.3.4)', 'red')];
  }

  const hits = EXPLOIT_DB.filter(
    (e) =>
      e.match.toLowerCase().includes(query) ||
      e.title.toLowerCase().includes(query) ||
      e.cve.toLowerCase().includes(query) ||
      query.split(/\s+/).every((tok) => `${e.title} ${e.match}`.toLowerCase().includes(tok))
  );

  if (hits.length === 0) {
    return [txt(`Exploits: No Results for '${args.join(' ')}'`, 'yellow')];
  }

  const lines: TerminalLine[] = [
    txt(`---------------------------------------------------------------------`),
    txt(` CVE / ID        | Title`),
    txt(`---------------------------------------------------------------------`),
  ];
  for (const h of hits) {
    lines.push(txt(` ${h.cve.padEnd(15)} | ${h.title}`, 'bright-green'));
    lines.push(txt(`   Usage: ${h.usage}`, 'cyan'));
  }
  return lines;
}

export function runExploitModule(args: string[], ctx: ToolContext): TerminalLine[] {
  const mod = args[0]?.toUpperCase();
  const targetIp = args[1];
  if (!mod) {
    return [
      txt('使用法: exploit <CVE-ID | cmdinj | cron> [target_ip] [port]', 'red'),
      txt('  利用可能モジュール: CVE-2011-2523, CVE-2021-41773, CVE-2020-1472, CVE-2021-44228, CVE-2021-3156, cmdinj, cron', 'dim'),
    ];
  }

  // Local privilege escalation modules inside remote server
  if (mod === 'CVE-2021-3156' || mod === 'CRON') {
    if (ctx.shell.hostId === 'local') {
      return [txt('このモジュールはターゲットサーバーのシェル内で実行してください。', 'yellow')];
    }
    const srv = ctx.servers.find((s) => s.id === ctx.shell.hostId);
    if (!srv) return [txt('Target context missing.', 'red')];

    if (mod === 'CVE-2021-3156' && srv.privescVectors.sudoCve20213156) {
      ctx.pushShell({ ...ctx.shell, user: 'root', uid: 0, cwd: '/root' });
      return [
        txt(`[*] Running sudoedit heap verification (CVE-2021-3156)...`, 'cyan'),
        txt(`[+] Privilege escalated to uid=0(root)!`, 'bright-green', true),
      ];
    }
    if (mod === 'CRON' && srv.privescVectors.cronWritable?.length) {
      ctx.pushShell({ ...ctx.shell, user: 'root', uid: 0, cwd: '/root' });
      return [
        txt(`[*] Updating writable cron script ${srv.privescVectors.cronWritable[0].targetScript}...`, 'cyan'),
        txt(`[+] Cron job executed as root! Privilege escalated to uid=0(root).`, 'bright-green', true),
      ];
    }
    return [txt(`[-] Target ${srv.hostname} is not vulnerable to ${mod}.`, 'red')];
  }

  if (!targetIp) {
    return [txt(`使用法: exploit ${mod} <ターゲットIP>`, 'red')];
  }
  const server = findServerByTarget(targetIp, ctx.servers, ctx.shell.hostId);
  if (!server) {
    return [txt(`[-] Unreachable target: ${targetIp}`, 'red')];
  }

  const runtime = ctx.runtimeMap[server.id];
  const openShell = (srv: ServerConfig, user: string) => {
    const uObj = srv.users.find((u) => u.username === user) || {
      username: user,
      uid: user === 'root' ? 0 : 1000,
      home: user === 'root' ? '/root' : `/home/${user}`,
      shell: '/bin/bash',
    };
    ctx.pushShell({
      hostId: srv.id,
      hostname: srv.hostname,
      ip: srv.ip,
      user: uObj.username,
      uid: uObj.uid,
      cwd: uObj.home,
      env: { USER: uObj.username, HOME: uObj.home, SHELL: uObj.shell, TERM: 'xterm-256color' },
    });
  };

  if (mod === 'CVE-2011-2523') {
    const ftp = server.services.find((s) => s.vulnerabilities.includes('vsftpd_234_backdoor'));
    if (!ftp) return [txt('[-] vsftpd 2.3.4 backdoor not detected.', 'red')];
    const shellUser = ftp.shellUser || 'worker';
    openShell(server, shellUser);
    return [
      txt(`[*] Triggering vsftpd 2.3.4 smiley backdoor on ${server.ip}:21...`, 'cyan'),
      txt(`[+] Shell session opened on port 6200 as ${shellUser}!`, 'bright-green', true),
    ];
  }

  if (mod === 'CVE-2021-41773') {
    const web = server.services.find((s) => s.vulnerabilities.includes('http_path_traversal_2449'));
    if (!web) return [txt('[-] Apache 2.4.49 not detected.', 'red')];
    const files = getEffectiveFiles(server.files, runtime);
    const rsa = files.find((f) => f.path.endsWith('id_rsa'));
    if (rsa) {
      ctx.saveLocalFile({
        path: `${ctx.shell.cwd === '/' ? '' : ctx.shell.cwd}/id_rsa`,
        content: rsa.content,
        owner: ctx.shell.user,
        group: ctx.shell.user,
        permissions: '-rw-------',
      });
      return [
        txt(`[*] Sending traversal check to ${server.ip}:${web.port}...`, 'cyan'),
        txt(`[+] Read ${rsa.path} and saved locally to ${ctx.shell.cwd}/id_rsa!`, 'bright-green'),
        txt(rsa.content.trim(), 'dim'),
      ];
    }
    return [txt('[+] Path traversal confirmed (read /etc/passwd).', 'green')];
  }

  if (mod === 'CVE-2021-44228') {
    const svc = server.services.find((s) => s.vulnerabilities.includes('http_log4j_rce'));
    if (!svc) return [txt('[-] Vulnerable Log4j endpoint not found.', 'red')];
    if (svc.knockSequence && !runtime.unlockedByKnock) {
      return [txt(`[-] Port ${svc.port} is filtered. Complete port knocking first.`, 'yellow')];
    }
    const u = svc.shellUser || 'appuser';
    openShell(server, u);
    return [
      txt(`[*] Sending JNDI header check to ${server.ip}:${svc.port}...`, 'cyan'),
      txt(`[+] Remote shell opened on ${server.hostname} as ${u}!`, 'bright-green', true),
    ];
  }

  if (mod === 'CMDINJ') {
    const svc = server.services.find((s) => s.vulnerabilities.includes('http_cmd_inj'));
    if (!svc) return [txt('[-] No command injection vulnerability detected.', 'red')];
    const u = svc.shellUser || 'www-data';
    openShell(server, u);
    return [
      txt(`[*] Opening reverse shell handler on 4444 & triggering /diag...`, 'cyan'),
      txt(`[+] Session opened as ${u}@${server.hostname}!`, 'bright-green', true),
    ];
  }

  return [txt(`[-] Module '${mod}' did not match target ${server.ip}.`, 'yellow')];
}
