# 本番iPhoneアプリ 実装アーキテクチャ指針

最終更新: 2026-10-18

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
- transportType (private / company)
- vehicleId (companyの場合必須)
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
- overrideTransportType
- overrideVehicleId
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

## 16. work追加要件のモデル・削除制約

2026-10-18のWebプロトタイプ追加モデル。本番DB/APIは今回実装しません。

- Vehicle: id / label / number / officeId / active
- VehicleUseRecord: id / date / time / end / vehicleId / staffId / clientId / officeId / cancelled / archived
- SharedOfficeNote: id / officeId / authorStaffId / text / createdAt / updatedAt
- AlcoholCheckRecord: id / date / officeId / vehicleId / driverStaffId / checkerStaffId / startAlcoholDetected / endAlcoholDetected / startTemperature / drivingInstruction / notes
- StaffWorkPattern: staffId / weekday / working / startTime / endTime
- StaffWorkException: staffId / date / kind(off, extra, hours) / working / startTime / endTime

氏名や表示名で結合せずclientId / staffId / officeId / vehicleIdを使う。本番では外部キーを設定し、削除時はトランザクション内で参照を再確認する。予定の例外・キャンセル、書類、依頼、メモ、車両履歴、アルコール記録も参照対象。未使用のみ完全削除、停止／無効化は別操作。

個人メモは本人のみ、共有メモは同一事業所でAPI認可する。本プロトタイプは `visit-free-notes:{staffId}` と `visit-office-notes:{officeId}` を分けるだけで、多端末共有・本番認可は実装しない。共有メモ編集で作成者と作成日時を変更しない。

## 17. 予定・車両履歴・集計の境界

予定本体と特定日override双方に移動手段・車両を保持。社用車は所属事業所の有効車両を選択し、停止後も既存割当と履歴を維持する。車両予約や時間重複判定は未確定のため実装しない。

履歴は実乗車情報とは別で、プロトタイプは指定月の予定を展開し、変更／削除前の社用車情報を保存済みレコードとして残す。職員別と車両別のどちらからもIDで参照する。

移動集計は発生回展開→キャンセル除外→職員別・日別区間→月合算。地図と同一の固定デモ区間値を共用し、帰着区間は未算入。平均は暫定的に移動予定日数で割る。実GPS／道路距離、正式集計対象、ガソリン代精算、距離適否基準は未確定。顧客提供の時間目安は参考表示で法的・医学的判定に使わない。

アルコールチェックはIDを参照する手入力記録。運転可否を推測しない。本番の必須・法定保存項目、保存期間、社内規程、法令上の確認と監査方針は未確定として残し、準拠保証をしない。

将来API例: /vehicles /vehicle-uses /travel-summary /alcohol-checks /office-notes /staff/{id}/work-patterns /staff/{id}/work-exceptions/{date}。APIで所属・役割を検証する。

## 18. 勤務設定と2段階ピンチ

個別日例外を曜日パターンより優先。未設定を休日と推測せず、勤務外区間を描画するだけで登録を拒否しない。勤怠連携・勤務外警告は未確定。

Webは予定表DOM内にTouch Eventsを登録。2点間距離が開始時から15%以上変わった際にdetail / overviewへ最大1回切替。2本指以上のtouchmoveのみpreventDefault（passive:false）し、他領域・1本指操作は変更しない。ジェスチャーの世代でピンチ中の長押しと誤タップを抑止。ボタンを代替操作として残す。

本番SwiftUIではMagnifyGesture等で同じ2状態を実装。ページ全体／iOSのアクセシビリティ拡大を無効にしない。Safari実機でピンチとスクロールの競合、長押しを確認する。

## 19. 2026-10-19の検証用追加要件

- 週間表示はdetail / overviewの2状態。今回はボタン切替を優先し、既存の日別ピンチを変更しない。
- 新規依頼の更新はidで置換し、requesterStaffId / requesterOfficeIdを既存レコードから維持。削除は確認後に対象idのみ除去。本番の編集／削除認可と監査はAPI側で設計するが、今回バックエンドは実装しない。
- ホームと管理画面はAlcoholChecksの表示バリエーションを使い、入力フォーム・検証・詳細・編集を共通利用。新規のdriverStaffIdはself.id、ホーム抽出はdriverStaffIdと本日dateで行う。同日複数を許容し、削除・編集監査の要否は未確定。
- 担当利用者はClient.ownerIdと選択中の職員ID（初期値self.id）で抽出。関連画面へclient.idを渡し、表示名で結合しない。
- 基本勤務の入力UIと初期値／検証は職員フォームと勤務設定で共通利用。新規Staff.idを1回だけ発行し、StaffWorkPattern.staffIdを同じIDで保存。編集時は当該職員の基本勤務だけ置換し、StaffWorkExceptionを保持。本番ではStaffと基本勤務の保存をトランザクションにする。
- 移動集計のモデル・計算・画面は今回変更しない。

## 20. 2026-10-21の新規依頼・担当職員切替

ClientPickerは標準allと新規依頼専用new-onlyを分離。new-onlyは既存検索・候補を描画せず、共通ClientEditorで登録したClientを親stateへ保存しclientIdを自動選択する。編集時の関連Clientは停止済みでも選択情報として表示する。NewRequestのモデル・更新／削除処理は変更しない。依頼段階でClientマスタへ登録する本番方針は未確定。

担当利用者は職員ID選択後にownerIdで抽出し、その結果を検索。職員名・事業所名は表示のみで識別キーにしない。プロトタイプでは職員マスタ全体を選択できるが、本番の一般職員／管理者・同一事業所／全事業所の閲覧範囲は未確定。確定後API側で認可し、今回UIだけの権限制御は追加しない。
