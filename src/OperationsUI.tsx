import { useState } from "react";
import { Empty, Modal } from "./components";
import {
  dateLabel,
  newId,
  today,
  type Client,
  type Office,
  type Staff,
  type Visit,
} from "./domain";
import {
  basicWorkPatterns,
  filterAlcohol,
  readLocal,
  storeLocal,
  travelSummary,
  travelTimeGuide,
  vehicleHistory,
  validWorkingHours,
  type AlcoholCheckRecord,
  type SharedOfficeNote,
  type StaffWorkException,
  type StaffWorkPattern,
  type Vehicle,
  type VehicleUseRecord,
} from "./operations";
import { WorkPatternFields } from "./WorkPatternFields";

export function MasterDeleteDialog({
  label,
  reasons,
  onClose,
  onDelete,
}: {
  label: string;
  reasons: string[];
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal title={`この${label}を削除しますか？`} onClose={onClose}>
      {reasons.length ? (
        <>
          <p role="alert">
            関連する予定・履歴が存在するため削除できません。利用停止・無効化をご利用ください。
          </p>
          <ul>
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <button className="secondary full" onClick={onClose}>
            戻る
          </button>
        </>
      ) : (
        <>
          <p>削除すると元に戻せません。</p>
          <div className="inline-actions">
            <button className="secondary" onClick={onClose}>
              戻る
            </button>
            <button className="primary danger-solid" onClick={onDelete}>
              削除する
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function SharedNotes({
  officeId,
  staffId,
  staff,
}: {
  officeId: string;
  staffId: string;
  staff: Staff[];
}) {
  const key = `visit-office-notes:${officeId}`;
  const [notes, setNotes] = useState<SharedOfficeNote[]>(() =>
    readLocal(key, []),
  );
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const [message, setMessage] = useState("");
  const save = (next: SharedOfficeNote[]) => {
    setNotes(next);
    setMessage(
      storeLocal(key, next)
        ? "保存しました"
        : "端末への保存に失敗しました。画面内のみの変更です。",
    );
  };
  return (
    <div className="page">
      <h1>事業所共有メモ</h1>
      <p className="field-note">
        同じ事業所で共有する想定のデモです。保存先はこの端末のみで、他の端末には同期しません。
      </p>
      <form
        className="formcard"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          const now = new Date().toISOString();
          save(
            editing
              ? notes.map((n) =>
                  n.id === editing
                    ? { ...n, text: draft.trim(), updatedAt: now }
                    : n,
                )
              : [
                  {
                    id: newId(),
                    officeId,
                    authorStaffId: staffId,
                    text: draft.trim(),
                    createdAt: now,
                    updatedAt: now,
                  },
                  ...notes,
                ],
          );
          setDraft("");
          setEditing(undefined);
        }}
      >
        <label>
          共有メモ内容
          <textarea
            required
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button className="primary full">
          {editing ? "共有メモの変更を保存" : "共有メモを保存"}
        </button>
        {editing && (
          <button
            type="button"
            className="text-action"
            onClick={() => {
              setDraft("");
              setEditing(undefined);
            }}
          >
            編集をやめる
          </button>
        )}
      </form>
      {notes.map((n) => (
        <article className="document-card" key={n.id}>
          <p className="preserve-lines">{n.text}</p>
          <small>
            作成者：
            {staff.find((s) => s.id === n.authorStaffId)?.name ||
              n.authorStaffId}
          </small>
          <small className="block">
            作成日時：{new Date(n.createdAt).toLocaleString("ja-JP")}
          </small>
          <small className="block">
            更新日時：{new Date(n.updatedAt).toLocaleString("ja-JP")}
          </small>
          <div className="inline-actions">
            <button
              className="secondary"
              onClick={() => {
                setDraft(n.text);
                setEditing(n.id);
                window.scrollTo(0, 0);
              }}
            >
              共有メモを編集
            </button>
            <button
              className="secondary danger"
              onClick={() => setDeleting(n.id)}
            >
              共有メモを削除
            </button>
          </div>
        </article>
      ))}
      {!notes.length && <Empty>共有メモはありません。</Empty>}
      {message && <p role="status">{message}</p>}
      {deleting && (
        <Modal
          title="共有メモを削除しますか？"
          onClose={() => setDeleting(undefined)}
        >
          <p>削除すると元に戻せません。</p>
          <button
            className="primary full danger-solid"
            onClick={() => {
              save(notes.filter((n) => n.id !== deleting));
              if (editing === deleting) {
                setEditing(undefined);
                setDraft("");
              }
              setDeleting(undefined);
            }}
          >
            削除する
          </button>
        </Modal>
      )}
    </div>
  );
}

export function Vehicles({
  vehicles,
  offices,
  onSave,
  onDelete,
  onHistory,
}: {
  vehicles: Vehicle[];
  offices: Office[];
  onSave: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
  onHistory: (id: string) => void;
}) {
  const [officeId, setOffice] = useState(offices[0]?.id || "");
  const [editor, setEditor] = useState<Vehicle>();
  const [stopping, setStopping] = useState<Vehicle>();
  return (
    <div className="page">
      <h1>車両管理</h1>
      <p className="field-note">番号はすべて架空です。</p>
      <label className="ops-filter">
        所属事業所
        <select value={officeId} onChange={(e) => setOffice(e.target.value)}>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="primary full"
        onClick={() =>
          setEditor({
            id: newId(),
            label: "",
            number: "",
            officeId,
            active: true,
          })
        }
      >
        車両を登録
      </button>
      {vehicles
        .filter((v) => v.officeId === officeId)
        .map((v) => (
          <article className="document-card" key={v.id}>
            <h2>{v.label}</h2>
            <p>{v.number}</p>
            <p>{v.active ? "利用中" : "利用停止"}</p>
            <div className="ops-actions">
              <button className="secondary" onClick={() => setEditor(v)}>
                車両を編集
              </button>
              <button className="secondary" onClick={() => onHistory(v.id)}>
                利用履歴
              </button>
              <button className="secondary" onClick={() => setStopping(v)}>
                {v.active ? "車両を利用停止" : "車両の利用を再開"}
              </button>
              <button className="secondary danger" onClick={() => onDelete(v)}>
                車両を削除
              </button>
            </div>
          </article>
        ))}
      {!vehicles.some((v) => v.officeId === officeId) && (
        <Empty>登録車両はありません。</Empty>
      )}
      {editor && (
        <Modal title="車両の登録・編集" onClose={() => setEditor(undefined)}>
          <form
            className="request-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editor.label.trim() || !editor.number.trim()) return;
              onSave({
                ...editor,
                label: editor.label.trim(),
                number: editor.number.trim(),
              });
              setEditor(undefined);
            }}
          >
            <p className="field-note">車両ID：{editor.id}</p>
            <label>
              車両表示名
              <input
                required
                value={editor.label}
                onChange={(e) =>
                  setEditor({ ...editor, label: e.target.value })
                }
              />
            </label>
            <label>
              車両番号（架空）
              <input
                required
                placeholder="架空 000 あ 00-00"
                value={editor.number}
                onChange={(e) =>
                  setEditor({ ...editor, number: e.target.value })
                }
              />
            </label>
            <label>
              所属事業所
              <select
                value={editor.officeId}
                disabled={vehicles.some((v) => v.id === editor.id)}
                onChange={(e) =>
                  setEditor({ ...editor, officeId: e.target.value })
                }
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-note">
              登録後の所属変更は、過去の履歴を保つためこのデモでは行いません。
            </p>
            <button className="primary full">車両を保存</button>
          </form>
        </Modal>
      )}
      {stopping && (
        <Modal
          title="車両の利用状態を変更しますか？"
          onClose={() => setStopping(undefined)}
        >
          <p>既存の予定・履歴は残ります。</p>
          <button
            className="primary full"
            onClick={() => {
              onSave({ ...stopping, active: !stopping.active });
              setStopping(undefined);
            }}
          >
            利用状態を確定
          </button>
        </Modal>
      )}
    </div>
  );
}

export function VehicleHistory({
  visits,
  vehicles,
  staff,
  offices,
  clients,
  archive,
  initialVehicleId = "",
  initialStaffId = "",
}: {
  visits: Visit[];
  vehicles: Vehicle[];
  staff: Staff[];
  offices: Office[];
  clients: Client[];
  archive: VehicleUseRecord[];
  initialVehicleId?: string;
  initialStaffId?: string;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [vehicleId, setVehicle] = useState(initialVehicleId);
  const [staffId, setStaff] = useState(initialStaffId);
  const records = vehicleHistory(visits, staff, month, archive).filter(
    (r) =>
      (!vehicleId || r.vehicleId === vehicleId) &&
      (!staffId || r.staffId === staffId),
  );
  return (
    <div className="page">
      <h1>車両利用履歴</h1>
      <p className="field-note">
        予定に基づく車両利用情報（デモ）。実際の乗車・走行実績を示すものではありません。変更前・削除前の登録情報も残します。
      </p>
      <div className="ops-filters">
        <label>
          対象月
          <input
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label>
          車両
          <select
            value={vehicleId}
            onChange={(e) => setVehicle(e.target.value)}
          >
            <option value="">すべての車両</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          職員
          <select value={staffId} onChange={(e) => setStaff(e.target.value)}>
            <option value="">すべての職員</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {records.map((r, i) => (
        <article className="document-card" key={`${r.id}:${i}`}>
          <h2>
            {dateLabel(r.date)} {r.time}〜{r.end}
          </h2>
          <p>
            {vehicles.find((v) => v.id === r.vehicleId)?.label} ·{" "}
            {vehicles.find((v) => v.id === r.vehicleId)?.number}
          </p>
          <p>職員：{staff.find((s) => s.id === r.staffId)?.name}</p>
          <p>
            利用者：
            {clients.find((c) => c.id === r.clientId)?.name || "利用者なし"}
          </p>
          <p>{offices.find((o) => o.id === r.officeId)?.name}</p>
          <small>
            {r.archived
              ? "変更前・保存済み情報（デモ）"
              : r.cancelled
                ? "キャンセル済みの利用予定"
                : "登録済みの利用予定"}
          </small>
        </article>
      ))}
      {!records.length && <Empty>対象の車両利用情報はありません。</Empty>}
    </div>
  );
}

export function TravelTotals({
  visits,
  staff,
  offices,
  selfId,
}: {
  visits: Visit[];
  staff: Staff[];
  offices: Office[];
  selfId: string;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const self = staff.find((s) => s.id === selfId)!;
  const [officeId, setOffice] = useState(self.officeId);
  const [staffId, setStaff] = useState(selfId);
  const total = travelSummary(visits, staffId, month);
  return (
    <div className="page">
      <h1>移動集計</h1>
      <p className="demo-notice">予定ルートによる推定 · デモ</p>
      <div className="ops-filters">
        <label>
          対象月
          <input
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label>
          事業所
          <select
            value={officeId}
            onChange={(e) => {
              setOffice(e.target.value);
              setStaff(
                staff.find((s) => s.officeId === e.target.value)?.id || "",
              );
            }}
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          職員
          <select value={staffId} onChange={(e) => setStaff(e.target.value)}>
            {!staff.some((s) => s.officeId === officeId) && (
              <option value="">職員なし</option>
            )}
            {staff
              .filter((s) => s.officeId === officeId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="metric-grid">
        {[
          ["月間累積移動距離", `${total.distance.toFixed(1)} km`],
          ["月間累積移動時間", `${total.duration} 分`],
          ["1日平均移動距離", `${total.averageDistance.toFixed(1)} km`],
          ["1日平均移動時間", `${total.averageDuration.toFixed(1)} 分`],
          ["自家用車の距離", `${total.privateDistance.toFixed(1)} km`],
          ["社用車の距離", `${total.companyDistance.toFixed(1)} km`],
          ["移動予定日数", `${total.days} 日`],
        ].map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <p className="field-note">
        暫定定義：移動予定が存在する日の1日平均です。キャンセルは除外。事業所→各訪問先の固定デモ区間を合算し、帰着区間は含みません。
      </p>
      <TimeGuide />
    </div>
  );
}
export function TimeGuide({ duration }: { duration?: number }) {
  return (
    <details className="time-guide">
      <summary>
        移動時間の目安（参考）
        {duration !== undefined ? `：${travelTimeGuide(duration)}` : ""}
      </summary>
      <p>顧客提供の参考指標です。法的・医学的基準、業界標準ではありません。</p>
      <dl>
        {[
          ["60分以内", "非常に効率的"],
          ["60分超〜90分以内", "理想的な範囲"],
          ["90分超〜120分以内", "許容範囲"],
          ["120分超〜150分未満", "改善を検討"],
          ["150分以上", "移動負担が大きい"],
        ].map(([range, label]) => (
          <div key={range}>
            <dt>{range}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

type AlcoholDraft = Omit<
  AlcoholCheckRecord,
  | "startAlcoholDetected"
  | "endAlcoholDetected"
  | "startTemperature"
  | "drivingInstruction"
> & {
  startAlcoholDetected?: boolean;
  endAlcoholDetected?: boolean;
  startTemperature: number | "";
  drivingInstruction: AlcoholCheckRecord["drivingInstruction"] | "";
};
export function AlcoholChecks({
  records,
  vehicles,
  staff,
  offices,
  onSave,
  selfId = staff[0]?.id || "",
  view = "management",
}: {
  records: AlcoholCheckRecord[];
  vehicles: Vehicle[];
  staff: Staff[];
  offices: Office[];
  onSave: (r: AlcoholCheckRecord) => void;
  selfId?: string;
  view?: "management" | "home";
}) {
  const home = view === "home";
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [period, setPeriod] = useState<"day" | "month">("month");
  const [officeId, setOffice] = useState(offices[0].id);
  const [vehicleId, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [editor, setEditor] = useState<AlcoholDraft>();
  const [selected, setSelected] = useState<AlcoholCheckRecord>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const original = records.find((record) => record.id === editor?.id);
  const filtered = home
    ? records.filter((r) => r.date === today && r.driverStaffId === selfId)
    : filterAlcohol(
        records,
        period === "day" ? day.slice(0, 7) : month,
        officeId,
        vehicleId,
        driver,
        period === "day" ? day : "",
      );
  return (
    <section
      className={home ? "home-alcohol" : "page"}
      aria-label={home ? "本日のアルコールチェック" : undefined}
    >
      {home ? (
        <h2 className="section-heading">本日のアルコールチェック</h2>
      ) : (
        <h1>アルコールチェック</h1>
      )}
      {home && (
        <p>
          {filtered.length ? `チェック済み · ${filtered.length}件` : "未登録"} ·{" "}
          {today}
        </p>
      )}
      <p className="demo-notice">
        手入力による確認デモ · 検知器とは連携しません
      </p>
      {!home && (
        <>
          <div
            className="schedule-modes"
            role="group"
            aria-label="アルコールチェックの表示期間"
          >
            <button
              aria-pressed={period === "day"}
              onClick={() => setPeriod("day")}
            >
              日別
            </button>
            <button
              aria-pressed={period === "month"}
              onClick={() => setPeriod("month")}
            >
              月別
            </button>
          </div>
          <div className="ops-filters">
            <label>
              {period === "day" ? "対象日" : "対象月"}
              <input
                type={period === "day" ? "date" : "month"}
                required
                value={period === "day" ? day : month}
                onChange={(e) =>
                  period === "day"
                    ? setDay(e.target.value)
                    : setMonth(e.target.value)
                }
              />
            </label>
            <label>
              事業所
              <select
                value={officeId}
                onChange={(e) => {
                  setOffice(e.target.value);
                  setVehicle("");
                  setDriver("");
                }}
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              車両
              <select
                value={vehicleId}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option value="">すべての車両</option>
                {vehicles
                  .filter((v) => v.officeId === officeId)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              運転手
              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              >
                <option value="">すべての運転手</option>
                {staff
                  .filter((s) => s.officeId === officeId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </>
      )}
      <button
        className="primary full"
        onClick={() => {
          setError("");
          setMessage("");
          setEditor({
            id: newId(),
            date: today,
            officeId: staff.find((s) => s.id === selfId)?.officeId || officeId,
            vehicleId: "",
            driverStaffId: selfId,
            checkerStaffId: "",
            startAlcoholDetected: undefined,
            endAlcoholDetected: undefined,
            startTemperature: "",
            drivingInstruction: "",
            notes: "",
          });
        }}
      >
        {home && filtered.length ? "チェックを追加登録" : "チェックを登録"}
      </button>
      {message && !selected && <p role="status">{message}</p>}
      {!home && <p>{filtered.length}件</p>}
      {filtered.map((r) => (
        <button
          className="client-list-item alcohol-item"
          key={r.id}
          onClick={() => {
            setMessage("");
            setSelected(r);
          }}
        >
          <b className="alcohol-driver">
            運転手：
            {staff.find((s) => s.id === r.driverStaffId)?.name ||
              "職員情報なし"}
          </b>
          <b>
            {dateLabel(r.date)} ·{" "}
            {vehicles.find((v) => v.id === r.vehicleId)?.label}
          </b>
          <span>
            確認者：{staff.find((s) => s.id === r.checkerStaffId)?.name}
          </span>
          <span>
            出勤：{r.startAlcoholDetected ? "酒気帯びあり" : "酒気帯びなし"} ·
            退勤：{r.endAlcoholDetected ? "酒気帯びあり" : "酒気帯びなし"}
          </span>
          <span>
            体温：{r.startTemperature}℃ ·{" "}
            {r.drivingInstruction === "allowed" ? "運転可" : "運転不可"}
          </span>
          <small>詳細を見る →</small>
        </button>
      ))}
      {!home && !filtered.length && <Empty>対象のチェックはありません。</Empty>}
      {!home && (
        <p className="field-note">
          本プロトタイプは法令準拠を保証しません。必須保存項目・保存期間・社内規程・法令上の確認は未確定です。
        </p>
      )}
      {editor && (
        <Modal
          title={
            original ? "アルコールチェックを編集" : "アルコールチェックを登録"
          }
          onClose={() => {
            setEditor(undefined);
            if (original) setSelected(original);
          }}
        >
          <form
            className="request-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !vehicles.some(
                  (v) =>
                    v.id === editor.vehicleId &&
                    ((v.active && v.officeId === editor.officeId) ||
                      v.id === original?.vehicleId),
                ) ||
                !staff.some(
                  (s) =>
                    s.id === editor.driverStaffId &&
                    ((s.active && s.officeId === editor.officeId) ||
                      s.id === original?.driverStaffId),
                ) ||
                !staff.some(
                  (s) =>
                    s.id === editor.checkerStaffId &&
                    (s.active || s.id === original?.checkerStaffId),
                )
              ) {
                setError("車両・運転手・確認者を選択してください。");
                return;
              }
              if (
                !editor.date ||
                editor.startAlcoholDetected === undefined ||
                editor.endAlcoholDetected === undefined ||
                editor.startTemperature === "" ||
                !Number.isFinite(editor.startTemperature) ||
                editor.startTemperature < 30 ||
                editor.startTemperature > 45 ||
                !editor.drivingInstruction
              ) {
                setError(
                  "日付・酒気帯び・体温（30〜45℃）・指示事項を入力してください。",
                );
                return;
              }
              const saved: AlcoholCheckRecord = {
                ...editor,
                startAlcoholDetected: editor.startAlcoholDetected,
                endAlcoholDetected: editor.endAlcoholDetected,
                startTemperature: editor.startTemperature,
                drivingInstruction: editor.drivingInstruction,
              };
              onSave(saved);
              setMonth(editor.date.slice(0, 7));
              setDay(editor.date);
              setOffice(editor.officeId);
              setVehicle("");
              setDriver("");
              setEditor(undefined);
              setMessage(
                original ? "変更を保存しました" : "チェックを保存しました",
              );
              if (original) setSelected(saved);
            }}
          >
            {original ? (
              <p className="field-note">
                記録の事業所：
                {offices.find((o) => o.id === editor.officeId)?.name}
              </p>
            ) : (
              <label>
                記録の事業所
                <select
                  value={editor.officeId}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      officeId: e.target.value,
                      vehicleId: "",
                      driverStaffId: "",
                    })
                  }
                >
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              日付
              <input
                type="date"
                required
                value={editor.date}
                onChange={(e) => setEditor({ ...editor, date: e.target.value })}
              />
            </label>
            <label>
              車両
              <select
                required
                value={editor.vehicleId}
                onChange={(e) =>
                  setEditor({ ...editor, vehicleId: e.target.value })
                }
              >
                <option value="">車両を選択</option>
                {vehicles
                  .filter(
                    (v) =>
                      (v.active && v.officeId === editor.officeId) ||
                      v.id === original?.vehicleId,
                  )
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                      {!v.active && "（現在利用停止）"}
                    </option>
                  ))}
              </select>
            </label>
            {(
              [
                ["driverStaffId", "運転手"],
                ["checkerStaffId", "確認者"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  required
                  value={editor[key]}
                  onChange={(e) =>
                    setEditor({ ...editor, [key]: e.target.value })
                  }
                >
                  <option value="">職員を選択</option>
                  {staff
                    .filter(
                      (s) =>
                        (s.active &&
                          (key === "checkerStaffId" ||
                            s.officeId === editor.officeId)) ||
                        s.id === original?.[key],
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {!s.active && "（現在利用停止）"}
                      </option>
                    ))}
                </select>
              </label>
            ))}
            {(
              [
                ["startAlcoholDetected", "出勤時 酒気帯び"],
                ["endAlcoholDetected", "退勤時 酒気帯び"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  required
                  value={
                    editor[key] === undefined ? "" : editor[key] ? "yes" : "no"
                  }
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      [key]: e.target.value
                        ? e.target.value === "yes"
                        : undefined,
                    })
                  }
                >
                  <option value="">確認結果を選択</option>
                  <option value="no">なし</option>
                  <option value="yes">あり</option>
                </select>
              </label>
            ))}
            <label>
              出勤時 体温（℃）
              <input
                type="number"
                step="0.1"
                min="30"
                max="45"
                required
                value={editor.startTemperature}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    startTemperature:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              指示事項
              <select
                required
                value={editor.drivingInstruction}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    drivingInstruction: e.target
                      .value as AlcoholDraft["drivingInstruction"],
                  })
                }
              >
                <option value="">指示を選択</option>
                <option value="allowed">運転可</option>
                <option value="prohibited">運転不可</option>
              </select>
            </label>
            <p className="field-note">
              指示事項は確認者の手入力です。アプリが測定値から運転可否を自動判定するものではありません。
            </p>
            <label>
              特記事項
              <textarea
                value={editor.notes}
                onChange={(e) =>
                  setEditor({ ...editor, notes: e.target.value })
                }
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary full">
              {original ? "変更を保存" : "チェックを保存"}
            </button>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          title="アルコールチェック詳細"
          onClose={() => setSelected(undefined)}
        >
          {message && <p role="status">{message}</p>}
          <dl className="ops-detail">
            {[
              ["日付", selected.date],
              ["事業所", offices.find((o) => o.id === selected.officeId)?.name],
              [
                "車両",
                vehicles.find((v) => v.id === selected.vehicleId)?.label,
              ],
              [
                "運転手",
                staff.find((s) => s.id === selected.driverStaffId)?.name,
              ],
              [
                "確認者",
                staff.find((s) => s.id === selected.checkerStaffId)?.name,
              ],
              [
                "出勤時 酒気帯び",
                selected.startAlcoholDetected ? "あり" : "なし",
              ],
              [
                "退勤時 酒気帯び",
                selected.endAlcoholDetected ? "あり" : "なし",
              ],
              ["体温", `${selected.startTemperature}℃`],
              [
                "指示事項",
                selected.drivingInstruction === "allowed"
                  ? "運転可"
                  : "運転不可",
              ],
              ["特記事項", selected.notes || "なし"],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd className="preserve-lines">{value}</dd>
              </div>
            ))}
          </dl>
          <button
            className="primary full"
            onClick={() => {
              setError("");
              setMessage("");
              setEditor({ ...selected });
              setSelected(undefined);
            }}
          >
            編集
          </button>
        </Modal>
      )}
    </section>
  );
}

export function WorkSettings({
  member,
  patterns,
  exceptions,
  onSave,
  onHistory,
}: {
  member: Staff;
  patterns: StaffWorkPattern[];
  exceptions: StaffWorkException[];
  onSave: (
    patterns: StaffWorkPattern[],
    exceptions: StaffWorkException[],
  ) => void;
  onHistory: () => void;
}) {
  const [draft, setDraft] = useState(() =>
    basicWorkPatterns(member.id, patterns),
  );
  const [days, setDays] = useState(
    exceptions.filter((e) => e.staffId === member.id),
  );
  const [exception, setException] = useState<StaffWorkException>({
    staffId: member.id,
    date: today,
    kind: "off",
    working: false,
    startTime: "09:00",
    endTime: "17:00",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const valid = validWorkingHours;
  return (
    <div className="page">
      <h1>{member.name}の勤務設定</h1>
      <p className="field-note">
        登録勤務時間外の背景表示に使います。勤怠実績や現在の勤務状態は判定しません。勤務外の予定登録も可能です。
      </p>
      <button className="secondary full" onClick={onHistory}>
        この職員の車両利用履歴
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.some((p) => !valid(p)) || days.some((p) => !valid(p))) {
            setError("終了時刻は開始時刻より後にしてください。");
            return;
          }
          onSave(draft, days);
          setError("");
          setMessage("勤務設定を保存しました");
        }}
      >
        <h2 className="section-heading">曜日ごとの勤務</h2>
        <WorkPatternFields patterns={draft} onChange={setDraft} />
        <h2 className="section-heading">個別日の例外</h2>
        <div className="formcard">
          <label>
            例外日
            <input
              type="date"
              value={exception.date}
              onChange={(e) =>
                setException({ ...exception, date: e.target.value })
              }
            />
          </label>
          <label>
            例外区分
            <select
              value={exception.kind}
              onChange={(e) =>
                setException({
                  ...exception,
                  kind: e.target.value as StaffWorkException["kind"],
                  working: e.target.value !== "off",
                })
              }
            >
              <option value="off">休み</option>
              <option value="extra">臨時出勤</option>
              <option value="hours">勤務時間変更</option>
            </select>
          </label>
          {exception.working && (
            <>
              <label>
                例外の開始時刻
                <input
                  type="time"
                  value={exception.startTime}
                  onChange={(e) =>
                    setException({ ...exception, startTime: e.target.value })
                  }
                />
              </label>
              <label>
                例外の終了時刻
                <input
                  type="time"
                  value={exception.endTime}
                  onChange={(e) =>
                    setException({ ...exception, endTime: e.target.value })
                  }
                />
              </label>
            </>
          )}
          <button
            type="button"
            className="secondary full"
            onClick={() => {
              if (!exception.date || !valid(exception)) {
                setError("例外の日付・時間を確認してください。");
                return;
              }
              setDays([
                ...days.filter((d) => d.date !== exception.date),
                exception,
              ]);
              setError("");
              setMessage(
                "例外を追加しました。「勤務設定を保存」で確定します。",
              );
            }}
          >
            例外を追加・更新
          </button>
        </div>
        {days.map((d) => (
          <article className="document-card" key={d.date}>
            <b>
              {d.date} ·{" "}
              {d.kind === "off"
                ? "休み"
                : d.kind === "extra"
                  ? "臨時出勤"
                  : "勤務時間変更"}
            </b>
            {d.working && (
              <p>
                {d.startTime}〜{d.endTime}
              </p>
            )}
            <button
              type="button"
              className="text-action"
              onClick={() => setDays(days.filter((r) => r.date !== d.date))}
            >
              例外を削除
            </button>
          </article>
        ))}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button className="primary full">勤務設定を保存</button>
      </form>
    </div>
  );
}
