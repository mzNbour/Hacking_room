import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Cpu,
  CreditCard,
  FileText,
  Globe,
  HeartPulse,
  Landmark,
  Lock,
  MapPin,
  Package,
  Plane,
  Radio,
  Search,
  Server,
  ShieldCheck,
  ShoppingBag,
  Terminal,
  Truck,
  Tv,
  Zap,
} from 'lucide-react';
import { ServerConfig } from '../types/game';

interface TargetSiteRendererProps {
  server: ServerConfig;
  body: string;
  status: number;
  queryParamInput: string;
  onQueryParamChange: (val: string) => void;
  onInteractiveSubmit: (e: React.FormEvent, paramName: string, basePath: string) => void;
  onNavigatePath: (pathWithQuery: string) => void;
}

export const TargetSiteRenderer: React.FC<TargetSiteRendererProps> = ({
  server,
  body,
  status,
  queryParamInput,
  onQueryParamChange,
  onInteractiveSubmit,
  onNavigatePath,
}) => {
  const [bankTab, setBankTab] = useState<'summary' | 'transfers' | 'corporate'>('summary');
  const [areaFilter, setAreaFilter] = useState<'all' | '港区' | '渋谷区' | '千代田区'>('all');
  const [secondInput, setSecondInput] = useState('');

  const template = server.siteTemplate || (server.isCustom ? 'custom' : 'corporate');
  const brandTitle = server.siteBrand?.title || server.name;
  const brandSubtitle = server.siteBrand?.subtitle || server.summary;

  // Helper to check active server capabilities for fallback/extra interactive widgets
  const webSvc = server.services.find(
    (s) => s.type === 'http' || s.type === 'https' || s.type === 'custom'
  );
  const routes = webSvc?.webRoutes || [];
  const sqliRoute = routes.find((r) => r.sqliResponse);
  const lfiRoute = routes.find((r) => r.lfiEnabled);
  const cmdInjRoute = routes.find((r) => r.cmdInjEnabled);
  const ssrfRoute = routes.find((r) => r.ssrfInternalTarget);
  const idorRoute = routes.find((r) => r.idorConfig);
  const tokenRoute = routes.find((r) => r.path === '/api/token' || r.path === '/api/session');
  const hasSqli = Boolean(sqliRoute);
  const hasLfi = Boolean(lfiRoute);
  const hasCmdInj = Boolean(cmdInjRoute);
  const hasSsrf = Boolean(ssrfRoute);

  // -------------------------------------------------------------------------
  // 1. BANK TEMPLATE (メトロポリタン信託銀行)
  // -------------------------------------------------------------------------
  if (template === 'bank') {
    const transactions = [
      { date: '2026/11/20', desc: '振込 カ）テクトレード キュウヨ', type: '入金', amount: '+¥412,000', bal: '¥1,482,500', pos: true },
      { date: '2026/11/18', desc: 'トウキョウデンリョク（デンキリョウキン）', type: '口座振替', amount: '-¥11,840', bal: '¥1,070,500', pos: false },
      { date: '2026/11/15', desc: 'MTBカード 11月ご請求分', type: '自動引落', amount: '-¥86,420', bal: '¥1,082,340', pos: false },
      { date: '2026/11/10', desc: 'セブン銀行ATM 出金手数料無料', type: 'ATM出金', amount: '-¥30,000', bal: '¥1,168,760', pos: false },
      { date: '2026/11/01', desc: '定期預金 満期利息お受取', type: '利息', amount: '+¥2,150', bal: '¥1,198,760', pos: true },
    ];

    return (
      <div className="min-h-full bg-[#F4F6F9] text-slate-900 font-sans">
        {/* Top Compliance Strip */}
        <div className="bg-[#071529] text-slate-300 text-[11px] px-6 py-1.5 flex items-center justify-between border-b border-[#162C4E]">
          <span>金融機関コード: 0198 · メトロポリタン信託銀行株式会社</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              TLS 1.3 暗号化保護通信
            </span>
            <span>窓口営業時間 平日 9:00〜15:00</span>
          </div>
        </div>

        {/* Main Bank Navigation */}
        <header className="bg-[#0B1F3A] text-white border-b-2 border-[#C9A227]">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#C9A227] text-[#0B1F3A] flex items-center justify-center font-bold text-sm tracking-tighter">
                MTB
              </div>
              <div>
                <div className="text-base font-bold tracking-tight">{brandTitle}</div>
                <div className="text-[11px] text-slate-300">METROPOLITAN TRUST BANK</div>
              </div>
            </div>

            <nav className="flex items-center gap-2 text-xs font-medium">
              {[
                { id: 'summary', label: '口座サマリー' },
                { id: 'transfers', label: '振込・振替' },
                { id: 'corporate', label: '法人トレジャリー' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBankTab(t.id as typeof bankTab)}
                  className={`px-3.5 py-2 rounded transition-colors ${
                    bankTab === t.id
                      ? 'bg-[#17355E] text-[#F7D774]'
                      : 'text-slate-200 hover:bg-[#132B4C]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Bank Main Workspace */}
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* Hero Account Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#0F2A4D] to-[#1A3F6E] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-300 mb-1">
                    東京本店 (支店コード 001) · 普通預金 口座番号 1004
                  </div>
                  <div className="text-3xl font-bold tracking-tight tabular-nums">
                    ¥1,482,500
                  </div>
                  <div className="text-xs text-emerald-300 mt-1.5">
                    お引出可能残高: ¥1,482,500 · 口座状態: 正常
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigatePath('/api/account?id=1004')}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C9A227] hover:bg-[#B8911E] text-[#0B1F3A] text-xs font-bold rounded transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    口座API詳細 (JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankTab('transfers')}
                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded border border-white/20 transition-colors"
                  >
                    振込・定期預金メニュー
                  </button>
                </div>
              </div>

              {bankTab === 'summary' && (
                <div className="p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">直近のお取引明細</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-3 font-semibold">取引日</th>
                          <th className="py-2 pr-3 font-semibold">摘要</th>
                          <th className="py-2 pr-3 font-semibold">区分</th>
                          <th className="py-2 pr-3 font-semibold text-right">金額</th>
                          <th className="py-2 font-semibold text-right">残高</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2.5 pr-3 font-mono text-slate-600">{tx.date}</td>
                            <td className="py-2.5 pr-3 text-slate-800 font-medium">{tx.desc}</td>
                            <td className="py-2.5 pr-3 text-slate-500">{tx.type}</td>
                            <td
                              className={`py-2.5 pr-3 text-right font-mono font-semibold tabular-nums ${
                                tx.pos ? 'text-emerald-700' : 'text-slate-900'
                              }`}
                            >
                              {tx.amount}
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-600 tabular-nums">
                              {tx.bal}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bankTab === 'transfers' && (
                <div className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">オンライン振込・振替手続き</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    現在デモセッション（閲覧専用権限）でログインしているため、新規の資金移動トランザクションはワンタイムパスワードトークンの再認証が必要です。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <div className="font-semibold text-slate-700">1日あたり振込限度額</div>
                      <div className="text-base font-bold text-slate-900 mt-1 tabular-nums">¥2,000,000</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <div className="font-semibold text-slate-700">他行宛振込手数料無料回数</div>
                      <div className="text-base font-bold text-slate-900 mt-1 tabular-nums">残り 3 回 / 月</div>
                    </div>
                  </div>
                </div>
              )}

              {bankTab === 'corporate' && (
                <div className="p-6 space-y-3">
                  <h3 className="text-sm font-bold text-slate-800">法人トレジャリー・財務統括サービス</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    大口法人顧客向けの外貨決済・資金集中配分（CMS）ゲートウェイは、専用認証ネットワークおよびAPIゲートウェイ経由で運用されています。
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                    夜間バッチ処理（02:00〜04:00 JST）の間、一部法人トレジャリー機能の同期に遅延が生じる場合があります。
                  </div>
                </div>
              )}
            </div>

            {/* Online Account API Lookup Form (Realistic Inquiry Widget) */}
            {idorRoute && (
              <form
                onSubmit={(e) => onInteractiveSubmit(e, idorRoute.idorConfig!.param, idorRoute.path)}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    口座番号リアルタイム照会 ({idorRoute.path})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">REST API v2</span>
                </div>
                <p className="text-xs text-slate-600">
                  照会したい口座番号を入力すると、支店・口座種別・残高情報をJSON形式で取得します。
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={queryParamInput}
                    onChange={(e) => onQueryParamChange(e.target.value)}
                    placeholder="1004"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0B1F3A]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0B1F3A] hover:bg-[#14335C] text-white text-xs font-semibold rounded transition-colors whitespace-nowrap"
                  >
                    口座を照会
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bank Right Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                銀行からのお知らせ
              </h3>
              <ul className="space-y-3 text-xs">
                <li className="border-b border-slate-100 pb-2.5">
                  <div className="text-[11px] text-slate-400">2026/11/19</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    【重要】フィッシング詐欺および不審なメールにご注意ください
                  </div>
                </li>
                <li className="border-b border-slate-100 pb-2.5">
                  <div className="text-[11px] text-slate-400">2026/11/12</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    個人向け外貨定期預金 金利改定のお知らせ
                  </div>
                </li>
                <li>
                  <div className="text-[11px] text-slate-400">2026/11/01</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    全店オンラインバンキング TLS 1.3 完全移行のお知らせ
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-[#0B1F3A] text-white rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C9A227]">
                <Lock className="w-4 h-4" />
                不正送金モニタリング稼働中
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                当行システムは24時間365日、IDSによる異常アクセス監視を実施しています。不審な通信を検知した場合は即時に接続が遮断されます。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. MEDICAL TEMPLATE (エイジス総合医療センター)
  // -------------------------------------------------------------------------
  if (template === 'medical') {
    const departments = [
      { name: '総合内科', doctor: '高橋 誠 医師', wait: '約15分', status: '受付中' },
      { name: '循環器内科', doctor: '中村 玲子 医師', wait: '約25分', status: '受付中' },
      { name: '眼科', doctor: '小林 健太 医師', wait: '約10分', status: '受付中' },
      { name: '整形外科', doctor: '伊藤 ゆかり 医師', wait: '約40分', status: '混雑' },
    ];

    return (
      <div className="min-h-full bg-[#F8FAFC] text-slate-900">
        <div className="bg-[#0F766E] text-white text-xs px-6 py-2 flex items-center justify-between">
          <span>特定機能病院 · エイジス総合医療センター</span>
          <span>代表電話: 03-5555-0192 (救急外来 24時間対応)</span>
        </div>

        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{brandTitle}</h1>
                <p className="text-xs text-slate-500">{brandSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigatePath('/api/patient?id=101')}
              className="px-3.5 py-2 bg-[#0F766E] hover:bg-[#0D625B] text-white text-xs font-medium rounded-md transition-colors"
            >
              予約状況API確認
            </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {idorRoute && (
              <form
                onSubmit={(e) => onInteractiveSubmit(e, idorRoute.idorConfig!.param, idorRoute.path)}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3"
              >
                <div className="text-sm font-bold text-slate-800">
                  患者予約・診察券番号照会 ({idorRoute.path})
                </div>
                <p className="text-xs text-slate-600">
                  診察券番号 (例: 101, 102) を入力して次回予約状況を確認できます。
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={queryParamInput}
                    onChange={(e) => onQueryParamChange(e.target.value)}
                    placeholder="101"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0F766E] hover:bg-[#0D625B] text-white text-xs font-medium rounded"
                  >
                    照会
                  </button>
                </div>
              </form>
            )}

            {hasLfi && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onNavigatePath(`/view?file=${encodeURIComponent(secondInput || 'pamphlet.txt')}`);
                }}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3"
              >
                <div className="text-sm font-bold text-slate-800">
                  外来案内・院内文書ビューア (/view)
                </div>
                <p className="text-xs text-slate-600">
                  院内配布パンフレットやドキュメントファイル名を指定して表示します。
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secondInput}
                    onChange={(e) => setSecondInput(e.target.value)}
                    placeholder="pamphlet.txt"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded"
                  >
                    表示
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3">本日の外来診療 混雑状況</h2>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">診療科</th>
                  <th className="py-2 pr-4 font-semibold">担当医</th>
                  <th className="py-2 pr-4 font-semibold">待ち時間目安</th>
                  <th className="py-2 font-semibold">受付状況</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2.5 pr-4 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{d.doctor}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-700">{d.wait}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          d.status === '混雑'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 3. REAL ESTATE TEMPLATE (UrbanEstates 都市不動産ポータル)
  // -------------------------------------------------------------------------
  if (template === 'realestate') {
    const properties = [
      {
        title: '南麻布プレミアムレジデンス 804号室',
        area: '港区',
        station: '麻布十番駅 徒歩4分',
        layout: '2LDK · 74.2㎡ · 築4年',
        rent: '¥385,000',
        tag: '即入居可',
      },
      {
        title: '渋谷神南パークタワー 2201号室',
        area: '渋谷区',
        station: '渋谷駅 徒歩6分',
        layout: '3LDK · 92.8㎡ · 築2年',
        rent: '¥520,000',
        tag: '角部屋',
      },
      {
        title: '麹町ガーデンコート 502号室',
        area: '千代田区',
        station: '麹町駅 徒歩3分',
        layout: '1LDK · 58.5㎡ · 築6年',
        rent: '¥295,000',
        tag: 'ペット相談',
      },
      {
        title: '赤坂ミッドタウンビュー 1508号室',
        area: '港区',
        station: '六本木駅 徒歩5分',
        layout: '2LDK · 86.0㎡ · 築3年',
        rent: '¥490,000',
        tag: 'コンシェルジュ付',
      },
    ];

    const shown = properties.filter((p) => areaFilter === 'all' || p.area === areaFilter);

    return (
      <div className="min-h-full bg-[#FAF9F6] text-slate-900">
        <header className="bg-[#1E242B] text-white px-6 py-5 border-b-2 border-amber-500">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-7 h-7 text-amber-400" />
              <div>
                <h1 className="text-lg font-bold tracking-tight">{brandTitle}</h1>
                <p className="text-xs text-slate-300">{brandSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {(['all', '港区', '渋谷区', '千代田区'] as const).map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setAreaFilter(area)}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    areaFilter === area
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  {area === 'all' ? '全エリア' : area}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>公開中のおすすめ物件 ({shown.length}件)</span>
            <span>東京都宅地建物取引業協会 会員</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map((prop) => (
              <div
                key={prop.title}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <MapPin className="w-3.5 h-3.5" />
                      東京都{prop.area}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                      {prop.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{prop.title}</h3>
                  <div className="text-xs text-slate-600 mt-1">{prop.station}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">{prop.layout}</div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">{prop.rent}</span>
                    <span className="text-xs text-slate-500"> / 月</span>
                  </div>
                  <span className="text-xs text-slate-500">管理費 ¥18,000</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 4. E-COMMERCE TEMPLATE (CyberShop)
  // -------------------------------------------------------------------------
  if (template === 'ecommerce') {
    const products = [
      { name: 'ProType 75 メカニカルキーボード', sku: 'KB-7500', price: '¥18,800', stock: '在庫あり', query: 'Keyboard' },
      { name: 'UltraView 27" 4K IPSモニター', sku: 'MN-274K', price: '¥64,900', stock: '残り3台', query: 'Monitor' },
      { name: 'StudioDAC USB-C オーディオIF', sku: 'AU-900', price: '¥32,400', stock: '在庫あり', query: 'Audio' },
    ];

    return (
      <div className="min-h-full bg-slate-50 text-slate-900">
        <header className="bg-slate-900 text-white px-6 py-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Package className="w-6 h-6 text-sky-400" />
              <div>
                <h1 className="text-lg font-bold">{brandTitle}</h1>
                <p className="text-xs text-slate-400">{brandSubtitle}</p>
              </div>
            </div>
            {sqliRoute && (
              <form
                onSubmit={(e) =>
                  onInteractiveSubmit(e, sqliRoute.sqliResponse!.vulnerableParam, sqliRoute.path)
                }
                className="flex items-center gap-2 min-w-[260px]"
              >
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={queryParamInput}
                    onChange={(e) => onQueryParamChange(e.target.value)}
                    placeholder="商品名で検索 (例: Keyboard)"
                    className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded"
                >
                  検索
                </button>
              </form>
            )}
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.sku} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>SKU: {p.sku}</span>
                  <span className="text-emerald-700 font-semibold">{p.stock}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                <div className="text-lg font-bold text-slate-900 tabular-nums">{p.price}</div>
                <button
                  type="button"
                  onClick={() =>
                    onNavigatePath(
                      `${sqliRoute?.path || '/search'}?${sqliRoute?.sqliResponse?.vulnerableParam || 'q'}=${encodeURIComponent(p.query)}`
                    )
                  }
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded transition-colors"
                >
                  在庫APIで確認
                </button>
              </div>
            ))}
          </div>

          {lfiRoute && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onNavigatePath(`${lfiRoute.path}?file=${encodeURIComponent(secondInput || 'welcome.txt')}`);
              }}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2"
            >
              <div className="text-xs font-bold text-slate-800">製品仕様書・カタログ閲覧 ({lfiRoute.path})</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={secondInput}
                  onChange={(e) => setSecondInput(e.target.value)}
                  placeholder="welcome.txt"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded"
                >
                  開く
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 5. EXCHANGE TEMPLATE (VORTEX Custody Exchange)
  // -------------------------------------------------------------------------
  if (template === 'exchange') {
    const reserves = [
      { asset: 'Bitcoin (BTC)', holdings: '42,180.50 BTC', coldRatio: '99.9%', quorum: '5-of-7 HSM' },
      { asset: 'Ethereum (ETH)', holdings: '385,400.00 ETH', coldRatio: '99.8%', quorum: '5-of-7 HSM' },
      { asset: 'USD Coin (USDC)', holdings: '$910,250,000', coldRatio: '98.5%', quorum: '4-of-7 HSM' },
      { asset: 'Solana (SOL)', holdings: '1,420,000 SOL', coldRatio: '99.7%', quorum: '5-of-7 HSM' },
    ];

    return (
      <div className="min-h-full bg-[#090D16] text-slate-100">
        <header className="border-b border-slate-800 bg-[#0D1320] px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-indigo-600 flex items-center justify-center font-bold text-sm">
                VX
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">{brandTitle}</h1>
                <p className="text-xs text-slate-400">{brandSubtitle}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400">HSM Quorum: Healthy</span>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400">預かり資産総額 (AUC)</div>
              <div className="text-2xl font-bold text-white mt-1 tabular-nums">$4,820,400,000</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400">コールドウォレット保管比率</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">99.94%</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400">署名方式</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono">MPC / HSM</div>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-white mb-3">準備金証明 (Proof of Reserves)</h2>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-4">銘柄</th>
                  <th className="py-2 pr-4">カストディ保有高</th>
                  <th className="py-2 pr-4">コールド比率</th>
                  <th className="py-2">署名ポリシー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reserves.map((r) => (
                  <tr key={r.asset}>
                    <td className="py-2.5 pr-4 font-semibold text-slate-200">{r.asset}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-300 tabular-nums">{r.holdings}</td>
                    <td className="py-2.5 pr-4 font-mono text-emerald-400 tabular-nums">{r.coldRatio}</td>
                    <td className="py-2.5 font-mono text-slate-400">{r.quorum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 6. LOGISTICS / DEVOPS / CORPORATE / UNIVERSITY / BASTION / GOV / CUSTOM
  // -------------------------------------------------------------------------
  const cleanText = body
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const headerTheme =
    template === 'logistics' || template === 'factory'
      ? 'bg-slate-900 border-b-2 border-amber-500 text-white'
      : template === 'devops'
      ? 'bg-[#111827] border-b border-slate-800 text-white'
      : template === 'gov' || template === 'bastion'
      ? 'bg-[#0F172A] border-b border-sky-700 text-white'
      : template === 'hotel'
      ? 'bg-[#2C1E1A] border-b-2 border-amber-500 text-white'
      : template === 'media'
      ? 'bg-[#18181B] border-b-2 border-rose-500 text-white'
      : template === 'retail'
      ? 'bg-[#14532D] border-b-2 border-emerald-400 text-white'
      : template === 'aviation'
      ? 'bg-[#0C4A6E] border-b-2 border-sky-400 text-white'
      : template === 'telecom'
      ? 'bg-[#172554] border-b-2 border-cyan-400 text-white'
      : template === 'energy'
      ? 'bg-[#064E3B] border-b-2 border-lime-400 text-white'
      : 'bg-slate-900 border-b border-slate-800 text-white';

  const TemplateIcon =
    template === 'logistics'
      ? Truck
      : template === 'factory'
      ? Cpu
      : template === 'devops'
      ? Terminal
      : template === 'university'
      ? FileText
      : template === 'gov'
      ? Landmark
      : template === 'bastion'
      ? ShieldCheck
      : template === 'hotel'
      ? Building2
      : template === 'media'
      ? Tv
      : template === 'retail'
      ? ShoppingBag
      : template === 'aviation'
      ? Plane
      : template === 'telecom'
      ? Radio
      : template === 'energy'
      ? Zap
      : Server;

  const publicArchiveRoute = routes.find((r) => r.path === '/backup' || r.path === '/archive');

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className={`${headerTheme} px-6 py-4`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center text-sky-400">
              <TemplateIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold">{brandTitle}</h1>
              <p className="text-xs text-slate-300">{brandSubtitle}</p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-300">
            {server.ip} · HTTP {status}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              ポータル概要
            </h2>
            <span className="text-xs font-mono text-slate-500">{server.hostname}</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{cleanText || server.summary}</p>
        </div>

        {template === 'university' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">公開アーカイブ・ステージング領域</h3>
                <span className="text-xs font-mono text-amber-700">Public Directory</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                検証ビルドや公開アーカイブがインデックス表示状態で保存されています。公開前の設定確認を行ってください。
              </p>
              {publicArchiveRoute && (
                <button
                  type="button"
                  onClick={() => onNavigatePath(publicArchiveRoute.path)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded transition-colors"
                >
                  {publicArchiveRoute.path}/ を閲覧する
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2.5">
              <h3 className="text-sm font-bold text-slate-800">ノード稼働情報</h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Webサーバー</span>
                  <span className="font-mono text-slate-800">{webSvc?.version || 'nginx'}</span>
                </div>
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-500">OS環境</span>
                  <span className="font-mono text-slate-800">{server.os}</span>
                </div>
                <div className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-500">ファイル共有</span>
                  <span className="font-mono text-slate-800">FTP / HTTP Staging</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {template === 'corporate' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800">社内インフォメーション・メンテナンス通知</h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span>2026/11/21</span>
                    <span>情報システム部</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    旧ポータルサーバーのSSHメンテナンス運用について
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    サーバー保守作業は社内ネットワーク経由のSSH接続にて実施しています。不要なバックアップファイルの整理を順次進めています。
                  </p>
                </div>
                <div className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span>2026/11/14</span>
                    <span>セキュリティ推進室</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    検索エンジン向けクローラ制御ポリシーの見直し
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    公開Webサーバーのクローラ制御ファイル設定および管理ディレクトリのアクセス制御を点検中です。
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800">ポータルステータス</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ホスト名</span>
                  <span className="font-mono text-slate-800">{server.hostname}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">稼働OS</span>
                  <span className="font-mono text-slate-800">{server.os.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Webサーバ</span>
                  <span className="font-mono text-slate-800">{webSvc?.banner || webSvc?.version}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {template === 'logistics' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { hub: '東京湾岸ロジハブ', ip: '10.10.1.80', rtt: '0.42 ms' },
              { hub: '大阪西ディストリビューション', ip: '172.20.4.12', rtt: '8.15 ms' },
              { hub: '福岡九州ゲートウェイ', ip: '172.20.9.30', rtt: '16.80 ms' },
            ].map((h) => (
              <div key={h.hub} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{h.ip}</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-sm font-bold text-slate-800">{h.hub}</div>
                <div className="text-xs font-mono text-emerald-700 mt-1">Latency: {h.rtt}</div>
              </div>
            ))}
          </div>
        )}

        {template === 'devops' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                稼働サービス・ノードステータス
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <span className="font-medium text-slate-700">本番パイプライン</span>
                  <span className="font-mono text-emerald-700 font-semibold">Running</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <span className="font-medium text-slate-700">Webサーバ</span>
                  <span className="font-mono text-slate-800">{webSvc?.banner || webSvc?.version}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <span className="font-medium text-slate-700">実行環境</span>
                  <span className="font-mono text-slate-700">{server.os}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3">直近のデプロイ履歴</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4 font-semibold">ビルドID</th>
                      <th className="py-2 pr-4 font-semibold">ブランチ</th>
                      <th className="py-2 pr-4 font-semibold">担当</th>
                      <th className="py-2 pr-4 font-semibold">日時</th>
                      <th className="py-2 font-semibold">結果</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2 pr-4 text-slate-800">#2048</td>
                      <td className="py-2 pr-4 text-sky-700">main</td>
                      <td className="py-2 pr-4 font-sans text-slate-700">リリース自動化</td>
                      <td className="py-2 pr-4 text-slate-500 tabular-nums">2026-11-22 14:10</td>
                      <td className="py-2 text-emerald-700 font-semibold">Succeeded</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-800">#2047</td>
                      <td className="py-2 pr-4 text-sky-700">staging/cache-fix</td>
                      <td className="py-2 pr-4 font-sans text-slate-700">インフラ運用</td>
                      <td className="py-2 pr-4 text-slate-500 tabular-nums">2026-11-21 19:45</td>
                      <td className="py-2 text-emerald-700 font-semibold">Succeeded</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {template === 'custom' && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800">公開サービス・構成サマリー</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500">OS</div>
                <div className="font-mono font-semibold text-slate-800 mt-0.5">{server.os}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500">Webサーバ</div>
                <div className="font-mono font-semibold text-slate-800 mt-0.5">
                  {webSvc?.banner || webSvc?.version || 'HTTP Service'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500">ホスト名</div>
                <div className="font-mono font-semibold text-slate-800 mt-0.5">{server.hostname}</div>
              </div>
            </div>
          </div>
        )}

        {template === 'gov' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { cat: '防災・避難施設データ', format: 'CSV / GeoJSON', updated: '2026-11-20' },
              { cat: '人口統計・世帯推計', format: 'CSV / UTF-8', updated: '2026-11-15' },
              { cat: '都市計画・公共施設台帳', format: 'JSON / REST', updated: '2026-11-08' },
            ].map((ds) => (
              <div key={ds.cat} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-1.5">
                <div className="text-xs font-mono text-sky-700 font-semibold">{ds.format}</div>
                <div className="text-sm font-bold text-slate-900">{ds.cat}</div>
                <div className="text-xs text-slate-500">最終更新: {ds.updated}</div>
              </div>
            ))}
          </div>
        )}

        {template === 'hotel' && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800">本日の客室稼働サマリー (PMS Live)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="text-slate-600">客室稼働率</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">89.4%</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-600">到着予定</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">64 室</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-600">チェックイン済</div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums mt-0.5">41 室</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-600">保守点検中</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">3 室</div>
              </div>
            </div>
          </div>
        )}

        {template === 'media' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { metric: '配信トラフィック / 入稿スループット', val: '42.8 Gbps', note: '東京POP / 編集ゲートウェイ' },
              { metric: 'キャッシュヒット率 / API応答', val: '99.12%', note: '平均レイテンシ 12 ms' },
              { metric: 'アクティブ配信ストリーム', val: '18,420', note: 'HLS / WebSocket 稼働中' },
            ].map((m) => (
              <div key={m.metric} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs text-slate-500">{m.metric}</div>
                <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">{m.val}</div>
                <div className="text-[11px] font-mono text-rose-700 mt-1">{m.note}</div>
              </div>
            ))}
          </div>
        )}

        {template === 'retail' && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">店舗別 POS 同期ステータス</h3>
              <span className="text-xs font-mono text-emerald-700">128 店舗オンライン</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { store: '渋谷本店 (#001)', sales: '¥4,820,400', sync: '1分前' },
                { store: '新宿西口店 (#014)', sales: '¥3,615,200', sync: '2分前' },
                { store: '横浜みなとみらい店 (#027)', sales: '¥2,940,800', sync: '1分前' },
              ].map((st) => (
                <div key={st.store} className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-semibold text-slate-800">{st.store}</div>
                  <div className="font-mono text-emerald-700 font-bold mt-1 tabular-nums">{st.sales}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">最終同期: {st.sync}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {template === 'factory' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { line: '第3CNC精密加工ライン', rate: '98.4%', temp: '41.2℃' },
              { line: '自動搬送AGVユニット', rate: '100.0%', temp: '36.8℃' },
              { line: '光学検査ロボット群', rate: '97.9%', temp: '39.5℃' },
            ].map((pl) => (
              <div key={pl.line} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs font-mono text-amber-700">PLC NODE ACTIVE</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{pl.line}</div>
                <div className="text-xs text-slate-600 mt-1 tabular-nums">稼働率: {pl.rate} · 温度: {pl.temp}</div>
              </div>
            ))}
          </div>
        )}

        {template === 'aviation' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { tag: 'FLT / SAT-01', title: 'NRT → LAX 貨物便 / 軌道テレメトリ', status: '定刻運用中' },
              { tag: 'FLT / SAT-02', title: 'KIX → SIN 保税輸送 / ダウンリンク', status: '受信正常' },
              { tag: 'EDI / XML', title: '税関マニフェスト & 気象データ同期', status: 'TLS 暗号化' },
            ].map((av) => (
              <div key={av.tag} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs font-mono text-sky-700">{av.tag}</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{av.title}</div>
                <div className="text-xs text-emerald-700 font-semibold mt-1">{av.status}</div>
              </div>
            ))}
          </div>
        )}

        {template === 'telecom' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { peer: 'IX-JPNAP Tokyo', asn: 'AS7527', state: 'Established (142 Prefixes)' },
              { peer: 'IX-BBIX Osaka', asn: 'AS2516', state: 'Established (98 Prefixes)' },
              { peer: 'Core MPLS Ring', asn: 'Backbone', state: 'RTT 1.2 ms / Loss 0%' },
            ].map((p) => (
              <div key={p.peer} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs font-mono text-cyan-700">{p.asn}</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{p.peer}</div>
                <div className="text-xs text-emerald-700 font-mono mt-1">{p.state}</div>
              </div>
            ))}
          </div>
        )}

        {template === 'energy' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: '関東基幹変電所 負荷', val: '1,420.5 MW', status: '安定供給' },
              { label: '系統周波数', val: '50.01 Hz', status: '基準範囲内' },
              { label: '蓄電池連系出力', val: '+185.0 MW', status: '遠隔SCADA連携' },
            ].map((e) => (
              <div key={e.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs text-slate-500">{e.label}</div>
                <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">{e.val}</div>
                <div className="text-xs text-emerald-700 font-semibold mt-1">{e.status}</div>
              </div>
            ))}
          </div>
        )}

        {tokenRoute && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-800">認証トークン発行エンドポイント</div>
              <div className="text-xs text-slate-600 mt-0.5">
                ゲスト権限のJWTセッションを発行します。
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigatePath(tokenRoute.path)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded whitespace-nowrap"
            >
              {tokenRoute.path} を開く
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sqliRoute && (
          <form
            onSubmit={(e) =>
              onInteractiveSubmit(e, sqliRoute.sqliResponse!.vulnerableParam, sqliRoute.path)
            }
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2"
          >
            <label className="block text-xs font-bold text-slate-800">
              データベース検索 ({sqliRoute.path})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryParamInput}
                onChange={(e) => onQueryParamChange(e.target.value)}
                placeholder="検索キーワードを入力"
                className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0060DF] text-white text-xs font-medium rounded hover:bg-[#0250BB]"
              >
                検索
              </button>
            </div>
          </form>
        )}

        {hasCmdInj && cmdInjRoute && (
          <form
            onSubmit={(e) => onInteractiveSubmit(e, 'host', cmdInjRoute.path)}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2"
          >
            <label className="block text-xs font-bold text-slate-800">
              ネットワーク疎通診断 ({cmdInjRoute.path})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryParamInput}
                onChange={(e) => onQueryParamChange(e.target.value)}
                placeholder="127.0.0.1"
                className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0060DF] text-white text-xs font-medium rounded hover:bg-[#0250BB]"
              >
                Ping実行
              </button>
            </div>
          </form>
        )}

        {hasSsrf && ssrfRoute && (
          <form
            onSubmit={(e) => onInteractiveSubmit(e, 'url', ssrfRoute.path)}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2"
          >
            <label className="block text-xs font-bold text-slate-800">
              URLプロキシフェッチャー ({ssrfRoute.path})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryParamInput}
                onChange={(e) => onQueryParamChange(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0060DF] text-white text-xs font-medium rounded hover:bg-[#0250BB]"
              >
                取得
              </button>
            </div>
          </form>
        )}

        {hasLfi && lfiRoute && (
          <form
            onSubmit={(e) => onInteractiveSubmit(e, 'file', lfiRoute.path)}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2"
          >
            <label className="block text-xs font-bold text-slate-800">
              ドキュメント閲覧 ({lfiRoute.path})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryParamInput}
                onChange={(e) => onQueryParamChange(e.target.value)}
                placeholder="welcome.txt"
                className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0060DF] text-white text-xs font-medium rounded hover:bg-[#0250BB]"
              >
                開く
              </button>
            </div>
          </form>
        )}

        {idorRoute && (
          <form
            onSubmit={(e) => onInteractiveSubmit(e, idorRoute.idorConfig!.param, idorRoute.path)}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2"
          >
            <label className="block text-xs font-bold text-slate-800">
              データ照会 ({idorRoute.path})
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryParamInput}
                onChange={(e) => onQueryParamChange(e.target.value)}
                placeholder="101"
                className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm font-mono text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0060DF] text-white text-xs font-medium rounded hover:bg-[#0250BB]"
              >
                照会
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
