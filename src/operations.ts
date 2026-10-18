import {
  dayOfWeek,
  minutes,
  monthDays,
  occurrenceKey,
  occurrencesOn,
} from "./domain.ts";
import type {
  Client,
  Occurrence,
  Office,
  Staff,
  Visit,
  VisitFields,
} from "./domain.ts";

export interface Vehicle {
  id: string;
  label: string;
  number: string;
  officeId: string;
  active: boolean;
}
export interface VehicleUseRecord {
  id: string;
  date: string;
  time: string;
  end: string;
  vehicleId: string;
  staffId: string;
  clientId?: string;
  officeId: string;
  cancelled: boolean;
  archived?: boolean;
}
export interface AlcoholCheckRecord {
  id: string;
  date: string;
  officeId: string;
  vehicleId: string;
  driverStaffId: string;
  checkerStaffId: string;
  startAlcoholDetected: boolean;
  endAlcoholDetected: boolean;
  startTemperature: number;
  drivingInstruction: "allowed" | "prohibited";
  notes: string;
}
export interface StaffWorkPattern {
  staffId: string;
  weekday: number;
  working: boolean;
  startTime: string;
  endTime: string;
}
export interface StaffWorkException {
  staffId: string;
  date: string;
  working: boolean;
  startTime: string;
  endTime: string;
  kind: "off" | "extra" | "hours";
}
export interface SharedOfficeNote {
  id: string;
  officeId: string;
  authorStaffId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function storeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function matchingClientIds(
  clients: Client[],
  query: string,
): Set<string> | undefined {
  const q = query.trim().normalize("NFKC").toLocaleLowerCase();
  if (!q) return undefined;
  return new Set(
    clients
      .filter((c) =>
        `${c.name} ${c.kana} ${c.id}`
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(q),
      )
      .map((c) => c.id),
  );
}
export function filterClients(items: Occurrence[], ids?: Set<string>) {
  return ids ? items.filter((v) => !!v.clientId && ids.has(v.clientId)) : items;
}
export function validateTransport(
  draft: VisitFields,
  vehicles: Vehicle[],
  officeId: string,
  previous?: VisitFields,
) {
  if (draft.transportType !== "company") return "";
  const v = vehicles.find((v) => v.id === draft.vehicleId);
  if (!v || v.officeId !== officeId)
    return "所属事業所の社用車を選択してください。";
  if (
    !v.active &&
    !(
      previous?.transportType === "company" &&
      previous.vehicleId === v.id &&
      previous.staffId === draft.staffId
    )
  )
    return "利用停止中の車両は新しく選択できません。";
  return "";
}
export function vehicleUse(
  v: Occurrence,
  staff: Staff[],
): VehicleUseRecord | undefined {
  if (v.transportType !== "company" || !v.vehicleId) return;
  const owner = staff.find((s) => s.id === v.staffId);
  if (!owner) return;
  return {
    id: occurrenceKey(v),
    date: v.date,
    time: v.time,
    end: v.end,
    vehicleId: v.vehicleId,
    staffId: v.staffId,
    clientId: v.clientId,
    officeId: owner.officeId,
    cancelled: v.status === "cancelled",
  };
}
export function vehicleHistory(
  visits: Visit[],
  staff: Staff[],
  month: string,
  archive: VehicleUseRecord[] = [],
) {
  const planned = monthDays(month).flatMap((d) =>
    occurrencesOn(visits, d).flatMap((v) => {
      const use = vehicleUse(v, staff);
      return use ? [use] : [];
    }),
  );
  return [...planned, ...archive.filter((r) => r.date.startsWith(month))].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );
}
// Same fixed demo legs are shared by the map and monthly totals. No road/GPS API is used.
export function demoRouteLegs(items: Occurrence[]) {
  return items
    .filter((v) => v.status !== "cancelled")
    .map((visit, i) => ({
      visit,
      distance: [1.2, 0.8, 1.6, 1.1][i % 4],
      duration: [6, 4, 8, 5][i % 4],
    }));
}
export function travelSummary(visits: Visit[], staffId: string, month: string) {
  const days = monthDays(month)
    .map((date) => ({
      date,
      legs: demoRouteLegs(
        occurrencesOn(visits, date).filter((v) => v.staffId === staffId),
      ),
    }))
    .filter((d) => d.legs.length);
  const legs = days.flatMap((d) => d.legs);
  const distance = legs.reduce((n, l) => n + l.distance, 0);
  const duration = legs.reduce((n, l) => n + l.duration, 0);
  const companyDistance = legs
    .filter((l) => l.visit.transportType === "company")
    .reduce((n, l) => n + l.distance, 0);
  return {
    days: days.length,
    distance,
    duration,
    averageDistance: days.length ? distance / days.length : 0,
    averageDuration: days.length ? duration / days.length : 0,
    companyDistance,
    privateDistance: distance - companyDistance,
  };
}
export const travelTimeGuide = (duration: number) =>
  duration <= 60
    ? "非常に効率的"
    : duration <= 90
      ? "理想的な範囲"
      : duration <= 120
        ? "許容範囲"
        : duration < 150
          ? "改善を検討"
          : "移動負担が大きい";
export function saveAlcoholRecord(
  records: AlcoholCheckRecord[],
  record: AlcoholCheckRecord,
) {
  return records.some((item) => item.id === record.id)
    ? records.map((item) => (item.id === record.id ? record : item))
    : [record, ...records];
}
export function filterAlcohol(
  records: AlcoholCheckRecord[],
  month: string,
  officeId: string,
  vehicleId = "",
  staffId = "",
) {
  return records
    .filter(
      (r) =>
        r.date.startsWith(`${month}-`) &&
        r.officeId === officeId &&
        (!vehicleId || r.vehicleId === vehicleId) &&
        (!staffId || r.driverStaffId === staffId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function workSetting(
  staffId: string,
  date: string,
  patterns: StaffWorkPattern[],
  exceptions: StaffWorkException[],
) {
  return (
    exceptions.find((e) => e.staffId === staffId && e.date === date) ||
    patterns.find((p) => p.staffId === staffId && p.weekday === dayOfWeek(date))
  );
}
export function nonWorkingRanges(
  staffId: string,
  date: string,
  patterns: StaffWorkPattern[],
  exceptions: StaffWorkException[],
  start: number,
  end: number,
) {
  const setting = workSetting(staffId, date, patterns, exceptions);
  if (!setting) return [];
  if (!setting.working) return [{ start, end }];
  return [
    { start, end: Math.min(end, minutes(setting.startTime)) },
    { start: Math.max(start, minutes(setting.endTime)), end },
  ].filter((r) => r.end > r.start);
}
export type ScheduleMode = "detail" | "overview";
export function pinchMode(
  start: number,
  distance: number,
  touchCount: number,
  switched: boolean,
): ScheduleMode | undefined {
  if (touchCount !== 2 || switched || start <= 0) return;
  if (distance <= start * 0.85) return "overview";
  if (distance >= start * 1.15) return "detail";
}
export type MasterKind = "client" | "staff" | "office" | "vehicle";
export interface ReferenceData {
  visits: Visit[];
  clients: Client[];
  staff: Staff[];
  offices: Office[];
  vehicles: Vehicle[];
  vehicleArchive: VehicleUseRecord[];
  alcohol: AlcoholCheckRecord[];
  patterns: StaffWorkPattern[];
  workExceptions: StaffWorkException[];
  requests: {
    clientId: string;
    requesterStaffId?: string;
    requesterOfficeId?: string;
  }[];
  selfId: string;
  localEntries: [string, string][];
}
// All references, including cancelled/moved/deleted occurrences and local records, prevent hard deletion.
export function deletionReasons(
  kind: MasterKind,
  id: string,
  data: ReferenceData,
): string[] {
  const reasons = new Set<string>();
  const check = (condition: boolean, label: string) => {
    if (condition) reasons.add(label);
  };
  const fields = data.visits.flatMap((v) => [
    v,
    ...Object.values(v.exceptions).flatMap((e) =>
      e.override ? [e.override] : [],
    ),
  ]);
  if (kind === "client") {
    check(
      fields.some((v) => v.clientId === id),
      "予定・キャンセル履歴",
    );
    check(
      data.clients.some((c) => c.id === id && !!c.nextDueMonth),
      "書類更新設定",
    );
    check(
      data.requests.some((r) => r.clientId === id),
      "新規依頼",
    );
    check(
      data.vehicleArchive.some((r) => r.clientId === id),
      "車両履歴",
    );
  }
  if (kind === "staff") {
    check(id === data.selfId, "ログイン中の職員");
    check(
      fields.some((v) => v.staffId === id),
      "予定・キャンセル履歴",
    );
    check(
      data.staff.some((s) => s.id === id && !!s.location),
      "位置情報",
    );
    check(
      data.clients.some((c) => c.ownerId === id),
      "担当利用者・書類",
    );
    check(
      data.vehicleArchive.some((r) => r.staffId === id),
      "車両履歴",
    );
    check(
      data.alcohol.some(
        (r) => r.driverStaffId === id || r.checkerStaffId === id,
      ),
      "アルコールチェック",
    );
    check(
      data.patterns.some((p) => p.staffId === id) ||
        data.workExceptions.some((p) => p.staffId === id),
      "勤務設定",
    );
    check(
      data.requests.some((r) => r.requesterStaffId === id),
      "新規依頼",
    );
  }
  if (kind === "office") {
    check(
      data.staff.some((s) => s.officeId === id),
      "所属職員",
    );
    check(
      data.clients.some((c) => c.officeId === id),
      "所属利用者",
    );
    check(
      data.vehicles.some((v) => v.officeId === id),
      "所属車両",
    );
    check(
      data.vehicleArchive.some((r) => r.officeId === id) ||
        data.alcohol.some((r) => r.officeId === id),
      "車両・アルコール履歴",
    );
    check(
      data.requests.some((r) => r.requesterOfficeId === id),
      "新規依頼",
    );
  }
  if (kind === "vehicle") {
    check(
      fields.some((v) => v.vehicleId === id),
      "利用予定・キャンセル履歴",
    );
    check(
      data.vehicleArchive.some((r) => r.vehicleId === id),
      "車両利用履歴",
    );
    check(
      data.alcohol.some((r) => r.vehicleId === id),
      "アルコールチェック",
    );
  }
  for (const [key, raw] of data.localEntries) {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      continue;
    }
    if (
      key.startsWith("visit-documents:") &&
      value &&
      typeof value === "object"
    ) {
      const keys = Object.keys(value);
      check(
        kind === "client" && keys.some((k) => k.startsWith(`${id}:`)),
        "書類履歴",
      );
      check(
        kind === "staff" && key === `visit-documents:${id}` && keys.length > 0,
        "書類履歴",
      );
    }
    if (Array.isArray(value)) {
      check(
        kind === "staff" &&
          key === `visit-free-notes:${id}` &&
          value.length > 0,
        "個人メモ",
      );
      if (key.startsWith("visit-office-notes:")) {
        check(
          kind === "office" &&
            key === `visit-office-notes:${id}` &&
            value.length > 0,
          "事業所共有メモ",
        );
        check(
          kind === "staff" && value.some((n) => n.authorStaffId === id),
          "作成した共有メモ",
        );
      }
    }
  }
  return [...reasons];
}
export function localEntries(): [string, string][] {
  try {
    return Array.from(
      { length: localStorage.length },
      (_, i) => localStorage.key(i)!,
    )
      .filter((k) => k?.startsWith("visit-"))
      .map((k) => [k, localStorage.getItem(k)!]);
  } catch {
    return [];
  }
}
