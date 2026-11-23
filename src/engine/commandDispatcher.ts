import { LOCAL_INITIAL_FILES } from '../data/localFs';
import { ServerConfig, ServerRuntimeState, ShellContext, TerminalLine } from '../types/game';
import {
  mkLine,
  runArpScan,
  runCurl,
  runDig,
  runGobuster,
  runJwtTool,
  runNmap,
  runPing,
  tokenizeArgs,
  ToolContext,
  txt,
} from './networkTools';
import {
  runExploitModule,
  runFtp,
  runHydra,
  runJohn,
  runMysql,
  runNc,
  runRedisCli,
  runSearchsploit,
  runSsh,
} from './remoteClients';
import { runSystemCommand } from './systemCommands';
import { canReadFile, getEffectiveFiles, listDirectoryEntries, normalizePath } from './virtualFs';
import { runWebSecTool } from './webSecTools';

export interface DispatchActions {
  shellStack: ShellContext[];
  servers: ServerConfig[];
  runtimeMap: Record<string, ServerRuntimeState>;
  updateRuntime: (serverId: string, updater: (prev: ServerRuntimeState) => ServerRuntimeState) => void;
  setShellStack: React.Dispatch<React.SetStateAction<ShellContext[]>>;
  clearTerminal: () => void;
  terminalSize: { rows: number; cols: number };
}

function getHelpLines(): TerminalLine[] {
  return [
    txt('=== NetStrike Lab 利用可能コマンド一覧 ===', 'cyan', true),
    txt('[ネットワーク・偵察・スキャン]', 'bright-green'),
    txt('  nmap / ping / traceroute / dig / arp-scan / ip / ss / netstat'),
    txt('[Web診断・ファジング・プロキシ]', 'bright-green'),
    txt('  curl / gobuster / dirb / dirbuster / ffuf / wfuzz / nikto / nuclei'),
    txt('  whatweb / wappalyzer / sqlmap / commix / wpscan / joomscan / wapiti'),
    txt('  skipfish / xsser / weevely / burpsuite / owasp-zap / caido / jwt-tool'),
    txt('[接続・監査・エクスプロイト]', 'bright-green'),
    txt('  ftp / ssh / nc / mysql / redis-cli / hydra / john / searchsploit / exploit'),
    txt('[Linux・Ubuntuシステム管理]', 'bright-green'),
    txt('  systemctl / journalctl / hostnamectl / localectl / loginctl / timedatectl'),
    txt('  networkctl / nmcli / resolvectl / resolvconf / netplan / ufw / chronyc'),
    txt('  apt / snap / pro / ubuntu-drivers / do-release-upgrade / stty / uname'),
    txt('  ls / ll / cd / pwd / cat / grep / find / getcap / sudo / su / id / whoami'),
  ];
}

function getSttyLines(rows: number, cols: number): TerminalLine[] {
  return [
    txt(`speed 38400 baud; rows ${rows}; columns ${cols}; line = 0;`),
    txt(`intr = ^C; quit = ^\\; erase = ^?; kill = ^U; eof = ^D; eol = <undef>; eol2 = <undef>;`),
    mkLine([
      { text: 'swtch = <undef>; ' },
      { text: 'start = ^Q; stop = ^S;', color: 'inverse' },
      { text: ' susp = ^Z; rprnt = ^R; werase = ^W; lnext = ^V;' },
    ]),
    txt(`discard = ^O; min = 1; time = 0;`),
    txt(`-parenb -parodd -cmspar cs8 -hupcl -cstopb cread -clocal -crtscts`),
    txt(`-ignbrk -brkint -ignpar -parmrk -inpck -istrip -inlcr -igncr icrnl ixon -ixoff -iuclc`),
    txt(`-ixany -imaxbel -iutf8`),
    txt(`opost -olcuc -ocrnl onlcr -onocr -onlret -ofill -ofdel nl0 cr0 tab0 bs0 vt0 ff0`),
    txt(`isig icanon iexten echo echoe echok -echonl -noflsh -xcase -tostop -echoprt echoctl echoke`),
    txt(`-flusho -extproc`),
  ];
}

export function executeTerminalCommand(rawInput: string, actions: DispatchActions): TerminalLine[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // Handle simple output redirection '>'
  let redirectPath: string | null = null;
  let commandPart = trimmed;
  const redirMatch = trimmed.match(/^(.*?)\s*>\s*([^\s|]+)$/);
  if (redirMatch && !trimmed.includes('2>/dev/null')) {
    commandPart = redirMatch[1].trim();
    redirectPath = redirMatch[2].trim();
  }

  // Handle pipeline '|'
  const pipeSegments = commandPart.split('|').map((s) => s.trim());
  const currentShell = actions.shellStack[actions.shellStack.length - 1];
  const homeDir = currentShell.uid === 0 ? '/root' : `/home/${currentShell.user}`;

  const getFiles = () => {
    const base =
      currentShell.hostId === 'local'
        ? LOCAL_INITIAL_FILES
        : actions.servers.find((s) => s.id === currentShell.hostId)?.files || [];
    return getEffectiveFiles(base, actions.runtimeMap[currentShell.hostId]);
  };

  const saveFileToCurrentHost = (file: {
    path: string;
    content: string;
    owner: string;
    group: string;
    permissions: string;
  }) => {
    actions.updateRuntime(currentShell.hostId, (prev) => ({
      ...prev,
      dynamicFiles: { ...prev.dynamicFiles, [file.path]: file },
    }));
  };

  const toolCtx: ToolContext = {
    shell: currentShell,
    servers: actions.servers,
    runtimeMap: actions.runtimeMap,
    updateRuntime: actions.updateRuntime,
    pushShell: (next) => actions.setShellStack((prev) => [...prev, next]),
    saveLocalFile: saveFileToCurrentHost,
  };

  const runSingle = (segment: string, stdinLines?: TerminalLine[]): TerminalLine[] => {
    const cleanSeg = segment.replace(/2>\/dev\/null/g, '').trim();
    const tokens = tokenizeArgs(cleanSeg);
    if (tokens.length === 0) return [];
    let cmd = tokens[0];
    let args = tokens.slice(1);

    // Handle multi-word tool names like "Burp Suite" or "OWASP ZAP"
    if (cmd.toLowerCase() === 'burp' && args[0]?.toLowerCase() === 'suite') {
      cmd = 'burpsuite';
      args = args.slice(1);
    } else if (cmd.toLowerCase() === 'owasp' && args[0]?.toLowerCase() === 'zap') {
      cmd = 'owasp-zap';
      args = args.slice(1);
    }

    const cmdLower = cmd.toLowerCase();

    // Alias expansion
    if (cmd === 'll') return runSingle(`ls -la ${args.join(' ')}`, stdinLines);
    if (cmd === 'la') return runSingle(`ls -A ${args.join(' ')}`, stdinLines);

    switch (cmdLower) {
      case 'clear':
        actions.clearTerminal();
        return [];

      case 'help':
        return getHelpLines();

      case 'man': {
        const topic = args[0];
        if (!topic) return [txt('What manual page do you want? (例: man nmap, man curl)')];
        if (topic === 'nmap') return runNmap(['--help'], toolCtx);
        if (topic === 'stty') return [txt('STTY(1) - change and print terminal line settings. Try: stty -a')];
        return [txt(`Manual entry for ${topic}: 'help' で概要と使用例を確認できます。`)];
      }

      case 'stty':
        if (args.includes('-a')) {
          return getSttyLines(actions.terminalSize.rows, actions.terminalSize.cols);
        }
        return [txt('speed 38400 baud; line = 0;')];

      case 'pwd':
        return [txt(currentShell.cwd)];

      case 'whoami':
        return [txt(currentShell.user)];

      case 'id':
        return [
          txt(
            `uid=${currentShell.uid}(${currentShell.user}) gid=${currentShell.uid}(${currentShell.user}) groups=${currentShell.uid}(${currentShell.user})`
          ),
        ];

      case 'uname': {
        const srv = actions.servers.find((s) => s.id === currentShell.hostId);
        const info = srv
          ? `${srv.kernel} (${srv.os})`
          : 'Linux user-PC 5.15.133.1-microsoft-standard-WSL2 #1 SMP x86_64 GNU/Linux';
        return [txt(args.includes('-a') ? info : 'Linux')];
      }

      case 'env':
        return Object.entries(currentShell.env).map(([k, v]) => txt(`${k}=${v}`));

      case 'echo': {
        const out = args.join(' ');
        return [txt(out)];
      }

      case 'base64': {
        const isDecode = args.includes('-d') || args.includes('--decode');
        const inputText = stdinLines
          ? stdinLines.map((l) => l.segments.map((s) => s.text).join('')).join('\n').trim()
          : args.find((a) => !a.startsWith('-')) || '';
        if (!inputText) return [txt('使用法: echo "..." | base64 -d', 'red')];
        try {
          return [txt(isDecode ? atob(inputText) : btoa(inputText), 'bright-green')];
        } catch {
          return [txt('base64: invalid input', 'red')];
        }
      }

      case 'cd': {
        const target = args[0] || homeDir;
        const resolved = normalizePath(currentShell.cwd, target, homeDir);
        const files = getFiles();
        const { exists } = listDirectoryEntries(resolved, files);
        if (!exists && resolved !== '/') {
          return [txt(`bash: cd: ${target}: No such file or directory`, 'red')];
        }
        actions.setShellStack((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], cwd: resolved };
          return copy;
        });
        return [];
      }

      case 'ls': {
        const showAll = args.some((a) => a.startsWith('-') && (a.includes('a') || a.includes('A')));
        const longFmt = args.some((a) => a.startsWith('-') && a.includes('l'));
        const pathArg = args.find((a) => !a.startsWith('-')) || currentShell.cwd;
        const resolved = normalizePath(currentShell.cwd, pathArg, homeDir);
        const files = getFiles();
        const { entries, exists } = listDirectoryEntries(resolved, files);

        if (!exists) {
          return [txt(`ls: cannot access '${pathArg}': No such file or directory`, 'red')];
        }

        const filtered = entries.filter((e) => {
          const name = e.path.split('/').pop() || '';
          if (!showAll && name.startsWith('.')) return false;
          return true;
        });

        if (longFmt) {
          return filtered.map((f) => {
            const name = f.path.split('/').pop() || '';
            return mkLine([
              { text: `${f.permissions} 1 ${f.owner.padEnd(8)} ${f.group.padEnd(8)} ${String(f.content.length).padStart(5)} ` },
              { text: name, color: f.isDirectory ? 'bright-blue' : f.permissions.includes('x') ? 'bright-green' : 'default' },
            ]);
          });
        }

        if (filtered.length === 0) return [];
        const segs = filtered.flatMap((f, idx) => {
          const name = f.path.split('/').pop() || '';
          const color: 'bright-blue' | 'bright-green' | 'default' = f.isDirectory
            ? 'bright-blue'
            : f.permissions.includes('x')
            ? 'bright-green'
            : 'default';
          return idx === 0 ? [{ text: name, color }] : [{ text: '  ' }, { text: name, color }];
        });
        return [mkLine(segs)];
      }

      case 'cat':
      case 'head':
      case 'tail': {
        if (stdinLines && args.length === 0) {
          return cmd === 'head' ? stdinLines.slice(0, 10) : cmd === 'tail' ? stdinLines.slice(-10) : stdinLines;
        }
        const target = args.find((a) => !a.startsWith('-'));
        if (!target) return [txt(`${cmd}: ファイル名を指定してください`, 'red')];
        const resolved = normalizePath(currentShell.cwd, target, homeDir);
        const files = getFiles();
        const file = files.find((f) => f.path === resolved);
        if (!file) return [txt(`${cmd}: ${target}: No such file or directory`, 'red')];
        if (file.isDirectory) return [txt(`${cmd}: ${target}: Is a directory`, 'red')];
        if (!canReadFile(file, currentShell.user, currentShell.uid)) {
          return [txt(`${cmd}: ${target}: Permission denied`, 'red')];
        }
        const lines = file.content.split('\n').filter((l, i, arr) => i < arr.length - 1 || l !== '');
        const sliced = cmd === 'head' ? lines.slice(0, 10) : cmd === 'tail' ? lines.slice(-10) : lines;
        return sliced.map((l) => txt(l));
      }

      case 'grep': {
        const insensitive = args.includes('-i');
        const nonFlags = args.filter((a) => !a.startsWith('-'));
        const pattern = nonFlags[0];
        if (!pattern) return [txt('使用法: grep [-i] <パターン> [ファイル]', 'red')];

        const sourceLines = stdinLines
          ? stdinLines.map((l) => l.segments.map((s) => s.text).join(''))
          : (() => {
              const fileArg = nonFlags[1];
              if (!fileArg) return [];
              const resolved = normalizePath(currentShell.cwd, fileArg, homeDir);
              const file = getFiles().find((f) => f.path === resolved);
              return file && canReadFile(file, currentShell.user, currentShell.uid)
                ? file.content.split('\n')
                : [];
            })();

        const matched = sourceLines.filter((line) =>
          insensitive ? line.toLowerCase().includes(pattern.toLowerCase()) : line.includes(pattern)
        );
        return matched.map((l) => txt(l, 'bright-green'));
      }

      case 'find': {
        const files = getFiles();
        if (args.includes('-4000') || args.includes('4000')) {
          return files
            .filter((f) => f.permissions.includes('s'))
            .map((f) => txt(f.path, 'bright-green'));
        }
        const nameIdx = args.indexOf('-name');
        const pat = nameIdx >= 0 ? args[nameIdx + 1]?.replace(/\*/g, '') : '';
        return files
          .filter((f) => !pat || f.path.includes(pat))
          .map((f) => txt(f.path));
      }

      case 'getcap': {
        const srv = actions.servers.find((s) => s.id === currentShell.hostId);
        const caps = srv?.privescVectors.capabilities || [];
        return caps.map((c) => txt(`${c.binary} = ${c.cap}`, 'bright-green'));
      }

      case 'ip':
      case 'ifconfig': {
        const srv = actions.servers.find((s) => s.id === currentShell.hostId);
        const lines = [txt(`1: lo: <LOOPBACK,UP> inet 127.0.0.1/8`), txt(`2: eth0: <BROADCAST,UP> inet ${currentShell.ip}/24`)];
        if (srv?.internalNetwork) {
          lines.push(txt(`3: eth1: <BROADCAST,UP> inet ${srv.internalNetwork.gateway}/24 (Internal Subnet ${srv.internalNetwork.subnet})`, 'bright-green'));
        }
        return lines;
      }

      case 'ps':
        return [
          txt('PID   USER     COMMAND'),
          txt('  1   root     /sbin/init'),
          txt(` 42   ${currentShell.user.padEnd(8)} -bash`),
        ];

      case 'sudo': {
        const srv = actions.servers.find((s) => s.id === currentShell.hostId);
        const userObj = srv?.users.find((u) => u.username === currentShell.user);
        if (args[0] === '-l') {
          if (!userObj?.sudoRules?.length) {
            return [txt(`User ${currentShell.user} may not run sudo on ${currentShell.hostname}.`)];
          }
          return [
            txt(`User ${currentShell.user} may run the following commands on ${currentShell.hostname}:`, 'cyan'),
            ...userObj.sudoRules.map((r) => txt(`    ${r}`, 'bright-green')),
          ];
        }
        if (args[0] === '--version') {
          const ver = srv?.privescVectors.sudoCve20213156 ? 'Sudo version 1.8.31' : 'Sudo version 1.9.13p3';
          return [txt(ver)];
        }
        const targetBin = args[0];
        const matchAbuse = srv?.privescVectors.sudoAbuse?.find(
          (a) => a.binary.endsWith('/' + targetBin) || a.binary === targetBin
        );
        if (matchAbuse || currentShell.uid === 0) {
          actions.setShellStack((prev) => [
            ...prev,
            { ...currentShell, user: 'root', uid: 0, cwd: '/root' },
          ]);
          return [txt(`[+] Elevated shell to uid=0(root) via sudo ${targetBin}!`, 'bright-green', true)];
        }
        return [txt(`sudo: ${currentShell.user} is not allowed to run '${args.join(' ')}'`, 'red')];
      }

      case 'su': {
        const targetUser = args[0] === '-' ? args[1] || 'root' : args[0] || 'root';
        const passArg = args.includes('-P') ? args[args.indexOf('-P') + 1] : args[1];
        const srv = actions.servers.find((s) => s.id === currentShell.hostId);
        const u = srv?.users.find((x) => x.username === targetUser);
        if (!u) return [txt(`su: user ${targetUser} does not exist`, 'red')];
        if (currentShell.uid !== 0 && (!passArg || passArg !== u.password)) {
          return [txt(`su: Authentication failure`, 'yellow')];
        }
        actions.setShellStack((prev) => [
          ...prev,
          { ...currentShell, user: u.username, uid: u.uid, cwd: u.home },
        ]);
        return [txt(`Switched user to ${u.username} (uid=${u.uid}).`, 'bright-green')];
      }

      case 'python3':
      case 'python3.11': {
        const code = args.join(' ');
        const srv = actions.servers.find((s) => s.id === currentShell.hostId);
        const hasSuid = srv?.privescVectors.suidBinaries?.some((b) => b.path.includes(cmd));
        const hasCap = srv?.privescVectors.capabilities?.some((c) => c.binary.includes(cmd));
        if (code.includes('setuid(0)') && (hasSuid || hasCap)) {
          actions.setShellStack((prev) => [
            ...prev,
            { ...currentShell, user: 'root', uid: 0, cwd: '/root' },
          ]);
          return [txt(`[+] setuid(0) succeeded! Root shell active.`, 'bright-green', true)];
        }
        return [txt(`Python 3 interactive snippet executed.`)];
      }

      case 'exit':
      case 'logout':
        if (actions.shellStack.length <= 1) {
          return [txt('ローカル端末セッション (user01@user-PC) の最上位シェルです。', 'dim')];
        }
        actions.setShellStack((prev) => prev.slice(0, -1));
        return [txt(`logout — セッションを終了し、前のシェルに戻りました。`, 'cyan')];

      case 'nmap':
        return runNmap(args, toolCtx);
      case 'ping':
        return runPing(args, toolCtx);
      case 'traceroute':
        return [
          txt(`traceroute to ${args[0] || 'target'} (30 hops max)`),
          txt(` 1  10.10.0.1 (gateway)  0.412 ms`),
          txt(` 2  ${args[0] || 'target'}  0.941 ms`, 'green'),
        ];
      case 'dig':
        return runDig(args, toolCtx);
      case 'curl':
        return runCurl(args, toolCtx);
      case 'gobuster':
      case 'dirb':
        return runGobuster(args, toolCtx);
      case 'arp-scan':
        return runArpScan(args, toolCtx);
      case 'jwt-tool':
        return runJwtTool(args);
      case 'ftp':
        return runFtp(args, toolCtx);
      case 'ssh':
        return runSsh(args, toolCtx);
      case 'nc':
        return runNc(args, toolCtx);
      case 'mysql':
        return runMysql(args, toolCtx);
      case 'redis-cli':
        return runRedisCli(args, toolCtx);
      case 'hydra':
        return runHydra(args, toolCtx);
      case 'john':
        return runJohn(args, toolCtx);
      case 'searchsploit':
        return runSearchsploit(args);
      case 'exploit':
        return runExploitModule(args, toolCtx);

      default: {
        const sysResult = runSystemCommand(cmdLower, args, currentShell, actions.servers);
        if (sysResult) return sysResult;

        const webSecResult = runWebSecTool(cmdLower, args, toolCtx);
        if (webSecResult) return webSecResult;

        return [txt(`${cmd}: command not found ('help' で利用可能なツール一覧を表示)`, 'red')];
      }
    }
  };

  let outputLines: TerminalLine[] | undefined;
  for (const seg of pipeSegments) {
    outputLines = runSingle(seg, outputLines);
  }

  const finalLines = outputLines || [];

  // Handle redirection '> file'
  if (redirectPath && finalLines.length > 0) {
    const resolved = normalizePath(currentShell.cwd, redirectPath, homeDir);
    const content = finalLines.map((l) => l.segments.map((s) => s.text).join('')).join('\n') + '\n';
    saveFileToCurrentHost({
      path: resolved,
      content,
      owner: currentShell.user,
      group: currentShell.user,
      permissions: '-rw-------',
    });
    return [txt(`Saved output to ${resolved}`, 'cyan')];
  }

  return finalLines;
}
