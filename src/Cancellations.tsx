import {
  cancellationsInMonth,
  dateLabel,
  occurrenceKey,
  today,
  typeClass,
  type Visit,
  type Staff,
  type Office,
  type Occurrence,
} from "./domain";
import { Empty } from "./components";

// Kept as a dedicated management screen so an authorization gate can be added at its entry point.
export function Cancellations({
  visits,
  staff,
  offices,
  month,
  officeId,
  onMonth,
  onOffice,
  onOpen,
}: {
  visits: Visit[];
  staff: Staff[];
  offices: Office[];
  month: string;
  officeId: string;
  onMonth: (value: string) => void;
  onOffice: (id: string) => void;
  onOpen: (v: Occurrence) => void;
}) {
  const items = cancellationsInMonth(visits, month, staff, officeId);
  const office = offices.find((o) => o.id === officeId);
  return (
    <div className="page cancellation-page">
      <div className="formcard cancellation-filters">
        <label>
          対象月
          <input
            type="month"
            value={month}
            onInput={(e) =>
              e.currentTarget.value && onMonth(e.currentTarget.value)
            }
          />
        </label>
        <label>
          事業所
          <select value={officeId} onChange={(e) => onOffice(e.target.value)}>
            {offices.map((o) => (
              <option value={o.id} key={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="text-action"
          onClick={() => onMonth(today.slice(0, 7))}
        >
          今月に戻す
        </button>
      </div>
      <div className="cancellation-summary">
        <span>
          {month.replace("-", "年")}月 · {office?.name}
        </span>
        <strong>キャンセル {items.length}件</strong>
        <small>予定日を基準に集計</small>
      </div>
      {items.length ? (
        <div className="cancellation-list">
          {items.map((v) => (
            <button
              className="cancellation-item"
              key={occurrenceKey(v)}
              onClick={() => onOpen(v)}
            >
              <div className="cancellation-item-heading">
                <b>{dateLabel(v.date)}</b>
                <span className="cancel-label">キャンセル</span>
              </div>
              <time>
                {v.time}〜{v.end}
              </time>
              <strong>{v.client}</strong>
              <span className={`type-badge ${typeClass(v.type)}`}>
                {v.type}
              </span>
              <p>担当：{staff.find((s) => s.id === v.staffId)?.name}</p>
              <p>{office?.name}</p>
              <span className="text-action">詳細を見る →</span>
            </button>
          ))}
        </div>
      ) : (
        <Empty>この月・事業所のキャンセル予定はありません。</Empty>
      )}
    </div>
  );
}
