export interface GuideCommandExample {
  label: string;
  cmd: string;
  note?: string;
}

export interface GuideTable {
  headers: string[];
  rows: string[][];
}

export interface GuideCallout {
  tone: 'info' | 'warning' | 'defense' | 'tip';
  title: string;
  body: string;
}

export interface GuideSection {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bulletPoints?: { term: string; detail: string }[];
  table?: GuideTable;
  commands?: GuideCommandExample[];
  callout?: GuideCallout;
}

export interface GuideChapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  sections: GuideSection[];
}

export const GUIDE_CHAPTERS: GuideChapter[] = [
  // =========================================================================
  // 第1章: ネットワーク・TCP/IP・Linuxの基礎
  // =========================================================================
  {
    id: 'ch-network-linux',
    number: '第1章',
    title: 'ネットワーク・TCP/IP・Linuxの基礎',
    subtitle: 'IPアドレス、ポート、3ウェイハンドシェイク、Linux権限の仕組みを根本から理解する',
    sections: [
      {
        id: 'sec-ip-subnet',
        title: '1.1 IPアドレスとサブネット（外部・内部・ループバック）',
        summary: '通信の「宛先住所」であるIPアドレスと、ネットワークの区切り（サブネット）の読み方を学びます。',
        paragraphs: [
          'ネットワーク上の機器（PCやサーバー）には、インターネット上の住所にあたる「IPアドレス（IPv4: 0〜255の数字を4つ並べたもの）」が割り当てられています。この演習環境では、あなたの端末（user-PC）は 10.10.0.5 であり、ターゲットサーバー群は 10.10.1.x 〜 10.10.10.x に配置されています。',
          'IPアドレスの末尾に付く「/24」などの表記はCIDR（サブネットマスク）と呼ばれ、「先頭何ビットが同じネットワーク（同じLANやグループ）か」を示します。たとえば 172.16.0.0/24 は「172.16.0.0 〜 172.16.0.255 までの256個のIPが同一ネットワークに属する」という意味です。',
          'また「127.0.0.1（localhost）」はループバックアドレスと呼ばれる特殊なIPで、「自分自身のコンピュータ内部」を指します。外部からは接続できずサーバー内部のサービスだけが通信するために使われることが多く、SSRF脆弱性（第4章）ではこの 127.0.0.1 を標的にします。',
        ],
        table: {
          headers: ['IPレンジ / 表記', '分類', '演習・実務での役割'],
          rows: [
            ['10.10.0.5', '自端末 (user-PC)', '攻撃・診断元となるワークステーション'],
            ['10.10.1.x 〜 10.10.10.x', 'ターゲット網', '外部（DMZや公開領域）から到達可能なサーバー群'],
            ['172.16.0.0/24 等', '内部閉域ネットワーク', '外部から直接届かず、踏み台サーバー経由（ピボット）でのみ到達できる内部網'],
            ['127.0.0.1 (localhost)', 'ループバック', 'サーバー自身の内部プロセス間通信（Redisや内部管理APIなど）'],
          ],
        },
        commands: [
          { label: '自ホストのIPとネットワーク構成を確認', cmd: 'ip a', note: 'eth0（外部側）に加えて eth1（内部網側）があるか確認します' },
          { label: 'ICMP疎通確認とOSのTTL推定', cmd: 'ping -c 3 <IP>', note: 'TTL=64前後ならLinux、TTL=128前後ならWindowsであることが多いです' },
        ],
      },
      {
        id: 'sec-tcp-ports',
        title: '1.2 ポート番号とTCP 3ウェイハンドシェイク',
        summary: '1台のサーバーで複数のサービス（Web、SSH、DBなど）を同時に動かすための仕組み「ポート」を理解します。',
        paragraphs: [
          'IPアドレスが「建物の住所」だとすれば、ポート番号（0〜65535番）は「建物の何号室か」を表します。1台のサーバーの中で、22番はSSH、80番はWeb（HTTP）、3306番はMySQL、といったように待機するプログラム（サービス／デーモン）が部屋ごとに割り当てられています。',
          'TCP通信を開始するとき、通信元とサーバーは「3ウェイハンドシェイク」という手順を踏みます。①クライアントが「SYN（接続したい）」を送り、②サーバーが「SYN/ACK（いいですよ）」を返し、③クライアントが「ACK（了解、開始します）」を返して接続が確立します。',
          'もしポートが閉じていればサーバーは「RST（拒否）」を返し、ファイアウォールで破棄（DROP）されていれば「無応答（タイムアウト）」になります。これが Nmap における open / closed / filtered の違いです。',
        ],
        table: {
          headers: ['ポート', 'プロトコル', '代表的なサービス', '演習・実務での主な確認ポイント'],
          rows: [
            ['21', 'TCP', 'FTP', 'anonymousログイン可否、古いvsftpd等の既知バックドア'],
            ['22', 'TCP', 'SSH', 'パスワード認証の強度、秘密鍵 (id_rsa) を使ったログイン'],
            ['53', 'TCP/UDP', 'DNS (BIND等)', 'ゾーン転送 (AXFR) の許可設定、TXTレコード内の機密メモ'],
            ['80 / 8080', 'TCP', 'HTTP (nginx/Apache)', 'Web画面、robots.txt、隠しディレクトリ、各種Web脆弱性'],
            ['443 / 8443', 'TCP', 'HTTPS', '暗号化されたWeb通信、APIエンドポイント、JWT認証'],
            ['3306', 'TCP', 'MySQL', '外部公開の有無、デフォルト/脆弱パスワードでのログイン'],
            ['6379', 'TCP', 'Redis', 'パスワード無しの未認証アクセス (KEYS * / GET)'],
            ['9000等', 'TCP', '独自アプリ / SpringBoot', '管理API、テンプレートエンジン(SSTI)、Log4j等のミドルウェア'],
          ],
        },
        callout: {
          tone: 'info',
          title: 'ポート状態: open / closed / filtered の見分け方',
          body: 'open＝ポートが開いておりサービスが待機中。closed＝ポートは到達可能だが待機中のプログラムが無い（RST応答）。filtered＝途中のファイアウォールやIDSによってパケットが遮断・ドロップされている状態（応答なし、またはPort Knocking解放待ち）。',
        },
      },
      {
        id: 'sec-linux-fs-perms',
        title: '1.3 Linuxのファイル構造・ユーザー権限・特殊ビット',
        summary: '侵入後にどこを探し、なぜ「root」権限が必要になるのかをLinuxの基本構造から解説します。',
        paragraphs: [
          'Linuxではすべてのファイル・ディレクトリに「所有者(owner)」「所有グループ(group)」「その他(others)」ごとの読み取り(r)・書き込み(w)・実行(x)権限が設定されています。',
          '最上位の管理者アカウントが root（UID=0）です。Webサーバー（www-data: UID=33）や一般ユーザー（UID=1000前後）でサーバーに侵入できたとしても、/root/flag.txt の権限が -rw-------（所有者rootのみ読み書き可）であれば読むことができません。そのため、設定不備や脆弱性を突いて UID=0 に昇格する「権限昇格（Privilege Escalation）」が必要になります。',
        ],
        table: {
          headers: ['ディレクトリ / パス', 'Linuxでの意味', 'CTF・セキュリティ監査で見るべき理由'],
          rows: [
            ['/home/<user>/', '各ユーザーのホーム', 'ユーザー固有のメモ、flag.txt、.ssh/id_rsa（隠しファイル）がある'],
            ['/root/', 'root専用ホーム', '多くの場合、最終目標の flag.txt や秘密鍵が格納されている'],
            ['/etc/', 'システム設定ファイル群', '/etc/passwd（ユーザー一覧）、/etc/cron.d/（定期実行設定）など'],
            ['/var/www/ · /var/backups/', 'Web公開・バックアップ', 'Webソース、環境設定(.env)、shadow.bak 等のバックアップが放置されやすい'],
            ['/opt/ · /srv/', '追加ソフト・共有領域', '独自スクリプト(/opt/scripts/*.sh)やFTP公開フォルダ(/srv/ftp)'],
            ['/usr/bin/ · /usr/sbin/', 'システム実行バイナリ', 'SUIDビットやCapabilitiesが付与された危険なバイナリが存在することがある'],
          ],
        },
        commands: [
          { label: '隠しファイル(.ssh等)も含めて詳細表示', cmd: 'ls -la', note: '権限欄の先頭や末尾、所有者名に注目します' },
          { label: '自分のユーザーIDと所属グループを確認', cmd: 'id', note: 'uid=0(root) なら最高権限を取得できています' },
          { label: 'Base64文字列をデコードする', cmd: 'echo "SGVsbG8=" | base64 -d', note: 'DNS TXTやWebソースの難読化文字列を元に戻します' },
        ],
      },
    ],
  },

  // =========================================================================
  // 第2章: Webの基礎知識（HTTP / ブラウザ / API）
  // =========================================================================
  {
    id: 'ch-web-basics',
    number: '第2章',
    title: 'Webの基礎知識（HTTP・ヘッダ・URL・設定ファイル）',
    subtitle: 'ブラウザやcurlの裏で何がやり取りされているのかを完全に理解する',
    sections: [
      {
        id: 'sec-url-http',
        title: '2.1 URLの分解とHTTPリクエスト／レスポンスの仕組み',
        summary: 'Webの脆弱性調査は「URLの各パーツ」と「HTTPヘッダ」を自在に読み解くことから始まります。',
        paragraphs: [
          '例えば `https://10.10.1.70:443/api/account?id=1004` というURLは、①プロトコル(`https`)、②接続先(`10.10.1.70`)、③ポート(`443`)、④パス(`/api/account`)、⑤クエリパラメータ(`?id=1004`) という5つの要素で構成されています。',
          'ブラウザがページを開くとき、裏ではHTTPリクエストというテキストメッセージがサーバーへ送信されています。リクエストにはメソッド（取得の `GET`、送信の `POST`）、パス、さらに `Host` や `Authorization`（認証トークン）、`User-Agent` などの「HTTPリクエストヘッダ」が含まれます。',
          'サーバーはこれに対し「ステータスコード（200, 401, 403, 404等）」「レスポンスヘッダ（`Server: nginx/1.24.0`, `Content-Type: application/json` 等）」「ボディ（HTMLやJSON本体）」を返します。`curl -i` を使うと、ブラウザが隠しているヘッダ情報まで丸ごと観察できます。',
        ],
        table: {
          headers: ['ステータスコード', '意味', '調査時の解釈と次のアクション'],
          rows: [
            ['200 OK', '正常取得', 'ページやファイル、API応答がそのまま返ってきている'],
            ['301 / 302', 'リダイレクト', '別URLへ転送。ログイン画面への強制遷移などに使われる'],
            ['401 Unauthorized', '未認証', 'ログインや Bearer JWT トークンが要求されている'],
            ['403 Forbidden', 'アクセス禁止', '【超重要】「ファイルやフォルダは実在する」が閲覧権限がない証拠'],
            ['404 Not Found', '存在しない', '指定パスが存在しない（ただし上位フォルダ配下に実在ファイルがある可能性はある）'],
          ],
        },
        commands: [
          { label: 'レスポンスヘッダとボディを同時に表示', cmd: 'curl -i http://<IP>/', note: 'ServerヘッダからApache/nginxやバージョンを特定できます' },
          { label: 'カスタムヘッダを付けてリクエスト', cmd: 'curl -H "Authorization: Bearer <TOKEN>" https://<IP>/api/admin/ssh-key', note: 'Webページタブの「開発ツール」→「リクエストヘッダ編集」でも同じ操作ができます' },
        ],
      },
      {
        id: 'sec-web-exposure',
        title: '2.2 なぜ robots.txt・.env・.git・ディレクトリ一覧が危険なのか',
        summary: '高度なハッキング技術を使わなくても、設定ミスだけでサーバーが陥落する典型的な情報漏洩パターンを学びます。',
        paragraphs: [
          '1) robots.txt: 検索エンジン（Google等）に「このフォルダは検索結果に載せないで」と伝えるための公開ファイルです。しかし人間やツールが `http://<IP>/robots.txt` に直接アクセスすれば内容が丸見えになるため、管理画面やバックアップフォルダの「隠し場所リスト」として悪用されます。',
          '2) ディレクトリリスティング (Index of /...): Webサーバーに `index.html` がなく自動一覧表示がオンになっていると、フォルダ内の全ファイル名がブラウザに一覧表示されます。バックアップCSVやテストメモが誰でもダウンロードできてしまいます。',
          '3) .env ファイル: フレームワークがデータベースのパスワード、APIキー、SSH保守情報などを保存する設定ファイルです。Web公開ディレクトリ直下やバックアップフォルダに置かれたままアクセス制限を忘れると、全秘密情報が平文で漏洩します。',
          '4) .git ディレクトリ: 開発者が `git clone` でサーバーにプログラムを展開した際、履歴管理フォルダ `.git/` へのアクセスを遮断し忘れるケースです。`.git/HEAD` や `.git/config` からリポジトリ構成、アカウント名、鍵パスなどが割り出せます。',
        ],
        callout: {
          tone: 'defense',
          title: '実務での対策（防御の視点）',
          body: 'robots.txt はアクセス制御ではないため、機密パスを記載せずIP制限・認証で守ります。.env や .git はドキュメントルート外に配置するか、nginx/Apache設定でドットファイル（^/\\.）へのHTTPアクセスを一律 403/404 拒否します。autoindex は必ず off にします。',
        },
      },
      {
        id: 'sec-json-devtools',
        title: '2.3 REST API（JSON）とブラウザ開発者ツール(DevTools)の活用',
        summary: '現代のWebアプリはHTMLだけでなくJSON形式でデータをやり取りします。Webページタブの活用法を解説します。',
        paragraphs: [
          'Webアプリが裏側で呼び出すAPI（`/api/patient?id=101` や `/api/token` など）は、HTMLではなく構造化されたデータ形式「JSON」を返します。NetStrike Labの「Webページ」タブ（Firefox風ビューア）では、JSON応答をツリー構造で折りたたみ・絞り込み・生データ確認できるだけでなく、文字列内に `/api/...` のようなパスがあればクリックしてそのまま遷移できます。',
          'また、APIが `401 Unauthorized` や `403 Forbidden` を返した場合は、右上の「開発ツール」を開き「リクエストヘッダ編集」タブから `Authorization: Bearer <偽造したJWT>` を入力することで、ターミナルの `curl -H` と同じ検証をブラウザ上でも完結できます。',
        ],
      },
    ],
  },

  // =========================================================================
  // 第3章: 偵察・スキャン・列挙ツール徹底解説
  // =========================================================================
  {
    id: 'ch-recon-tools',
    number: '第3章',
    title: '偵察・スキャン・列挙ツール徹底解説',
    subtitle: 'nmap・IDS回避・gobuster・dig・arp-scan の原理と正しいオプション選択',
    sections: [
      {
        id: 'sec-nmap-deep',
        title: '3.1 Nmap：ポートスキャンとIDS回避のメカニズム',
        summary: 'セキュリティ診断の第一歩。どのようなオプションがあり、なぜ高レベルサーバーでは通常スキャンが失敗するのかを解説します。',
        paragraphs: [
          'Nmapは「どのIPが生きているか」「どのポートが開いているか」「そのポートでどのソフト（何のバージョン）が動いているか」を調べる必須ツールです。',
          'しかし、Lv.6以降のサーバーには **IDS（侵入検知システム）** と **レート制限ファイアウォール** が搭載されています。`-A`（全自動スキャン）や `-T4` / `-T5`（高速連続送信）は、短時間に大量の通信を発生させるため、IDSが即座に攻撃と判定してポートを `filtered` に見せかけたり、18秒間あなたのIPを一時遮断したりします。',
          'これを回避するには、3ウェイハンドシェイクを最後まで完了させない **SYNステルススキャン (`-sS`)**、送信間隔をゆっくりにする **低速タイミング (`-T2`)**、そして必要なポートだけを狙い撃つ **ポート指定 (`-p 22,53,80,443,6379`)** を組み合わせます。',
        ],
        table: {
          headers: ['オプション', '意味', '使い分け・注意点'],
          rows: [
            ['-sV', 'バージョン検出', '開いたポートのバナーから `vsftpd 2.3.4` や `Apache/2.4.49` 等を特定'],
            ['-sC', '既定スクリプト', 'anonymous FTP可否、robots.txt、.git、DNS AXFR等を自動チェック'],
            ['-sS', 'SYNステルススキャン', '接続を完了せず調査するためIDS回避に有効'],
            ['-T2', 'Politeタイミング', '通信間隔を空けてレート制限を回避（-T4/-T5はLv.6以降で検知される）'],
            ['-p 22,80,8080', 'ポート指定', '特定ポートだけスキャン。全ポート調べる場合は `-p-`（ただし高負荷）'],
            ['-sn 10.10.1.0/24', 'Pingスイープ', 'サブネット内の稼働ホスト一覧を探索'],
          ],
        },
        commands: [
          { label: '標準的な詳細スキャン (Lv.1〜5向け)', cmd: 'nmap -sV -sC <IP>' },
          { label: 'IDS回避ステルススキャン (Lv.6〜10向け)', cmd: 'nmap -sS -T2 -sV -p 22,53,80,443,6379,8080,8443,9000 <IP>' },
        ],
      },
      {
        id: 'sec-gobuster-websec',
        title: '3.2 Webディレクトリ列挙（gobuster / ffuf / nikto / nuclei）',
        summary: 'リンクされていない隠れURLや管理画面を辞書総当たりで炙り出します。',
        paragraphs: [
          'Webサイトのトップページ（`/`）にリンクが貼られていなくても、`/backup` や `/.env`、`/.git/config`、`/admin-backup` といったパスがサーバー上に置かれていることは珍しくありません。',
          '`gobuster` や `ffuf` は、ワードリスト（`/usr/share/wordlists/common.txt`）に書かれた候補URLを1つずつHTTPリクエストし、404（存在しない）以外の **200（公開中）や403（存在するが禁止）** が返ったパスだけを報告します。',
          'また `nikto` は既知の設定ミスや危険ファイルを、`nuclei` は脆弱性テンプレートに合致するエンドポイントを自動診断してくれます。',
        ],
        commands: [
          { label: '隠しディレクトリ・ファイル探索', cmd: 'gobuster dir -u http://<IP>' },
          { label: 'ffuf によるWebファジング（ポート指定例）', cmd: 'ffuf -u http://<IP>:8080/FUZZ' },
          { label: 'nikto / nuclei によるWeb脆弱性診断', cmd: 'nuclei -u http://<IP>' },
        ],
      },
      {
        id: 'sec-dns-dig',
        title: '3.3 DNSと dig：TXTレコードとゾーン転送(AXFR)の脅威',
        summary: 'ドメイン名とIPを結ぶDNSには、内部ネットワーク構成や秘密のAPIルートが書かれていることがあります。',
        paragraphs: [
          'DNS（ポート53）は本来「`corp.local` のIPは何か（Aレコード）」を教える電話帳です。しかし管理者が運用メモや検証用設定を **TXTレコード** に書き込んだり、場合によってはBase64エンコードして隠したりしているケースがあります。',
          'さらに危険なのが **ゾーン転送（AXFR）** の設定ミスです。本来ゾーン転送はプライマリDNSからセカンダリDNSへ全レコードを同期するための仕組みであり、信頼されたDNSサーバー以外からは拒否すべきです。外部からの `dig @<IP> axfr <ドメイン>` が許可されていると、社内の非公開サブドメイン（例: `internal-api.corp.local`）や全TXTレコードが一括で丸見えになります。',
        ],
        commands: [
          { label: 'DNSゾーン転送 (AXFR) の試行', cmd: 'dig @<IP> axfr corp.local', note: 'ドメイン名はターゲットごとに異なります（ヒントやホスト名を確認）' },
          { label: '特定ホストのTXTレコード照会', cmd: 'dig @<IP> TXT knock.sovereign.lab' },
          { label: '全レコード種別(ANY)照会', cmd: 'dig @<IP> ANY <ドメイン>' },
        ],
      },
    ],
  },

  // =========================================================================
  // 第4章: Webアプリケーションの代表的な脆弱性
  // =========================================================================
  {
    id: 'ch-web-vulns',
    number: '第4章',
    title: 'Webアプリケーションの代表的な脆弱性',
    subtitle: 'SQLi・IDOR・LFI・コマンドインジェクション・SSRF・JWT・SSTIの仕組みと対策',
    sections: [
      {
        id: 'sec-sqli',
        title: '4.1 SQLインジェクション (SQLi)',
        summary: '検索欄などに特定の記号を入れることで、裏側のデータベース命令を乗っ取る古典的かつ致命的な脆弱性です。',
        paragraphs: [
          'Webアプリが検索入力 `q` をそのまま文字列結合して `SELECT * FROM products WHERE name = \'` + q + `\'` のようなSQL文を組み立てている場合、`q` に `\' OR 1=1--` を渡すとSQL全体の意味が書き換わります。',
          'シングルクォート `\'` が文字列を閉じ、`OR 1=1` が条件を常に真（TRUE）にし、`--`（コメント記号）が後ろの本来の条件を消してしまいます。その結果、本来1件しか返らないはずの画面からテーブル内の全行や別テーブルのパスワードハッシュまでダンプできてしまいます。',
          '対策は、入力値をSQL命令として解釈させない **プリペアドステートメント（プレースホルダ `?` やバインド変数）** を必ず使用することです。',
        ],
        commands: [
          { label: 'curlで手動SQLiテスト', cmd: 'curl "http://<IP>/search?q=\' OR 1=1--"' },
          { label: 'sqlmapで自動診断・テーブルダンプ', cmd: 'sqlmap -u "http://<IP>/search?q=test" --dump' },
        ],
      },
      {
        id: 'sec-idor',
        title: '4.2 IDOR（不安全な直接オブジェクト参照）',
        summary: '「ログインしているか」だけでなく「その人がそのデータを見てよいか」のチェック漏れを突く脆弱性です。',
        paragraphs: [
          '例えば予約確認画面 `/api/patient?id=101` や口座照会 `/api/account?id=1004` のように、URLパラメータでレコード番号を直接指定する仕組みは広く使われています。',
          'このときサーバー側が「リクエストしたユーザーに本当に ID=1004 を閲覧する権限があるか（認可チェック）」を確認していないと、URLの数字を `id=1` や `id=0`、`id=102` に書き換えるだけで、他人の個人情報やシステム管理者の秘密データまで閲覧できてしまいます。',
        ],
        commands: [
          { label: 'IDパラメータを 1 に変えて管理者データを参照', cmd: 'curl "http://<IP>/api/patient?id=1"', note: 'WebページタブのフォームからIDを書き換えて送信することもできます' },
        ],
      },
      {
        id: 'sec-lfi-traversal',
        title: '4.3 LFI（ローカルファイルインクルード）とパストラバーサル',
        summary: 'ファイル表示機能のパラメータに `../` を混ぜて、本来非公開のシステムファイルを読み取ります。',
        paragraphs: [
          'ドキュメント閲覧機能 `/view?file=welcome.txt` が、内部で `/var/www/docs/` + `file` のように単純連結してファイルを開いている場合、`../../../../etc/passwd` のように親ディレクトリへ遡る文字列（ディレクトリトラバーサル）を渡すと、Web公開フォルダの外側にある任意ファイルを読み取れます。',
          '特に `/home/<user>/.ssh/id_rsa`（SSH秘密鍵）や `/etc/passwd`（ユーザー名一覧）が読めると、即座にSSH侵入へ繋げられます。',
          'また Apache HTTP Server 2.4.49 には URLデコード正規化のバグ（**CVE-2021-41773**）があり、`.%2e/` を使うことでアクセス制限を回避してサーバー上のファイル（`/home/deploy/.ssh/id_rsa` 等）を読み取れる著名な脆弱性が存在します。',
        ],
        commands: [
          { label: 'LFIでユーザーのSSH秘密鍵を読む', cmd: 'curl "http://<IP>/view?file=../../../../home/shopadmin/.ssh/id_rsa"' },
          { label: 'Apache 2.4.49 パストラバーサル (CVE-2021-41773)', cmd: 'exploit CVE-2021-41773 <IP> 8080' },
        ],
      },
      {
        id: 'sec-cmdinj-ssrf',
        title: '4.4 OSコマンドインジェクション と SSRF',
        summary: 'サーバー側でOSコマンドを実行させる攻撃（CmdInj）と、サーバーを踏み台にして内部ネットワークを覗く攻撃（SSRF）です。',
        paragraphs: [
          '【OSコマンドインジェクション】疎通診断機能 `/diag?host=127.0.0.1` の裏側で、プログラムが `ping -c 1 ${host}` のようにOSシェルを呼び出している場合、`127.0.0.1; id` や `127.0.0.1 && cat /etc/passwd` のようにシェル区切り文字（`;`, `|`, `&&`）を混ぜると、後ろの任意OSコマンドまで実行されてしまいます。',
          '【SSRF（Server-Side Request Forgery）】URLフェッチ機能 `/fetch?url=https://example.com` は、サーバー自身が外部URLへアクセスして結果を取得します。ここに `http://127.0.0.1:6379/secret` のように **サーバー内部（localhost）** のURLを指定すると、外部ファイアウォールに守られていて攻撃者が直接触れない内部サービスにサーバー経由でアクセスできてしまいます。',
        ],
        commands: [
          { label: 'コマンドインジェクションの手動検証', cmd: 'curl "http://<IP>/diag?host=127.0.0.1; id"' },
          { label: 'commix / exploit による対話シェル取得', cmd: 'exploit cmdinj <IP>' },
          { label: 'SSRFでローカル内部サービスにアクセス', cmd: 'curl "http://<IP>/fetch?url=http://127.0.0.1:6379/secret"' },
        ],
      },
      {
        id: 'sec-jwt-ssti',
        title: '4.5 JWT（JSON Web Token）の署名偽造 と SSTI / Log4Shell',
        summary: '現代の認証・API基盤やJava/Pythonテンプレートエンジンを狙う高度な攻撃手法です。',
        paragraphs: [
          '【JWTの構造と脆弱性】JWTは `ヘッダ.ペイロード.署名` の3つをドット(.)で繋いだトークンで、ヘッダとペイロードは単なるBase64URLエンコード（暗号化ではない）ため誰でも中身を読めます。代表的な攻撃は2つ：①ヘッダのアルゴリズムを `"alg": "none"` に書き換え署名を空にして検証を素通りさせる **alg:none攻撃**、②署名に使われている共通鍵が `secret99` などの弱い文字列だった場合に辞書攻撃で鍵を割り出し、`"role": "admin"` に書き換えた上で再署名する攻撃です。',
          '【SSTI（テンプレートインジェクション）】ユーザー名を画面に埋め込む際、`{{7*7}}` や `${7*7}` のようなテンプレート構文がそのまま評価され `49` と表示される場合、サーバー上で任意のコード実行に繋がる危険があります。',
          '【Log4Shell (CVE-2021-44228)】Javaのログライブラリ Log4j 2.14.1 がログ文字列内の `${jndi:ldap://...}` を自動解釈して外部サーバーからクラスを読み込んでしまう、2021年最大級のRCE脆弱性です。',
        ],
        commands: [
          { label: 'JWTのデコードと alg:none 偽造', cmd: 'jwt-tool <JWT> --forge-none' },
          { label: '判明した秘密鍵で管理者JWTを再署名', cmd: 'jwt-tool <JWT> --sign secret99' },
          { label: 'Log4Shell エクスプロイト実行', cmd: 'exploit CVE-2021-44228 <IP> 9000' },
        ],
      },
    ],
  },

  // =========================================================================
  // 第5章: サービス別攻撃・認証・ハッシュクラック
  // =========================================================================
  {
    id: 'ch-services-auth',
    number: '第5章',
    title: 'サービス別攻撃・認証・ハッシュクラック',
    subtitle: 'FTP・SSH・MySQL・Redisの弱点と、hydra / john / searchsploit の実践',
    sections: [
      {
        id: 'sec-ftp-ssh',
        title: '5.1 FTP・SSH の認証方式と攻撃アプローチ',
        summary: 'パスワード総当たりだけでなく、漏洩した秘密鍵を使った鍵認証の仕組みを押さえます。',
        paragraphs: [
          '【FTP (ポート21)】anonymousログインが許可されている場合、パスワード不要で誰でもファイルを閲覧・取得 (`get`) できます。また `vsftpd 2.3.4` には悪意あるコードが混入された有名なバックドア（CVE-2011-2523）が存在します。',
          '【SSH (ポート22)】リモートログインには「パスワード認証 (`ssh user@ip -P pass`)」と「公開鍵認証 (`ssh -i id_rsa user@ip`)」があります。公開鍵認証では、サーバー側の `~/.ssh/authorized_keys` に対応する **秘密鍵 (`id_rsa`)** を持つ人だけがログインできます。したがってLFIやRedisやAPIから `id_rsa` が漏洩すると、パスワードを知らなくてもSSHログインされてしまいます。',
        ],
        commands: [
          { label: '匿名FTPに接続してファイル一覧を見る', cmd: 'ftp <IP>' },
          { label: 'FTPからファイルを取得する', cmd: 'ftp <IP> get /pub/flag.txt' },
          { label: 'パスワード指定でSSH接続', cmd: 'ssh <user>@<IP> -P <password>' },
          { label: '秘密鍵ファイル(id_rsa)でSSH接続', cmd: 'ssh -i id_rsa <user>@<IP>' },
        ],
      },
      {
        id: 'sec-hydra-john',
        title: '5.2 パスワード辞書攻撃 (hydra) とハッシュ解読 (john)',
        summary: '漏洩したハッシュ値から元のパスワードを復元する原理と、オンライン総当たりの違いを学びます。',
        paragraphs: [
          '【hydra（オンライン総当たり）】実際のSSHログイン窓口に対し、`rockyou.txt` などのよく使われるパスワード辞書を片っ端から試します。ただしIDSが有効なサーバーでは連続ログイン試行が検知・遮断される点に注意が必要です。',
          '【john（オフライン・ハッシュクラック）】SQLインジェクションや `/var/backups/shadow.bak` から盗み出した「ハッシュ値」を手元で辞書解析します。ハッシュ（MD5: 32桁16進数、SHA256: 64桁、Linux shadow `$6$...`: SHA-512crypt）は一方向関数であり「復号」はできませんが、同じ計算式で辞書の単語をハッシュ化して一致するものを探すことで、元の平文パスワードを特定できます。',
        ],
        commands: [
          { label: 'SSHパスワード辞書監査', cmd: 'hydra -l worker -P /usr/share/wordlists/rockyou.txt ssh://<IP>' },
          { label: 'ハッシュファイルや文字列を解読', cmd: 'john /var/backups/shadow.bak', note: '引数にハッシュ文字列を直接渡すこともできます' },
        ],
      },
      {
        id: 'sec-db-searchsploit',
        title: '5.3 MySQL・Redis の無防備な公開と CVE検索 (searchsploit)',
        summary: '本来ローカルや内部網に閉じるべきDB/キャッシュが露出した際の挙動と、既知CVEの調べ方。',
        paragraphs: [
          '【MySQL (ポート3306)】外部ネットワークから接続できる設定になっており、かつ `admin123` や `password` のような弱い認証情報を使っていると、テーブル内の全顧客情報やパスワードハッシュが直接抜き取られます。',
          '【Redis (ポート6379)】高速なインメモリKVS（Key-Valueストア）であるRedisは、デフォルトで認証（requirepass）なしで動作するケースが多く、外部やSSRFから `KEYS *` でキー一覧を見られると、保存されたセッションやSSH秘密鍵がそのまま読み出されます。',
          '【searchsploit】`nmap -sV` でソフト名とバージョン（例: `vsftpd 2.3.4`, `Apache/2.4.49`, `Log4j 2.14.1`, `sudo 1.8.31`）が分かったら、まず `searchsploit <名前>` で公開エクスプロイト(CVE)が存在するか検索するのが定石です。',
        ],
        commands: [
          { label: 'MySQLへ接続しテーブルを参照', cmd: 'mysql -h <IP> -u dbuser -padmin123' },
          { label: '未認証Redisのキー一覧と値取得', cmd: 'redis-cli -h <IP> KEYS *' },
          { label: 'Redisから秘密鍵を取得', cmd: 'redis-cli -h <IP> GET ssh_key', note: '秘密鍵が含まれていれば自動的にカレントディレクトリの id_rsa に保存されます' },
          { label: 'サービスバージョンから既知CVEを検索', cmd: 'searchsploit vsftpd 2.3.4' },
        ],
      },
    ],
  },

  // =========================================================================
  // 第6章: 侵入後の権限昇格・ピボット・Port Knocking
  // =========================================================================
  {
    id: 'ch-post-exploit',
    number: '第6章',
    title: '侵入後の権限昇格・ピボット・Port Knocking',
    subtitle: '一般ユーザーからrootへの4大昇格ルート、横展開(Pivot)、ステルスポート開放の仕組み',
    sections: [
      {
        id: 'sec-privesc-checklist',
        title: '6.1 Linux権限昇格（Privilege Escalation）の4大ベクトル',
        summary: 'ターゲットサーバーにログインできたら、必ず順番に確認すべき権限昇格チェックポイント。',
        paragraphs: [
          '1) sudo設定の不備 (`sudo -l`): 管理者権限で実行を許可されたコマンド（`NOPASSWD: /usr/bin/vim`, `find`, `tar`, `less`, `awk` 等）に、内部からシェルを起動できる機能（GTFOBins）があると、そのままrootシェルになります。',
          '2) SUIDバイナリ (`find / -perm -4000`): パーミッションが `-rwsr-xr-x` のように `s` が付いている実行ファイルは、「実行した一般ユーザー」ではなく「ファイル所有者（root）」の権限で動きます。`/usr/bin/python3` にSUIDが付いていると、`os.setuid(0)` を呼ぶだけで自分のプロセスがroot化します。',
          '3) Linux Capabilities (`getcap -r /`): プログラムに細かい特権だけを付与する仕組みですが、`cap_setuid+ep` が Python などに付いていると、SUIDと同様に `os.setuid(0)` でrootになれます。',
          '4) 書き込み可能なCronジョブ (`/etc/cron.d/`): rootが毎分自動実行しているバックアップスクリプト等（例: `/opt/scripts/cleanup.sh`）に、一般ユーザーや所属グループの書き込み権限（`-rwxrwxr-x`）があると、スクリプトを書き換えて次の実行時にroot権限を奪取できます。',
          '5) Sudo自体の脆弱性 (`sudo --version`): `Sudo version 1.8.31` のような古いバージョンは、ヒープバッファオーバーフロー **CVE-2021-3156 (Baron Samedit)** に脆弱です。',
        ],
        commands: [
          { label: '1. sudo許可ルールとバージョン確認', cmd: 'sudo -l' },
          { label: '2. SUIDビット付きバイナリを探索', cmd: 'find / -perm -4000 2>/dev/null' },
          { label: '3. Capabilities付与バイナリを確認', cmd: 'getcap -r / 2>/dev/null' },
          { label: '4. Python SUID / cap_setuid によるroot昇格', cmd: 'python3 -c "import os; os.setuid(0)"', note: 'バイナリが python3.11 の場合は python3.11 を指定してください' },
          { label: '5. Cron / Baron Samedit モジュール実行', cmd: 'exploit CVE-2021-3156', note: 'Cron書き込み昇格時は exploit cron を実行します' },
        ],
      },
      {
        id: 'sec-pivot-knock',
        title: '6.2 ピボット（横展開）と Port Knocking',
        summary: 'DMZの踏み台サーバーを経由した内部ネットワーク攻撃と、隠されたポートを開放するノッキング技術。',
        paragraphs: [
          '【ピボット（Pivoting / Lateral Movement）】企業の重要サーバー（DBやVault、SCADA制御装置）はインターネットから直接到達できない「内部サブネット（例: 172.16.0.0/24）」に隔離されています。しかしDMZにある踏み台サーバー（Bastion）は外部側(`eth0`)と内部側(`eth1`)の両方にネットワークカードを持っているため、まずDMZにSSH侵入し、そこから `ip a` や `arp-scan 172.16.0.0/24` を実行することで初めて内部サーバーが見えてきます。',
          '【Port Knocking】高度な防御設定（Lv.10）では、普段は重要サービスのポート（例: 9000や8443）をファイアウォールで閉じて（`filtered` にして）おき、「7001 → 8002 → 9003」のような秘密の順序でパケットが届いた直後だけポートを開放する仕組みが使われます。秘密の順序はDNS TXTレコード等からBase64復号で突き止め、`nc -z` を順番に実行して開放します。',
        ],
        commands: [
          { label: '踏み台サーバー内で内部ネットワークを探索', cmd: 'arp-scan 172.16.0.0/24' },
          { label: 'Port Knocking を順番に実行する', cmd: 'nc -z <IP> 7001' },
          { label: '前のシェル（踏み台→自PCなど）に戻る', cmd: 'exit' },
        ],
      },
    ],
  },

  // =========================================================================
  // 第7章: セキュリティレベル 1〜10 攻略ロードマップ
  // =========================================================================
  {
    id: 'ch-roadmap',
    number: '第7章',
    title: 'セキュリティレベル 1〜10 攻略ロードマップ',
    subtitle: 'レベルごとの出題テーマ、防御機構、推奨思考フローの総まとめ',
    sections: [
      {
        id: 'sec-level-matrix',
        title: '7.1 レベル1〜10 難易度別・必要スキル一覧',
        summary: '各レベルで新たに登場する防御や攻撃手法を整理しました。詰まったときの道標として活用してください。',
        paragraphs: [
          'NetStrike Lab のキャンペーン問題は Lv.1 から Lv.10 まで段階的に現実世界の攻撃チェーン（キルチェーン：偵察 → 初期侵入 → 内部調査 → 権限昇格／横展開 → 目標奪取）を体験できるよう設計されています。',
          'なお、問題を切り替えて「ターゲットに選択」を押すとターミナルは自動でローカル端末（user-PC）にリセットされるため、前の問題のroot権限のまま次の問題を誤操作する心配はありません。',
        ],
        table: {
          headers: ['レベル', '主なテーマ', '新出要素・キーツール', '典型的な突破の流れ'],
          rows: [
            ['Lv.1', '公開情報の放置', 'nmap -sV -sC, ftp, gobuster', '匿名FTP接続またはIndex of /公開ディレクトリから直接取得'],
            ['Lv.2', '設定漏洩・弱認証', 'robots.txt, .env, .git, hydra, ssh', '隠し設定ファイルやhydraで資格情報を得てSSHログイン'],
            ['Lv.3', 'Web/DB複合攻撃', 'sqlmap, curl (SQLi/LFI), mysql, john', 'SQLi / LFI / MySQLで鍵やハッシュを抜きSSH侵入'],
            ['Lv.4', '既知CVE・IDOR・SUID', 'searchsploit, exploit, IDOR, find -4000', 'レガシーCVEやIDORで侵入後、SUIDバイナリでroot昇格'],
            ['Lv.5', '設定不備の連鎖', 'CVE-2021-41773, .git, sudo -l', 'パストラバーサル等で鍵取得後、sudo設定不備でroot化'],
            ['Lv.6', 'IDS回避・SSRF・Cron', 'nmap -sS -T2, redis-cli, SSRF, exploit cron', 'ステルススキャンで検知を回避し、Redis/SSRF→cron権限昇格'],
            ['Lv.7', 'DNS転送・JWT改ざん', 'dig axfr, jwt-tool, DevTools', 'DNSから内部APIとJWT仕様を暴き、管理者JWT偽造→sudo昇格'],
            ['Lv.8', 'RCE & CVE-2021-3156', 'CmdInj, commix, john, su, CVE-2021-3156', 'コマンド注入で侵入→shadowクラック→su切替→Baron Samedit'],
            ['Lv.9', '多段ピボット攻撃', 'ip a, arp-scan, 踏み台経由スキャン', 'DMZ踏み台を侵害し、別サブネット(172.x)の隔離サーバーを攻略'],
            ['Lv.10', 'Zero-Trust 総合試練', 'base64 -d, Port Knocking, Log4j, getcap', 'DNS暗号解読→ncノック開放→Log4j/JWT侵入→cap_setuid昇格'],
          ],
        },
        callout: {
          tone: 'tip',
          title: '迷ったときの基本3ステップ',
          body: '① まず nmap（Lv.6以上は -sS -T2 -p 指定）で全開ポートとバージョンを見る。 ② Webがあれば「Webページ」タブで画面を触りつつ、ターミナルで robots.txt / gobuster / sqlmap / curl を確認。 ③ ログインできたら必ず id・ls -la・sudo -l・find / -perm -4000・getcap -r /・/etc/cron.d/ を順番にチェックする。',
        },
      },
    ],
  },
];
