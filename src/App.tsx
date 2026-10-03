import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Map,
  Plus,
  Settings,
  Users,
  Building2,
  Palette,
  LogOut,
  Route,
  Navigation,
  Check,
} from "lucide-react";
import { Avatar, Empty, Menu, Modal } from "./components";
import { Schedule, VisitForm, Detail, ChangeSheet } from "./Schedule";
import { Cancellations } from "./Cancellations";
import { StaffForm, StaffList, OfficeForm, OfficeList } from "./Admin";
import { DistancePage, RoutePage, StaffMap, VisitMap } from "./Maps";
import {
  changeOccurrence,
  newId,
  occurrencesOn,
  removeOccurrence,
  cancelOccurrence,
  today,
  type EditScope,
  type Occurrence,
  type RecurrenceRule,
  type Theme,
  type VisitFields,
} from "./domain";
import {
  loginStaffId,
  noticeSeed,
  officeSeed,
  staffSeed,
  visitSeed,
} from "./data";

type Screen =
  | {
      kind:
        | "home"
        | "schedule"
        | "map"
        | "team"
        | "notices"
        | "settings"
        | "staff"
        | "staff-add"
        | "offices"
        | "office-add"
        | "theme"
        | "route"
        | "distance"
        | "add"
        | "cancellations";
    }
  | { kind: "detail" | "edit" | "destination"; visit: Occurrence };
const titles: Record<Screen["kind"], string> = {
  home: "訪問予定",
  schedule: "予定表",
  map: "自分の訪問先",
  team: "職員位置",
  notices: "通知",
  settings: "設定",
  staff: "職員管理",
  "staff-add": "職員を追加",
  offices: "事業所管理",
  "office-add": "事業所を追加",
  theme: "テーマ",
  route: "推奨ルート",
  distance: "移動距離",
  add: "予定を追加",
  edit: "予定を編集",
  detail: "予定詳細",
  destination: "訪問先の位置",
  cancellations: "キャンセル一覧",
};
const themes: { id: Theme; name: string; color: string }[] = [
  { id: "blue", name: "ブルー", color: "#276cb0" },
  { id: "green", name: "グリーン", color: "#28775e" },
  { id: "purple", name: "パープル", color: "#7853a4" },
  { id: "orange", name: "オレンジ", color: "#a85b29" },
  { id: "simple", name: "シンプル", color: "#4b5965" },
];
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [cancellationMonth, setCancellationMonth] = useState(today.slice(0, 7));
  const [cancellationOfficeId, setCancellationOfficeId] = useState(
    officeSeed[0].id,
  );
  const [staff, setStaff] = useState(staffSeed);
  const [offices, setOffices] = useState(officeSeed);
  const [visits, setVisits] = useState(visitSeed);
  const [notices, setNotices] = useState(noticeSeed);
  const [screens, setScreens] = useState<Screen[]>([{ kind: "home" }]);
  const screen = screens[screens.length - 1];
  const [date, setDate] = useState(today);
  const [officeId, setOfficeId] = useState(officeSeed[0].id);
  const [change, setChange] = useState<Occurrence | null>(null);
  const [focusVisit, setFocusVisit] = useState<VisitFields>();
  const [logout, setLogout] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(`visit-theme:${loginStaffId}`);
      return themes.some((t) => t.id === saved) ? (saved as Theme) : "blue";
    } catch {
      return "blue";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`visit-theme:${loginStaffId}`, theme);
    } catch {
      /* The selected theme still works without local storage. */
    }
  }, [theme]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const flash = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  const self = staff.find((s) => s.id === loginStaffId)!;
  const ownOffice = offices.find((o) => o.id === self.officeId)!;
  const items = occurrencesOn(visits, date);
  const ownItems = items.filter(
    (v) => v.staffId === loginStaffId && v.status !== "cancelled",
  );
  const unread = notices.filter((n) => !n.read).length;
  const push = (s: Screen) => {
    setScreens((old) => [...old, s]);
    window.scrollTo(0, 0);
  };
  const back = () => {
    setScreens((old) =>
      old.length > 1 ? old.slice(0, -1) : [{ kind: "home" }],
    );
    window.scrollTo(0, 0);
  };
  const go = (s: Screen) => {
    setScreens([s]);
    window.scrollTo(0, 0);
  };
  const openOwnMap = () => {
    setDate(today);
    go({ kind: "map" });
  };
  const open = (visit: Occurrence) => push({ kind: "detail", visit });
  const save = (
    draft: VisitFields,
    rule: RecurrenceRule | undefined,
    scope: EditScope,
    target?: Occurrence,
  ) => {
    setVisits((previous) =>
      target
        ? changeOccurrence(previous, target, draft, rule, scope, newId())
        : [
            ...previous,
            { ...draft, id: newId(), recurrenceRule: rule, exceptions: {} },
          ],
    );
    setDate(draft.date);
    setFocusVisit(draft);
    setOfficeId(staff.find((s) => s.id === draft.staffId)!.officeId);
    setChange(null);
    go({ kind: "schedule" });
    flash(target ? "予定を変更しました" : "予定を登録しました");
  };
  let content;
  const formOfficeId =
    screen.kind === "edit"
      ? staff.find((s) => s.id === screen.visit.staffId)?.officeId
      : screens[screens.length - 2]?.kind === "schedule"
        ? officeId
        : self.officeId;
  const formStaff = staff.filter((s) => s.officeId === formOfficeId);
  switch (screen.kind) {
    case "home":
      content = (
        <div className="page home">
          <h1>ホーム</h1>
          <p className="home-copy">
            {ownOffice.name} · {self.name}
          </p>
          <div className="home-actions">
            <button
              className="home-action featured"
              onClick={() => go({ kind: "schedule" })}
            >
              <CalendarDays />
              <div>
                <b>予定を確認</b>
                <span>職員別のタイムラインを見る</span>
              </div>
              <ChevronRight />
            </button>
            <button
              className="home-action"
              onClick={() => push({ kind: "add" })}
            >
              <Plus />
              <div>
                <b>予定を追加</b>
                <span>訪問・繰り返し予定を登録</span>
              </div>
              <ChevronRight />
            </button>
            <div className="home-split">
              <button onClick={openOwnMap}>
                <Map />
                <b>自分の訪問先</b>
                <span>今日の訪問順とルート</span>
              </button>
              <button onClick={() => push({ kind: "team" })}>
                <Users />
                <b>職員位置</b>
                <span>他職員の最終取得位置</span>
              </button>
            </div>
            <button
              className="home-action"
              onClick={() => go({ kind: "notices" })}
            >
              <Bell />
              <div>
                <b>通知</b>
                <span>予定に関するお知らせ</span>
              </div>
              {unread > 0 && <span className="count-badge">{unread}</span>}
              <ChevronRight />
            </button>
          </div>
          <p className="field-note home-note">
            仕様確認用プロトタイプ · 入力内容は再読み込みでリセットされます。
          </p>
        </div>
      );
      break;
    case "schedule":
      content = (
        <Schedule
          focus={focusVisit?.date === date ? focusVisit : undefined}
          items={items}
          staff={staff}
          offices={offices}
          officeId={officeId}
          setOfficeId={setOfficeId}
          date={date}
          setDate={setDate}
          onOpen={open}
          onChange={setChange}
          onAdd={() =>
            staff.some((s) => s.officeId === officeId && s.active)
              ? push({ kind: "add" })
              : flash("この事業所の有効な職員を先に登録してください")
          }
        />
      );
      break;
    case "add":
    case "edit":
      content = (
        <VisitForm
          existing={screen.kind === "edit" ? screen.visit : null}
          date={date}
          staff={formStaff}
          offices={offices}
          defaultStaffId={
            formStaff.find((s) => s.id === self.id)?.id ||
            formStaff.find((s) => s.active)?.id ||
            ""
          }
          onSave={(draft, rule, scope) =>
            save(
              draft,
              rule,
              scope,
              screen.kind === "edit" ? screen.visit : undefined,
            )
          }
          onCancel={back}
        />
      );
      break;
    case "detail":
      content = (
        <Detail
          visit={screen.visit}
          staff={staff}
          offices={offices}
          onEdit={() => push({ kind: "edit", visit: screen.visit })}
          onChange={() => setChange(screen.visit)}
          onMap={() => push({ kind: "destination", visit: screen.visit })}
          onDelete={() => {
            setVisits((v) => removeOccurrence(v, screen.visit));
            setDate(screen.visit.date);
            go({ kind: "schedule" });
            flash("この予定を削除しました");
          }}
          onCancelVisit={() => {
            const cancelled = { ...screen.visit, status: "cancelled" as const };
            setVisits((v) => cancelOccurrence(v, screen.visit));
            setDate(screen.visit.date);
            setOfficeId(
              staff.find((s) => s.id === screen.visit.staffId)!.officeId,
            );
            setFocusVisit(cancelled);
            go({ kind: "schedule" });
            flash("この予定をキャンセルしました");
          }}
        />
      );
      break;
    case "destination": {
      const member = staff.find((s) => s.id === screen.visit.staffId)!;
      content = (
        <VisitMap
          single
          items={[screen.visit]}
          member={member}
          office={offices.find((o) => o.id === member.officeId)!}
          date={screen.visit.date}
          setDate={setDate}
          onOpen={open}
          onRoute={() => {}}
        />
      );
      break;
    }
    case "map":
      content = (
        <VisitMap
          items={ownItems}
          member={self}
          office={ownOffice}
          date={date}
          setDate={setDate}
          onOpen={open}
          onRoute={() => push({ kind: "route" })}
        />
      );
      break;
    case "team":
      content = (
        <StaffMap
          staff={staff}
          offices={offices}
          visits={visits}
          selfId={self.id}
        />
      );
      break;
    case "route":
      content = (
        <RoutePage
          items={ownItems}
          office={ownOffice}
          date={date}
          onOpen={open}
          onDistance={() => push({ kind: "distance" })}
        />
      );
      break;
    case "distance":
      content = (
        <DistancePage
          items={ownItems}
          office={ownOffice}
          date={date}
          onOpen={open}
        />
      );
      break;
    case "staff":
      content = (
        <StaffList
          staff={staff}
          offices={offices}
          onAdd={() => push({ kind: "staff-add" })}
        />
      );
      break;
    case "cancellations":
      content = (
        <Cancellations
          visits={visits}
          staff={staff}
          offices={offices}
          month={cancellationMonth}
          officeId={cancellationOfficeId}
          onMonth={setCancellationMonth}
          onOffice={setCancellationOfficeId}
          onOpen={open}
        />
      );
      break;
    case "staff-add":
      content = (
        <StaffForm
          staff={staff}
          offices={offices}
          onCancel={back}
          onSave={(s) => {
            setStaff((prev) => [...prev, s]);
            back();
            flash("職員を登録しました");
          }}
        />
      );
      break;
    case "offices":
      content = (
        <OfficeList
          offices={offices}
          staff={staff}
          onAdd={() => push({ kind: "office-add" })}
        />
      );
      break;
    case "office-add":
      content = (
        <OfficeForm
          offices={offices}
          onCancel={back}
          onSave={(o) => {
            setOffices((prev) => [...prev, o]);
            back();
            flash("事業所を登録しました");
          }}
        />
      );
      break;
    case "notices":
      content = (
        <div className="page notices">
          <div className="list-heading">
            <span>未読 {unread}件</span>
            <button
              className="text-action"
              disabled={!unread}
              onClick={() =>
                setNotices((prev) => prev.map((n) => ({ ...n, read: true })))
              }
            >
              すべて既読にする
            </button>
          </div>
          {notices.map((n) => (
            <button
              className={`notice-item ${n.read ? "" : "unread"}`}
              key={n.id}
              onClick={() => {
                setNotices((prev) =>
                  prev.map((v) => (v.id === n.id ? { ...v, read: true } : v)),
                );
                const visit = occurrencesOn(visits, n.date).find(
                  (v) => v.seriesId === n.visitId,
                );
                if (visit) open(visit);
                else flash("この日の予定は削除または変更されています");
              }}
            >
              <Bell size={19} />
              <div>
                <b>{n.title}</b>
                <p>{n.body}</p>
                <small>
                  {n.date} {n.time} · デモ通知
                </small>
              </div>
              <ChevronRight size={15} />
            </button>
          ))}
          {!notices.length && <Empty>通知はありません。</Empty>}
          <p className="field-note">Push通知の送信・受信は行いません。</p>
        </div>
      );
      break;
    case "settings":
      content = (
        <div className="page settings">
          <div className="profile">
            <Avatar staff={self} />
            <div>
              <b>{self.name}</b>
              <p>
                {ownOffice.name} · {self.role}
              </p>
            </div>
          </div>
          <h3>アプリ設定</h3>
          <label className="preference-row">
            <Bell size={20} />
            <span>
              <b>通知</b>
              <small>予定変更のお知らせ（設定デモ）</small>
            </span>
            <input
              type="checkbox"
              checked={notificationEnabled}
              onChange={(e) => setNotificationEnabled(e.target.checked)}
            />
          </label>
          <label className="preference-row">
            <Navigation size={20} />
            <span>
              <b>位置情報の共有</b>
              <small>同一事業所への共有を許可（設定デモ）</small>
            </span>
            <input
              type="checkbox"
              checked={locationSharing}
              onChange={(e) => setLocationSharing(e.target.checked)}
            />
          </label>
          <p className="field-note">
            実際の通知送信・GPS取得・位置共有は行いません。
          </p>
          <Menu
            icon={<Palette />}
            title="テーマ"
            sub={themes.find((t) => t.id === theme)!.name}
            onClick={() => push({ kind: "theme" })}
          />
          <h3>管理</h3>
          <Menu
            icon={<CalendarDays />}
            title="キャンセル一覧"
            sub="月別・事業所別のキャンセル予定"
            onClick={() => push({ kind: "cancellations" })}
          />
          <Menu
            icon={<Users />}
            title="職員管理"
            sub={`${staff.length}名の登録職員`}
            onClick={() => push({ kind: "staff" })}
          />
          <Menu
            icon={<Building2 />}
            title="事業所管理"
            sub={`${offices.length}事業所`}
            onClick={() => push({ kind: "offices" })}
          />
          <h3>訪問ルート</h3>
          <Menu
            icon={<Route />}
            title="ルートを確認"
            sub="自分の今日の訪問予定"
            onClick={() => {
              setDate(today);
              push({ kind: "route" });
            }}
          />
          <Menu
            icon={<Navigation />}
            title="移動距離"
            sub="区間別の距離・移動時間（デモ）"
            onClick={() => {
              setDate(today);
              push({ kind: "distance" });
            }}
          />
          <button className="logout" onClick={() => setLogout(true)}>
            <LogOut size={18} />
            ログアウト
          </button>
          <p className="field-note">
            Phase 1 · 認証・権限制御・本番データ連携は未実装です。
          </p>
        </div>
      );
      break;
    case "theme":
      content = (
        <div className="page">
          <h2 className="section-heading">自分のテーマ</h2>
          <p className="field-note">
            {self.name}
            の表示設定です。選ぶとすぐに反映され、この端末に保存されます。予定種別の色は変わりません。
          </p>
          <div className="theme-options">
            {themes.map((t) => (
              <button
                className={`theme-option ${theme === t.id ? "selected" : ""}`}
                key={t.id}
                aria-pressed={theme === t.id}
                onClick={() => setTheme(t.id)}
              >
                <span style={{ background: t.color }} />
                <b>{t.name}</b>
                {theme === t.id && <Check size={20} />}
              </button>
            ))}
          </div>
          <div className="theme-preview">
            <h3>プレビュー</h3>
            <p>読みやすい文字と落ち着いた配色</p>
            <span className="primary">選択したテーマ</span>
          </div>
        </div>
      );
      break;
  }
  const isForm = ["add", "edit", "staff-add", "office-add"].includes(
    screen.kind,
  );
  return (
    <div className="shell" data-theme={theme}>
      <div className="phone">
        {!loggedIn ? (
          <Login
            onLogin={() => {
              setLoggedIn(true);
              go({ kind: "home" });
            }}
          />
        ) : (
          <>
            <header className="appbar">
              {screens.length > 1 ||
              !["home", "schedule", "map", "notices", "settings"].includes(
                screen.kind,
              ) ? (
                <button
                  className="back-button"
                  aria-label="戻る"
                  onClick={back}
                >
                  <ChevronLeft />
                </button>
              ) : (
                <span className="brandmark">
                  <CalendarDays size={19} />
                </span>
              )}
              <span className="header-title">{titles[screen.kind]}</span>
              <span className="demo">DEMO</span>
              <button
                className="iconbtn"
                aria-label="通知を開く"
                onClick={() => go({ kind: "notices" })}
              >
                <Bell size={21} />
                {unread > 0 && <i />}
              </button>
            </header>
            <main
              className={`view ${isForm ? "form-view" : ""}`}
              key={
                screen.kind + ("visit" in screen ? screen.visit.seriesId : "")
              }
            >
              {content}
            </main>
            {!isForm && (
              <nav className="tabbar" aria-label="メインナビゲーション">
                {(
                  [
                    { kind: "home", icon: <Home size={21} />, label: "ホーム" },
                    {
                      kind: "schedule",
                      icon: <CalendarDays size={21} />,
                      label: "予定",
                    },
                    { kind: "map", icon: <Map size={21} />, label: "訪問先" },
                    {
                      kind: "notices",
                      icon: <Bell size={21} />,
                      label: "通知",
                    },
                    {
                      kind: "settings",
                      icon: <Settings size={21} />,
                      label: "設定",
                    },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.kind}
                    className={screen.kind === t.kind ? "active" : ""}
                    aria-current={screen.kind === t.kind ? "page" : undefined}
                    onClick={() =>
                      t.kind === "map" ? openOwnMap() : go({ kind: t.kind })
                    }
                  >
                    <span className="tabicon">
                      {t.icon}
                      {t.kind === "notices" && unread > 0 && <em />}
                    </span>
                    {t.label}
                  </button>
                ))}
              </nav>
            )}
            {change && (
              <ChangeSheet
                visit={change}
                staff={staff.filter(
                  (s) =>
                    s.officeId ===
                    staff.find((owner) => owner.id === change.staffId)
                      ?.officeId,
                )}
                onCancel={() => setChange(null)}
                onSave={(draft, rule, scope) =>
                  save(draft, rule, scope, change)
                }
              />
            )}{" "}
            {logout && (
              <Modal
                title="ログアウトしますか？"
                onClose={() => setLogout(false)}
              >
                <p>テーマと、このタブでのデモ登録内容は保持されます。</p>
                <div className="inline-actions">
                  <button
                    className="secondary"
                    onClick={() => setLogout(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      setLogout(false);
                      setLoggedIn(false);
                    }}
                  >
                    ログアウト
                  </button>
                </div>
              </Modal>
            )}
          </>
        )}
        {toast && (
          <div role="status" className="app-toast">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="login">
      <div className="login-top">
        <span className="login-logo">
          <CalendarDays size={32} />
        </span>
        <h1>訪問予定</h1>
      </div>
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault();
          onLogin();
        }}
      >
        <label>
          メールアドレス
          <input
            type="email"
            required
            autoComplete="username"
            defaultValue="staff1@example.test"
            placeholder="メールアドレス"
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            required
            autoComplete="current-password"
            defaultValue="prototype"
            placeholder="パスワード"
          />
        </label>
        <button className="primary full">ログイン</button>
      </form>
      <p className="prototype-note">仕様確認用デモ · 職員Aとしてログイン</p>
    </div>
  );
}
