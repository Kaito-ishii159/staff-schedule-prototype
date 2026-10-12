# 本番iPhoneアプリ 実装アーキテクチャ指針

最終更新: 2026-10-12

この文書は `PRODUCT_SPEC.md` の業務要件を本番iPhoneアプリへ移行する際の技術指針です。技術選定の一部は「推奨」であり、顧客確定仕様ではありません。

## 1. 基本方針

本番はiPhoneのみを対象とするため、バックグラウンド位置情報、MapKit、Push通知、非公開配布との親和性を重視します。

推奨ベースライン:

- iOS: Swift / SwiftUI
- 位置情報: Core Location
- 地図: MapKit
- Push: APNs
- 通信: HTTPS REST API
- サーバー: 自前API + RDB
- DB: PostgreSQL等
- 配布: Apple Business Manager Custom App を第一候補

SwiftUI以外を採用する場合でも、Core Locationのバックグラウンド要件を満たせることを事前検証してください。

## 2. システム構成

想定:

iPhone App
→ HTTPS API
→ Application Server
→ Database

外部 / Appleサービス:

- APNs
- Core Location
- MapKit / Appleの経路サービス
- Apple Business Manager / App Store Connect

FirebaseやGoogle Mapsは必須ではありません。

## 3. 推奨エンティティ

### Office

- id
- name
- address
- phone
- active
- createdAt
- updatedAt

### Staff

- id
- email
- name
- officeId
- role
- active
- theme
- createdAt
- updatedAt

### Client

- id
- name
- kana
- phone
- address
- officeId
- ownerStaffId
- active
- nextPlanDueMonth
- createdAt
- updatedAt

利用者IDは不変とし、氏名は識別キーにしません。

### ScheduleSeries

繰り返し予定の親です。

- id
- clientId
- staffId
- officeId
- visitType
- serviceKind
- content
- defaultMemo
- memoScope
- startDate
- startTime
- endTime
- recurrenceFrequency
- weekdays
- recurrenceEndDate
- active
- createdBy
- createdAt
- updatedAt

### ScheduleOverride

特定発生回の例外です。

- id
- scheduleSeriesId
- occurrenceDate
- overrideDate
- overrideStartTime
- overrideEndTime
- overrideStaffId
- overrideContent
- overrideMemo
- status
- deleted
- createdAt
- updatedAt

特定日の変更・キャンセルは、シリーズ本体を書き換えず例外として扱います。

### MemoCompletion

- scheduleSeriesId
- occurrenceDate
- completed
- completedBy
- completedAt

繰り返しメモの完了は発生回単位です。

### StaffLocation

- staffId
- latitude
- longitude
- accuracy
- capturedAt
- uploadedAt

履歴保存が必要な場合は別テーブルまたは時系列保存とします。

### Notification

- id
- recipientStaffId
- type
- scheduleSeriesId
- occurrenceDate
- title
- body
- readAt
- createdAt

### DocumentStatus

- id
- clientId
- staffId
- documentType
- dueMonth
- completedAt
- completedBy

documentType:

- report
- plan

### InternalRequest

- id
- clientId
- requesterStaffId
- requesterOfficeId
- source
- clientSummary
- freeText
- createdAt

承認ステータスは要件確定までは持たせないか、将来追加可能な設計に留めます。

### FreeNote

- id
- staffId
- text
- createdAt
- updatedAt

### Device

Push通知・端末管理が必要なら保持します。

- id
- staffId
- apnsToken
- active
- lastSeenAt

## 4. 認証・認可

本番ではメールアドレス + パスワード等の認証を実装します。

必須:

- パスワードの安全なハッシュ化
- access / refresh token または同等のセッション
- 無効職員のアクセス停止
- API側で毎回認可
- UI非表示だけに依存しない

管理者機能はサーバー側でもroleを検証します。

## 5. 予定生成

クライアントが無期限の予定レコードを大量生成する方式は避けます。

推奨:

1. ScheduleSeriesに繰り返しルールを保持
2. 表示期間の日付ごとに発生判定
3. ScheduleOverrideを適用
4. キャンセル / 削除 / 担当変更を反映

プロトタイプの `occurrencesOn`、`changeOccurrence`、`cancelOccurrence` の考え方を参考にします。

## 6. 位置情報

### iOS

- Core Locationを利用
- Background Location Updatesを利用
- 必要な位置権限の説明を明示
- バッテリー消費を考慮

強制終了されたアプリで継続更新できると保証しないでください。

### サーバー

最新位置表示だけならStaffのlatest locationを保持してもよいですが、履歴が必要ならStaffLocationとして保存します。

本番前に次を決定します。

- 送信頻度
- 距離変化による送信条件
- 保存期間
- 古い位置を「現在地」と誤認させない表示

UIには必ず最終更新時刻を表示します。

## 7. 地図・ルート

MapKitを第一候補とします。

必要機能:

- 訪問先ピン
- 現在地
- 職員最新位置
- 道路経路
- 区間距離
- 所要時間

複数訪問先の最適順はMapKitの単一路線表示だけに依存せず、必要に応じてアプリ / サーバー側で順序最適化します。

訪問件数が増える可能性を考慮し、総当たりだけに依存しない設計を検討します。

## 8. Push通知

APNsを使用する場合:

- 端末tokenをDeviceへ登録
- 予定担当変更時に対象職員へ通知
- 時刻変更時に対象職員へ通知
- 通知タップで予定詳細へDeep Link

通知生成はサーバー側を原則とします。

## 9. テーマ

テーマ設定はStaffまたはStaffPreferenceとしてサーバー保存することを推奨します。

テーマ:

- polar
- animals
- space
- tropical
- flowers

画像素材は権利処理済みのオリジナル素材のみ使用します。

## 10. API境界の例

正式URLは実装時に決定します。

- POST /auth/login
- POST /auth/refresh
- GET /me
- GET /offices
- GET /staff
- GET /clients
- POST /clients
- PATCH /clients/{id}
- GET /schedules
- POST /schedules
- PATCH /schedules/{id}
- POST /schedules/{id}/overrides
- POST /schedules/{id}/cancel
- POST /schedules/{id}/memo-completions
- GET /cancellations
- POST /locations
- GET /staff-locations
- GET /document-status
- PATCH /document-status/{id}
- GET /internal-requests
- POST /internal-requests
- GET /free-notes
- POST /free-notes
- PATCH /free-notes/{id}
- DELETE /free-notes/{id}

## 11. 監査ログ

利用者情報・位置情報・予定変更を扱うため、本番では重要操作の監査ログを推奨します。

候補:

- 予定登録
- 予定編集
- 担当変更
- キャンセル
- 利用者情報変更
- 職員無効化
- 位置情報閲覧の監査が必要かは要確認

## 12. プライバシー

位置情報は業務上必要な範囲だけ取得します。

必要事項:

- 取得目的を明示
- 取得中であることを職員に分かるようにする
- 保存期間を決める
- 勤務外の取得を避ける運用
- 閲覧できる職員範囲を明文化

## 13. 本番移行時の実装順序

推奨順:

### Phase A: 基盤

- 認証
- Office
- Staff
- Client
- API / DB
- 権限

### Phase B: 予定管理

- ScheduleSeries
- ScheduleOverride
- 日 / 週表示
- 予定登録・編集
- 担当変更
- 繰り返し
- キャンセル
- メモ

### Phase C: 通知

- APNs
- 通知一覧
- Deep Link

### Phase D: 地図・ルート

- MapKit
- 自分の訪問先
- 経路
- 距離
- 最適順

### Phase E: 位置情報

- Core Location
- バックグラウンド更新
- StaffLocation
- 職員位置マップ
- 実機・電池検証

### Phase F: 周辺機能

- 書類更新管理
- フリーメモ
- 新規依頼
- テーマ
- 管理画面

### Phase G: 非公開配布

- App Store Connect
- Apple Business Manager
- 本番審査
- 社内展開

## 14. プロトタイプを移植するときの注意

Webプロトタイプは仕様・UX確認のための資料です。

そのまま移植してはいけないもの:

- React stateをDB代わりにする
- localStorageを業務データ保存にする
- 架空座標を本番位置として使う
- SVG地図を本番地図として使う
- ダミー認証を残す
- 氏名文字列でデータを紐付ける

再利用すべきもの:

- 画面構成
- 入力項目
- 操作順
- 業務ルール
- 繰り返し / 例外の概念
- clientIdによる関連付け
- テストで表現された受入条件

## 15. AI / Codexで本番開発を開始するとき

最初に必ず以下を読ませてください。

1. `docs/PRODUCT_SPEC.md`
2. `docs/PRODUCTION_ARCHITECTURE.md`
3. 現在のプロトタイプ
4. README
5. tests

実装を開始する前に、未確定事項を勝手に決めず一覧化してください。
