import { useEffect, useState } from "react";
import {
  Building2,
  Clock3,
  MapPin,
  Navigation,
  Route,
  Users,
} from "lucide-react";
import { DateControl, Empty } from "./components";
import {
  dateLabel,
  nextRegisteredVisit,
  occurrenceKey,
  typeClass,
  today,
  type Occurrence,
  type Office,
  type Staff,
  type Visit,
} from "./domain";
type Point = { x: number; y: number };
const depot = { x: 65, y: 360 };
const stopPoints: Point[] = [
  { x: 65, y: 255 },
  { x: 175, y: 255 },
  { x: 285, y: 150 },
  { x: 285, y: 45 },
  { x: 175, y: 45 },
  { x: 65, y: 45 },
  { x: 175, y: 150 },
  { x: 285, y: 360 },
];
const stopPoint = (i: number, count: number) =>
  count <= stopPoints.length
    ? stopPoints[i]
    : {
        x: 42 + (i % 4) * 102,
        y:
          40 +
          (Math.floor(i / 4) * 350) / Math.max(1, Math.ceil(count / 4) - 1),
      };
export function demoLegs(items: Occurrence[]) {
  return items.map((visit, i) => ({
    visit,
    distance: [1.2, 0.8, 1.6, 1.1][i % 4],
    duration: [6, 4, 8, 5][i % 4],
  }));
}
function totalLabel(items: Occurrence[]) {
  const legs = demoLegs(items);
  return `${legs.reduce((n, l) => n + l.distance, 0).toFixed(1)} km / ${legs.reduce((n, l) => n + l.duration, 0)} 分`;
}
// A shared, entirely fictional basemap. All route/pin coordinates use the same viewBox.
export function MapScene({
  area,
  visits = [],
  staff = [],
  selected,
  onVisit,
  onStaff,
  showRoute = false,
}: {
  area: string;
  visits?: Occurrence[];
  staff?: Staff[];
  selected?: string;
  onVisit?: (v: Occurrence) => void;
  onStaff?: (s: Staff) => void;
  showRoute?: boolean;
}) {
  const points = [depot, ...visits.map((_, i) => stopPoint(i, visits.length))];
  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `V ${p.y} H ${p.x}`))
    .join(" ");
  return (
    <div className="cartography">
      <svg
        viewBox="0 0 390 430"
        role="img"
        aria-label={`${area}の架空地図。道路、建物、公園、駅を表示`}
      >
        <defs>
          <pattern
            id="blocks"
            width="110"
            height="105"
            patternUnits="userSpaceOnUse"
          >
            <rect width="110" height="105" fill="#eceee9" />
            <rect
              x="9"
              y="10"
              width="30"
              height="20"
              rx="3"
              fill="#dedfd9"
              stroke="#d0d2cb"
            />
            <rect
              x="10"
              y="40"
              width="26"
              height="40"
              rx="3"
              fill="#e3dfd5"
              stroke="#d3d0c7"
            />
            <rect
              x="81"
              y="10"
              width="23"
              height="23"
              rx="3"
              fill="#e0e1da"
              stroke="#d0d2cb"
            />
            <rect x="82" y="60" width="20" height="32" rx="2" fill="#e0ddd3" />
            <path d="M0 95H110 M43 0V105" stroke="#fff" strokeWidth="5" />
          </pattern>
          <pattern
            id="rail"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 5H10 M5 0V10" stroke="#a2aaa8" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="390" height="430" fill="url(#blocks)" />
        <path
          d="M365 -20Q325 80 359 180T350 440"
          fill="none"
          stroke="#abd5df"
          strokeWidth="28"
        />
        <path
          d="M365 -20Q325 80 359 180T350 440"
          fill="none"
          stroke="#d1e9ec"
          strokeWidth="15"
        />
        <rect
          x="198"
          y="280"
          width="62"
          height="57"
          rx="9"
          fill="#c4dcb6"
          stroke="#a9c99c"
        />
        <path
          d="M209 290L249 326M250 290L209 326"
          stroke="#e8efd8"
          strokeWidth="5"
        />
        <circle cx="210" cy="295" r="6" fill="#a3c997" />
        <circle cx="248" cy="319" r="7" fill="#a3c997" />
        <rect x="85" y="70" width="56" height="53" rx="7" fill="#c9dfbe" />
        {[65, 175, 285].map((x) => (
          <path
            key={x}
            d={`M${x} 0V430`}
            stroke="#cdd3cb"
            strokeWidth={x === 175 ? 22 : 13}
          />
        ))}
        {[45, 150, 255, 360].map((y) => (
          <path
            key={y}
            d={`M0 ${y}H390`}
            stroke="#cdd3cb"
            strokeWidth={y === 150 ? 23 : 14}
          />
        ))}
        {[65, 175, 285].map((x) => (
          <path
            key={x}
            d={`M${x} 0V430`}
            stroke={x === 175 ? "#fff5d7" : "#fff"}
            strokeWidth={x === 175 ? 19 : 10}
          />
        ))}
        {[45, 150, 255, 360].map((y) => (
          <path
            key={y}
            d={`M0 ${y}H390`}
            stroke={y === 150 ? "#fff5d7" : "#fff"}
            strokeWidth={y === 150 ? 20 : 11}
          />
        ))}
        <path d="M0 397H390" stroke="#d5d9d5" strokeWidth="12" />
        <rect x="0" y="393" width="390" height="8" fill="url(#rail)" />
        <rect
          x="134"
          y="387"
          width="76"
          height="19"
          rx="4"
          fill="#fbfcfa"
          stroke="#9ba9a6"
        />
        <g fontFamily="sans-serif" textAnchor="middle" fill="#718078">
          <text x="111" y="100" fontSize="9">
            公園
          </text>
          <text x="229" y="310" fontSize="9">
            中央公園
          </text>
          <text x="172" y="400" fontSize="10">
            {area}駅（仮）
          </text>
          <text x="116" y="146" fontSize="9">
            中央通り
          </text>
          <text x="240" y="23" fontSize="14" fontWeight="600">
            {area}エリア
          </text>
          <text x="320" y="215" fontSize="9">
            住宅街
          </text>
        </g>
        {showRoute && visits.length > 0 && (
          <>
            <path
              d={path}
              stroke="#fff"
              strokeWidth="10"
              fill="none"
              strokeLinejoin="round"
            />
            <path
              className="route-path"
              d={path}
              strokeWidth="6"
              fill="none"
              strokeLinejoin="round"
            />
            <path
              d={path}
              stroke="#fff"
              strokeWidth="1.5"
              strokeDasharray="2 11"
              fill="none"
            />
          </>
        )}
        <circle cx="35" cy="340" r="18" fill="#569ce1" opacity=".16" />
        <circle
          cx="35"
          cy="340"
          r="6"
          fill="#317dcb"
          stroke="#fff"
          strokeWidth="3"
        />
        <text x="10" y="317" fontSize="9" fill="#416e9b">
          現在地（デモ）
        </text>
      </svg>
      <div className="map-north" aria-hidden="true">
        N ↑
      </div>
      {showRoute && (
        <div
          className="depot-pin"
          style={{
            left: `${(depot.x / 390) * 100}%`,
            top: `${(depot.y / 430) * 100}%`,
          }}
        >
          <Building2 size={16} />
          <span>事業所</span>
        </div>
      )}
      {visits.map((v, i) => {
        const p = stopPoint(i, visits.length);
        return (
          <button
            key={`${v.seriesId}:${v.occurrenceDate}`}
            aria-label={`${i + 1} ${v.client} ${v.time}`}
            aria-pressed={selected === occurrenceKey(v)}
            className={`destination-pin ${selected === occurrenceKey(v) ? "selected" : ""}`}
            style={{
              left: `${(p.x / 390) * 100}%`,
              top: `${(p.y / 430) * 100}%`,
            }}
            onClick={() => onVisit?.(v)}
          >
            <span>{i + 1}</span>
            <small>{v.time}</small>
          </button>
        );
      })}
      {staff
        .filter((s) => s.location)
        .map((s) => (
          <button
            className={`colleague-pin ${selected === s.id ? "selected" : ""}`}
            key={s.id}
            aria-label={`${s.name}の最終取得位置`}
            aria-pressed={selected === s.id}
            style={{
              left: `${(s.location!.x / 390) * 100}%`,
              top: `${(s.location!.y / 430) * 100}%`,
            }}
            onClick={() => onStaff?.(s)}
          >
            <span style={{ background: s.color }}>
              {s.name.replace("職員", "")}
            </span>
            <b>{s.name}</b>
          </button>
        ))}
      <small className="map-demo-label">架空地図 · 位置・経路はデモ</small>
    </div>
  );
}
export function VisitMap({
  items,
  member,
  office,
  date,
  setDate,
  onOpen,
  onRoute,
  initial,
  single = false,
}: {
  items: Occurrence[];
  member: Staff;
  office: Office;
  date: string;
  setDate: (d: string) => void;
  onOpen: (v: Occurrence) => void;
  onRoute: () => void;
  initial?: string;
  single?: boolean;
}) {
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState(
    initial || (items[0] && occurrenceKey(items[0])),
  );
  const visit = items.find((v) => occurrenceKey(v) === selected) || items[0];
  const number = visit ? items.indexOf(visit) + 1 : 0;
  return (
    <div className="map-screen">
      {!single && <DateControl date={date} onChange={setDate} />}
      <div className="map-toolbar">
        <div>
          <b>{single ? "選択した訪問先" : "自分の訪問先"}</b>
          <small>
            {member.name} · {items.length}件{date === today ? " · 今日" : ""}
          </small>
        </div>
        <div className="segment">
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            マップ
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            一覧
          </button>
        </div>
      </div>
      {view === "map" ? (
        <>
          <MapScene
            area={office.name.replace("事業所", "")}
            visits={items}
            selected={visit && occurrenceKey(visit)}
            onVisit={(v) => setSelected(occurrenceKey(v))}
            showRoute={!single}
          />
          {visit && (
            <article className="map-selection">
              <div className="list-heading">
                <b>
                  {number}. {visit.client}
                </b>
                <span className={`type-badge ${typeClass(visit.type)}`}>
                  {visit.type}
                </span>
              </div>
              <p>
                <Clock3 size={14} />
                {visit.time}〜{visit.end}
              </p>
              <p>
                <MapPin size={14} />
                {visit.address || "住所未登録"}
              </p>
              <p>担当：{member.name}</p>
              <button className="text-action" onClick={() => onOpen(visit)}>
                詳細を見る →
              </button>
            </article>
          )}
        </>
      ) : (
        <div className="route-list">
          {items.map((v, i) => (
            <button
              className="visit-list-item"
              onClick={() => onOpen(v)}
              key={`${v.seriesId}:${v.occurrenceDate}`}
            >
              <span className="order-number">{i + 1}</span>
              <div>
                <b>
                  {v.time}〜{v.end}　{v.client}
                </b>
                <p>{v.address}</p>
                <small className={`type-badge ${typeClass(v.type)}`}>
                  {v.type}
                </small>
              </div>
            </button>
          ))}
        </div>
      )}
      {!items.length && <Empty>この日の自分の訪問予定はありません。</Empty>}
      {!single && items.length > 0 && (
        <div className="map-summary">
          <div>
            <b>予定時刻順 · {items.length}件</b>
            <strong>{totalLabel(items)}</strong>
            <small>距離・移動時間はデモ値です</small>
          </div>
          <button className="primary full" onClick={onRoute}>
            <Route size={17} />
            推奨ルートを確認
          </button>
        </div>
      )}
    </div>
  );
}
export function StaffMap({
  staff,
  offices,
  visits,
  selfId,
}: {
  staff: Staff[];
  offices: Office[];
  visits: Visit[];
  selfId: string;
}) {
  const [officeId, setOfficeId] = useState(
    staff.find((s) => s.id === selfId)?.officeId || offices[0].id,
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const members = staff.filter(
    (s) => s.id !== selfId && s.officeId === officeId && s.name.includes(query),
  );
  const located = members.filter((s) => s.location);
  const member = located.find((s) => s.id === selected) || located[0];
  const next = member
    ? nextRegisteredVisit(visits, member.id, today, "09:50")
    : undefined;
  return (
    <div className="map-screen">
      <div className="team-filters">
        <label className="selectline">
          <Building2 size={18} />
          <select
            aria-label="位置表示の事業所"
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <input
          className="map-search"
          placeholder="職員名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p>位置情報は最後に取得できた地点を表示しています。</p>
        <small>デモ基準日時：{today} 09:50 · 自分以外の職員</small>
      </div>
      <MapScene
        area={offices
          .find((o) => o.id === officeId)!
          .name.replace("事業所", "")}
        staff={located}
        selected={member?.id}
        onStaff={(s) => setSelected(s.id)}
      />
      {member ? (
        <article className="map-selection">
          <h2>
            <Users size={20} />
            {member.name}
          </h2>
          <p>{offices.find((o) => o.id === member.officeId)?.name}</p>
          <p>最終位置更新：{member.location?.updatedAt}（デモ）</p>
          <div className="next-record">
            <small>次に登録されている予定（基準時刻以降）</small>
            <b>
              {next
                ? `${dateLabel(next.date)} ${next.time}〜${next.end}　${next.client}`
                : "今後の登録予定はありません"}
            </b>
            {next && (
              <span>
                {next.type} · {next.address}
              </span>
            )}
          </div>
        </article>
      ) : (
        <Empty>表示できる最終取得位置がありません。</Empty>
      )}
      {members.some((s) => !s.location) && (
        <p className="field-note inset">
          位置未取得：
          {members
            .filter((s) => !s.location)
            .map((s) => s.name)
            .join("、")}
        </p>
      )}
    </div>
  );
}
export function RoutePage({
  items,
  office,
  date,
  onOpen,
  onDistance,
}: {
  items: Occurrence[];
  office: Office;
  date: string;
  onOpen: (v: Occurrence) => void;
  onDistance: () => void;
}) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="map-screen">
      <div className="route-intro">
        <b>{dateLabel(date)} · 推奨ルート（デモ）</b>
        <p>
          登録された予定時刻順に並べています。道路・所要時間の実計算は行いません。
        </p>
      </div>
      <MapScene
        area={office.name.replace("事業所", "")}
        visits={items}
        showRoute
        onVisit={onOpen}
      />
      <div className="map-summary">
        {loading ? (
          <p role="status">ルートを準備しています…</p>
        ) : (
          <>
            <strong>{totalLabel(items)}</strong>
            <small>事業所 → 訪問先 / 復路は含みません</small>
            <button className="text-action" onClick={onDistance}>
              区間ごとの距離を見る →
            </button>
          </>
        )}
      </div>
      <LegList items={items} office={office} onOpen={onOpen} />
    </div>
  );
}
function LegList({
  items,
  office,
  onOpen,
}: {
  items: Occurrence[];
  office: Office;
  onOpen?: (v: Occurrence) => void;
}) {
  return (
    <div className="route-list">
      <p>
        <Building2 size={15} /> 出発：{office.name}
      </p>
      {demoLegs(items).map(({ visit, distance, duration }, i) => (
        <div key={`${visit.seriesId}:${visit.occurrenceDate}`}>
          <p className="leg">
            <Navigation size={13} />
            {distance.toFixed(1)} km · {duration}分（デモ）
          </p>
          <button className="visit-list-item" onClick={() => onOpen?.(visit)}>
            <span className="order-number">{i + 1}</span>
            <div>
              <b>{visit.client}</b>
              <p>
                {visit.time}〜{visit.end}
              </p>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
export function DistancePage({
  items,
  office,
  date,
  onOpen,
}: {
  items: Occurrence[];
  office: Office;
  date: string;
  onOpen: (v: Occurrence) => void;
}) {
  return (
    <div className="page">
      <div className="hero-status">
        <h2>移動距離</h2>
        <p>{dateLabel(date)}</p>
        <h1>{totalLabel(items)}</h1>
        <p>予定時刻順のデモ値・復路を除く</p>
      </div>
      <LegList items={items} office={office} onOpen={onOpen} />
      <p className="field-note">実際の経路検索・GPS測定は行っていません。</p>
    </div>
  );
}
