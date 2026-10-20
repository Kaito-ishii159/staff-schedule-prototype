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
  NotebookPen,
  Files,
  ClipboardPlus,
  Car,
  ClipboardCheck,
} from "lucide-react";
import {
  AlcoholChecks,
  MasterDeleteDialog,
  TravelTotals,
  VehicleHistory,
  Vehicles,
  WorkSettings,
} from "./OperationsUI";
import {
  alcoholSeed,
  vehicleArchiveSeed,
  vehicleSeed,
  workPatternSeed,
} from "./operationData";
import {
  deletionReasons,
  localEntries,
  saveAlcoholRecord,
  saveRequest,
  vehicleUse,
  travelSummary,
  type AlcoholCheckRecord,
  type MasterKind,
  type StaffWorkException,
} from "./operations";
import { ThemeArt, themes } from "./Themes";
import { AssignedClients, ClientManagement } from "./Clients";
import {
  ClientCalendar,
  Documents,
  FreeNotes,
  Requests,
  VisitSummary,
  WeeklySchedule,
  type NewRequest,
} from "./Additional";
import { Avatar, Empty, Menu, Modal } from "./components";
import { Schedule, VisitForm, Detail, ChangeSheet } from "./Schedule";
import { Cancellations } from "./Cancellations";
import { StaffForm, StaffList, OfficeForm, OfficeList } from "./Admin";
import { DistancePage, RoutePage, StaffMap, VisitMap } from "./Maps";
import {
  changeOccurrence,
  resolveClientVisits,
  completeMemo,
  occurrenceKey,
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
  type Client,
  type Staff,
  type Office,
} from "./domain";
import {
  loginStaffId,
  noticeSeed,
  officeSeed,
  staffSeed,
  visitSeed,
  clientSeed,
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
  | {
      kind:
        | "weekly"
        | "documents"
        | "free-notes"
        | "requests"
        | "clients"
        | "assigned-clients";
    }
  | { kind: "vehicles" | "travel-totals" | "alcohol" }
  | { kind: "work-settings"; staffId: string }
  | { kind: "vehicle-history"; vehicleId?: string; staffId?: string }
  | { kind: "client-documents"; clientId: string }
  | { kind: "client-calendar"; client: Client; date: string }
  | { kind: "detail" | "edit" | "destination"; visit: Occurrence };
const titles: Record<Screen["kind"], string> = {
  "assigned-clients": "担当利用者",
  vehicles: "車両管理",
  "vehicle-history": "車両利用履歴",
  "travel-totals": "移動集計",
  alcohol: "アルコールチェック",
  "work-settings": "勤務設定",
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
  "client-calendar": "利用者月間スケジュール",
  weekly: "週間予定",
  documents: "書類更新管理",
  "free-notes": "フリーメモ",
  requests: "新規依頼管理",
  clients: "利用者管理",
  "client-documents": "利用者の書類",
};
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [cancellationMonth, setCancellationMonth] = useState(today.slice(0, 7));
  const [cancellationOfficeId, setCancellationOfficeId] = useState(
    officeSeed[0].id,
  );
  const [staff, setStaff] = useState(staffSeed);
  const [vehicles, setVehicles] = useState(vehicleSeed);
  const [vehicleArchive, setVehicleArchive] = useState(vehicleArchiveSeed);
  const [alcohol, setAlcohol] = useState<AlcoholCheckRecord[]>(alcoholSeed);
  const [workPatterns, setWorkPatterns] = useState(workPatternSeed);
  const [workExceptions, setWorkExceptions] = useState<StaffWorkException[]>(
    [],
  );
  const [editingStaff, setEditingStaff] = useState<Staff>();
  const [editingOffice, setEditingOffice] = useState<Office>();
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: MasterKind;
    id: string;
  }>();
  const [offices, setOffices] = useState(officeSeed);
  const [storedVisits, setVisits] = useState(visitSeed);
  const [clients, setClients] = useState(clientSeed);
  const visits = resolveClientVisits(storedVisits, clients);
  const saveClient = (client: Client) =>
    setClients((prev) =>
      prev.some((c) => c.id === client.id)
        ? prev.map((c) => (c.id === client.id ? client : c))
        : [...prev, client],
    );
  const [requests, setRequests] = useState<NewRequest[]>([]);
  const referenceData = () => ({
    visits: storedVisits,
    clients,
    staff,
    offices,
    vehicles,
    vehicleArchive,
    alcohol,
    patterns: workPatterns,
    workExceptions,
    requests,
    selfId: loginStaffId,
    localEntries: localEntries(),
  });
  const archiveVehicle = (v: Occurrence) => {
    const use = vehicleUse(v, staff);
    if (use)
      setVehicleArchive((prev) => [
        ...prev,
        { ...use, id: `${use.id}:revision:${newId()}`, archived: true },
      ]);
  };
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
      return themes.some((t) => t.id === saved) ? (saved as Theme) : "polar";
    } catch {
      return "polar";
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
  const todaysOwnItems = occurrencesOn(visits, today).filter(
    (v) => v.staffId === self.id,
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
    const client = clients.find((c) => c.id === draft.clientId);
    if (!client) {
      flash("登録済み利用者を選択してください");
      return;
    }
    draft = {
      ...draft,
      client: client.name,
      address: client.address,
      phone: client.phone,
      vehicleId:
        draft.transportType === "company" ? draft.vehicleId : undefined,
    };
    if (target) archiveVehicle(target);
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
    case "vehicles":
      content = (
        <Vehicles
          vehicles={vehicles}
          offices={offices}
          onSave={(v) =>
            setVehicles((prev) =>
              prev.some((p) => p.id === v.id)
                ? prev.map((p) => (p.id === v.id ? v : p))
                : [...prev, v],
            )
          }
          onDelete={(v) => setDeleteTarget({ kind: "vehicle", id: v.id })}
          onHistory={(vehicleId) =>
            push({ kind: "vehicle-history", vehicleId })
          }
        />
      );
      break;
    case "vehicle-history":
      content = (
        <VehicleHistory
          visits={visits}
          staff={staff}
          offices={offices}
          clients={clients}
          vehicles={vehicles}
          archive={vehicleArchive}
          initialVehicleId={screen.vehicleId}
          initialStaffId={screen.staffId}
        />
      );
      break;
    case "travel-totals":
      content = (
        <TravelTotals
          visits={visits}
          staff={staff}
          offices={offices}
          selfId={self.id}
        />
      );
      break;
    case "alcohol":
      content = (
        <AlcoholChecks
          selfId={self.id}
          records={alcohol}
          vehicles={vehicles}
          staff={staff}
          offices={offices}
          onSave={(r) => setAlcohol((prev) => saveAlcoholRecord(prev, r))}
        />
      );
      break;
    case "work-settings":
      content = (
        <WorkSettings
          member={staff.find((s) => s.id === screen.staffId)!}
          patterns={workPatterns}
          exceptions={workExceptions}
          onHistory={() =>
            push({ kind: "vehicle-history", staffId: screen.staffId })
          }
          onSave={(patterns, exceptions) => {
            setWorkPatterns((prev) => [
              ...prev.filter((p) => p.staffId !== screen.staffId),
              ...patterns,
            ]);
            setWorkExceptions((prev) => [
              ...prev.filter((p) => p.staffId !== screen.staffId),
              ...exceptions,
            ]);
          }}
        />
      );
      break;
    case "home":
      content = (
        <div className="page home">
          <div className="home-art">
            <ThemeArt theme={theme} />
            <span>MY WORKSPACE</span>
          </div>
          <h1>ホーム</h1>
          <p className="home-copy">
            {ownOffice.name} · {self.name}
          </p>
          <div className="shortcut-grid">
            {[
              {
                label: "予定登録",
                icon: <Plus />,
                action: () => {
                  setDate(today);
                  push({ kind: "add" });
                },
              },
              {
                label: "スケジュール",
                icon: <CalendarDays />,
                action: () => go({ kind: "schedule" }),
              },
              { label: "マップ", icon: <Map />, action: openOwnMap },
              {
                label: "通知",
                icon: <Bell />,
                action: () => go({ kind: "notices" }),
              },
              {
                label: "フリーメモ",
                icon: <NotebookPen />,
                action: () => push({ kind: "free-notes" }),
              },
              {
                label: "書類管理",
                icon: <Files />,
                action: () => push({ kind: "documents" }),
              },
              {
                label: "新規依頼",
                icon: <ClipboardPlus />,
                action: () => push({ kind: "requests" }),
              },
              {
                label: "週間予定",
                icon: <CalendarDays />,
                action: () => push({ kind: "weekly" }),
              },
            ].map((item, i) => (
              <button key={item.label} onClick={item.action}>
                <span className={`shortcut-icon shortcut-${i % 4}`}>
                  {item.icon}
                </span>
                <b>{item.label}</b>
              </button>
            ))}
          </div>
          <Menu
            icon={<Users />}
            title="担当利用者"
            sub="自分の担当利用者を確認"
            onClick={() => push({ kind: "assigned-clients" })}
          />
          <Menu
            icon={<Users />}
            title="職員位置"
            sub="他職員の最終取得位置"
            onClick={() => push({ kind: "team" })}
          />
          <AlcoholChecks
            view="home"
            selfId={self.id}
            records={alcohol}
            vehicles={vehicles}
            staff={staff}
            offices={offices}
            onSave={(r) => setAlcohol((prev) => saveAlcoholRecord(prev, r))}
          />
          <div className="list-heading">
            <h2 className="section-heading">本日の予定</h2>
            <span>{today.slice(5).replace("-", " / ")}</span>
          </div>
          {todaysOwnItems.map((v) => (
            <VisitSummary key={occurrenceKey(v)} visit={v} onOpen={open} />
          ))}
          {!todaysOwnItems.length && <Empty>本日の予定はありません。</Empty>}
          <p className="field-note home-note">
            仕様確認用デモ ·
            予定・新規依頼は再読み込みでリセット。テーマ・フリーメモ・書類チェックはこの端末に保存します。
          </p>
        </div>
      );
      break;
    case "client-calendar":
      content = (
        <ClientCalendar
          client={clients.find((c) => c.id === screen.client.id)!}
          visits={visits}
          initialDate={screen.date}
          onOpen={open}
        />
      );
      break;
    case "assigned-clients":
      content = (
        <AssignedClients
          clients={clients}
          selfId={self.id}
          offices={offices}
          onCalendar={(client) =>
            push({ kind: "client-calendar", client, date: today })
          }
        />
      );
      break;
    case "clients":
      content = (
        <ClientManagement
          onDelete={(c) => setDeleteTarget({ kind: "client", id: c.id })}
          clients={clients}
          offices={offices}
          staff={staff}
          onSave={saveClient}
          onCalendar={(client) =>
            push({ kind: "client-calendar", client, date: today })
          }
          onDocuments={(client) =>
            push({ kind: "client-documents", clientId: client.id })
          }
        />
      );
      break;
    case "client-documents": {
      const client = clients.find((c) => c.id === screen.clientId)!;
      content = (
        <Documents clients={[client]} staffId={client.ownerId} clientOnly />
      );
      break;
    }
    case "weekly":
      content = (
        <WeeklySchedule
          clients={clients}
          visits={visits}
          staff={staff}
          onOpen={open}
        />
      );
      break;
    case "documents":
      content = <Documents clients={clients} staffId={self.id} />;
      break;
    case "free-notes":
      content = (
        <FreeNotes staffId={self.id} officeId={self.officeId} staff={staff} />
      );
      break;
    case "requests":
      content = (
        <Requests
          clients={clients}
          offices={offices}
          staff={staff}
          onSaveClient={saveClient}
          requests={requests}
          onSave={(r) => {
            setRequests((prev) => saveRequest(prev, r, self.id, self.officeId));
          }}
          onDelete={(id) =>
            setRequests((prev) => prev.filter((r) => r.id !== id))
          }
        />
      );
      break;
    case "schedule":
      content = (
        <Schedule
          clients={clients}
          workPatterns={workPatterns}
          workExceptions={workExceptions}
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
          vehicles={vehicles}
          onSaveClient={saveClient}
          clients={clients}
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
          vehicles={vehicles}
          visit={
            occurrencesOn(visits, screen.visit.date).find(
              (v) => occurrenceKey(v) === occurrenceKey(screen.visit),
            ) || screen.visit
          }
          onClient={() => {
            const client = clients.find((c) => c.id === screen.visit.clientId);
            if (client)
              push({
                kind: "client-calendar",
                client,
                date: screen.visit.date,
              });
          }}
          onCompleteMemo={() => {
            setVisits((prev) => completeMemo(prev, screen.visit));
            flash("この回のメモを完了しました");
          }}
          staff={staff}
          offices={offices}
          onEdit={() => push({ kind: "edit", visit: screen.visit })}
          onChange={() => setChange(screen.visit)}
          onMap={() => push({ kind: "destination", visit: screen.visit })}
          onDelete={() => {
            archiveVehicle(screen.visit);
            setVisits((v) => removeOccurrence(v, screen.visit));
            setDate(screen.visit.date);
            go({ kind: "schedule" });
            flash("この予定を削除しました");
          }}
          onCancelVisit={() => {
            archiveVehicle(screen.visit);
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
          monthlyTravel={travelSummary(visits, self.id, date.slice(0, 7))}
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
          onAdd={() => {
            setEditingStaff(undefined);
            push({ kind: "staff-add" });
          }}
          onEdit={(s) => {
            setEditingStaff(s);
            push({ kind: "staff-add" });
          }}
          onDelete={(s) => setDeleteTarget({ kind: "staff", id: s.id })}
          onToggle={(s) =>
            setStaff((prev) =>
              prev.map((p) =>
                p.id === s.id ? { ...s, active: !s.active } : p,
              ),
            )
          }
          onWork={(s) => push({ kind: "work-settings", staffId: s.id })}
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
          workPatterns={workPatterns}
          existing={editingStaff}
          staff={staff}
          offices={offices}
          onCancel={back}
          onSave={(s, patterns) => {
            setStaff((prev) =>
              prev.some((p) => p.id === s.id)
                ? prev.map((p) => (p.id === s.id ? s : p))
                : [...prev, s],
            );
            setWorkPatterns((prev) => [
              ...prev.filter((p) => p.staffId !== s.id),
              ...patterns,
            ]);
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
          onAdd={() => {
            setEditingOffice(undefined);
            push({ kind: "office-add" });
          }}
          onEdit={(o) => {
            setEditingOffice(o);
            push({ kind: "office-add" });
          }}
          onDelete={(o) => setDeleteTarget({ kind: "office", id: o.id })}
          onToggle={(o) =>
            setOffices((prev) =>
              prev.map((p) =>
                p.id === o.id ? { ...o, active: o.active === false } : p,
              ),
            )
          }
        />
      );
      break;
    case "office-add":
      content = (
        <OfficeForm
          existing={editingOffice}
          offices={offices}
          onCancel={back}
          onSave={(o) => {
            setOffices((prev) =>
              prev.some((p) => p.id === o.id)
                ? prev.map((p) => (p.id === o.id ? o : p))
                : [...prev, o],
            );
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
            icon={<Car />}
            title="車両管理"
            sub="登録・利用状態・車両利用履歴"
            onClick={() => push({ kind: "vehicles" })}
          />
          <Menu
            icon={<Navigation />}
            title="移動集計"
            sub="月別・職員別の予定ルート推定"
            onClick={() => push({ kind: "travel-totals" })}
          />
          <Menu
            icon={<ClipboardCheck />}
            title="アルコールチェック"
            sub="手入力の確認記録（デモ）"
            onClick={() => push({ kind: "alcohol" })}
          />
          <Menu
            icon={<Users />}
            title="利用者管理"
            sub="利用者マスタ・基本情報・月間予定"
            onClick={() => push({ kind: "clients" })}
          />
          <Menu
            icon={<Files />}
            title="書類更新管理"
            sub="担当利用者の報告書・計画書"
            onClick={() => push({ kind: "documents" })}
          />
          <Menu
            icon={<ClipboardPlus />}
            title="新規依頼管理"
            sub="法人内の依頼を共有"
            onClick={() => push({ kind: "requests" })}
          />
          <Menu
            icon={<CalendarDays />}
            title="週間予定"
            sub="全職員の1週間"
            onClick={() => push({ kind: "weekly" })}
          />
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
                <ThemeArt theme={t.id} />
                <b>{t.name}</b>
                <small>{t.caption}</small>
                {theme === t.id && <Check size={20} />}
              </button>
            ))}
          </div>
          <div className="theme-preview">
            <ThemeArt theme={theme} />
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
      <div className={`phone ${screen.kind === "weekly" ? "wide-phone" : ""}`}>
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
              <span className="header-title">
                {screen.kind === "staff-add" && editingStaff
                  ? "職員を編集"
                  : screen.kind === "office-add" && editingOffice
                    ? "事業所を編集"
                    : titles[screen.kind]}
              </span>
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
            {deleteTarget && (
              <MasterDeleteDialog
                label={
                  {
                    client: "利用者",
                    staff: "職員",
                    office: "事業所",
                    vehicle: "車両",
                  }[deleteTarget.kind]
                }
                reasons={deletionReasons(
                  deleteTarget.kind,
                  deleteTarget.id,
                  referenceData(),
                )}
                onClose={() => setDeleteTarget(undefined)}
                onDelete={() => {
                  if (
                    deletionReasons(
                      deleteTarget.kind,
                      deleteTarget.id,
                      referenceData(),
                    ).length
                  ) {
                    flash("関連データがあるため削除できません");
                    return;
                  }
                  const { kind, id } = deleteTarget;
                  if (kind === "client")
                    setClients((prev) => prev.filter((c) => c.id !== id));
                  if (kind === "staff")
                    setStaff((prev) => prev.filter((s) => s.id !== id));
                  if (kind === "office") {
                    setOffices((prev) => prev.filter((o) => o.id !== id));
                    if (officeId === id) setOfficeId(self.officeId);
                    if (cancellationOfficeId === id)
                      setCancellationOfficeId(self.officeId);
                  }
                  if (kind === "vehicle")
                    setVehicles((prev) => prev.filter((v) => v.id !== id));
                  setDeleteTarget(undefined);
                  flash("削除しました");
                }}
              />
            )}
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
