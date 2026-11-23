import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GuideView } from './components/GuideView';
import { HintsView } from './components/HintsView';
import { LevelsView } from './components/LevelsView';
import { MissionSidebar } from './components/MissionSidebar';
import { ServerBuilder } from './components/ServerBuilder';
import { formatPromptPath, TerminalWindow } from './components/TerminalWindow';
import { WebPageView } from './components/WebPageView';
import { CAMPAIGN_SERVERS } from './data/levels';
import { executeTerminalCommand } from './engine/commandDispatcher';
import { mkLine } from './engine/networkTools';
import {
  GameProgress,
  ServerConfig,
  ServerRuntimeState,
  ShellContext,
  TerminalLine,
} from './types/game';

type ActiveTab = 'terminal' | 'webpage' | 'levels' | 'hints' | 'guide' | 'builder';

const STORAGE_CUSTOM_SERVERS = 'netstrike_custom_servers_v1';
const STORAGE_PROGRESS = 'netstrike_progress_v1';

const LOCAL_INITIAL_SHELL: ShellContext = {
  hostId: 'local',
  hostname: 'user-PC',
  ip: '10.10.0.5',
  user: 'user01',
  uid: 1000,
  cwd: '/home/user01',
  env: {
    USER: 'user01',
    HOME: '/home/user01',
    SHELL: '/bin/bash',
    TERM: 'xterm-256color',
  },
};

function createInitialTerminalLines(): TerminalLine[] {
  return [];
}

function makeDefaultRuntime(): ServerRuntimeState {
  return {
    idsAlerts: 0,
    knockedPorts: [],
    unlockedByKnock: false,
    compromisedServices: [],
    dynamicFiles: {},
    deletedPaths: [],
    discoveredPorts: [],
    discoveredPaths: [],
    notes: [],
  };
}

const DEFAULT_RUNTIME: ServerRuntimeState = makeDefaultRuntime();

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('terminal');
  const [customServers, setCustomServers] = useState<ServerConfig[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_SERVERS);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [progress, setProgress] = useState<GameProgress>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PROGRESS);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        capturedFlags: parsed?.capturedFlags && typeof parsed.capturedFlags === 'object' ? parsed.capturedFlags : {},
        revealedHints: parsed?.revealedHints && typeof parsed.revealedHints === 'object' ? parsed.revealedHints : {},
      };
    } catch {
      return { capturedFlags: {}, revealedHints: {} };
    }
  });

  const allServers = useMemo(
    () => [...CAMPAIGN_SERVERS, ...customServers],
    [customServers]
  );

  const [selectedServerId, setSelectedServerId] = useState<string>(CAMPAIGN_SERVERS[0].id);
  const selectedServer = useMemo(
    () => allServers.find((s) => s.id === selectedServerId) || allServers[0],
    [allServers, selectedServerId]
  );

  const [runtimeMap, setRuntimeMap] = useState<Record<string, ServerRuntimeState>>(() => {
    const map: Record<string, ServerRuntimeState> = { local: makeDefaultRuntime() };
    for (const s of [...CAMPAIGN_SERVERS, ...customServers]) {
      map[s.id] = makeDefaultRuntime();
    }
    return map;
  });

  const [shellStack, setShellStack] = useState<ShellContext[]>([LOCAL_INITIAL_SHELL]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(createInitialTerminalLines);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalCursorPos, setTerminalCursorPos] = useState(0);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_SERVERS, JSON.stringify(customServers));
    } catch {
      // ignore storage quota errors
    }
  }, [customServers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(progress));
    } catch {
      // ignore storage quota errors
    }
  }, [progress]);

  const updateRuntime = useCallback(
    (serverId: string, updater: (prev: ServerRuntimeState) => ServerRuntimeState) => {
      setRuntimeMap((prev) => ({
        ...prev,
        [serverId]: updater(prev[serverId] || makeDefaultRuntime()),
      }));
    },
    []
  );

  const handleExecuteCommand = useCallback(
    (rawCommand: string) => {
      const currentShell = shellStack[shellStack.length - 1];
      const promptPath = formatPromptPath(currentShell.cwd, currentShell.user, currentShell.uid);
      const sym = currentShell.uid === 0 ? '#' : '$';

      const echoLine = mkLine([
        {
          text: `${currentShell.user}@${currentShell.hostname}`,
          color: currentShell.uid === 0 ? 'red' : 'bright-green',
          bold: currentShell.uid === 0,
        },
        { text: ':', color: 'default' },
        { text: promptPath, color: 'bright-blue' },
        { text: `${sym} ${rawCommand}`, color: 'default' },
      ]);

      const trimmed = rawCommand.trim();
      if (trimmed) {
        setCommandHistory((prev) => [...prev.slice(-99), trimmed]);
      }

      if (trimmed === 'clear') {
        setTerminalLines([]);
        return;
      }

      let cleared = false;
      const result = executeTerminalCommand(rawCommand, {
        shellStack,
        servers: allServers,
        runtimeMap,
        updateRuntime,
        setShellStack,
        clearTerminal: () => {
          cleared = true;
          setTerminalLines([]);
        },
        terminalSize: { rows: 28, cols: 90 },
      });

      if (!cleared) {
        setTerminalLines((prev) => [...prev, echoLine, ...result]);
      }
    },
    [shellStack, allServers, runtimeMap, updateRuntime]
  );

  const handleInterrupt = useCallback(() => {
    const currentShell = shellStack[shellStack.length - 1];
    const promptPath = formatPromptPath(currentShell.cwd, currentShell.user, currentShell.uid);
    const sym = currentShell.uid === 0 ? '#' : '$';
    setTerminalLines((prev) => [
      ...prev,
      mkLine([
        {
          text: `${currentShell.user}@${currentShell.hostname}`,
          color: currentShell.uid === 0 ? 'red' : 'bright-green',
        },
        { text: ':' },
        { text: promptPath, color: 'bright-blue' },
        { text: `${sym} ^C` },
      ]),
    ]);
  }, [shellStack]);

  const handleClear = useCallback(() => {
    setTerminalLines([]);
  }, []);

  const handleSubmitFlag = (serverId: string, submitted: string) => {
    const clean = submitted.trim();
    const target = allServers.find((s) => s.id === serverId);
    if (!target) return { ok: false, message: 'ターゲットが見つかりません。' };
    if (!clean) return { ok: false, message: 'フラグを入力してください。' };
    if (clean === target.flag) {
      setProgress((prev) => ({
        ...prev,
        capturedFlags: {
          ...prev.capturedFlags,
          [serverId]: { flag: clean, capturedAt: Date.now() },
        },
      }));
      return { ok: true, message: `正解！ ${target.name} のフラグを獲得しました。` };
    }
    return { ok: false, message: 'フラグが一致しません。' };
  };

  const resetTerminalSession = useCallback(() => {
    setShellStack([LOCAL_INITIAL_SHELL]);
    setTerminalLines([]);
    setTerminalInput('');
    setTerminalCursorPos(0);
  }, []);

  const handleSelectServer = useCallback(
    (serverId: string) => {
      if (serverId !== selectedServerId) {
        setSelectedServerId(serverId);
        resetTerminalSession();
      }
    },
    [selectedServerId, resetTerminalSession]
  );

  const handleSaveAndDeployCustom = (srv: ServerConfig) => {
    setCustomServers((prev) => [...prev, srv]);
    setRuntimeMap((prev) => ({
      ...prev,
      [srv.id]: makeDefaultRuntime(),
    }));
    setSelectedServerId(srv.id);
    resetTerminalSession();
    setActiveTab('terminal');
  };

  const handleDeleteCustom = (serverId: string) => {
    setCustomServers((prev) => prev.filter((s) => s.id !== serverId));
    if (selectedServerId === serverId) {
      setSelectedServerId(CAMPAIGN_SERVERS[0].id);
      resetTerminalSession();
    }
  };

  const handleAttackFromLevels = (serverId: string) => {
    setSelectedServerId(serverId);
    resetTerminalSession();
    setActiveTab('terminal');
  };

  const handleRecordWebPath = useCallback(
    (serverId: string, path: string) => {
      updateRuntime(serverId, (prev) => {
        if (prev.discoveredPaths.includes(path)) return prev;
        return { ...prev, discoveredPaths: [...prev.discoveredPaths, path] };
      });
    },
    [updateRuntime]
  );

  const handleRevealHint = (serverId: string) => {
    setProgress((prev) => ({
      ...prev,
      revealedHints: {
        ...prev.revealedHints,
        [serverId]: (prev.revealedHints[serverId] || 0) + 1,
      },
    }));
  };

  const handleRevealAllHints = (serverId: string, total: number) => {
    setProgress((prev) => ({
      ...prev,
      revealedHints: {
        ...prev.revealedHints,
        [serverId]: total,
      },
    }));
  };

  const handleInsertFromHints = (cmd: string) => {
    setTerminalInput(cmd);
    setTerminalCursorPos(cmd.length);
    setActiveTab('terminal');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-slate-100">
      {/* Top Bar Contract: Brand wordmark | 3 Tabs (ターミナル / Webページ / レベル一覧) | 1 Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 h-14 border-b border-[#232A3B] bg-[#0E121A] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('terminal')}
          className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
        >
          NetStrike Lab
        </button>

        <nav className="flex items-center gap-6 text-sm font-medium overflow-x-auto">
          {[
            { id: 'terminal', label: 'ターミナル' },
            { id: 'webpage', label: 'Webページ' },
            { id: 'levels', label: 'レベル一覧' },
            { id: 'hints', label: 'ヒント' },
            { id: 'guide', label: '解説' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === item.id
                  ? 'text-white border-sky-500'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            サーバー作成
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        <div
          className={`max-w-[1440px] mx-auto px-4 sm:px-6 py-4 h-[calc(100vh-3.5rem)] ${
            activeTab === 'terminal' ? 'block' : 'hidden'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <div className="lg:col-span-8 h-full min-h-[480px]">
              <TerminalWindow
                lines={terminalLines}
                shell={shellStack[shellStack.length - 1]}
                commandHistory={commandHistory}
                input={terminalInput}
                onInputChange={setTerminalInput}
                cursorPos={terminalCursorPos}
                onCursorPosChange={setTerminalCursorPos}
                onExecute={handleExecuteCommand}
                onInterrupt={handleInterrupt}
                onClear={handleClear}
                isMaximized={isTerminalMaximized}
                onToggleMaximize={() => setIsTerminalMaximized((v) => !v)}
                availableIps={allServers
                  .filter(
                    (s) =>
                      !s.requiresPivotFrom ||
                      s.requiresPivotFrom === shellStack[shellStack.length - 1].hostId
                  )
                  .map((s) => s.ip)}
              />
            </div>

            <div className="lg:col-span-4 h-full min-h-[420px]">
              <MissionSidebar
                servers={allServers}
                selectedServer={selectedServer}
                onSelectServer={handleSelectServer}
                runtime={runtimeMap[selectedServer.id] || DEFAULT_RUNTIME}
                shellStack={shellStack}
                progress={progress}
                onSubmitFlag={handleSubmitFlag}
              />
            </div>
          </div>
        </div>

        <div className={activeTab === 'webpage' ? 'block' : 'hidden'}>
          <WebPageView
            server={selectedServer}
            runtime={runtimeMap[selectedServer.id] || DEFAULT_RUNTIME}
            onRecordPath={handleRecordWebPath}
            isActive={activeTab === 'webpage'}
          />
        </div>

        {activeTab === 'levels' && (
          <LevelsView
            servers={allServers}
            progress={progress}
            onAttackServer={handleAttackFromLevels}
            onGoToBuilder={() => setActiveTab('builder')}
            onDeleteCustomServer={handleDeleteCustom}
          />
        )}

        {activeTab === 'hints' && (
          <HintsView
            servers={allServers}
            selectedServer={selectedServer}
            onSelectServer={handleSelectServer}
            progress={progress}
            onRevealHint={handleRevealHint}
            onRevealAllHints={handleRevealAllHints}
            onInsertToTerminal={handleInsertFromHints}
          />
        )}

        {activeTab === 'guide' && (
          <GuideView
            selectedServer={selectedServer}
            onInsertToTerminal={handleInsertFromHints}
          />
        )}

        {activeTab === 'builder' && (
          <ServerBuilder
            existingCustomCount={customServers.length}
            onSaveAndDeploy={handleSaveAndDeployCustom}
          />
        )}
      </main>
    </div>
  );
}
