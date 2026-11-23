import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCode2,
  FileText,
  Folder,
  Globe,
  KeyRound,
  RotateCw,
  Search,
  Server as ServerIcon,
  ShieldAlert,
  Terminal,
  WrapText,
} from 'lucide-react';
import { ServerConfig, WebRoute } from '../types/game';

export interface WebResponseData {
  error: string | null;
  status: number;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  route: WebRoute | null;
  recordedPath: string | null;
  detectedFlag?: string | null;
  pageTitle: string;
}

interface WebResponseViewerProps {
  server: ServerConfig;
  activeUrl: string;
  homeUrl: string;
  response: WebResponseData;
  canGoBack: boolean;
  onGoBack: () => void;
  onGoHome: () => void;
  onNavigatePath: (pathWithQuery: string) => void;
  onOpenRequestHeaders: () => void;
  queryParamInput: string;
  onQueryParamChange: (val: string) => void;
  onInteractiveSubmit: (e: React.FormEvent, paramName: string, basePath: string) => void;
}

function formatBytes(str: string): string {
  const bytes = new Blob([str]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getBrandAccent(template?: ServerConfig['siteTemplate']) {
  switch (template) {
    case 'bank':
      return {
        bg: 'bg-[#0B1F3A]',
        text: 'text-[#F7D774]',
        btn: 'bg-[#0B1F3A] hover:bg-[#14335C] text-white',
        label: 'METROPOLITAN TRUST BANK',
      };
    case 'medical':
      return {
        bg: 'bg-[#0F766E]',
        text: 'text-white',
        btn: 'bg-[#0F766E] hover:bg-[#0D625B] text-white',
        label: 'Aegis Medical Center',
      };
    case 'realestate':
      return {
        bg: 'bg-[#1E242B]',
        text: 'text-amber-400',
        btn: 'bg-[#1E242B] hover:bg-slate-800 text-white',
        label: 'UrbanEstates Portal',
      };
    case 'exchange':
      return {
        bg: 'bg-[#0D1320]',
        text: 'text-indigo-400',
        btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        label: 'VORTEX Custody Edge',
      };
    case 'gov':
      return {
        bg: 'bg-[#0F172A]',
        text: 'text-sky-300',
        btn: 'bg-[#0F172A] hover:bg-slate-800 text-white',
        label: 'Public Administration Portal',
      };
    case 'hotel':
      return {
        bg: 'bg-[#2C1E1A]',
        text: 'text-amber-300',
        btn: 'bg-[#5C3A21] hover:bg-[#462C19] text-white',
        label: 'Hospitality PMS',
      };
    case 'media':
      return {
        bg: 'bg-[#18181B]',
        text: 'text-rose-400',
        btn: 'bg-rose-600 hover:bg-rose-500 text-white',
        label: 'Media & Publishing Edge',
      };
    case 'retail':
      return {
        bg: 'bg-[#14532D]',
        text: 'text-emerald-300',
        btn: 'bg-emerald-700 hover:bg-emerald-600 text-white',
        label: 'Retail POS Network',
      };
    case 'factory':
      return {
        bg: 'bg-[#1E293B]',
        text: 'text-amber-400',
        btn: 'bg-amber-600 hover:bg-amber-500 text-white',
        label: 'Industrial SCADA Gateway',
      };
    case 'aviation':
      return {
        bg: 'bg-[#0C4A6E]',
        text: 'text-sky-300',
        btn: 'bg-[#0369A1] hover:bg-[#075985] text-white',
        label: 'Aviation & Telemetry Ops',
      };
    case 'telecom':
      return {
        bg: 'bg-[#172554]',
        text: 'text-cyan-300',
        btn: 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white',
        label: 'Carrier NOC Proxy',
      };
    case 'energy':
      return {
        bg: 'bg-[#064E3B]',
        text: 'text-lime-300',
        btn: 'bg-[#047857] hover:bg-[#065F46] text-white',
        label: 'SmartGrid Control Node',
      };
    default:
      return {
        bg: 'bg-slate-900',
        text: 'text-sky-400',
        btn: 'bg-[#0060DF] hover:bg-[#0250BB] text-white',
        label: 'Web Portal',
      };
  }
}

function isRouteLikeString(val: string): boolean {
  return (
    val.startsWith('/') &&
    !val.startsWith('//') &&
    !val.includes('\n') &&
    val.length > 1 &&
    val.length < 80 &&
    !/\s/.test(val)
  );
}

// ============================================================================
// Recursive JSON Tree Node (Firefox JSON Viewer Style)
// ============================================================================
const JsonTreeNode: React.FC<{
  name?: string;
  value: unknown;
  depth: number;
  expandAllSignal: number;
  collapseAllSignal: number;
  filterText: string;
  onNavigatePath: (path: string) => void;
}> = ({
  name,
  value,
  depth,
  expandAllSignal,
  collapseAllSignal,
  filterText,
  onNavigatePath,
}) => {
  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);
  const [expanded, setExpanded] = useState(depth < 3);

  React.useEffect(() => {
    if (expandAllSignal > 0) setExpanded(true);
  }, [expandAllSignal]);

  React.useEffect(() => {
    if (collapseAllSignal > 0) setExpanded(depth === 0);
  }, [collapseAllSignal, depth]);

  const lowerFilter = filterText.trim().toLowerCase();
  if (lowerFilter && depth > 0) {
    const serialized = JSON.stringify({ [name ?? '']: value }).toLowerCase();
    if (!serialized.includes(lowerFilter)) {
      return null;
    }
  }

  if (!isObject) {
    let valueNode: React.ReactNode;
    if (typeof value === 'string') {
      const clickable = isRouteLikeString(value);
      const hasFlag = /FLAG\{[^}]+\}/.test(value);
      valueNode = clickable ? (
        <button
          type="button"
          onClick={() => onNavigatePath(value)}
          title={`${value} へ移動`}
          className="text-[#0060DF] hover:underline font-mono text-left break-all cursor-pointer"
        >
          "{value}"
        </button>
      ) : (
        <span
          className={`break-all whitespace-pre-wrap ${
            hasFlag
              ? 'text-emerald-700 bg-emerald-50 px-1 rounded font-semibold'
              : 'text-[#057A55]'
          }`}
        >
          "{value}"
        </span>
      );
    } else if (typeof value === 'number') {
      valueNode = <span className="text-[#1D4ED8] tabular-nums">{String(value)}</span>;
    } else if (typeof value === 'boolean') {
      valueNode = <span className="text-[#7C3AED] font-semibold">{String(value)}</span>;
    } else {
      valueNode = <span className="text-slate-500 italic">null</span>;
    }

    return (
      <div
        className="flex items-start gap-1.5 py-0.5 hover:bg-slate-100/80 rounded px-1.5 leading-relaxed"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {name !== undefined && (
          <>
            <span className="text-[#0369A1] font-medium shrink-0">"{name}"</span>
            <span className="text-slate-500 shrink-0">:</span>
          </>
        )}
        {valueNode}
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div>
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 py-0.5 hover:bg-slate-100/80 rounded px-1.5 cursor-pointer select-none leading-relaxed"
        style={{ paddingLeft: `${depth * 18 + 4}px` }}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        {name !== undefined && (
          <>
            <span className="text-[#0369A1] font-medium">{name}</span>
            <span className="text-slate-500 mr-1">:</span>
          </>
        )}
        <span className="text-slate-600">{openBracket}</span>
        {!expanded && (
          <span className="text-slate-400 text-[11px] mx-1">
            {isArray ? `${entries.length} items` : `${entries.length} properties`}
          </span>
        )}
        {!expanded && <span className="text-slate-600">{closeBracket}</span>}
      </div>

      {expanded && (
        <div>
          {entries.map(([k, v]) => (
            <JsonTreeNode
              key={k}
              name={isArray ? `${k}` : k}
              value={v}
              depth={depth + 1}
              expandAllSignal={expandAllSignal}
              collapseAllSignal={collapseAllSignal}
              filterText={filterText}
              onNavigatePath={onNavigatePath}
            />
          ))}
          <div
            className="text-slate-600 py-0.5 px-1.5"
            style={{ paddingLeft: `${depth * 18 + 22}px` }}
          >
            {closeBracket}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Response Viewer
// ============================================================================
export const WebResponseViewer: React.FC<WebResponseViewerProps> = ({
  server,
  activeUrl,
  homeUrl,
  response,
  canGoBack,
  onGoBack,
  onGoHome,
  onNavigatePath,
  onOpenRequestHeaders,
  queryParamInput,
  onQueryParamChange,
  onInteractiveSubmit,
}) => {
  const [jsonTab, setJsonTab] = useState<'json' | 'raw' | 'headers'>('json');
  const [prettyRaw, setPrettyRaw] = useState(true);
  const [jsonFilter, setJsonFilter] = useState('');
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  const parsedUrl = useMemo(() => {
    try {
      const norm = activeUrl.startsWith('http') ? activeUrl : `http://${activeUrl}`;
      return new URL(norm);
    } catch {
      return null;
    }
  }, [activeUrl]);

  const routePath = parsedUrl
    ? parsedUrl.pathname === '/'
      ? '/'
      : parsedUrl.pathname.replace(/\/+$/, '')
    : '/';

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const serverBanner = response.headers.Server || 'nginx';
  const portNum = parsedUrl?.port || (parsedUrl?.protocol === 'https:' ? '443' : '80');
  const trimmedBody = response.body.trim();

  const isJsonResponse = response.contentType === 'application/json';
  const isApiServerHome =
    server.services.some(
      (s) =>
        (s.type === 'http' || s.type === 'https' || s.type === 'custom') &&
        s.webRoutes?.some((r) => r.path === '/' && r.contentType === 'application/json')
    ) || routePath.startsWith('/api');

  const jsonPayload = useMemo(() => {
    if (isJsonResponse) {
      try {
        return JSON.parse(response.body);
      } catch {
        return null;
      }
    }
    if (response.status >= 400 && isApiServerHome) {
      return {
        timestamp: '2026-11-23T02:30:00Z',
        status: response.status,
        error: response.status === 404 ? 'Not Found' : response.status === 403 ? 'Forbidden' : 'Unauthorized',
        path: routePath,
        message: response.body,
        server: serverBanner,
      };
    }
    return null;
  }, [isJsonResponse, response.body, response.status, isApiServerHome, routePath, serverBanner]);

  // --------------------------------------------------------------------------
  // 1. Directory Listing (Index of /...) — Lv.1 /backup, Lv.1b /backups, etc.
  // --------------------------------------------------------------------------
  if (response.status === 200 && trimmedBody.startsWith('Index of ')) {
    const rawLines = trimmedBody.split('\n').map((l) => l.trim()).filter(Boolean);
    const heading = rawLines[0] || `Index of ${routePath}/`;
    const entries = rawLines.slice(1);
    const baseDir = routePath === '/' ? '' : routePath;

    return (
      <div className="min-h-full bg-white text-slate-900 flex flex-col justify-between">
        <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-3">
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
              {heading}
            </h1>
            <button
              type="button"
              onClick={onGoHome}
              className="text-xs font-medium text-[#0060DF] hover:underline"
            >
              ポータルトップに戻る
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-xs text-slate-600">
                  <th className="py-2 pr-6 font-semibold">Name</th>
                  <th className="py-2 pr-6 font-semibold">Last modified</th>
                  <th className="py-2 pr-6 font-semibold text-right">Size</th>
                  <th className="py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, idx) => {
                  const isParent = entry === '../' || entry === '..';
                  const isDir = entry.endsWith('/');
                  const targetPath = isParent
                    ? '/'
                    : `${baseDir}/${entry.replace(/\/+$/, '')}`;
                  const fakeSize = isParent || isDir ? '-' : entry.includes('csv') ? '1.8K' : entry.includes('flag') ? '42 B' : '128 B';
                  const fakeDate = isParent ? '' : `2026-11-${String(12 + idx).padStart(2, '0')} 09:${String(15 + idx * 7).padStart(2, '0')}`;

                  return (
                    <tr key={entry} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-6">
                        <button
                          type="button"
                          onClick={() => onNavigatePath(targetPath)}
                          className="inline-flex items-center gap-2 text-[#0000EE] hover:underline cursor-pointer"
                        >
                          {isParent ? (
                            <ArrowLeft className="w-4 h-4 text-slate-500" />
                          ) : isDir ? (
                            <Folder className="w-4 h-4 text-amber-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-500" />
                          )}
                          <span>{isParent ? 'Parent Directory' : entry}</span>
                        </button>
                      </td>
                      <td className="py-2.5 pr-6 text-xs text-slate-600 tabular-nums">{fakeDate}</td>
                      <td className="py-2.5 pr-6 text-xs text-slate-600 text-right tabular-nums">{fakeSize}</td>
                      <td className="py-2.5 text-xs text-slate-500 font-sans">
                        {isParent
                          ? '親ディレクトリへ移動'
                          : entry.endsWith('.csv')
                          ? 'CSV データファイル'
                          : entry.endsWith('.txt')
                          ? 'テキストファイル'
                          : 'ファイル'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <hr className="border-slate-300" />
          <address className="text-xs font-mono text-slate-500 not-italic">
            {serverBanner} Server at {server.ip} Port {portNum}
          </address>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. JSON Responses (200, 401, 403, or API 404) — Firefox JSON Viewer
  // --------------------------------------------------------------------------
  if (jsonPayload !== null) {
    const formattedJson = JSON.stringify(jsonPayload, null, 2);
    const hasHtmlHome = server.services.some((s) =>
      s.webRoutes?.some((r) => r.path === '/' && r.contentType === 'text/html')
    );

    const interactiveParam = response.route?.idorConfig
      ? { param: response.route.idorConfig.param, label: 'IDパラメータ', placeholder: '101' }
      : response.route?.sqliResponse
      ? { param: response.route.sqliResponse.vulnerableParam, label: '検索クエリ', placeholder: 'Keyboard' }
      : response.route?.sstiEnabled
      ? { param: 'name', label: 'テンプレート変数', placeholder: 'guest' }
      : null;

    return (
      <div className="min-h-full bg-[#F9F9FB] text-slate-900 flex flex-col">
        {/* Firefox JSON Viewer Toolbar */}
        <div className="bg-[#EFEFF2] border-b border-[#D7D7DB] px-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center">
            {[
              { id: 'json', label: 'JSON' },
              { id: 'raw', label: '生データ' },
              { id: 'headers', label: 'ヘッダー' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setJsonTab(t.id as typeof jsonTab)}
                className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                  jsonTab === t.id
                    ? 'border-[#0060DF] text-[#0060DF] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 py-1.5 flex-wrap">
            {jsonTab === 'json' && (
              <>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                  <input
                    type="text"
                    value={jsonFilter}
                    onChange={(e) => setJsonFilter(e.target.value)}
                    placeholder="JSON を絞り込み"
                    className="bg-white border border-[#CFCFD4] rounded pl-7 pr-2.5 py-1 text-xs text-slate-800 w-44 focus:outline-none focus:border-[#0060DF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setExpandSignal((s) => s + 1)}
                  className="px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-[#CFCFD4] rounded transition-colors"
                >
                  すべて展開
                </button>
                <button
                  type="button"
                  onClick={() => setCollapseSignal((s) => s + 1)}
                  className="px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-[#CFCFD4] rounded transition-colors"
                >
                  折りたたむ
                </button>
              </>
            )}

            {jsonTab === 'raw' && (
              <button
                type="button"
                onClick={() => setPrettyRaw((v) => !v)}
                className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                  prettyRaw
                    ? 'bg-[#0060DF] text-white border-[#0060DF]'
                    : 'bg-white text-slate-700 border-[#CFCFD4] hover:bg-slate-100'
                }`}
              >
                整形表示
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCopy(formattedJson)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-[#CFCFD4] rounded transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'コピー済' : 'コピー'}
            </button>

            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                response.status >= 400
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              HTTP {response.status}
            </span>

            {hasHtmlHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="text-xs text-[#0060DF] hover:underline font-medium ml-1"
              >
                ポータルトップに戻る
              </button>
            )}
          </div>
        </div>

        {/* Auth Required Notice for 401/403 JWT routes */}
        {(response.status === 401 || response.status === 403) &&
          response.route?.requiresAuth?.type === 'bearer_jwt' && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  このエンドポイントは管理者権限の Bearer JWT 認証が必要です。開発ツールから Authorization ヘッダを送信できます。
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenRequestHeaders}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded transition-colors whitespace-nowrap"
              >
                開発ツールで Authorization ヘッダを設定
              </button>
            </div>
          )}

        {/* Interactive Parameter Inquiry Strip (for IDOR / SQLi / SSTI JSON endpoints) */}
        {interactiveParam && (
          <form
            onSubmit={(e) => onInteractiveSubmit(e, interactiveParam.param, routePath)}
            className="bg-white border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center gap-2.5 text-xs"
          >
            <span className="font-semibold text-slate-700">
              クエリパラメータ ({interactiveParam.param}):
            </span>
            <input
              type="text"
              value={queryParamInput}
              onChange={(e) => onQueryParamChange(e.target.value)}
              placeholder={
                parsedUrl?.searchParams.get(interactiveParam.param) || interactiveParam.placeholder
              }
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-mono text-xs text-slate-900 w-64 focus:outline-none focus:border-[#0060DF]"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-[#0060DF] hover:bg-[#0250BB] text-white font-medium rounded transition-colors"
            >
              リクエスト再送信
            </button>
            {parsedUrl?.search && (
              <span className="text-[11px] font-mono text-slate-500 ml-auto">
                現在のクエリ: {parsedUrl.search}
              </span>
            )}
          </form>
        )}

        {/* JSON Content Body */}
        <div className="flex-1 bg-white p-4 font-mono text-[13px] overflow-auto">
          {jsonTab === 'json' && (
            <div className="max-w-5xl">
              <JsonTreeNode
                value={jsonPayload}
                depth={0}
                expandAllSignal={expandSignal}
                collapseAllSignal={collapseSignal}
                filterText={jsonFilter}
                onNavigatePath={onNavigatePath}
              />
            </div>
          )}

          {jsonTab === 'raw' && (
            <pre className="text-slate-800 whitespace-pre-wrap break-all leading-relaxed">
              {prettyRaw ? formattedJson : response.body}
            </pre>
          )}

          {jsonTab === 'headers' && (
            <div className="max-w-3xl space-y-4">
              <div>
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-500 mb-2">
                  応答ヘッダー
                </h3>
                <div className="border border-slate-200 rounded overflow-hidden divide-y divide-slate-100">
                  <div className="flex px-3 py-2 text-xs bg-slate-50">
                    <span className="w-44 font-semibold text-slate-600">HTTP Status</span>
                    <span className="text-slate-900">{response.status}</span>
                  </div>
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex px-3 py-2 text-xs">
                      <span className="w-44 font-semibold text-slate-600">{k}</span>
                      <span className="text-slate-900 break-all">{v}</span>
                    </div>
                  ))}
                  <div className="flex px-3 py-2 text-xs">
                    <span className="w-44 font-semibold text-slate-600">Content-Length</span>
                    <span className="text-slate-900 tabular-nums">{new Blob([response.body]).size}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-500 mb-2">
                  リクエスト情報
                </h3>
                <div className="border border-slate-200 rounded overflow-hidden divide-y divide-slate-100 text-xs">
                  <div className="flex px-3 py-2">
                    <span className="w-44 font-semibold text-slate-600">Request URL</span>
                    <span className="text-slate-900 break-all">{activeUrl}</span>
                  </div>
                  <div className="flex px-3 py-2">
                    <span className="w-44 font-semibold text-slate-600">Method</span>
                    <span className="text-slate-900">GET</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. HTTP Error Pages (404 / 403 / 401 non-JSON) — Apache / nginx / Branded
  // --------------------------------------------------------------------------
  if (response.status >= 400) {
    const isApache = serverBanner.toLowerCase().includes('apache');
    const isBrandedPortal =
      server.siteTemplate === 'bank' ||
      server.siteTemplate === 'medical' ||
      server.siteTemplate === 'realestate' ||
      server.siteTemplate === 'ecommerce' ||
      server.siteTemplate === 'exchange' ||
      server.siteTemplate === 'gov' ||
      server.siteTemplate === 'hotel' ||
      server.siteTemplate === 'media' ||
      server.siteTemplate === 'retail' ||
      server.siteTemplate === 'factory' ||
      server.siteTemplate === 'aviation' ||
      server.siteTemplate === 'telecom' ||
      server.siteTemplate === 'energy';

    if (isBrandedPortal && response.status === 404) {
      const brand = getBrandAccent(server.siteTemplate);
      return (
        <div className="min-h-full bg-[#F8FAFC] text-slate-900 flex flex-col">
          <header className={`${brand.bg} text-white px-6 py-4 border-b border-black/10`}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <div className="text-base font-bold">{server.siteBrand?.title || server.name}</div>
                <div className={`text-[11px] ${brand.text}`}>{brand.label}</div>
              </div>
              <span className="text-xs font-mono text-slate-300">{server.ip}</span>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-8 shadow-sm space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono font-semibold text-rose-600 tabular-nums">
                    HTTP 404 Not Found
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">
                    お探しのページは見つかりませんでした
                  </h1>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                指定された URL（<code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{routePath}</code>）は削除されたか、移動または一時的にアクセスできない状態です。
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-600 space-y-1">
                <div>Requested Path: GET {routePath}</div>
                <div>Server: {serverBanner}</div>
                <div>Host: {server.ip}:{portNum}</div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onGoHome}
                  className={`px-4 py-2 text-xs font-medium rounded transition-colors ${brand.btn}`}
                >
                  ポータルトップに戻る
                </button>
                {canGoBack && (
                  <button
                    type="button"
                    onClick={onGoBack}
                    className="px-4 py-2 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded transition-colors"
                  >
                    前のページに戻る
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isApache) {
      const title = response.status === 403 ? 'Forbidden' : 'Not Found';
      const detail =
        response.status === 403
          ? `You don't have permission to access ${routePath} on this server.`
          : `The requested URL ${routePath} was not found on this server.`;

      return (
        <div className="min-h-full bg-white text-black px-8 py-8 font-serif flex flex-col justify-between">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-base">{detail}</p>
            <hr className="border-slate-300 my-4" />
            <address className="text-sm italic text-slate-700">
              {serverBanner} Server at {server.ip} Port {portNum}
            </address>

            <div className="pt-6 font-sans flex items-center gap-3">
              <button
                type="button"
                onClick={onGoHome}
                className="px-3.5 py-1.5 text-xs font-medium bg-[#0060DF] hover:bg-[#0250BB] text-white rounded transition-colors"
              >
                ポータルトップに戻る
              </button>
              {canGoBack && (
                <button
                  type="button"
                  onClick={onGoBack}
                  className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
                >
                  前のページに戻る
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Authentic nginx / generic web server 404/403
    const statusLabel =
      response.status === 403
        ? '403 Forbidden'
        : response.status === 401
        ? '401 Authorization Required'
        : '404 Not Found';

    return (
      <div className="min-h-full bg-white text-slate-900 px-8 py-12 flex flex-col items-center">
        <div className="w-full max-w-2xl text-center space-y-3">
          <h1 className="text-3xl font-serif font-bold text-slate-900">{statusLabel}</h1>
          <hr className="border-slate-300" />
          <div className="text-sm font-serif text-slate-700">{serverBanner}</div>
          <div className="text-xs font-mono text-slate-400 pt-2">
            GET {routePath} · {server.ip}:{portNum}
          </div>

          <div className="pt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoHome}
              className="px-4 py-2 text-xs font-medium bg-[#0060DF] hover:bg-[#0250BB] text-white rounded transition-colors"
            >
              ポータルトップに戻る
            </button>
            {canGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
              >
                前のページに戻る
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. Interactive Tool Endpoints (/diag, /view, /fetch)
  // --------------------------------------------------------------------------
  if (response.route?.cmdInjEnabled) {
    const currentHost = parsedUrl?.searchParams.get('host') || '127.0.0.1';
    return (
      <div className="min-h-full bg-[#F8FAFC] text-slate-900 flex flex-col">
        <header className="bg-slate-900 text-white px-6 py-4 border-b-2 border-amber-500">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-amber-400" />
              <div>
                <h1 className="text-sm font-bold">{server.siteBrand?.title || server.name} — 疎通診断結果</h1>
                <p className="text-[11px] text-slate-300 font-mono">GET {routePath}?host={currentHost}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoHome}
              className="text-xs text-sky-300 hover:underline"
            >
              ポータルトップに戻る
            </button>
          </div>
        </header>

        <div className="max-w-4xl w-full mx-auto px-6 py-6 space-y-4">
          <form
            onSubmit={(e) => onInteractiveSubmit(e, 'host', routePath)}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-2 shadow-sm"
          >
            <label className="text-xs font-semibold text-slate-700 mr-1">対象ホスト:</label>
            <input
              type="text"
              value={queryParamInput}
              onChange={(e) => onQueryParamChange(e.target.value)}
              placeholder={currentHost}
              className="flex-1 min-w-[200px] bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0060DF]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0060DF] hover:bg-[#0250BB] text-white text-xs font-medium rounded transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Ping再実行
            </button>
          </form>

          <div className="bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-[#1E293B] border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 font-mono">
              <span>stdout — ping -c 1 {currentHost}</span>
              <button
                type="button"
                onClick={() => handleCopy(response.body)}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'コピー済' : '出力をコピー'}
              </button>
            </div>
            <pre className="p-5 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
              {response.body}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (response.route?.lfiEnabled || response.route?.ssrfInternalTarget) {
    const isSsrf = Boolean(response.route?.ssrfInternalTarget);
    const paramName = isSsrf ? 'url' : 'file';
    const currentParam = parsedUrl?.searchParams.get(paramName) || (isSsrf ? 'https://example.com' : 'welcome.txt');

    return (
      <div className="min-h-full bg-[#F8FAFC] text-slate-900 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {isSsrf ? (
                <Globe className="w-5 h-5 text-sky-600" />
              ) : (
                <FileText className="w-5 h-5 text-teal-600" />
              )}
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  {isSsrf ? `プロキシ取得結果 (${routePath})` : `ドキュメントビューア (${routePath})`}
                </h1>
                <p className="text-xs font-mono text-slate-500">
                  {paramName}={currentParam}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoHome}
              className="text-xs font-medium text-[#0060DF] hover:underline"
            >
              ポータルトップに戻る
            </button>
          </div>
        </header>

        <div className="max-w-4xl w-full mx-auto px-6 py-6 space-y-4">
          <form
            onSubmit={(e) => onInteractiveSubmit(e, paramName, routePath)}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-2 shadow-sm"
          >
            <label className="text-xs font-semibold text-slate-700 mr-1">
              {isSsrf ? '取得先URL:' : 'ファイル名:'}
            </label>
            <input
              type="text"
              value={queryParamInput}
              onChange={(e) => onQueryParamChange(e.target.value)}
              placeholder={currentParam}
              className="flex-1 min-w-[220px] bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0060DF]"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0060DF] hover:bg-[#0250BB] text-white text-xs font-medium rounded transition-colors"
            >
              {isSsrf ? '取得' : '表示'}
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>{currentParam} · {formatBytes(response.body)}</span>
              <button
                type="button"
                onClick={() => handleCopy(response.body)}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
            <pre className="p-5 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-all bg-white">
              {response.body}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 5. Plain-Text / Config / Key / Flag / CSV Viewer (Firefox Plain Text Style)
  // --------------------------------------------------------------------------
  const lines = response.body.replace(/\n$/, '').split('\n');
  const fileName = routePath.split('/').filter(Boolean).pop() || 'document.txt';

  return (
    <div className="min-h-full bg-[#F9F9FB] text-slate-900 flex flex-col">
      {/* Firefox Source / Plain-Text Header Bar */}
      <div className="bg-[#EFEFF2] border-b border-[#D7D7DB] px-5 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 text-xs text-slate-700 font-mono">
          <FileCode2 className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-900">{routePath}</span>
          <span className="text-slate-400">·</span>
          <span>{response.contentType}</span>
          <span className="text-slate-400">·</span>
          <span className="tabular-nums">{formatBytes(response.body)}</span>
          <span className="text-slate-400">·</span>
          <span className="tabular-nums">{lines.length} 行</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWrapLines((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs border rounded transition-colors ${
              wrapLines
                ? 'bg-[#0060DF] text-white border-[#0060DF]'
                : 'bg-white text-slate-700 border-[#CFCFD4] hover:bg-slate-100'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
            折り返し
          </button>
          <button
            type="button"
            onClick={() => handleCopy(response.body)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-[#CFCFD4] rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'コピー済' : '内容をコピー'}
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="text-xs text-[#0060DF] hover:underline font-medium ml-1"
          >
            ポータルトップに戻る
          </button>
        </div>
      </div>

      {/* Line-Numbered Document Body */}
      <div className="flex-1 bg-white overflow-auto font-mono text-[13px] leading-6">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isComment = line.trim().startsWith('#');
              const isSection = /^\[.+\]$/.test(line.trim());
              const isEnvKv = /^[A-Z0-9_]+=/.test(line.trim());
              const isRobotsDirective = /^(User-agent|Disallow|Allow):/i.test(line.trim());
              const hasFlag = /FLAG\{[^}]+\}/.test(line);
              const isPemBoundary = line.includes('-----BEGIN') || line.includes('-----END');

              let renderedLine: React.ReactNode = line || '\u00A0';
              if (hasFlag) {
                renderedLine = (
                  <span className="bg-emerald-50 text-emerald-800 font-semibold px-1 rounded">
                    {line}
                  </span>
                );
              } else if (isPemBoundary) {
                renderedLine = <span className="text-amber-700 font-semibold">{line}</span>;
              } else if (isComment) {
                renderedLine = <span className="text-slate-400 italic">{line}</span>;
              } else if (isSection) {
                renderedLine = <span className="text-purple-700 font-semibold">{line}</span>;
              } else if (isEnvKv) {
                const eqIdx = line.indexOf('=');
                renderedLine = (
                  <>
                    <span className="text-[#0369A1] font-semibold">{line.slice(0, eqIdx)}</span>
                    <span className="text-slate-500">=</span>
                    <span className="text-[#057A55]">{line.slice(eqIdx + 1)}</span>
                  </>
                );
              } else if (isRobotsDirective) {
                const colonIdx = line.indexOf(':');
                const val = line.slice(colonIdx + 1).trim();
                const clickablePath = val.startsWith('/') ? val.replace(/\/$/, '') || '/' : null;
                renderedLine = (
                  <>
                    <span className="text-[#0369A1] font-semibold">{line.slice(0, colonIdx + 1)}</span>{' '}
                    {clickablePath ? (
                      <button
                        type="button"
                        onClick={() => onNavigatePath(clickablePath)}
                        className="text-[#0060DF] hover:underline cursor-pointer"
                      >
                        {val}
                      </button>
                    ) : (
                      <span className="text-slate-800">{val}</span>
                    )}
                  </>
                );
              }

              return (
                <tr key={idx} className="hover:bg-slate-50/90">
                  <td className="w-12 select-none text-right pr-3 pl-3 text-[11px] text-slate-400 bg-[#F9F9FB] border-r border-slate-200 align-top tabular-nums">
                    {idx + 1}
                  </td>
                  <td
                    className={`px-4 text-slate-800 ${
                      wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                    }`}
                  >
                    {renderedLine}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#F9F9FB] border-t border-slate-200 px-5 py-1.5 text-[11px] font-mono text-slate-500 flex items-center justify-between shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <ServerIcon className="w-3 h-3" />
          {fileName} · {serverBanner}
        </span>
        <span>{server.ip}:{portNum}</span>
      </div>
    </div>
  );
};
