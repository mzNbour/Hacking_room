import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Code2,
  Globe,
  Lock,
  Plus,
  RotateCw,
  Shield,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ServerConfig, ServerRuntimeState } from '../types/game';
import { getEffectiveFiles } from '../engine/virtualFs';
import { TargetSiteRenderer } from './TargetSiteRenderer';
import { WebResponseViewer } from './WebResponseViewer';

interface WebPageViewProps {
  server: ServerConfig;
  runtime: ServerRuntimeState;
  onRecordPath: (serverId: string, path: string) => void;
  isActive?: boolean;
}

interface BrowserTab {
  id: string;
  history: string[];
  historyIdx: number;
}

export const WebPageView: React.FC<WebPageViewProps> = ({
  server,
  runtime,
  onRecordPath,
  isActive = true,
}) => {
  const webServices = server.services.filter(
    (s) => s.type === 'http' || s.type === 'https' || s.type === 'custom'
  );
  const primarySvc = webServices[0];
  const primaryType = primarySvc?.type;
  const primaryPort = primarySvc?.port;

  const homeUrl = useMemo(() => {
    const scheme = primaryType === 'https' ? 'https' : 'http';
    const portPart =
      primaryPort && primaryPort !== 80 && primaryPort !== 443 ? `:${primaryPort}` : '';
    return `${scheme}://${server.ip}${portPart}/`;
  }, [server.ip, primaryType, primaryPort]);

  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', history: [homeUrl], historyIdx: 0 },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [urlInput, setUrlInput] = useState(homeUrl);
  const [authHeader, setAuthHeader] = useState('');
  const [showDevTools, setShowDevTools] = useState(false);
  const [devToolsTab, setDevToolsTab] = useState<'headers' | 'raw' | 'request'>('headers');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [queryParamInput, setQueryParamInput] = useState('');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeUrl = activeTab.history[activeTab.historyIdx] || homeUrl;

  // Reset initial tab URL when switching target server
  useEffect(() => {
    setTabs([{ id: 'tab-1', history: [homeUrl], historyIdx: 0 }]);
    setActiveTabId('tab-1');
    setUrlInput(homeUrl);
    setQueryParamInput('');
    setAuthHeader('');
  }, [server.id, homeUrl]);

  // Keep urlInput synced when switching browser tabs or navigating back/forward
  useEffect(() => {
    setUrlInput(activeUrl);
  }, [activeUrl, activeTabId]);

  const navigateTo = (nextUrl: string) => {
    const clean = nextUrl.trim();
    if (!clean) return;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTab.id) return t;
        const sliced = t.history.slice(0, t.historyIdx + 1);
        if (sliced[sliced.length - 1] === clean) return t;
        return {
          ...t,
          history: [...sliced, clean],
          historyIdx: sliced.length,
        };
      })
    );
    setUrlInput(clean);
  };

  const goBack = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id && t.historyIdx > 0
          ? { ...t, historyIdx: t.historyIdx - 1 }
          : t
      )
    );
  };

  const goForward = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id && t.historyIdx < t.history.length - 1
          ? { ...t, historyIdx: t.historyIdx + 1 }
          : t
      )
    );
  };

  const addTab = () => {
    const id = `tab-${Date.now()}`;
    setTabs((prev) => [...prev, { id, history: [homeUrl], historyIdx: 0 }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[Math.max(0, idx - 1)].id);
    }
  };

  const toggleBookmark = () => {
    setBookmarks((prev) =>
      prev.includes(activeUrl) ? prev.filter((u) => u !== activeUrl) : [...prev, activeUrl]
    );
  };

  // Pure response resolution
  const response = useMemo(() => {
    const normalized = activeUrl.startsWith('http') ? activeUrl : `http://${activeUrl}`;
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      return {
        error: 'ERR_INVALID_URL',
        status: 0,
        headers: {} as Record<string, string>,
        body: '',
        contentType: 'text/plain',
        route: null,
        recordedPath: null as string | null,
        detectedFlag: null as string | null,
        pageTitle: '問題が発生しました',
      };
    }

    const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
    const svc = server.services.find(
      (s) => s.port === port && (s.type === 'http' || s.type === 'https' || s.type === 'custom')
    );

    if (!svc) {
      return {
        error: `Firefox は ${server.ip}:${port} への接続を確立できませんでした。`,
        status: 0,
        headers: {} as Record<string, string>,
        body: '',
        contentType: 'text/plain',
        route: null,
        recordedPath: null as string | null,
        detectedFlag: null as string | null,
        pageTitle: '接続できませんでした',
      };
    }

    const isOpen = svc.knockSequence ? runtime.unlockedByKnock : svc.state === 'open';
    if (!isOpen) {
      return {
        error: `接続がタイムアウトしました (${server.ip}:${port} からの応答がありません)。`,
        status: 0,
        headers: {} as Record<string, string>,
        body: '',
        contentType: 'text/plain',
        route: null,
        recordedPath: null as string | null,
        detectedFlag: null as string | null,
        pageTitle: 'タイムアウト',
      };
    }

    const routePath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
    const routes = svc.webRoutes || [];
    const route = routes.find((r) => r.path === routePath || r.path === parsed.pathname);

    if (svc.vulnerabilities.includes('http_path_traversal_2449') && activeUrl.includes('.%2e')) {
      const targetFile = activeUrl.split('.%2e').pop()?.replace(/^\/+/, '/') || '/etc/passwd';
      const files = getEffectiveFiles(server.files, runtime);
      const found = files.find((f) => f.path === targetFile);
      if (found) {
        return {
          error: null,
          status: 200,
          headers: { Server: svc.banner || svc.version, 'Content-Type': 'text/plain' },
          body: found.content,
          contentType: 'text/plain',
          route: null,
          recordedPath: null as string | null,
          detectedFlag: found.content.match(/FLAG\{[^}]+\}/)?.[0] || null,
          pageTitle: `${parsed.hostname} — ${targetFile}`,
        };
      }
    }

    if (!route) {
      return {
        error: null,
        status: 404,
        headers: { Server: svc.banner || svc.version, 'Content-Type': 'text/html' },
        body: `404 Not Found — ${routePath} was not found on this server.`,
        contentType: 'text/plain',
        route: null,
        recordedPath: null as string | null,
        detectedFlag: null as string | null,
        pageTitle: '404 Not Found',
      };
    }

    if (route.requiresAuth?.type === 'bearer_jwt') {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      let validAdmin = false;
      const parts = token.split('.');
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
        return {
          error: null,
          status: token ? 403 : 401,
          headers: { Server: svc.banner || svc.version, 'Content-Type': 'application/json' },
          body: JSON.stringify(
            { error: token ? 'Forbidden: admin role JWT required' : 'Authorization Bearer JWT token required' },
            null,
            2
          ),
          contentType: 'application/json',
          route,
          recordedPath: null as string | null,
          detectedFlag: null as string | null,
          pageTitle: `${parsed.hostname} (${token ? 403 : 401})`,
        };
      }
    }

    let finalBody = route.body;

    if (route.sqliResponse) {
      const q = parsed.searchParams.get(route.sqliResponse.vulnerableParam) || '';
      if (q.includes("'") || q.toUpperCase().includes('OR 1=1') || q.toUpperCase().includes('UNION')) {
        const dbSvc = server.services.find((s) => s.dbTables && s.dbTables.length > 0);
        if (dbSvc?.dbTables) {
          finalBody = JSON.stringify(dbSvc.dbTables, null, 2);
        }
      }
    }

    if (route.lfiEnabled) {
      const fileParam = parsed.searchParams.get('file');
      if (fileParam && (fileParam.includes('..') || fileParam.startsWith('/'))) {
        const cleaned = '/' + fileParam.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
        const files = getEffectiveFiles(server.files, runtime);
        const found = files.find((f) => f.path === cleaned);
        finalBody = found
          ? found.content
          : `Warning: include(${fileParam}): failed to open stream: No such file or directory`;
      }
    }

    if (route.ssrfInternalTarget) {
      const targetUrl = parsed.searchParams.get('url') || '';
      if (targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
        finalBody = route.ssrfInternalTarget;
      }
    }

    if (route.cmdInjEnabled) {
      const hostParam = parsed.searchParams.get('host') || '';
      if (hostParam.includes(';') || hostParam.includes('|') || hostParam.includes('&&')) {
        const injected = hostParam.split(/;|&&|\|/).slice(1).join(';').trim();
        if (injected.startsWith('id')) {
          finalBody = `${route.body}\nuid=33(www-data) gid=33(www-data) groups=33(www-data)`;
        } else if (injected.startsWith('cat ')) {
          const p = injected.slice(4).trim();
          const f = getEffectiveFiles(server.files, runtime).find((x) => x.path === p);
          finalBody = f ? `${route.body}\n${f.content}` : `${route.body}\ncat: ${p}: No such file or directory`;
        } else {
          finalBody = `${route.body}\n[executed '${injected}' as www-data]`;
        }
      }
    }

    if (route.idorConfig) {
      const idVal = parsed.searchParams.get(route.idorConfig.param) || '';
      if (idVal) {
        finalBody =
          idVal in route.idorConfig.records
            ? route.idorConfig.records[idVal]
            : JSON.stringify({ error: `Record id=${idVal} not found` }, null, 2);
      }
    }

    if (route.sstiEnabled) {
      const nameParam = parsed.searchParams.get('name');
      if (nameParam) {
        let rendered = nameParam;
        if (nameParam.includes('{{7*7}}') || nameParam.includes('${7*7}')) {
          rendered = nameParam.replace(/\{\{7\*7\}\}|\$\{7\*7\}/g, '49');
        }
        try {
          const obj = JSON.parse(finalBody);
          finalBody = JSON.stringify({ ...obj, rendered_name: rendered }, null, 2);
        } catch {
          finalBody = `${finalBody}\nHello, ${rendered}`;
        }
      }
    }

    const titleMatch = finalBody.match(/<title>(.*?)<\/title>/i);

    return {
      error: null,
      status: route.status,
      headers: {
        Server: svc.banner || svc.version,
        'Content-Type': route.contentType,
      },
      body: finalBody,
      contentType: route.contentType,
      route,
      recordedPath: routePath,
      pageTitle: titleMatch?.[1] || server.siteBrand?.title || `${parsed.hostname}${routePath}`,
    };
  }, [activeUrl, authHeader, runtime, server]);

  useEffect(() => {
    if (isActive && response.recordedPath) {
      onRecordPath(server.id, response.recordedPath);
    }
  }, [isActive, server.id, response.recordedPath, onRecordPath]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const handleInteractiveSubmit = (e: React.FormEvent, paramName: string, basePath: string) => {
    e.preventDefault();
    const scheme = primaryType === 'https' ? 'https' : 'http';
    const portPart =
      primaryPort && primaryPort !== 80 && primaryPort !== 443 ? `:${primaryPort}` : '';
    const target = `${scheme}://${server.ip}${portPart}${basePath}?${paramName}=${encodeURIComponent(
      queryParamInput
    )}`;
    navigateTo(target);
  };

  const isBookmarked = bookmarks.includes(activeUrl);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Mozilla Firefox Proton Dark Window */}
      <div className="flex-1 flex flex-col bg-[#1C1B22] border border-[#383740] rounded-lg overflow-hidden shadow-2xl">
        {/* Firefox Tab Strip (#1C1B22) */}
        <div className="flex items-center justify-between h-[40px] px-2 pt-1.5 bg-[#1C1B22] select-none shrink-0">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              const tabUrl = tab.history[tab.historyIdx] || homeUrl;
              const label = isActive ? response.pageTitle : tabUrl.replace(/^https?:\/\//, '');
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 h-[32px] px-3 rounded-t-lg text-xs cursor-pointer max-w-[220px] min-w-[130px] transition-colors ${
                    isActive
                      ? 'bg-[#42414D] text-[#FBFBFE] shadow-sm'
                      : 'text-[#B1B1B3] hover:bg-[#2B2A33]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-[#00DDFF] shrink-0" />
                  <span className="truncate flex-1">{label}</span>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => closeTab(tab.id, e)}
                      aria-label="タブを閉じる"
                      className="p-0.5 rounded hover:bg-[#5B5B66] text-[#B1B1B3] hover:text-white opacity-80 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addTab}
              title="新しいタブ"
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#B1B1B3] hover:bg-[#2B2A33] hover:text-white transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Firefox Window Caption Branding */}
          <div className="hidden sm:flex items-center gap-2 px-3 text-[11px] text-[#9E9EA8] shrink-0">
            <span>Firefox</span>
          </div>
        </div>

        {/* Firefox Navigation Toolbar (#2B2A33) */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#2B2A33] border-b border-[#18181D] shrink-0">
          <button
            type="button"
            onClick={goBack}
            disabled={activeTab.historyIdx <= 0}
            title="戻る"
            className="p-1.5 rounded-md text-[#FBFBFE] hover:bg-[#3A3944] disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={activeTab.historyIdx >= activeTab.history.length - 1}
            title="進む"
            className="p-1.5 rounded-md text-[#FBFBFE] hover:bg-[#3A3944] disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setUrlInput(activeUrl)}
            title="再読み込み"
            className="p-1.5 rounded-md text-[#FBFBFE] hover:bg-[#3A3944] transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Firefox Megabar Address Input */}
          <form onSubmit={handleAddressSubmit} className="flex-1 flex items-center min-w-[200px]">
            <div className="w-full flex items-center gap-2 bg-[#1C1B22] border border-[#4A4954] focus-within:border-[#00DDFF] rounded-md px-2.5 py-1.5 transition-colors">
              <Shield className="w-3.5 h-3.5 text-[#B1B1B3] shrink-0" />
              <span className="h-3.5 w-[1px] bg-[#3B3A45] shrink-0" />
              {activeUrl.startsWith('https') ? (
                <Lock className="w-3.5 h-3.5 text-[#3FE1B0] shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-[#B1B1B3] shrink-0" />
              )}
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-transparent text-[13px] font-mono text-[#FBFBFE] placeholder:text-[#8F8F9D] focus:outline-none"
                aria-label="Firefox アドレスバー"
              />
              <button
                type="button"
                onClick={toggleBookmark}
                title="このページをブックマーク"
                className={`p-0.5 rounded hover:bg-[#3A3944] transition-colors ${
                  isBookmarked ? 'text-[#00DDFF]' : 'text-[#8F8F9D]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </form>

          {/* Firefox DevTools Toggle */}
          <button
            type="button"
            onClick={() => setShowDevTools((v) => !v)}
            title="ウェブ開発ツール (F12)"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              showDevTools
                ? 'bg-[#0A84FF] text-white'
                : 'text-[#FBFBFE] hover:bg-[#3A3944]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            開発ツール
          </button>
        </div>

        {/* Optional Bookmarks Strip */}
        {bookmarks.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#2B2A33] border-b border-[#18181D] overflow-x-auto shrink-0">
            {bookmarks.map((bm) => (
              <button
                key={bm}
                type="button"
                onClick={() => navigateTo(bm)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono text-[#E0E0E6] hover:bg-[#3A3944] rounded transition-colors whitespace-nowrap shrink-0"
              >
                <Globe className="w-3 h-3 text-[#00DDFF]" />
                {bm.replace(/^https?:\/\//, '')}
              </button>
            ))}
          </div>
        )}

        {/* Viewport + Firefox Bottom DevTools Split */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 bg-[#FFFFFF] text-slate-900 overflow-y-auto">
            {response.error ? (
              <div className="max-w-xl mx-auto mt-14 px-6 space-y-5 text-slate-800">
                <div className="flex items-center gap-3 text-slate-900">
                  <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
                  <h1 className="text-xl font-semibold">接続に問題が発生しました</h1>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{response.error}</p>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
                  <li>対象サーバーで HTTP/HTTPS サービスが稼働していないか、ポート番号が異なっている可能性があります。</li>
                  <li>ファイアウォールやポートノッキングによって該当ポートが遮断されている場合があります。</li>
                  <li>ポートスキャンやサービス確認はターミナルから実行できます。</li>
                </ul>
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => navigateTo(homeUrl)}
                    className="px-4 py-2 text-xs font-medium bg-[#0060DF] hover:bg-[#0250BB] text-white rounded transition-colors"
                  >
                    ホームURLで再試行
                  </button>
                  {activeTab.historyIdx > 0 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
                    >
                      前のページに戻る
                    </button>
                  )}
                </div>
              </div>
            ) : response.contentType === 'text/html' &&
              response.status < 400 &&
              !response.body.trim().startsWith('Index of ') ? (
              <TargetSiteRenderer
                server={server}
                body={response.body}
                status={response.status}
                queryParamInput={queryParamInput}
                onQueryParamChange={setQueryParamInput}
                onInteractiveSubmit={handleInteractiveSubmit}
                onNavigatePath={(pathWithQuery) => {
                  const scheme = primaryType === 'https' ? 'https' : 'http';
                  const portPart =
                    primaryPort && primaryPort !== 80 && primaryPort !== 443 ? `:${primaryPort}` : '';
                  const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
                  navigateTo(`${scheme}://${server.ip}${portPart}${cleanPath}`);
                }}
              />
            ) : (
              <WebResponseViewer
                server={server}
                activeUrl={activeUrl}
                homeUrl={homeUrl}
                response={response}
                canGoBack={activeTab.historyIdx > 0}
                onGoBack={goBack}
                onGoHome={() => navigateTo(homeUrl)}
                onNavigatePath={(pathWithQuery) => {
                  const scheme = primaryType === 'https' ? 'https' : 'http';
                  const portPart =
                    primaryPort && primaryPort !== 80 && primaryPort !== 443 ? `:${primaryPort}` : '';
                  const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
                  navigateTo(`${scheme}://${server.ip}${portPart}${cleanPath}`);
                }}
                onOpenRequestHeaders={() => {
                  setShowDevTools(true);
                  setDevToolsTab('request');
                }}
                queryParamInput={queryParamInput}
                onQueryParamChange={setQueryParamInput}
                onInteractiveSubmit={handleInteractiveSubmit}
              />
            )}
          </div>

          {/* Firefox Bottom DevTools Panel */}
          {showDevTools && (
            <div className="h-[220px] bg-[#18181B] border-t border-[#383740] flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 bg-[#232329] border-b border-[#383740]">
                <div className="flex items-center gap-1">
                  {[
                    { id: 'headers', label: 'ネットワーク / ヘッダ' },
                    { id: 'raw', label: 'レスポンス生データ' },
                    { id: 'request', label: 'リクエストヘッダ編集' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDevToolsTab(t.id as typeof devToolsTab)}
                      className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                        devToolsTab === t.id
                          ? 'text-[#00DDFF] border-[#00DDFF]'
                          : 'text-[#B1B1B3] border-transparent hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowDevTools(false)}
                  className="p-1 text-[#B1B1B3] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {devToolsTab === 'headers' && (
                  <div className="space-y-2">
                    <div className="text-slate-400">
                      GET {activeUrl} — Status: <span className="text-emerald-400">{response.status}</span>
                    </div>
                    <pre className="text-sky-400 whitespace-pre-wrap">
                      {Object.entries(response.headers)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n') || '(No headers)'}
                    </pre>
                  </div>
                )}

                {devToolsTab === 'raw' && (
                  <pre className="text-slate-300 whitespace-pre-wrap break-all">
                    {response.body || '(Empty)'}
                  </pre>
                )}

                {devToolsTab === 'request' && (
                  <div className="space-y-2 max-w-2xl">
                    <label className="block text-slate-400">Authorization Header</label>
                    <input
                      type="text"
                      value={authHeader}
                      onChange={(e) => setAuthHeader(e.target.value)}
                      placeholder="Bearer <JWT>"
                      className="w-full bg-[#1C1B22] border border-[#4A4954] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00DDFF]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
