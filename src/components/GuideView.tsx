import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  Lightbulb,
  Search,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { GUIDE_CHAPTERS, GuideCallout, GuideChapter, GuideSection } from '../data/guideData';
import { ServerConfig } from '../types/game';

interface GuideViewProps {
  selectedServer: ServerConfig;
  onInsertToTerminal: (cmd: string) => void;
}

function renderRichInlineText(text: string): React.ReactNode {
  // Safely parse `inline code` and **bold** spans without raw HTML injection
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#0B0E14] border border-[#232A3B] font-mono text-[12px] text-sky-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function sectionMatchesQuery(section: GuideSection, q: string): boolean {
  if (!q) return true;
  const haystacks: string[] = [
    section.title,
    section.summary,
    ...section.paragraphs,
  ];
  if (section.bulletPoints) {
    for (const bp of section.bulletPoints) {
      haystacks.push(bp.term, bp.detail);
    }
  }
  if (section.table) {
    haystacks.push(...section.table.headers);
    for (const row of section.table.rows) {
      haystacks.push(...row);
    }
  }
  if (section.commands) {
    for (const c of section.commands) {
      haystacks.push(c.label, c.cmd, c.note || '');
    }
  }
  if (section.callout) {
    haystacks.push(section.callout.title, section.callout.body);
  }
  return haystacks.some((item) => item.toLowerCase().includes(q));
}

const CALLOUT_STYLES: Record<
  GuideCallout['tone'],
  {
    wrapper: string;
    icon: React.ReactNode;
    badge: string;
    title: string;
  }
> = {
  info: {
    wrapper: 'bg-sky-950/25 border-sky-500/40',
    icon: <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    badge: '知識',
    title: 'text-sky-300',
  },
  warning: {
    wrapper: 'bg-amber-950/25 border-amber-500/40',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
    badge: '注意',
    title: 'text-amber-300',
  },
  defense: {
    wrapper: 'bg-emerald-950/25 border-emerald-500/40',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
    badge: '防御対策',
    title: 'text-emerald-300',
  },
  tip: {
    wrapper: 'bg-indigo-950/25 border-indigo-500/40',
    icon: <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />,
    badge: '実践ポイント',
    title: 'text-indigo-300',
  },
};

export const GuideView: React.FC<GuideViewProps> = ({
  selectedServer,
  onInsertToTerminal,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredChapters = useMemo(() => {
    const baseChapters: GuideChapter[] =
      selectedChapterId === 'all' || normalizedQuery
        ? GUIDE_CHAPTERS
        : GUIDE_CHAPTERS.filter((ch) => ch.id === selectedChapterId);

    if (!normalizedQuery) return baseChapters;

    return baseChapters
      .map((ch) => {
        const chapterMetaMatch =
          ch.title.toLowerCase().includes(normalizedQuery) ||
          ch.subtitle.toLowerCase().includes(normalizedQuery) ||
          ch.number.toLowerCase().includes(normalizedQuery);
        if (chapterMetaMatch) return ch;

        const matchingSections = ch.sections.filter((sec) =>
          sectionMatchesQuery(sec, normalizedQuery)
        );
        if (matchingSections.length === 0) return null;
        return { ...ch, sections: matchingSections };
      })
      .filter((ch): ch is GuideChapter => ch !== null);
  }, [selectedChapterId, normalizedQuery]);

  const totalMatchingSections = useMemo(
    () => filteredChapters.reduce((sum, ch) => sum + ch.sections.length, 0),
    [filteredChapters]
  );

  const activeChapterIndex =
    selectedChapterId === 'all'
      ? -1
      : GUIDE_CHAPTERS.findIndex((c) => c.id === selectedChapterId);

  const handleCopyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      window.setTimeout(() => {
        setCopiedCmd((prev) => (prev === cmd ? null : prev));
      }, 1500);
    } catch {
      // fallback: ignore clipboard permission issues
    }
  };

  const handleJumpToSection = (chapterId: string, sectionId: string) => {
    if (selectedChapterId !== 'all' && selectedChapterId !== chapterId) {
      setSelectedChapterId(chapterId);
    }
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#232A3B] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
            <BookOpen className="w-4 h-4" />
            <span>SECURITY & CTF HANDBOOK</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            技術解説 & 基礎知識ハンドブック
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl">
            ネットワーク・Linux権限・HTTP/Webの仕組みから、Nmap/Gobuster/SQLi/JWT/権限昇格・ピボットまでの原理と実戦コマンドを体系的に解説しています。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="px-3 py-2 bg-[#131720] border border-[#232A3B] rounded-md text-xs">
            <div className="text-slate-400">現在のターゲットIP置換対象</div>
            <div className="font-mono text-slate-100 mt-0.5">
              {selectedServer.name}{' '}
              <span className="text-sky-400">({selectedServer.ip})</span>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワード検索 (例: SQLi, SUID, 403, nmap)"
              className="w-full bg-[#131720] border border-[#2A3244] rounded-md pl-9 pr-8 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="検索をクリア"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Chapter Selector */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedChapterId('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
            selectedChapterId === 'all' && !normalizedQuery
              ? 'bg-sky-600 border-sky-500 text-white'
              : 'bg-[#131720] border-[#232A3B] text-slate-300 hover:text-white'
          }`}
        >
          全章表示 ({GUIDE_CHAPTERS.length})
        </button>
        {GUIDE_CHAPTERS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedChapterId(ch.id);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 transition-colors ${
              selectedChapterId === ch.id && !normalizedQuery
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-[#131720] border-[#232A3B] text-slate-300 hover:text-white'
            }`}
          >
            {ch.number}: {ch.title}
          </button>
        ))}
      </div>

      {/* Main Layout: Sidebar TOC + Detailed Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Sidebar TOC */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-4 bg-[#131720] border border-[#232A3B] rounded-lg p-3 max-h-[calc(100vh-6rem)] overflow-y-auto panel-scroll space-y-2">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            目次・チャプター
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedChapterId('all');
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
              selectedChapterId === 'all' && !normalizedQuery
                ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-300 hover:bg-[#1A202E] border border-transparent'
            }`}
          >
            <span>すべての章を表示</span>
            <span className="font-mono text-[11px] text-slate-400">
              {GUIDE_CHAPTERS.length}章
            </span>
          </button>

          <div className="space-y-1 pt-1 border-t border-[#232A3B]">
            {GUIDE_CHAPTERS.map((ch) => {
              const isSelected = selectedChapterId === ch.id && !normalizedQuery;
              const isExpanded = isSelected || selectedChapterId === 'all';
              return (
                <div key={ch.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedChapterId(ch.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors border ${
                      isSelected
                        ? 'bg-sky-600/20 text-sky-200 border-sky-500/40'
                        : 'text-slate-300 hover:bg-[#1A202E] border-transparent'
                    }`}
                  >
                    <div className="text-[11px] font-mono text-sky-400">
                      {ch.number}
                    </div>
                    <div className="text-xs font-medium leading-snug mt-0.5">
                      {ch.title}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="pl-3 ml-2 border-l border-[#232A3B] space-y-0.5">
                      {ch.sections.map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => handleJumpToSection(ch.id, sec.id)}
                          className="w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-100 hover:bg-[#1A202E]/60 rounded transition-colors leading-snug"
                        >
                          {sec.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Content Column */}
        <div className="lg:col-span-9 space-y-8">
          {normalizedQuery && (
            <div className="flex items-center justify-between bg-[#131720] border border-[#232A3B] rounded-md px-4 py-2.5 text-xs text-slate-300">
              <span>
                「<strong className="text-sky-300">{searchQuery}</strong>」の検索結果：
                <span className="font-mono font-semibold ml-1 text-slate-100">
                  {totalMatchingSections}
                </span>{' '}
                件のセクションが一致しました
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-sky-400 hover:text-sky-300 font-medium"
              >
                検索をリセット
              </button>
            </div>
          )}

          {filteredChapters.length === 0 ? (
            <div className="bg-[#131720] border border-[#232A3B] rounded-lg p-10 text-center space-y-3">
              <p className="text-sm text-slate-300">
                「{searchQuery}」に一致する解説が見つかりませんでした。
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors"
              >
                すべての解説を表示
              </button>
            </div>
          ) : (
            filteredChapters.map((chapter) => (
              <section
                key={chapter.id}
                id={chapter.id}
                className="space-y-5 scroll-mt-4"
              >
                {/* Chapter Header */}
                <div className="bg-[#131720] border border-[#232A3B] rounded-lg px-6 py-5 border-l-4 border-l-sky-500">
                  <div className="text-xs font-mono font-semibold text-sky-400">
                    {chapter.number}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-100 mt-1">
                    {chapter.title}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {chapter.subtitle}
                  </p>
                </div>

                {/* Sections */}
                <div className="space-y-5">
                  {chapter.sections.map((section) => (
                    <article
                      key={section.id}
                      id={section.id}
                      className="bg-[#131720] border border-[#232A3B] rounded-lg p-6 space-y-5 scroll-mt-4"
                    >
                      <div className="space-y-1 border-b border-[#232A3B] pb-3.5">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                          {section.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-sky-300/90">
                          {section.summary}
                        </p>
                      </div>

                      {/* Body Paragraphs */}
                      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                        {section.paragraphs.map((p, idx) => (
                          <p key={idx}>{renderRichInlineText(p)}</p>
                        ))}
                      </div>

                      {/* Optional Bullet Points */}
                      {section.bulletPoints && section.bulletPoints.length > 0 && (
                        <ul className="space-y-2 bg-[#0B0E14] border border-[#232A3B] rounded-md p-4">
                          {section.bulletPoints.map((bp, idx) => (
                            <li key={idx} className="text-sm text-slate-300 leading-relaxed">
                              <span className="font-semibold text-slate-100 mr-2">
                                {bp.term}:
                              </span>
                              <span>{renderRichInlineText(bp.detail)}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Optional Structured Table */}
                      {section.table && (
                        <div className="overflow-x-auto border border-[#232A3B] rounded-md">
                          <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                              <tr className="bg-[#0B0E14] border-b border-[#232A3B] text-slate-200">
                                {section.table.headers.map((header, idx) => (
                                  <th
                                    key={idx}
                                    className="px-4 py-2.5 font-semibold whitespace-nowrap"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#232A3B] bg-[#0F131C]">
                              {section.table.rows.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className="hover:bg-[#171D2A] transition-colors"
                                >
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className={`px-4 py-2.5 align-top leading-relaxed ${
                                        cIdx === 0
                                          ? 'font-mono text-sky-300 whitespace-nowrap'
                                          : 'text-slate-300'
                                      }`}
                                    >
                                      {renderRichInlineText(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Optional Practical Commands */}
                      {section.commands && section.commands.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            実践コマンド例
                          </div>
                          <div className="grid grid-cols-1 gap-2.5">
                            {section.commands.map((item, idx) => {
                              const resolvedCmd = item.cmd.replace(
                                /<IP>/g,
                                selectedServer.ip
                              );
                              const isCopied = copiedCmd === resolvedCmd;
                              return (
                                <div
                                  key={idx}
                                  className="bg-[#0B0E14] border border-[#232A3B] rounded-md p-3.5 space-y-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-300">
                                      {item.label}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyCommand(resolvedCmd)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-[#131720] hover:bg-[#1C2230] border border-[#2A3244] rounded transition-colors"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400">コピー済み</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>コピー</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onInsertToTerminal(resolvedCmd)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                                      >
                                        <Terminal className="w-3 h-3" />
                                        <span>ターミナルに入力</span>
                                      </button>
                                    </div>
                                  </div>
                                  <code className="block text-xs sm:text-[13px] font-mono text-emerald-400 break-all bg-[#080B10] px-3 py-2 rounded border border-[#1B2232]">
                                    $ {resolvedCmd}
                                  </code>
                                  {item.note && (
                                    <p className="text-xs text-slate-400">
                                      {renderRichInlineText(item.note)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Optional Callout */}
                      {section.callout && (
                        <div
                          className={`border rounded-md p-4 flex items-start gap-3 ${
                            CALLOUT_STYLES[section.callout.tone].wrapper
                          }`}
                        >
                          {CALLOUT_STYLES[section.callout.tone].icon}
                          <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
                            <div
                              className={`font-semibold ${
                                CALLOUT_STYLES[section.callout.tone].title
                              }`}
                            >
                              {section.callout.title}
                            </div>
                            <p className="text-slate-300">
                              {renderRichInlineText(section.callout.body)}
                            </p>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Single-Chapter Footer Navigation */}
          {!normalizedQuery && activeChapterIndex !== -1 && (
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#232A3B]">
              {activeChapterIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterId(GUIDE_CHAPTERS[activeChapterIndex - 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#131720] hover:bg-[#1C2230] border border-[#2A3244] text-slate-200 rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>
                    {GUIDE_CHAPTERS[activeChapterIndex - 1].number}:{' '}
                    {GUIDE_CHAPTERS[activeChapterIndex - 1].title}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {activeChapterIndex < GUIDE_CHAPTERS.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterId(GUIDE_CHAPTERS[activeChapterIndex + 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors"
                >
                  <span>
                    {GUIDE_CHAPTERS[activeChapterIndex + 1].number}:{' '}
                    {GUIDE_CHAPTERS[activeChapterIndex + 1].title}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
