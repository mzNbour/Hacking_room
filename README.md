# NetStrike Lab

擬似Linuxターミナルと各種セキュリティツール（`nmap` / `gobuster` / `curl` / `sqlmap` / `hydra` / `ssh` / `john` / `dig` / `redis-cli` / `jwt-tool` 等）を使って、セキュリティレベル 1〜10 のサーバーや自作サーバーからフラグを奪取する実践型CTF学習シミュレーターです。

## ローカルでの起動方法

```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run build
```

## GitHub Pages で公開して遊ぶ方法

このリポジトリには自動デプロイ用の GitHub Actions ワークフロー（`.github/workflows/deploy.yml`）が含まれています。

1. ソースコードを GitHub リポジトリの `main`（または `master`）ブランチへ Push します。
2. GitHub のリポジトリページで **Settings → Pages** を開きます。
3. **Build and deployment → Source** を **GitHub Actions** に変更します。
4. **Actions** タブで `Deploy to GitHub Pages` が完了すると、表示される URL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）からブラウザ上で誰でも遊べるようになります。
