import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Ellipsis,
  MapPin,
  Navigation,
  Plus,
  Route,
  Search,
  Settings,
  Users,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  Car,
  Building2,
  LogOut,
  ShieldCheck,
  Map,
  UserRoundCheck,
  BellRing,
  Power,
  ChevronDown,
} from "lucide-react";
import "./styles.css";

type Staff = {
  id: string;
  name: string;
  office: string;
  status: "勤務中" | "訪問中" | "移動中" | "休憩中";
  color: string;
  next: string;
  updated: string;
};
type Visit = {
  id: string;
  time: string;
  end: string;
  client: string;
  address: string;
  content: string;
  memo: string;
  staffId: string;
  status: "予定" | "移動中" | "訪問中" | "完了";
  distance: string;
};
type Notice = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  visitId: string;
};

const offices = [
  "西新宿事業所",
  "志木事業所",
  "新座事業所",
  "和光事業所",
  "練馬事業所",
  "板橋事業所",
  "戸田事業所",
];
const staffSeed: Staff[] = [
  {
    id: "aoki",
    name: "青木 章人",
    office: "西新宿事業所",
    status: "移動中",
    color: "#0b8a9a",
    next: "10:30 A様宅",
    updated: "2分前",
  },
  {
    id: "takahashi",
    name: "高橋 真理子",
    office: "西新宿事業所",
    status: "訪問中",
    color: "#405dd3",
    next: "11:45 C様宅",
    updated: "1分前",
  },
  {
    id: "kobayashi",
    name: "小林 英二",
    office: "西新宿事業所",
    status: "勤務中",
    color: "#a15ac7",
    next: "13:00 B様宅",
    updated: "5分前",
  },
  {
    id: "iida",
    name: "飯田 志央",
    office: "西新宿事業所",
    status: "移動中",
    color: "#e07343",
    next: "10:45 D様宅",
    updated: "3分前",
  },
  {
    id: "hayashi",
    name: "林 健太",
    office: "西新宿事業所",
    status: "休憩中",
    color: "#638a4d",
    next: "13:30 E様宅",
    updated: "12分前",
  },
  {
    id: "nakamura",
    name: "中村 さくら",
    office: "志木事業所",
    status: "訪問中",
    color: "#c44e71",
    next: "12:00 A様宅",
    updated: "1分前",
  },
  {
    id: "saito",
    name: "斎藤 愛子",
    office: "新座事業所",
    status: "勤務中",
    color: "#886bd5",
    next: "14:00 B様宅",
    updated: "4分前",
  },
  {
    id: "watanabe",
    name: "渡部 隆之",
    office: "和光事業所",
    status: "移動中",
    color: "#317d9e",
    next: "11:15 C様宅",
    updated: "2分前",
  },
];
const visitsSeed: Visit[] = [
  {
    id: "v1",
    time: "10:30",
    end: "11:15",
    client: "A様",
    address: "東京都新宿区西新宿 1-2-3",
    content: "定期訪問・服薬確認",
    memo: "玄関チャイムを押してお待ちください",
    staffId: "aoki",
    status: "移動中",
    distance: "3.2km",
  },
  {
    id: "v2",
    time: "11:45",
    end: "12:30",
    client: "C様",
    address: "東京都新宿区西新宿 2-4-1",
    content: "生活状況の確認",
    memo: "ご家族同席予定",
    staffId: "takahashi",
    status: "予定",
    distance: "2.7km",
  },
  {
    id: "v3",
    time: "13:00",
    end: "13:45",
    client: "B様",
    address: "東京都新宿区西新宿 3-1-8",
    content: "定期訪問・記録",
    memo: "駐車場は建物裏側",
    staffId: "kobayashi",
    status: "予定",
    distance: "1.9km",
  },
  {
    id: "v4",
    time: "10:45",
    end: "11:30",
    client: "D様",
    address: "東京都新宿区西新宿 1-7-4",
    content: "支援内容の相談",
    memo: "",
    staffId: "iida",
    status: "予定",
    distance: "2.4km",
  },
  {
    id: "v5",
    time: "13:30",
    end: "14:15",
    client: "E様",
    address: "東京都新宿区西新宿 4-2-6",
    content: "定期訪問",
    memo: "",
    staffId: "hayashi",
    status: "予定",
    distance: "3.1km",
  },
];
const noticeSeed: Notice[] = [
  {
    id: "n1",
    title: "訪問時刻が変更されました",
    body: "A様の訪問予定が10:00から10:30へ変更されました。",
    time: "10分前",
    read: false,
    visitId: "v1",
  },
  {
    id: "n2",
    title: "担当が変更されました",
    body: "C様の担当があなたに変更されました。",
    time: "35分前",
    read: false,
    visitId: "v2",
  },
  {
    id: "n3",
    title: "予定が更新されました",
    body: "B様の訪問内容が更新されました。",
    time: "昨日 16:20",
    read: true,
    visitId: "v3",
  },
];
const today = "2026年9月27日（日）";
function App() {
  const [logged, setLogged] = useState(false);
  const [tab, setTab] = useState<
    "home" | "schedule" | "map" | "notices" | "more"
  >("home");
  const [screen, setScreen] = useState("");
  const [visits, setVisits] = useState(visitsSeed);
  const [notices, setNotices] = useState(noticeSeed);
  const [office, setOffice] = useState("西新宿事業所");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"assign" | "actions" | null>(null);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Visit | null>(null);
  const [routeReady, setRouteReady] = useState(false);
  const [position, setPosition] = useState("共有中");
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const staff = staffSeed.filter((s) => s.office === office);
  const current = visits.find((v) => v.id === selected) || null;
  const go = (next: any, detail = "") => {
    setTab(next);
    setScreen(detail);
    setSelected(null);
    window.scrollTo(0, 0);
  };
  const addOrSave = (v: Visit) => {
    setVisits((x) =>
      x.some((i) => i.id === v.id)
        ? x.map((i) => (i.id === v.id ? v : i))
        : [...x, v],
    );
    setEditing(null);
    setScreen("");
    setTab("schedule");
    setToast("予定を保存しました");
  };
  const changeStaff = (id: string) => {
    if (!current) return;
    const target = staffSeed.find((s) => s.id === id)!;
    setVisits((x) =>
      x.map((v) => (v.id === current.id ? { ...v, staffId: id } : v)),
    );
    setSheet(null);
    setSelected(null);
    setToast(`${target.name}さんへ担当を変更しました`);
  };
  if (!logged) return <Login onLogin={() => setLogged(true)} />;
  const title =
    screen === "detail"
      ? "予定詳細"
      : screen === "form"
        ? editing
          ? "予定を編集"
          : "予定を追加"
        : screen === "route"
          ? "最適ルート"
          : screen === "team"
            ? "職員の現在地"
            : screen === "distance"
              ? "移動距離"
              : screen === "staff"
                ? "職員管理"
                : screen === "office"
                  ? "事業所管理"
                  : screen === "settings"
                    ? "設定"
                    : "";
  const back = () => {
    setScreen("");
    setSelected(null);
    setEditing(null);
  };
  return (
    <main className="shell">
      <div className="phone">
        <header className="appbar">
          {screen ? (
            <button className="iconbtn" onClick={back}>
              <ChevronLeft />
            </button>
          ) : (
            <div className="brand">
              <span className="brandmark">
                <MapPin size={18} />
              </span>
              <b>訪問予定</b>
            </div>
          )}
          <span className="header-title">{title}</span>
          <span className="demo">DEMO</span>
          {!screen && (
            <button className="iconbtn" onClick={() => go("notices")}>
              <Bell size={20} />
              <i />
            </button>
          )}
        </header>
        <section className="view">
          {screen === "detail" && current ? (
            <Detail
              visit={current}
              staff={staffSeed}
              onEdit={() => {
                setEditing(current);
                setScreen("form");
              }}
              onAssign={() => setSheet("assign")}
              onMap={() => setScreen("route")}
              onDelete={() => {
                setVisits((x) => x.filter((v) => v.id !== current.id));
                setScreen("");
                setTab("schedule");
                setToast("予定を削除しました");
              }}
            />
          ) : screen === "form" ? (
            <VisitForm
              existing={editing}
              staff={staffSeed}
              onSave={addOrSave}
              onCancel={back}
            />
          ) : screen === "route" ? (
            <RouteView
              ready={routeReady}
              setReady={setRouteReady}
              onBack={back}
            />
          ) : screen === "team" ? (
            <TeamMap staff={staff} onBack={back} />
          ) : screen === "distance" ? (
            <DistanceView />
          ) : screen === "staff" ? (
            <StaffAdmin />
          ) : screen === "office" ? (
            <OfficeAdmin />
          ) : screen === "settings" ? (
            <SettingsView
              position={position}
              setPosition={setPosition}
              onLogout={() => setLogged(false)}
            />
          ) : tab === "home" ? (
            <Home
              visits={visits}
              notices={notices}
              onSchedule={() => go("schedule")}
              onRoute={() => setScreen("route")}
              onTeam={() => setScreen("team")}
            />
          ) : tab === "schedule" ? (
            <Schedule
              visits={visits}
              staff={staff}
              office={office}
              setOffice={setOffice}
              query={query}
              setQuery={setQuery}
              onSelect={(id) => {
                setSelected(id);
                setScreen("detail");
              }}
              onLong={(id) => {
                setSelected(id);
                setSheet("actions");
              }}
              onAdd={() => {
                setEditing(null);
                setScreen("form");
              }}
            />
          ) : tab === "map" ? (
            <MapView
              visits={visits}
              onRoute={() => setScreen("route")}
              onTeam={() => setScreen("team")}
              onDistance={() => setScreen("distance")}
            />
          ) : tab === "notices" ? (
            <Notices
              notices={notices}
              onOpen={(n) => {
                setNotices((x) =>
                  x.map((a) => (a.id === n.id ? { ...a, read: true } : a)),
                );
                setSelected(n.visitId);
                setScreen("detail");
              }}
            />
          ) : (
            <More onGo={setScreen} />
          )}
        </section>
        {!screen && (
          <nav className="tabbar">
            {[
              ["home", "ホーム", CircleUserRound],
              ["schedule", "予定", CalendarDays],
              ["map", "マップ", Map],
              ["notices", "通知", Bell],
              ["more", "その他", Ellipsis],
            ].map(([id, label, C]: any) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => go(id)}
              >
                <span className="tabicon">
                  <C size={20} />
                  {id === "notices" && notices.some((n) => !n.read) && <em />}
                </span>
                {label}
              </button>
            ))}
          </nav>
        )}
        {sheet && (
          <BottomSheet
            kind={sheet}
            current={current}
            staff={staff}
            onClose={() => setSheet(null)}
            onAssign={changeStaff}
            onStartAssign={() => setSheet("assign")}
            onDetail={() => {
              setSheet(null);
              setScreen("detail");
            }}
          />
        )}
        {toast && (
          <div className="toast">
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="shell login-shell">
      <div className="phone login">
        <div className="login-top">
          <div className="logo">
            <MapPin size={29} />
          </div>
          <h1>訪問予定</h1>
          <p>訪問業務を、もっと見通しよく。</p>
        </div>
        <div className="login-card">
          <label>
            職員ID またはメールアドレス
            <input
              defaultValue="aoki@example.demo"
              placeholder="例：staff@example.demo"
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              defaultValue="password"
              placeholder="パスワード"
            />
          </label>
          <button className="primary large" onClick={onLogin}>
            ログイン
          </button>
          <p className="hint">
            <ShieldCheck size={15} /> 社内専用アプリです
          </p>
        </div>
        <p className="prototype-note">
          これは操作イメージを確認するためのデモです
        </p>
      </div>
    </main>
  );
}
function Home({
  visits,
  notices,
  onSchedule,
  onRoute,
  onTeam,
}: {
  visits: Visit[];
  notices: Notice[];
  onSchedule: () => void;
  onRoute: () => void;
  onTeam: () => void;
}) {
  const next = visits.find((v) => v.staffId === "aoki")!;
  return (
    <div className="page home">
      <p className="eyebrow">{today}</p>
      <h1>
        おはようございます、
        <br />
        青木さん
      </h1>
      <div className="office-line">
        <Building2 size={15} /> 西新宿事業所 <span>勤務中</span>
      </div>
      <button className="next-card" onClick={onSchedule}>
        <div className="next-label">
          <Navigation size={15} /> 次の訪問
        </div>
        <div className="next-main">
          <time>{next.time}</time>
          <div>
            <strong>{next.client}</strong>
            <p>{next.content}</p>
          </div>
          <ChevronRight />
        </div>
        <div className="next-foot">
          <MapPin size={14} />
          {next.address}
          <span>あと 18分</span>
        </div>
      </button>
      <div className="metric-grid">
        <button onClick={onSchedule}>
          <CalendarDays />
          <strong>3件</strong>
          <span>今日の予定</span>
        </button>
        <button onClick={onRoute}>
          <Route />
          <strong>7.8km</strong>
          <span>移動予定距離</span>
        </button>
        <button onClick={onTeam}>
          <Users />
          <strong>共有中</strong>
          <span>位置情報</span>
        </button>
      </div>
      <div className="section-head">
        <h2>今日の予定</h2>
        <button onClick={onSchedule}>すべて見る</button>
      </div>
      <div className="mini-list">
        {visits
          .filter((v) => v.staffId === "aoki" || v.staffId === "takahashi")
          .slice(0, 2)
          .map((v) => (
            <button key={v.id} onClick={onSchedule}>
              <time>{v.time}</time>
              <span className={"statusdot " + v.status} />
              <div>
                <strong>{v.client}</strong>
                <p>{v.content}</p>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
      </div>
      {notices.some((n) => !n.read) && (
        <div className="notice-strip">
          <BellRing size={17} />
          <span>
            未読のお知らせが {notices.filter((n) => !n.read).length} 件あります
          </span>
        </div>
      )}
    </div>
  );
}
function Schedule({
  visits,
  staff,
  office,
  setOffice,
  query,
  setQuery,
  onSelect,
  onLong,
  onAdd,
}: {
  visits: Visit[];
  staff: Staff[];
  office: string;
  setOffice: (x: string) => void;
  query: string;
  setQuery: (x: string) => void;
  onSelect: (x: string) => void;
  onLong: (x: string) => void;
  onAdd: () => void;
}) {
  const [date, setDate] = useState(0);
  const shown = staff.filter((s) => s.name.includes(query));
  return (
    <div className="page schedule">
      <div className="date-row">
        <button>
          <ChevronLeft />
        </button>
        <div>
          <b>{date === 0 ? "今日" : "2026年9月" + (27 + date) + "日"}</b>
          <span>日曜日</span>
        </div>
        <button>
          <ChevronRight />
        </button>
        <button className="today" onClick={() => setDate(0)}>
          今日
        </button>
      </div>
      <label className="selectline">
        <Building2 size={17} />
        <select value={office} onChange={(e) => setOffice(e.target.value)}>
          {offices.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <label className="search">
        <Search size={18} />
        <input
          placeholder="職員名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="nowline">
        <span />
        現在 10:12
      </div>
      <div className="staff-list">
        {shown.map((s) => (
          <div className="staff-row" key={s.id}>
            <button className="avatar" style={{ background: s.color }}>
              {s.name.slice(0, 1)}
            </button>
            <div className="staff-schedule">
              <button className="staffname">
                <strong>{s.name}</strong>
                <span className={"work " + s.status}>{s.status}</span>
              </button>
              {visits
                .filter((v) => v.staffId === s.id)
                .map((v) => (
                  <VisitCard
                    key={v.id}
                    visit={v}
                    onClick={() => onSelect(v.id)}
                    onLong={() => onLong(v.id)}
                  />
                )) || <p className="no-visit">予定はありません</p>}
            </div>
          </div>
        ))}
      </div>
      <button className="fab" onClick={onAdd} aria-label="予定を追加">
        <Plus />
      </button>
      <p className="long-hint">予定を長押しすると担当を変更できます</p>
    </div>
  );
}
function VisitCard({
  visit,
  onClick,
  onLong,
}: {
  visit: Visit;
  onClick: () => void;
  onLong: () => void;
}) {
  let timer: any;
  return (
    <button
      className={"visit-card " + visit.status}
      onClick={onClick}
      onPointerDown={() => (timer = setTimeout(onLong, 650))}
      onPointerUp={() => clearTimeout(timer)}
      onPointerLeave={() => clearTimeout(timer)}
    >
      <time>
        {visit.time}
        <small>– {visit.end}</small>
      </time>
      <div>
        <strong>{visit.client}</strong>
        <p>{visit.content}</p>
      </div>
      <span className="visit-state">{visit.status}</span>
    </button>
  );
}
function Detail({
  visit,
  staff,
  onEdit,
  onAssign,
  onMap,
  onDelete,
}: {
  visit: Visit;
  staff: Staff[];
  onEdit: () => void;
  onAssign: () => void;
  onMap: () => void;
  onDelete: () => void;
}) {
  const owner = staff.find((s) => s.id === visit.staffId)!;
  return (
    <div className="page detail">
      <div className={"hero-status " + visit.status}>
        <span>{visit.status}</span>
        <h1>{visit.client}への訪問</h1>
        <p>
          <Clock3 size={16} />
          {today}　{visit.time} – {visit.end}
        </p>
      </div>
      <div className="detail-card">
        <Row
          icon={<MapPin />}
          label="訪問先"
          value={visit.client}
          sub={visit.address}
        />
        <Row icon={<CalendarDays />} label="内容" value={visit.content} />
        <Row
          icon={<Users />}
          label="担当職員"
          value={owner.name}
          sub={owner.office}
          action="変更"
          onAction={onAssign}
        />
        <Row
          icon={<Pencil />}
          label="メモ"
          value={visit.memo || "メモはありません"}
        />
      </div>
      <button className="map-button" onClick={onMap}>
        <Map size={20} />
        <div>
          <b>地図・ルートで見る</b>
          <span>次の訪問先までの経路を確認</span>
        </div>
        <ChevronRight />
      </button>
      <div className="detail-actions">
        <button onClick={onEdit}>
          <Pencil />
          編集
        </button>
        <button
          className="danger"
          onClick={() => confirm("この予定を削除しますか？") && onDelete()}
        >
          <Trash2 />
          削除
        </button>
      </div>
    </div>
  );
}
function Row({
  icon,
  label,
  value,
  sub,
  action,
  onAction,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="row">
      <span className="rowicon">{icon}</span>
      <div>
        <label>{label}</label>
        <strong>{value}</strong>
        {sub && <p>{sub}</p>}
      </div>
      {action && <button onClick={onAction}>{action}</button>}
    </div>
  );
}
function VisitForm({
  existing,
  staff,
  onSave,
  onCancel,
}: {
  existing: Visit | null;
  staff: Staff[];
  onSave: (v: Visit) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<Visit>(
    existing || {
      id: "v" + Date.now(),
      time: "10:00",
      end: "10:45",
      client: "",
      address: "",
      content: "定期訪問",
      memo: "",
      staffId: "aoki",
      status: "予定",
      distance: "2.0km",
    },
  );
  const set = (k: keyof Visit, v: string) => setF({ ...f, [k]: v });
  return (
    <form
      className="page form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(f);
      }}
    >
      <p className="form-intro">
        必要な項目だけを入力して、すぐに共有できます。
      </p>
      <div className="formcard">
        <label>
          日付
          <input value="2026/09/27" readOnly />
        </label>
        <div className="twocol">
          <label>
            開始時刻
            <input
              type="time"
              value={f.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </label>
          <label>
            終了時刻
            <input
              type="time"
              value={f.end}
              onChange={(e) => set("end", e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="formcard">
        <label>
          訪問先
          <input
            required
            placeholder="例：A様"
            value={f.client}
            onChange={(e) => set("client", e.target.value)}
          />
        </label>
        <label>
          住所
          <input
            placeholder="例：東京都新宿区西新宿 1-2-3"
            value={f.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </label>
        <label>
          内容
          <select
            value={f.content}
            onChange={(e) => set("content", e.target.value)}
          >
            <option>定期訪問</option>
            <option>生活状況の確認</option>
            <option>支援内容の相談</option>
            <option>その他</option>
          </select>
        </label>
        <label>
          担当職員
          <select
            value={f.staffId}
            onChange={(e) => set("staffId", e.target.value)}
          >
            {staff.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}（{s.office}）
              </option>
            ))}
          </select>
        </label>
        <label>
          メモ
          <textarea
            value={f.memo}
            onChange={(e) => set("memo", e.target.value)}
            placeholder="任意のメモを入力"
          />
        </label>
      </div>
      <div className="form-footer">
        <button type="button" className="secondary" onClick={onCancel}>
          キャンセル
        </button>
        <button className="primary">保存する</button>
      </div>
    </form>
  );
}
function MapCanvas({ mode = "route" }: { mode?: "route" | "team" }) {
  return (
    <div className="map-canvas">
      <div className="road r1" />
      <div className="road r2" />
      <div className="road r3" />
      <div className="park p1" />
      <div className="park p2" />
      {mode === "route" && (
        <svg className="route-svg" viewBox="0 0 320 350">
          <path
            d="M55 289 C72 245, 108 263, 123 201 S184 177, 212 121 S259 82, 270 51"
            fill="none"
            stroke="#0b8a9a"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="2 8"
          />
        </svg>
      )}
      {mode === "route" ? (
        <>
          {[
            ["現在地", "start"],
            ["1", "pin pA"],
            ["2", "pin pB"],
            ["3", "pin pC"],
          ].map(([x, c]) => (
            <span key={c} className={c}>
              {x}
            </span>
          ))}
        </>
      ) : (
        staffSeed.slice(0, 5).map((s, i) => (
          <button
            className={"person person" + i}
            key={s.id}
            style={{ background: s.color }}
          >
            {s.name.slice(0, 1)}
          </button>
        ))
      )}
    </div>
  );
}
function MapView({
  visits,
  onRoute,
  onTeam,
  onDistance,
}: {
  visits: Visit[];
  onRoute: () => void;
  onTeam: () => void;
  onDistance: () => void;
}) {
  return (
    <div className="map-page">
      <div className="map-tabs">
        <button className="active">訪問先</button>
        <button onClick={onTeam}>職員の現在地</button>
      </div>
      <MapCanvas />
      <div className="map-sheet">
        <div className="grab" />
        <h2>本日の訪問先</h2>
        <p className="subline">
          <Navigation size={15} />
          最初の訪問まで 3.2km・約12分
        </p>
        {visits.slice(0, 3).map((v, i) => (
          <button className="place" key={v.id} onClick={onRoute}>
            <span>{i + 1}</span>
            <div>
              <b>
                {v.time}　{v.client}
              </b>
              <p>{v.content}</p>
            </div>
            <ChevronRight />
          </button>
        ))}
        <button className="primary routego" onClick={onRoute}>
          <Route />
          最適ルートを見る
        </button>
        <button className="text-action" onClick={onDistance}>
          <Car />
          移動距離を確認
        </button>
      </div>
    </div>
  );
}
function RouteView({
  ready,
  setReady,
  onBack,
}: {
  ready: boolean;
  setReady: (x: boolean) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const calc = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setReady(true);
    }, 900);
  };
  return (
    <div className="route-page">
      <MapCanvas />
      <div className="route-sheet">
        <div className="grab" />
        <div className="route-head">
          <div>
            <p>西新宿事業所からのおすすめ順</p>
            <h2>今日の最適ルート</h2>
          </div>
          <span className="demo">DEMO</span>
        </div>
        {!ready ? (
          <>
            <div className="route-placeholder">
              <Route size={32} />
              <p>
                訪問先3件の効率的な順番を
                <br />
                確認できます
              </p>
            </div>
            <button className="primary large" disabled={loading} onClick={calc}>
              {loading ? "ルートを計算中…" : "最短ルートを計算"}
            </button>
          </>
        ) : (
          <>
            <div className="total">
              <Route />
              <div>
                <span>合計移動距離</span>
                <strong>7.8km</strong>
              </div>
              <div>
                <span>所要時間</span>
                <strong>28分</strong>
              </div>
            </div>
            <ol className="route-list">
              <li>
                <i>出発</i>
                <b>西新宿事業所</b>
                <small>3.2km / 12分</small>
              </li>
              <li>
                <i>1</i>
                <b>A様</b>
                <small>2.7km / 9分</small>
              </li>
              <li>
                <i>2</i>
                <b>C様</b>
                <small>1.9km / 7分</small>
              </li>
              <li>
                <i>3</i>
                <b>B様</b>
              </li>
            </ol>
            <button className="secondary full" onClick={onBack}>
              マップへ戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function TeamMap({ staff, onBack }: { staff: Staff[]; onBack: () => void }) {
  const [picked, setPicked] = useState(staff[0]);
  return (
    <div className="team-page">
      <div className="team-notice">
        <ShieldCheck size={18} />
        <span>
          位置情報は勤務中のみ共有されます。アプリを終了すると更新されません。
        </span>
      </div>
      <MapCanvas mode="team" />
      <div className="team-sheet">
        <div className="grab" />
        <div className="team-title">
          <h2>西新宿事業所の職員</h2>
          <span>
            <i />
            更新中
          </span>
        </div>
        <div className="staff-chips">
          {staff.map((s) => (
            <button
              className={picked.id === s.id ? "selected" : ""}
              key={s.id}
              onClick={() => setPicked(s)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="person-card">
          <span className="avatar" style={{ background: picked.color }}>
            {picked.name.slice(0, 1)}
          </span>
          <div>
            <b>{picked.name}</b>
            <p>
              <i /> 最終更新 {picked.updated}
            </p>
            <span>次の予定：{picked.next}</span>
          </div>
          <Navigation />
        </div>
        <button className="secondary full" onClick={onBack}>
          マップに戻る
        </button>
      </div>
    </div>
  );
}
function DistanceView() {
  return (
    <div className="page distance">
      <div className="date-row compact">
        <div>
          <b>{today}</b>
          <span>青木 章人</span>
        </div>
        <button>
          <ChevronDown />
        </button>
      </div>
      <div className="distance-total">
        <Car />
        <span>本日の移動距離</span>
        <strong>
          7.8 <small>km</small>
        </strong>
        <p>訪問先間の推定走行距離</p>
      </div>
      <h2>移動区間</h2>
      <div className="leg-list">
        {[
          ["西新宿事業所", "A様", "3.2km", "12分"],
          ["A様", "C様", "2.7km", "9分"],
          ["C様", "B様", "1.9km", "7分"],
        ].map((x) => (
          <div className="leg" key={x[0]}>
            <span>
              <i />
              {x[0]}
              <i />
              {x[1]}
            </span>
            <b>{x[2]}</b>
            <small>{x[3]}</small>
          </div>
        ))}
      </div>
      <p className="distance-note">
        距離・所要時間は本番では道路状況をもとに算出します。
      </p>
    </div>
  );
}
function Notices({
  notices,
  onOpen,
}: {
  notices: Notice[];
  onOpen: (n: Notice) => void;
}) {
  return (
    <div className="page notices">
      <h1>通知</h1>
      <p className="muted">予定の変更や担当変更をお知らせします</p>
      <div className="notice-list">
        {notices.map((n) => (
          <button
            className={!n.read ? "unread" : ""}
            key={n.id}
            onClick={() => onOpen(n)}
          >
            <span className="notice-icon">
              <Bell size={18} />
            </span>
            <div>
              <b>{n.title}</b>
              <p>{n.body}</p>
              <small>{n.time}</small>
            </div>
            {!n.read && <i />}
          </button>
        ))}
      </div>
    </div>
  );
}
function More({ onGo }: { onGo: (x: string) => void }) {
  return (
    <div className="page more">
      <h1>その他</h1>
      <section>
        <p className="menu-label">管理</p>
        <Menu
          icon={<Users />}
          title="職員管理"
          sub="職員の追加・編集・無効化"
          onClick={() => onGo("staff")}
        />
        <Menu
          icon={<Building2 />}
          title="事業所管理"
          sub="事業所と所属人数の確認"
          onClick={() => onGo("office")}
        />
      </section>
      <section>
        <p className="menu-label">アカウント</p>
        <Menu
          icon={<Settings />}
          title="設定"
          sub="通知・位置情報・アカウント"
          onClick={() => onGo("settings")}
        />
      </section>
      <div className="version">
        <span className="brandmark">
          <MapPin size={17} />
        </span>
        <b>訪問予定</b>
        <p>Prototype version 1.0</p>
      </div>
    </div>
  );
}
function Menu({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: any;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button className="menu" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <p>{sub}</p>
      </div>
      <ChevronRight />
    </button>
  );
}
function StaffAdmin() {
  return (
    <div className="page admin">
      <div className="admin-head">
        <p>有効な職員</p>
        <strong>68名</strong>
        <button className="primary">
          <Plus size={17} />
          職員を追加
        </button>
      </div>
      <label className="search">
        <Search size={18} />
        <input placeholder="氏名で検索" />
      </label>
      {staffSeed.map((s) => (
        <button className="admin-row" key={s.id}>
          <span className="avatar" style={{ background: s.color }}>
            {s.name.slice(0, 1)}
          </span>
          <div>
            <b>{s.name}</b>
            <p>{s.office}</p>
          </div>
          <span className="active-pill">有効</span>
          <ChevronRight />
        </button>
      ))}
    </div>
  );
}
function OfficeAdmin() {
  return (
    <div className="page admin">
      <div className="admin-head">
        <p>登録事業所</p>
        <strong>7事業所</strong>
        <button className="primary">
          <Plus size={17} />
          事業所を追加
        </button>
      </div>
      {offices.map((o, i) => (
        <button className="office-row" key={o}>
          <span>
            <Building2 />
          </span>
          <div>
            <b>{o}</b>
            <p>所属職員 {i === 0 ? "12" : "8"}名</p>
          </div>
          <ChevronRight />
        </button>
      ))}
    </div>
  );
}
function SettingsView({
  position,
  setPosition,
  onLogout,
}: {
  position: string;
  setPosition: (x: string) => void;
  onLogout: () => void;
}) {
  return (
    <div className="page settings">
      <div className="profile">
        <span className="avatar big">青</span>
        <div>
          <b>青木 章人</b>
          <p>西新宿事業所</p>
        </div>
      </div>
      <p className="menu-label">アプリ設定</p>
      <div className="setting-row">
        <Bell />
        <div>
          <b>通知</b>
          <p>予定変更・担当変更のお知らせ</p>
        </div>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="setting-row">
        <Navigation />
        <div>
          <b>位置情報の共有</b>
          <p>勤務中のみ、同一事業所に共有</p>
        </div>
        <button
          className={position === "共有中" ? "on-toggle" : "off-toggle"}
          onClick={() =>
            setPosition(position === "共有中" ? "停止中" : "共有中")
          }
        >
          {position === "共有中" ? "オン" : "オフ"}
        </button>
      </div>
      <div className="privacy">
        <ShieldCheck />
        <p>
          位置情報は訪問業務のためにのみ利用します。アプリを明示的に終了した場合は共有されません。
        </p>
      </div>
      <p className="menu-label">その他</p>
      <Menu
        icon={<CircleUserRound />}
        title="アプリについて"
        sub="訪問予定 Prototype 1.0"
        onClick={() => {}}
      />
      <button className="logout" onClick={onLogout}>
        <LogOut />
        ログアウト
      </button>
    </div>
  );
}
function BottomSheet({
  kind,
  current,
  staff,
  onClose,
  onAssign,
  onStartAssign,
  onDetail,
}: {
  kind: "assign" | "actions";
  current: Visit | null;
  staff: Staff[];
  onClose: () => void;
  onAssign: (x: string) => void;
  onStartAssign: () => void;
  onDetail: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (!current) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {kind === "actions" ? (
          <>
            <h2>{current.client} の予定</h2>
            <button
              className="sheet-action"
              onClick={onDetail}
            >
              <CalendarDays />
              予定の詳細を見る
              <ChevronRight />
            </button>
            <button className="sheet-action emphasis" onClick={onStartAssign}>
              <Users />
              担当職員を変更
              <ChevronRight />
            </button>
            <p className="sheet-help">同じ事業所の職員へ予定を移動できます</p>
          </>
        ) : (
          <>
            <h2>担当職員を変更</h2>
            <p className="muted">{current.client} の担当者を選択してください</p>
            <div className="assign-list">
              {staff.map((s) => (
                <button
                  className={confirmId === s.id ? "chosen" : ""}
                  key={s.id}
                  onClick={() => setConfirmId(s.id)}
                >
                  <span className="avatar" style={{ background: s.color }}>
                    {s.name.slice(0, 1)}
                  </span>
                  <div>
                    <b>{s.name}</b>
                    <p>
                      {s.status}・次の予定 {s.next}
                    </p>
                  </div>
                  {confirmId === s.id && <CheckCircle2 />}
                </button>
              ))}
            </div>
            <button
              className="primary large"
              disabled={!confirmId}
              onClick={() => confirmId && onAssign(confirmId)}
            >
              この職員に変更する
            </button>
          </>
        )}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
