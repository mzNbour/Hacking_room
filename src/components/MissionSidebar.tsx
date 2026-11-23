import React, { useEffect, useState } from 'react';
import { CheckCircle2, Flag, Shield } from 'lucide-react';
import { SECURITY_LEVEL_DESCRIPTIONS } from '../data/levels';
import { GameProgress, ServerConfig, ServerRuntimeState, ShellContext } from '../types/game';

interface MissionSidebarProps {
  servers: ServerConfig[];
  selectedServer: ServerConfig;
  onSelectServer: (id: string) => void;
  runtime: ServerRuntimeState;
  shellStack: ShellContext[];
  progress: GameProgress;
  onSubmitFlag: (serverId: string, flag: string) => { ok: boolean; message: string };
}

export const MissionSidebar: React.FC<MissionSidebarProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  runtime,
  shellStack,
  progress,
  onSubmitFlag,
}) => {
  const [flagInput, setFlagInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setFeedback(null);
    setFlagInput('');
  }, [selectedServer.id]);

  const visibleTargets = servers.filter((s) => !s.requiresPivotFrom);
  const currentShell = shellStack[shellStack.length - 1];
  const isCaptured = Boolean(progress.capturedFlags[selectedServer.id]);
  const levelInfo = SECURITY_LEVEL_DESCRIPTIONS[selectedServer.level];

  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSubmitFlag(selectedServer.id, flagInput);
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) setFlagInput('');
  };

  return (
    <aside className="flex flex-col h-full bg-[#131720] border border-[#232A3B] rounded-lg overflow-hidden">
      {/* Target Selector Header */}
      <div className="p-4 border-b border-[#232A3B] space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="target-select" className="text-xs font-medium text-slate-400">
            攻撃ターゲット選択
          </label>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            獲得済: {Object.keys(progress.capturedFlags).length} / {visibleTargets.length}
          </span>
        </div>

        <select
          id="target-select"
          value={selectedServer.id}
          onChange={(e) => {
            onSelectServer(e.target.value);
            setFeedback(null);
          }}
          className="w-full bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
        >
          <optgroup label="キャンペーン (Security Lv.1 〜 Lv.10)">
            {visibleTargets
              .filter((s) => !s.isCustom)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {progress.capturedFlags[s.id] ? '[済] ' : ''}
                  {s.name} ({s.ip})
                </option>
              ))}
          </optgroup>
          {visibleTargets.some((s) => s.isCustom) && (
            <optgroup label="カスタムサーバー">
              {visibleTargets
                .filter((s) => s.isCustom)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {progress.capturedFlags[s.id] ? '[済] ' : ''}
                    {s.name} ({s.ip})
                  </option>
                ))}
            </optgroup>
          )}
        </select>

        {/* Security Level Gauge */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              {levelInfo.label}
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              Level {selectedServer.level} / 10
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, idx) => {
              const active = idx < selectedServer.level;
              const tone =
                selectedServer.level <= 3
                  ? 'bg-emerald-500'
                  : selectedServer.level <= 6
                  ? 'bg-sky-500'
                  : selectedServer.level <= 8
                  ? 'bg-amber-500'
                  : 'bg-rose-500';
              return (
                <div
                  key={idx}
                  className={`h-1.5 rounded-sm ${active ? tone : 'bg-[#1E2534]'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Target Metadata (Zero hints) */}
      <div className="flex-1 overflow-y-auto panel-scroll divide-y divide-[#232A3B]">
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100 truncate">{selectedServer.name}</h2>
            {isCaptured && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                クリア済
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 font-mono tabular-nums">
            <span>{selectedServer.ip}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedServer.hostname}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedServer.os}</span>
          </div>
          <div className="pt-1 text-xs text-slate-400">
            現在のシェル:{' '}
            <span className="font-mono text-slate-200">
              {currentShell.user}@{currentShell.hostname}
            </span>
            {shellStack.length > 1 && (
              <span className="text-amber-400 ml-2">({shellStack.length - 1}段接続中)</span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2">
          <div className="text-xs font-medium text-slate-300">偵察ログ</div>
          <div className="text-xs text-slate-400 space-y-1.5 font-mono">
            <div>
              発見ポート:{' '}
              {runtime.discoveredPorts.length > 0 ? (
                <span className="text-emerald-400 tabular-nums">
                  {runtime.discoveredPorts.join(', ')}
                </span>
              ) : (
                <span className="text-slate-500">未検出</span>
              )}
            </div>
            <div>
              発見パス:{' '}
              {runtime.discoveredPaths.length > 0 ? (
                <span className="text-sky-400">{runtime.discoveredPaths.join(', ')}</span>
              ) : (
                <span className="text-slate-500">なし</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flag Submission Footer */}
      <form onSubmit={handleFlagSubmit} className="p-4 border-t border-[#232A3B] bg-[#0F131C] space-y-2 shrink-0">
        <label htmlFor="flag-input" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
          <Flag className="w-3.5 h-3.5 text-emerald-400" />
          フラグ提出
        </label>
        <div className="flex gap-2">
          <input
            id="flag-input"
            type="text"
            value={flagInput}
            onChange={(e) => setFlagInput(e.target.value)}
            placeholder="FLAG{...}"
            className="flex-1 min-w-0 bg-[#0B0E14] border border-[#2A3244] rounded-md px-3 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            送信
          </button>
        </div>
        {feedback && (
          <p className={`text-xs ${feedback.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {feedback.text}
          </p>
        )}
      </form>
    </aside>
  );
};
