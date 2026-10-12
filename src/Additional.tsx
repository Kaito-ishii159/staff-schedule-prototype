import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Empty, Modal } from "./components";
import { ClientPicker } from "./Clients";
import {
  addDays,
  clientMonth,
  dateLabel,
  dayOfWeek,
  hasPendingMemo,
  newId,
  occurrenceKey,
  occurrencesOn,
  today,
  typeClass,
  weekStart,
  type Client,
  type Office,
  type Occurrence,
  type Staff,
  type Visit,
} from "./domain";

export function VisitSummary({
  visit,
  onOpen,
}: {
  visit: Occurrence;
  onOpen: (v: Occurrence) => void;
}) {
  return (
    <button
      className={`day-visit ${typeClass(visit.type)} ${visit.status === "cancelled" ? "cancelled-card" : ""}`}
      onClick={() => onOpen(visit)}
    >
      <time>
        {visit.time}
        <small>〜{visit.end}</small>
      </time>
      <div>
        <strong>{visit.client}</strong>
        <span>{visit.type}</span>
        {visit.status === "cancelled" && (
          <span className="cancel-label">キャンセル</span>
        )}
      </div>
      {hasPendingMemo(visit) && (
        <span className="memo-alert" aria-label="未完了のメモあり">
          !
        </span>
      )}
      <ChevronRight size={18} />
    </button>
  );
}
export function ClientCalendar({
  client,
  visits,
  initialDate,
  onOpen,
}: {
  client: Client;
  visits: Visit[];
  initialDate: string;
  onOpen: (v: Occurrence) => void;
}) {
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const days = clientMonth(visits, client.id, month);
  const leading = days.length ? (dayOfWeek(days[0].date) + 6) % 7 : 0;
  const [selected, setSelected] = useState(initialDate);
  const selectedVisits = days.find((d) => d.date === selected)?.visits || [];
  const shift = (n: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    const next = d.toISOString().slice(0, 7);
    setMonth(next);
    setSelected(`${next}-01`);
  };
  return (
    <div className="page client-calendar">
      <h1>{client.name}</h1>
      <p className="field-note">利用者月間スケジュール</p>
      <div className="period-control">
        <button aria-label="前月" onClick={() => shift(-1)}>
          <ChevronLeft />
        </button>
        <label>
          対象月
          <input
            type="month"
            value={month}
            onInput={(e) => {
              if (e.currentTarget.value) {
                setMonth(e.currentTarget.value);
                setSelected(`${e.currentTarget.value}-01`);
              }
            }}
          />
        </label>
        <button aria-label="次月" onClick={() => shift(1)}>
          <ChevronRight />
        </button>
      </div>
      <div className="service-legend">
        <span className="service-nursing">○ 看護</span>
        <span className="service-rehab">● リハビリ</span>
        <span className="service-monitor">● モニタリング</span>
        <span>－ キャンセル</span>
      </div>
      <div className="month-scroll">
        <div className="month-grid">
          {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
            <b className="month-weekday" key={d}>
              {d}
            </b>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <div className="month-blank" key={`blank-${i}`} />
          ))}
          {days.map(({ date, visits: entries }) => (
            <button
              key={date}
              className={`month-cell ${date === selected ? "selected" : ""}`}
              aria-label={`${date} ${entries.length}件`}
              aria-pressed={date === selected}
              onClick={() => setSelected(date)}
            >
              <b>{Number(date.slice(-2))}</b>
              {entries.map((v) => (
                <span
                  key={occurrenceKey(v)}
                  className={
                    v.status === "cancelled"
                      ? "service-cancelled"
                      : v.serviceKind === "看護"
                        ? "service-nursing"
                        : v.serviceKind === "リハビリ"
                          ? "service-rehab"
                          : "service-monitor"
                  }
                >
                  {v.status === "cancelled"
                    ? "－"
                    : v.serviceKind === "看護"
                      ? "○"
                      : "●"}{" "}
                  {v.time}
                  <small>
                    {v.status === "cancelled"
                      ? "キャンセル"
                      : v.serviceKind || "未設定"}
                  </small>
                </span>
              ))}
            </button>
          ))}
        </div>
      </div>
      <p className="field-note">日付を選ぶと、その日の予定を下に表示します。</p>
      <h2 className="section-heading">{dateLabel(selected)}</h2>
      {selectedVisits.map((v) => (
        <VisitSummary key={occurrenceKey(v)} visit={v} onOpen={onOpen} />
      ))}
      {!selectedVisits.length && <Empty>この日の予定はありません。</Empty>}
    </div>
  );
}

export function WeeklySchedule({
  visits,
  staff,
  onOpen,
}: {
  visits: Visit[];
  staff: Staff[];
  onOpen: (v: Occurrence) => void;
}) {
  const [start, setStart] = useState(weekStart(today));
  const [query, setQuery] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const entries = days.map((d) => occurrencesOn(visits, d));
  const members = staff.filter((s) => s.name.includes(query.trim()));
  return (
    <div className="page weekly-page">
      <div className="period-control">
        <button aria-label="前週" onClick={() => setStart(addDays(start, -7))}>
          <ChevronLeft />
        </button>
        <b>
          {dateLabel(start)}〜<br />
          {dateLabel(days[6])}
        </b>
        <button aria-label="次週" onClick={() => setStart(addDays(start, 7))}>
          <ChevronRight />
        </button>
      </div>
      <div className="list-heading">
        <span>全職員 {members.length}名</span>
        <button
          className="text-action"
          onClick={() => setStart(weekStart(today))}
        >
          今週
        </button>
      </div>
      <label className="search">
        <input
          aria-label="週間予定の職員検索"
          placeholder="職員名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div
        className="week-scroll"
        tabIndex={0}
        role="region"
        aria-label="全職員の週間予定・左右にスクロール可能"
      >
        <table className="week-table">
          <thead>
            <tr>
              <th>職員</th>
              {days.map((d) => (
                <th key={d}>{dateLabel(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.name}</th>
                {days.map((d, i) => (
                  <td key={d}>
                    {entries[i]
                      .filter((v) => v.staffId === s.id)
                      .map((v) => (
                        <button
                          key={occurrenceKey(v)}
                          className={`week-visit ${typeClass(v.type)} ${v.status === "cancelled" ? "cancelled-card" : ""}`}
                          onClick={() => onOpen(v)}
                        >
                          <b>
                            {v.time}〜{v.end}
                          </b>
                          <strong>{v.client}</strong>
                          <span>{v.type}</span>
                          {v.status === "cancelled" && (
                            <small>キャンセル</small>
                          )}
                          {hasPendingMemo(v) && (
                            <span className="memo-alert">!</span>
                          )}
                        </button>
                      ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function storeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function Documents({
  clients,
  staffId,
  clientOnly = false,
}: {
  clients: Client[];
  staffId: string;
  clientOnly?: boolean;
}) {
  const key = `visit-documents:${staffId}`;
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    readLocal(key, {}),
  );
  const [month, setMonth] = useState(today.slice(0, 7));
  const [message, setMessage] = useState("");
  const toggle = (id: string, value: boolean) => {
    const next = { ...checks, [id]: value };
    setChecks(next);
    setMessage(
      storeLocal(key, next)
        ? "チェックを保存しました"
        : "この端末に保存できません。画面を閉じるとチェックは失われます。",
    );
  };
  return (
    <div className="page">
      <h1>書類更新管理</h1>
      <p className="field-note">
        {clientOnly
          ? "選択した利用者の更新チェック"
          : "自分の担当利用者の更新チェック"}
      </p>
      <div className="formcard">
        <label>
          報告書の対象月
          <input
            type="month"
            value={month}
            onInput={(e) => {
              if (e.currentTarget.value) setMonth(e.currentTarget.value);
            }}
          />
        </label>
      </div>
      {clients
        .filter((c) => c.ownerId === staffId)
        .map((c) => (
          <article className="document-card" key={c.id}>
            <h2>{c.name}</h2>
            {(["報告書", "計画書"] as const).map((kind) => {
              const due = kind === "報告書" ? month : c.nextDueMonth;
              const id = `${c.id}:${kind}:${due}`;
              return (
                <label className="document-check" key={kind}>
                  <span>
                    <b>{kind}</b>
                    <small>
                      {kind === "報告書" ? "毎月更新" : "3か月ごと・次回"}：
                      {due || "未設定"}
                    </small>
                    <em>{checks[id] ? "完了" : "未完了"}</em>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={`${c.name} ${kind} 完了`}
                    checked={!!checks[id]}
                    disabled={!due}
                    onChange={(e) => toggle(id, e.target.checked)}
                  />
                </label>
              );
            })}
          </article>
        ))}
      <p className="field-note">
        計画書の次回月は登録されたサンプル値です。完了しても次回月は自動変更しません。
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

type Note = { id: string; text: string };
export function FreeNotes({ staffId }: { staffId: string }) {
  const key = `visit-free-notes:${staffId}`;
  const [notes, setNotes] = useState<Note[]>(() => readLocal(key, []));
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const [message, setMessage] = useState("");
  const save = (next: Note[]) => {
    setNotes(next);
    setMessage(
      storeLocal(key, next)
        ? "保存しました"
        : "この端末に保存できません。画面を閉じるとメモは失われます。",
    );
  };
  return (
    <div className="page">
      <h1>フリーメモ</h1>
      <p className="field-note">自分だけのメモ · この端末に保存</p>
      <form
        className="formcard"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          save(
            editing
              ? notes.map((n) =>
                  n.id === editing ? { ...n, text: draft.trim() } : n,
                )
              : [{ id: newId(), text: draft.trim() }, ...notes],
          );
          setDraft("");
          setEditing(undefined);
        }}
      >
        <label>
          メモ内容
          <textarea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            required
            placeholder="覚えておきたいことを自由に"
          />
        </label>
        <button className="primary full">
          {editing ? "変更を保存" : "メモを保存"}
        </button>
        {editing && (
          <button
            type="button"
            className="text-action"
            onClick={() => {
              setEditing(undefined);
              setDraft("");
            }}
          >
            編集をやめる
          </button>
        )}
      </form>
      {notes.map((n) => (
        <article className="document-card" key={n.id}>
          <p className="preserve-lines">{n.text}</p>
          <div className="inline-actions">
            <button
              className="secondary"
              onClick={() => {
                setEditing(n.id);
                setDraft(n.text);
                window.scrollTo(0, 0);
              }}
            >
              編集
            </button>
            <button
              aria-label="メモを削除"
              className="secondary"
              onClick={() => setDeleting(n.id)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </article>
      ))}
      {!notes.length && <Empty>保存したメモはありません。</Empty>}
      {message && <p role="status">{message}</p>}
      {deleting && (
        <Modal
          title="このメモを削除しますか？"
          onClose={() => setDeleting(undefined)}
        >
          <p>削除すると元に戻せません。</p>
          <div className="inline-actions">
            <button
              className="secondary"
              onClick={() => setDeleting(undefined)}
            >
              戻る
            </button>
            <button
              className="primary"
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
          </div>
        </Modal>
      )}
    </div>
  );
}

export type NewRequest = {
  id: string;
  clientId: string;
  source: string;
  info: string;
  body: string;
};
export function Requests({
  clients,
  offices,
  staff,
  onSaveClient,
  requests,
  onAdd,
}: {
  clients: Client[];
  offices: Office[];
  staff: Staff[];
  onSaveClient: (c: Client) => void;
  requests: NewRequest[];
  onAdd: (v: NewRequest) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    clientId: "",
    source: "",
    info: "",
    body: "",
  });
  return (
    <div className="page">
      <h1>新規依頼管理</h1>
      <p className="field-note">自社内の依頼も、ここから共有できます。</p>
      <button className="primary full" onClick={() => setAdding(true)}>
        <Plus size={20} />
        新規依頼をする
      </button>
      {requests.map((r) => (
        <article className="document-card" key={r.id}>
          <h2>
            {clients.find((c) => c.id === r.clientId)?.name || "利用者情報なし"}
          </h2>
          <small>{r.clientId}</small>
          <p>
            <b>依頼元：</b>
            {r.source}
          </p>
          <h3>利用者情報</h3>
          <p className="preserve-lines">{r.info || "記載なし"}</p>
          <h3>依頼内容</h3>
          <p className="preserve-lines">{r.body || "記載なし"}</p>
        </article>
      ))}
      {!requests.length && <Empty>登録された依頼はありません。</Empty>}
      {adding && (
        <Modal title="新規依頼をする" onClose={() => setAdding(false)}>
          <form
            className="request-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.clientId || !draft.source.trim()) return;
              onAdd({ ...draft, id: newId() });
              setDraft({ clientId: "", source: "", info: "", body: "" });
              setAdding(false);
            }}
          >
            <ClientPicker
              clients={clients}
              offices={offices}
              staff={staff}
              value={draft.clientId}
              onSave={onSaveClient}
              onSelect={(c) => setDraft({ ...draft, clientId: c.id })}
            />
            {!draft.clientId && (
              <p className="field-note">
                登録済み利用者を選択、または新しい利用者を登録してください。
              </p>
            )}
            {(
              [
                ["source", "依頼元"],
                ["info", "簡単な利用者情報"],
                ["body", "フリー記載欄"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                {key === "source" ? (
                  <input
                    required
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                ) : (
                  <textarea
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            <button className="primary full">依頼を登録</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
