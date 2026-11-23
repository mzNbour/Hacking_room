import { ServerConfig, ServerRuntimeState, VirtualFile } from '../types/game';

export function normalizePath(cwd: string, target: string, homeDir: string): string {
  if (!target || target === '~') return homeDir;
  let path = target;
  if (path.startsWith('~/')) {
    path = homeDir + path.slice(1);
  } else if (!path.startsWith('/')) {
    path = (cwd === '/' ? '' : cwd) + '/' + path;
  }
  const parts = path.split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

export function getEffectiveFiles(
  baseFiles: VirtualFile[],
  runtime?: ServerRuntimeState
): VirtualFile[] {
  const map = new Map<string, VirtualFile>();
  for (const f of baseFiles) {
    if (runtime?.deletedPaths.includes(f.path)) continue;
    map.set(f.path, f);
  }
  if (runtime?.dynamicFiles) {
    for (const [p, f] of Object.entries(runtime.dynamicFiles)) {
      if (!runtime.deletedPaths.includes(p)) {
        map.set(p, f);
      }
    }
  }
  return Array.from(map.values());
}

export function canReadFile(file: VirtualFile, user: string, uid: number): boolean {
  if (uid === 0 || user === 'root') return true;
  if (file.owner === user) return file.permissions[1] === 'r';
  if (file.group === user) return file.permissions[4] === 'r';
  return file.permissions[7] === 'r';
}

export function canWriteFile(file: VirtualFile, user: string, uid: number): boolean {
  if (uid === 0 || user === 'root') return true;
  if (file.owner === user) return file.permissions[2] === 'w';
  if (file.group === user) return file.permissions[5] === 'w';
  return file.permissions[8] === 'w';
}

export function listDirectoryEntries(
  dirPath: string,
  allFiles: VirtualFile[]
): { entries: VirtualFile[]; exists: boolean } {
  const normalized = dirPath === '/' ? '/' : dirPath.replace(/\/+$/, '');
  const prefix = normalized === '/' ? '/' : normalized + '/';

  const directChildren = new Map<string, VirtualFile>();
  let dirExists = normalized === '/' || allFiles.some((f) => f.path === normalized && f.isDirectory);

  for (const f of allFiles) {
    if (f.path === normalized) {
      if (f.isDirectory) dirExists = true;
      continue;
    }
    if (f.path.startsWith(prefix)) {
      dirExists = true;
      const rest = f.path.slice(prefix.length);
      if (!rest.includes('/')) {
        directChildren.set(rest, f);
      } else {
        const subName = rest.split('/')[0];
        const subPath = prefix + subName;
        if (!directChildren.has(subName)) {
          directChildren.set(subName, {
            path: subPath,
            content: '',
            owner: 'root',
            group: 'root',
            permissions: 'drwxr-xr-x',
            isDirectory: true,
          });
        }
      }
    }
  }

  return {
    exists: dirExists,
    entries: Array.from(directChildren.values()).sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export function findServerByTarget(
  target: string,
  servers: ServerConfig[],
  currentHostId: string
): ServerConfig | undefined {
  const clean = target.trim().toLowerCase();
  const matched = servers.find(
    (s) =>
      s.ip.toLowerCase() === clean ||
      s.hostname.toLowerCase() === clean ||
      `${s.hostname.toLowerCase()}.lab` === clean
  );
  if (!matched) return undefined;

  if (matched.requiresPivotFrom) {
    if (currentHostId !== matched.requiresPivotFrom) {
      return undefined;
    }
  }
  return matched;
}
