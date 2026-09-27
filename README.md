# 訪問予定管理 Prototype

社内向け訪問予定管理iPhoneアプリのフェーズ1操作プロトタイプです。架空データのみを使用し、認証・GPS・ルート計算・通知・保存は完成イメージを示すデモとして実装しています。

## 起動

```bash
npm install
npm run dev
```

`npm run build` で静的ファイルを生成します。ハッシュルーティングを使用するため、GitHub Pages上の直接アクセス・リロードにも対応します。

## GitHub Pages

`main` ブランチへプッシュすると、[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) がビルド成果物を GitHub Pages に公開します。リポジトリの **Settings → Pages → Build and deployment** で Source を **GitHub Actions** に一度設定してください。

## 主な操作

- 任意入力のログイン
- 下部タブでホーム、予定、マップ、通知、その他を切替
- 予定カードのタップで詳細、長押しでアクションシート
- 予定の追加・編集・削除、詳細からの担当変更
- 訪問先マップ、最適ルート計算デモ、職員現在地、移動距離
- 通知の既読化、設定の変更、ログアウト
