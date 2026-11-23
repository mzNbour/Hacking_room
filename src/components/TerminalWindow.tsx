import React, { useEffect, useRef, useState } from 'react';
import { ShellContext, TerminalLine, TerminalSegment } from '../types/game';

interface TerminalWindowProps {
  lines: TerminalLine[];
  shell: ShellContext;
  commandHistory: string[];
  input: string;
  onInputChange: (next: string) => void;
  cursorPos: number;
  onCursorPosChange: (pos: number) => void;
  onExecute: (command: string) => void;
  onInterrupt: () => void;
  onClear: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  availableIps: string[];
}

const KNOWN_COMMANDS = [
  'nmap',
  'ping',
  'traceroute',
  'dig',
  'curl',
  'gobuster',
  'dirb',
  'dirbuster',
  'ffuf',
  'wfuzz',
  'nikto',
  'nuclei',
  'whatweb',
  'wappalyzer',
  'sqlmap',
  'wpscan',
  'joomscan',
  'wapiti',
  'skipfish',
  'commix',
  'xsser',
  'weevely',
  'burpsuite',
  'owasp-zap',
  'caido',
  'ftp',
  'ssh',
  'nc',
  'mysql',
  'redis-cli',
  'hydra',
  'john',
  'jwt-tool',
  'searchsploit',
  'exploit',
  'arp-scan',
  'ip',
  'ss',
  'resolvectl',
  'resolvconf',
  'systemctl',
  'journalctl',
  'apt',
  'timedatectl',
  'chronyc',
  'snap',
  'netplan',
  'ufw',
  'do-release-upgrade',
  'ubuntu-drivers',
  'pro',
  'hostnamectl',
  'localectl',
  'loginctl',
  'networkctl',
  'nmcli',
  'stty',
  'uname',
  'whoami',
  'id',
  'pwd',
  'ls',
  'll',
  'cd',
  'cat',
  'grep',
  'find',
  'getcap',
  'sudo',
  'su',
  'base64',
  'python3',
  'clear',
  'help',
  'man',
  'exit',
];

function segmentClass(color?: TerminalSegment['color'], bold?: boolean): string {
  const weight = bold ? 'font-bold ' : '';
  switch (color) {
    case 'green':
      return weight + 'text-[#3ab54a]';
    case 'bright-green':
      return weight + 'text-[#4ee44e]';
    case 'blue':
      return weight + 'text-[#4e7bff]';
    case 'bright-blue':
      return weight + 'text-[#5c94ff]';
    case 'cyan':
      return weight + 'text-[#39c5bb]';
    case 'yellow':
      return weight + 'text-[#e5c07b]';
    case 'red':
      return weight + 'text-[#f14c4c]';
    case 'magenta':
      return weight + 'text-[#c678dd]';
    case 'dim':
      return weight + 'text-[#7a7a7a]';
    case 'white':
      return weight + 'text-[#ffffff]';
    case 'inverse':
      return weight + 'bg-[#d4d4d4] text-[#000000] px-0.5';
    default:
      return weight + 'text-[#d4d4d4]';
  }
}

export function formatPromptPath(cwd: string, user: string, uid: number): string {
  const home = uid === 0 ? '/root' : `/home/${user}`;
  if (cwd === home) return '~';
  if (cwd.startsWith(home + '/')) return '~' + cwd.slice(home.length);
  return cwd;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  lines,
  shell,
  commandHistory,
  input,
  onInputChange,
  cursorPos,
  onCursorPosChange,
  onExecute,
  onInterrupt,
  onClear,
  isMaximized,
  onToggleMaximize,
  availableIps,
}) => {
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isFocused, setIsFocused] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const promptPath = formatPromptPath(shell.cwd, shell.user, shell.uid);
  const promptSymbol = shell.uid === 0 ? '#' : '$';
  const titleText = `${shell.user}@${shell.hostname}: ${promptPath}`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Keep native input selection synced with cursorPos
  useEffect(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      const clamped = Math.max(0, Math.min(cursorPos, input.length));
      if (el.selectionStart !== clamped || el.selectionEnd !== clamped) {
        el.setSelectionRange(clamped, clamped);
      }
    }
  }, [cursorPos, input.length]);

  const syncCursorFromInput = () => {
    const el = inputRef.current;
    if (el && el.selectionStart !== null) {
      onCursorPosChange(el.selectionStart);
    }
  };

  const handleContainerMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    onInputChange(val);
    onCursorPosChange(pos);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      onInterrupt();
      onInputChange('');
      onCursorPosChange(0);
      setHistoryIndex(-1);
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      onClear();
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      onCursorPosChange(0);
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      onCursorPosChange(input.length);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onCursorPosChange(Math.max(0, cursorPos - 1));
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onCursorPosChange(Math.min(input.length, cursorPos + 1));
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      onCursorPosChange(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      onCursorPosChange(input.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input;
      onInputChange('');
      onCursorPosChange(0);
      setHistoryIndex(-1);
      onExecute(cmd);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      const nextCmd = commandHistory[commandHistory.length - 1 - nextIdx] || '';
      onInputChange(nextCmd);
      onCursorPosChange(nextCmd.length);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        onInputChange('');
        onCursorPosChange(0);
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        const nextCmd = commandHistory[commandHistory.length - 1 - nextIdx] || '';
        onInputChange(nextCmd);
        onCursorPosChange(nextCmd.length);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.split(/\s+/);
      const last = parts[parts.length - 1] || '';
      if (parts.length <= 1) {
        const match = KNOWN_COMMANDS.find((c) => c.startsWith(last.toLowerCase()));
        if (match) {
          const completed = match + ' ';
          onInputChange(completed);
          onCursorPosChange(completed.length);
        }
      } else {
        const matchIp = availableIps.find((ip) => ip.startsWith(last));
        if (matchIp) {
          parts[parts.length - 1] = matchIp;
          const completed = parts.join(' ');
          onInputChange(completed);
          onCursorPosChange(completed.length);
        }
      }
    }
  };

  const clampedCursor = Math.max(0, Math.min(cursorPos, input.length));
  const beforeCursor = input.slice(0, clampedCursor);
  const atCursor = clampedCursor < input.length ? input[clampedCursor] : '';
  const afterCursor = clampedCursor < input.length ? input.slice(clampedCursor + 1) : '';

  return (
    <div
      className={`flex flex-col border border-[#4a4a4a] bg-[#000000] shadow-2xl overflow-hidden ${
        isMaximized ? 'fixed inset-3 z-50' : 'h-full min-h-[540px]'
      }`}
    >
      {/* Classic Windows 10 / WSL Title Bar matching user's reference screenshot */}
      <div className="flex items-center justify-between h-[30px] bg-[#3b3b3b] border-b border-[#252525] select-none shrink-0">
        <div className="flex items-center gap-2 pl-2.5 min-w-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
            <ellipse cx="12" cy="13.5" rx="6.5" ry="8" fill="#18181b" />
            <ellipse cx="12" cy="14.5" rx="4.2" ry="5.5" fill="#f4f4f5" />
            <circle cx="10.2" cy="8.5" r="1" fill="#ffffff" />
            <circle cx="13.8" cy="8.5" r="1" fill="#ffffff" />
            <circle cx="10.2" cy="8.5" r="0.45" fill="#000000" />
            <circle cx="13.8" cy="8.5" r="0.45" fill="#000000" />
            <polygon points="10.5,10.2 13.5,10.2 12,11.9" fill="#f59e0b" />
            <ellipse cx="9" cy="20.8" rx="2.3" ry="1.1" fill="#f59e0b" />
            <ellipse cx="15" cy="20.8" rx="2.3" ry="1.1" fill="#f59e0b" />
          </svg>
          <span className="text-[12px] text-[#e5e5e5] font-normal truncate tracking-tight">
            {titleText}
          </span>
        </div>

        <div className="flex items-center h-full shrink-0">
          <button
            type="button"
            onClick={onClear}
            title="画面をクリア (Ctrl+L)"
            className="w-11 h-full flex items-center justify-center text-[#cccccc] hover:bg-[#505050] transition-colors text-xs"
          >
            <span className="w-2.5 h-[1px] bg-current block" />
          </button>
          <button
            type="button"
            onClick={onToggleMaximize}
            title={isMaximized ? '元のサイズに戻す' : '最大化'}
            className="w-11 h-full flex items-center justify-center text-[#cccccc] hover:bg-[#505050] transition-colors"
          >
            <span className="w-2.5 h-2.5 border border-current block" />
          </button>
          <button
            type="button"
            onClick={onInterrupt}
            title="現在の入力を中断 (Ctrl+C)"
            className="w-11 h-full flex items-center justify-center text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Pure Black Terminal Canvas */}
      <div
        ref={scrollRef}
        onMouseUp={handleContainerMouseUp}
        className="flex-1 bg-[#000000] p-2.5 overflow-y-auto win-terminal-scroll terminal-selection cursor-text font-mono text-[13.5px] leading-[1.32]"
      >
        {lines.map((line) => (
          <div key={line.id} className="whitespace-pre-wrap break-all min-h-[18px]">
            {line.segments.map((seg, idx) => (
              <span key={idx} className={segmentClass(seg.color, seg.bold)}>
                {seg.text}
              </span>
            ))}
          </div>
        ))}

        {/* Active Prompt Line with true Left/Right movable cursor */}
        <div className="flex items-start whitespace-pre-wrap break-all min-h-[18px]">
          <span className="shrink-0 select-none">
            <span className={shell.uid === 0 ? 'text-[#f14c4c] font-bold' : 'text-[#4ee44e]'}>
              {shell.user}@{shell.hostname}
            </span>
            <span className="text-[#d4d4d4]">:</span>
            <span className="text-[#5c94ff]">{promptPath}</span>
            <span className="text-[#d4d4d4]">{promptSymbol} </span>
          </span>

          <div className="relative flex-1 min-w-[40px]">
            <span className="text-[#d4d4d4] whitespace-pre-wrap break-all">
              {beforeCursor}
              {atCursor ? (
                <span
                  className={
                    isFocused
                      ? 'bg-[#d4d4d4] text-[#000000]'
                      : 'border border-[#d4d4d4] text-[#d4d4d4]'
                  }
                >
                  {atCursor}
                </span>
              ) : (
                <span
                  className={`inline-block w-[8px] h-[15px] align-middle -mt-[2px] ${
                    isFocused ? 'bg-[#d4d4d4] animate-pulse' : 'border border-[#d4d4d4]'
                  }`}
                />
              )}
              {afterCursor}
            </span>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onKeyUp={syncCursorFromInput}
              onClick={syncCursorFromInput}
              onSelect={syncCursorFromInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-label="Terminal command input"
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
