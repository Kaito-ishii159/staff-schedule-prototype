import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Repeat2,
  Ellipsis,
  Pencil,
  Trash2,
  MapPin,
  Users,
} from "lucide-react";
import { Avatar, DateControl, Empty, Footer, Modal } from "./components";
import {
  dateLabel,
  fieldsOf,
  telephoneHref,
  minutes,
  recurrenceLabel,
  timelineLanes,
  typeClass,
  validateVisit,
  visitTypes,
  weekdayLabels,
  type EditScope,
  type Occurrence,
  type Office,
  type RecurrenceRule,
  type Staff,
  type VisitFields,
} from "./domain";

interface ScheduleProps {
  focus?: VisitFields;
  items: Occurrence[];
  staff: Staff[];
  offices: Office[];
  officeId: string;
  setOfficeId: (id: string) => void;
  date: string;
  setDate: (date: string) => void;
  onOpen: (v: Occurrence) => void;
  onChange: (v: Occurrence) => void;
  onAdd: () => void;
}
const PIXELS_PER_MINUTE = 3;
export function Schedule({
  focus,
  items,
  staff,
  offices,
  officeId,
  setOfficeId,
  date,
  setDate,
  onOpen,
  onChange,
  onAdd,
}: ScheduleProps) {
  const [query, setQuery] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const names = staff.filter(
    (s) =>
      s.officeId === officeId &&
      s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const relevant = items.filter((v) => names.some((s) => s.id === v.staffId));
  const startHour = Math.min(
    8,
    ...relevant.map((v) => Math.floor(minutes(v.time) / 60)),
  );
  const endHour = Math.max(
    18,
    ...relevant.map((v) => Math.ceil(minutes(v.end) / 60) + 1),
  );
  const width = (endHour - startHour) * 60 * PIXELS_PER_MINUTE;
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollLeft = Math.max(
        0,
        (9.75 - startHour) * 60 * PIXELS_PER_MINUTE,
      );
  }, [startHour]);
  useEffect(() => {
    if (focus) setQuery("");
  }, [focus]);
  useEffect(() => {
    if (!focus || !scroll.current) return;
    scroll.current.scrollLeft = Math.max(
      0,
      (minutes(focus.time) - startHour * 60 - 5) * PIXELS_PER_MINUTE,
    );
    const row = scroll.current.querySelector<HTMLElement>(
      `[data-staff-id="${focus.staffId}"]`,
    );
    if (row) scroll.current.scrollTop = Math.max(0, row.offsetTop - 36);
  }, [focus, startHour, query]);
  return (
    <div className="page schedule">
      <DateControl date={date} onChange={setDate} />
      <label className="selectline">
        <Building2 size={18} />
        <select
          aria-label="事業所"
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
        >
          {offices.map((o) => (
            <option value={o.id} key={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="search">
        <Search size={18} />
        <input
          placeholder="職員名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="timeline-guide">
        <span>横にスワイプして時間を移動</span>
        <button onClick={onAdd}>
          <Plus size={16} />
          追加
        </button>
      </div>
      <div className="type-legend">
        {visitTypes.map((type) => (
          <span key={type} className={typeClass(type)}>
            <i />
            {type}
          </span>
        ))}
      </div>
      <div
        className="timeline-scroll"
        ref={scroll}
        tabIndex={0}
        role="region"
        aria-label="職員別タイムライン・左右にスクロール可能"
      >
        <div style={{ width: width + 88 }} className="timeline-table">
          <div className="timeline-header">
            <div className="timeline-corner">職員</div>
            <div className="timeline-hours" style={{ width }}>
              {Array.from({ length: endHour - startHour }, (_, i) => (
                <span key={i} style={{ width: 60 * PIXELS_PER_MINUTE }}>
                  {startHour + i}:00
                </span>
              ))}
            </div>
          </div>
          {names.map((member) => {
            const entries = timelineLanes(
              relevant.filter((v) => v.staffId === member.id),
              PIXELS_PER_MINUTE,
            );
            const height = Math.max(
              104,
              (Math.max(0, ...entries.map((e) => e.lane)) + 1) * 96 + 12,
            );
            return (
              <div
                className="timeline-row"
                data-staff-id={member.id}
                key={member.id}
                style={{ height }}
              >
                <div className="timeline-name">
                  <Avatar staff={member} />
                  <b>{member.name}</b>
                </div>
                <div
                  className="timeline-track"
                  style={{
                    width,
                    backgroundSize: `${60 * PIXELS_PER_MINUTE}px 100%`,
                  }}
                >
                  {entries.map(({ item, lane }) => (
                    <TimelineCard
                      key={`${item.seriesId}:${item.occurrenceDate}`}
                      visit={item}
                      left={
                        (minutes(item.time) - startHour * 60) *
                        PIXELS_PER_MINUTE
                      }
                      width={Math.max(
                        132,
                        (minutes(item.end) - minutes(item.time)) *
                          PIXELS_PER_MINUTE,
                      )}
                      top={6 + lane * 96}
                      onOpen={() => onOpen(item)}
                      onChange={() => onChange(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!names.length && <Empty>該当する職員はいません。</Empty>}
      <p className="long-hint">長押し または「…」で担当・時間を変更できます</p>
      <button className="fab" onClick={onAdd} aria-label="予定を追加">
        <Plus />
      </button>
    </div>
  );
}
function TimelineCard({
  visit,
  left,
  width,
  top,
  onOpen,
  onChange,
}: {
  visit: Occurrence;
  left: number;
  width: number;
  top: number;
  onOpen: () => void;
  onChange: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef({ x: 0, y: 0 });
  const held = useRef(false);
  const stop = () => {
    clearTimeout(timer.current);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div
      className={`timeline-card ${typeClass(visit.type)} ${visit.isOverride ? "overridden" : ""} ${visit.status === "cancelled" ? "cancelled-card" : ""}`}
      style={{ left, width, top }}
    >
      <button
        className="timeline-hit"
        aria-label={`${visit.time}–${visit.end} ${visit.client} ${visit.type}${visit.status === "cancelled" ? " キャンセル" : visit.recurrenceRule ? ` ${visit.isOverride ? "この日の変更" : "繰り返し"}` : ""}`}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          held.current = false;
          origin.current = { x: e.clientX, y: e.clientY };
          timer.current = setTimeout(() => {
            held.current = true;
            if (visit.status === "cancelled") onOpen();
            else onChange();
          }, 600);
        }}
        onPointerMove={(e) => {
          if (
            Math.hypot(
              e.clientX - origin.current.x,
              e.clientY - origin.current.y,
            ) > 10
          )
            stop();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onClick={() => {
          if (!held.current) onOpen();
          held.current = false;
        }}
      >
        <b>
          {visit.time}–{visit.end}
        </b>
        <strong>{visit.client}</strong>
        <span>{visit.type}</span>
        {visit.status === "cancelled" ? (
          <small className="cancel-label">キャンセル</small>
        ) : (
          visit.recurrenceRule && (
            <small>
              <Repeat2 size={11} />
              {visit.isOverride ? "この日の変更" : "繰り返し"}
            </small>
          )
        )}
      </button>
      <button
        className="timeline-more"
        aria-label={
          visit.status === "cancelled"
            ? `${visit.client}のキャンセル詳細`
            : `${visit.client}の担当・時間を変更`
        }
        onClick={visit.status === "cancelled" ? onOpen : onChange}
      >
        <Ellipsis size={16} />
      </button>
    </div>
  );
}
export function ScopeSelector({
  value,
  onChange,
}: {
  value: EditScope;
  onChange: (scope: EditScope) => void;
}) {
  return (
    <fieldset className="scope-select">
      <legend>変更する範囲</legend>
      <label>
        <input
          type="radio"
          name="scope"
          value="one"
          checked={value === "one"}
          onChange={() => onChange("one")}
        />
        この予定のみ変更
      </label>
      <label>
        <input
          type="radio"
          name="scope"
          value="future"
          checked={value === "future"}
          onChange={() => onChange("future")}
        />
        今後の予定も変更
      </label>
      <p>
        {value === "one"
          ? "この日だけ変更します。次回以降は元の曜日・担当・時刻のままです。"
          : "選択した日以降の予定に適用します。以降の個別変更はリセットしますが、過去の予定とキャンセル済みの記録は残ります。"}
      </p>
    </fieldset>
  );
}
interface FormProps {
  existing: Occurrence | null;
  date: string;
  staff: Staff[];
  offices: Office[];
  defaultStaffId: string;
  onSave: (
    fields: VisitFields,
    rule: RecurrenceRule | undefined,
    scope: EditScope,
  ) => void;
  onCancel: () => void;
}
export function VisitForm({
  existing,
  date,
  staff,
  offices,
  defaultStaffId,
  onSave,
  onCancel,
}: FormProps) {
  const [draft, setDraft] = useState<VisitFields>(
    existing
      ? fieldsOf(existing)
      : {
          date,
          time: "10:00",
          end: "10:30",
          client: "",
          address: "",
          phone: "",
          status: "active",
          type: "定期訪問",
          content: "",
          memo: "",
          staffId: defaultStaffId,
        },
  );
  const [rule, setRule] = useState<RecurrenceRule | undefined>(
    existing?.recurrenceRule,
  );
  const [scope, setScope] = useState<EditScope>("one");
  const [error, setError] = useState("");
  const single = !!existing?.recurrenceRule && scope === "one";
  const put = <K extends keyof VisitFields>(key: K, value: VisitFields[K]) =>
    setDraft({ ...draft, [key]: value });
  return (
    <form
      className="page form"
      onSubmit={(e) => {
        e.preventDefault();
        const activeRule = rule
          ? { ...rule, startDate: draft.date }
          : undefined;
        const message = validateVisit(draft, single ? undefined : activeRule);
        if (message) {
          setError(message);
          return;
        }
        onSave(draft, single ? existing?.recurrenceRule : activeRule, scope);
      }}
    >
      {existing?.recurrenceRule && (
        <ScopeSelector value={scope} onChange={setScope} />
      )}
      <div className="formcard">
        <label>
          日付
          <input
            type="date"
            required
            value={draft.date}
            onInput={(e) => put("date", e.currentTarget.value)}
          />
        </label>
        <TimeFields draft={draft} onChange={put} />
      </div>
      <div className="formcard">
        <label>
          訪問先
          <input
            required
            value={draft.client}
            placeholder="例：A様"
            onChange={(e) => put("client", e.target.value)}
          />
        </label>
        <label>
          住所
          <input
            value={draft.address}
            placeholder="東京都新宿区・サンプル住所"
            onChange={(e) => put("address", e.target.value)}
          />
        </label>
        <label>
          電話番号
          <input
            type="tel"
            autoComplete="tel"
            value={draft.phone}
            placeholder="000-0000-0000"
            onChange={(e) => put("phone", e.target.value)}
          />
        </label>
        <label>
          予定種別
          <select
            value={draft.type}
            onChange={(e) => put("type", e.target.value as VisitFields["type"])}
          >
            {visitTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          内容
          <textarea
            value={draft.content}
            placeholder="例：ご家族への説明と書類の確認"
            onChange={(e) => put("content", e.target.value)}
          />
        </label>
        <label>
          メモ
          <textarea
            value={draft.memo}
            placeholder="任意のメモ"
            onChange={(e) => put("memo", e.target.value)}
          />
        </label>
        <label>
          担当職員
          <select
            value={draft.staffId}
            onChange={(e) => put("staffId", e.target.value)}
          >
            {staff
              .filter((s) => s.active || s.id === draft.staffId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}（{offices.find((o) => o.id === s.officeId)?.name}）
                  {!s.active ? "・無効" : ""}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="formcard">
        <label>
          繰り返し
          <select
            disabled={single}
            value={rule ? "weekly" : "none"}
            onChange={(e) =>
              setRule(
                e.target.value === "weekly"
                  ? {
                      frequency: "weekly",
                      weekdays: [
                        new Date(`${draft.date}T12:00:00Z`).getUTCDay(),
                      ],
                      startDate: draft.date,
                    }
                  : undefined,
              )
            }
          >
            <option value="none">なし</option>
            <option value="weekly">毎週</option>
          </select>
        </label>
        {rule && (
          <>
            <fieldset className="weekday-picker" disabled={single}>
              <legend>繰り返す曜日（複数選択）</legend>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={rule.weekdays.includes(d)}
                    onChange={(e) =>
                      setRule({
                        ...rule,
                        weekdays: e.target.checked
                          ? [...rule.weekdays, d]
                          : rule.weekdays.filter((v) => v !== d),
                      })
                    }
                  />
                  <span>{weekdayLabels[d]}</span>
                </label>
              ))}
            </fieldset>
            <label>
              繰り返し終了日（任意）
              <input
                type="date"
                disabled={single}
                min={draft.date}
                value={rule.endDate || ""}
                onInput={(e) =>
                  setRule({
                    ...rule,
                    endDate: e.currentTarget.value || undefined,
                  })
                }
              />
            </label>
            <p className="field-note">
              開始日：{draft.date}。
              {single
                ? "当日だけの変更では繰り返しルールは変わりません。"
                : "指定曜日の予定を日付切替で確認できます。"}
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Footer onCancel={onCancel} />
    </form>
  );
}
function TimeFields({
  draft,
  onChange,
}: {
  draft: Pick<VisitFields, "time" | "end">;
  onChange: (key: "time" | "end", value: string) => void;
}) {
  return (
    <div className="twocol">
      <label>
        開始時刻
        <input
          required
          type="time"
          value={draft.time}
          onInput={(e) => onChange("time", e.currentTarget.value)}
        />
      </label>
      <label>
        終了時刻
        <input
          required
          type="time"
          value={draft.end}
          onInput={(e) => onChange("end", e.currentTarget.value)}
        />
      </label>
    </div>
  );
}
export function ChangeSheet({
  visit,
  staff,
  onCancel,
  onSave,
}: {
  visit: Occurrence;
  staff: Staff[];
  onCancel: () => void;
  onSave: (
    draft: VisitFields,
    rule: RecurrenceRule | undefined,
    scope: EditScope,
  ) => void;
}) {
  const [draft, setDraft] = useState(fieldsOf(visit));
  const [scope, setScope] = useState<EditScope>("one");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal title="担当・時間を変更" onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const message = validateVisit(
            draft,
            scope === "future" && visit.recurrenceRule
              ? { ...visit.recurrenceRule, startDate: draft.date }
              : undefined,
          );
          if (message) {
            setError(message);
            return;
          }
          if (!confirming) {
            setConfirming(true);
            return;
          }
          onSave(
            draft,
            visit.recurrenceRule
              ? { ...visit.recurrenceRule, startDate: draft.date }
              : undefined,
            scope,
          );
        }}
      >
        <p>
          {dateLabel(visit.date)} · {visit.client}
        </p>
        {confirming ? (
          <div className="change-confirm">
            <b>{staff.find((s) => s.id === draft.staffId)?.name}</b>
            <strong>
              {draft.time}〜{draft.end}
            </strong>
            <p>
              {visit.recurrenceRule
                ? scope === "one"
                  ? "この予定のみ変更"
                  : "今後の予定も変更"
                : "選択中の予定を変更"}
            </p>
            <button
              type="button"
              className="text-action"
              onClick={() => setConfirming(false)}
            >
              選択に戻る
            </button>
          </div>
        ) : (
          <>
            <div className="formcard">
              <label>
                担当職員
                <select
                  value={draft.staffId}
                  onChange={(e) =>
                    setDraft({ ...draft, staffId: e.target.value })
                  }
                >
                  {staff
                    .filter((s) => s.active || s.id === draft.staffId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <TimeFields
                draft={draft}
                onChange={(key, value) => setDraft({ ...draft, [key]: value })}
              />
            </div>
            {visit.recurrenceRule && (
              <ScopeSelector value={scope} onChange={setScope} />
            )}
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="inline-actions">
          <button className="secondary" type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button className="primary">
            {confirming ? "変更を確定" : "変更内容を確認"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Detail({
  visit,
  staff,
  offices,
  onEdit,
  onChange,
  onMap,
  onDelete,
  onCancelVisit,
}: {
  visit: Occurrence;
  staff: Staff[];
  offices: Office[];
  onEdit: () => void;
  onChange: () => void;
  onMap: () => void;
  onDelete: () => void;
  onCancelVisit: () => void;
}) {
  const owner = staff.find((s) => s.id === visit.staffId);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const cancelled = visit.status === "cancelled";
  const phoneLink = telephoneHref(visit.phone);
  return (
    <div className="page detail">
      <div className="hero-status">
        {cancelled && <p className="cancel-banner">キャンセル済み</p>}
        <span className={`type-badge ${typeClass(visit.type)}`}>
          {visit.type}
        </span>
        <h1>{visit.client}への訪問</h1>
        <p>
          {dateLabel(visit.date)}　{visit.time}〜{visit.end}
        </p>
      </div>
      <div className="detail-card">
        <dl>
          <dt>訪問先・住所</dt>
          <dd>
            {visit.client}
            <p>{visit.address || "住所なし"}</p>
          </dd>
          <dt>担当職員</dt>
          <dd>
            {owner?.name}
            <p>{offices.find((o) => o.id === owner?.officeId)?.name}</p>
          </dd>
          <dt>電話番号</dt>
          <dd className="customer-phone">
            {visit.phone || "未登録"}
            {phoneLink && (
              <a className="primary phone-call" href={phoneLink}>
                電話をかける
              </a>
            )}
          </dd>
          <dt>内容</dt>
          <dd>{visit.content || "内容なし"}</dd>
          <dt>メモ</dt>
          <dd>{visit.memo || "メモなし"}</dd>
          <dt>繰り返し</dt>
          <dd>
            {recurrenceLabel(visit.recurrenceRule)}
            {visit.isOverride && <p>この日のみ変更されています</p>}
          </dd>
        </dl>
      </div>
      {!cancelled && (
        <button className="map-button" onClick={onChange}>
          <Users />
          <div>
            <b>担当・時間を変更</b>
          </div>
        </button>
      )}
      <button className="map-button" onClick={onMap}>
        <MapPin />
        <div>
          <b>この訪問先を地図で見る</b>
        </div>
      </button>
      <div className="detail-actions">
        {!cancelled && (
          <button onClick={onEdit}>
            <Pencil />
            編集
          </button>
        )}
        <button className="danger" onClick={() => setDeleting(true)}>
          <Trash2 />
          削除
        </button>
      </div>
      {!cancelled && (
        <button
          className="cancel-visit-button"
          onClick={() => setCancelling(true)}
        >
          予定をキャンセル
        </button>
      )}
      {cancelling && (
        <Modal
          title="この予定をキャンセルしますか？"
          onClose={() => setCancelling(false)}
        >
          <p>
            {visit.client} · {dateLabel(visit.date)} {visit.time}〜{visit.end}
          </p>
          <p>
            予定表にキャンセル済みとして残ります。
            {visit.recurrenceRule &&
              "この予定のみキャンセルし、次回以降の予定は変更しません。"}
          </p>
          <div className="inline-actions">
            <button className="secondary" onClick={() => setCancelling(false)}>
              戻る
            </button>
            <button className="primary danger-solid" onClick={onCancelVisit}>
              この予定のみキャンセル
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="この予定を削除しますか？"
          onClose={() => setDeleting(false)}
        >
          <p>
            {visit.client} · {dateLabel(visit.date)} {visit.time}
          </p>
          {visit.recurrenceRule && (
            <p>
              この日の予定だけ削除します。次回以降の繰り返し予定は残ります。
            </p>
          )}
          <div className="inline-actions">
            <button className="secondary" onClick={() => setDeleting(false)}>
              キャンセル
            </button>
            <button className="primary danger-solid" onClick={onDelete}>
              この予定を削除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
