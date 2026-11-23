import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Plus, Server, Shield, Trash2 } from 'lucide-react';
import { SECURITY_LEVEL_DESCRIPTIONS } from '../data/levels';
import { GameProgress, ServerConfig } from '../types/game';

interface LevelsViewProps {
  servers: ServerConfig[];
  progress: GameProgress;
  onAttackServer: (serverId: string) => void;
  onGoToBuilder: () => void;
  onDeleteCustomServer: (serverId: string) => void;
}

export const LevelsView: React.FC<LevelsViewProps> = ({
  servers,
  progress,
  onAttackServer,
  onGoToBuilder,
  onDeleteCustomServer,
}) => {
  const [filter, setFilter] = useState<'all' | 'campaign' | 'custom' | 'cleared'>('all');

  const visibleServers = servers.filter((s) => !s.requiresPivotFrom);
  const filtered = visibleServers.filter((s) => {
    if (filter === 'campaign') return !s.isCustom;
    if (filter === 'custom') return Boolean(s.isCustom);
    if (filter === 'cleared') return Boolean(progress.capturedFlags[s.id]);
    return true;
  });

  const clearedCount = visibleServers.filter((s) => progress.capturedFlags[s.id]).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232A3B] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            ターゲットサーバー一覧 (Security Level 1〜10)
          </h1>
          <p className="text-sm text-slate-400">
            セキュリティレベル1から10までの段階的な防衛機構を突破し、すべてのフラグを奪取してください。
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono tabular-nums text-slate-300">
            攻略進捗: {clearedCount} / {visibleServers.length}
          </span>
          <button
            type="button"
            onClick={onGoToBuilder}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            新規サーバー作成
          </button>
        </div>
      </div>

      {/* Interactive Filter Segmented Control */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#131720] border border-[#232A3B] rounded-lg">
        {[
          { id: 'all', label: 'すべて' },
          { id: 'campaign', label: '公式レベル (1〜10)' },
          { id: 'custom', label: '自作サーバー' },
          { id: 'cleared', label: 'クリア済' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === tab.id
                ? 'bg-[#232A3B] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Server Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#131720] border border-[#232A3B] rounded-lg p-10 text-center space-y-3">
          <Server className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-300">該当するサーバーがありません。</p>
          <button
            type="button"
            onClick={onGoToBuilder}
            className="px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors"
          >
            サーバービルダーで作成する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((srv) => {
            const isCleared = Boolean(progress.capturedFlags[srv.id]);
            const lvlMeta = SECURITY_LEVEL_DESCRIPTIONS[srv.level];

            return (
              <div
                key={srv.id}
                className="bg-[#131720] border border-[#232A3B] hover:border-[#34405B] rounded-lg p-5 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <span className="font-mono tabular-nums text-sky-400 font-medium">
                          Level {srv.level}/10
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{srv.isCustom ? 'カスタム' : lvlMeta.label.split(' ')[1]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{srv.ip}</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-100">{srv.name}</h3>
                    </div>

                    {isCleared ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        獲得済
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                        未攻略
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 pt-1 font-mono">
                    <div>Hostname: {srv.hostname}</div>
                    <div>OS: {srv.os}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1E2534] gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Security Level {srv.level}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {srv.isCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomServer(srv.id)}
                        title="カスタムサーバーを削除"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-[#1C2230] rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAttackServer(srv.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      ターゲットに選択
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
