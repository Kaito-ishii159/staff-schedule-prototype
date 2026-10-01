export const visitTypes = [
  "定期訪問",
  "担当者会議",
  "退院前カンファ",
  "緊急訪問",
  "契約",
] as const;
export type VisitType = (typeof visitTypes)[number];
export type EditScope = "one" | "future";
export type Theme = "blue" | "green" | "purple" | "orange" | "simple";
export interface Office {
  id: string;
  name: string;
  address: string;
  phone: string;
}
export interface Staff {
  id: string;
  name: string;
  email: string;
  officeId: string;
  role: "一般職員" | "管理者";
  active: boolean;
  color: string;
  location?: { x: number; y: number; updatedAt: string };
}
export interface RecurrenceRule {
  frequency: "weekly";
  weekdays: number[];
  startDate: string;
  endDate?: string;
}
export interface VisitFields {
  date: string;
  time: string;
  end: string;
  client: string;
  address: string;
  type: VisitType;
  content: string;
  memo: string;
  staffId: string;
}
export interface Visit extends VisitFields {
  id: string;
  recurrenceRule?: RecurrenceRule;
  exceptions: Record<string, { cancelled?: boolean; override?: VisitFields }>;
}
export interface Occurrence extends VisitFields {
  seriesId: string;
  occurrenceDate: string;
  recurrenceRule?: RecurrenceRule;
  isOverride: boolean;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  read: boolean;
  visitId: string;
  date: string;
  time: string;
}
export const occurrenceKey = (v: Occurrence) =>
  `${v.seriesId}:${v.occurrenceDate}`;
export const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
export const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
}).format(new Date());
export const newId = () => crypto.randomUUID();
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const dayOfWeek = (date: string) =>
  new Date(`${date}T12:00:00Z`).getUTCDay();
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
export const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const typeClass = (type: VisitType) =>
  `type-${visitTypes.indexOf(type)}`;
export function fieldsOf(v: VisitFields): VisitFields {
  return {
    date: v.date,
    time: v.time,
    end: v.end,
    client: v.client,
    address: v.address,
    type: v.type,
    content: v.content,
    memo: v.memo,
    staffId: v.staffId,
  };
}
export function occursOn(v: Visit, date: string) {
  const r = v.recurrenceRule;
  return r
    ? date >= r.startDate &&
        (!r.endDate || date <= r.endDate) &&
        r.weekdays.includes(dayOfWeek(date))
    : v.date === date;
}
export function occurrencesOn(visits: Visit[], date: string): Occurrence[] {
  const result: Occurrence[] = [];
  for (const v of visits) {
    const make = (
      fields: VisitFields,
      occurrenceDate: string,
      isOverride: boolean,
    ): Occurrence => ({
      ...fields,
      seriesId: v.id,
      occurrenceDate,
      recurrenceRule: v.recurrenceRule,
      isOverride,
    });
    if (occursOn(v, date) && !v.exceptions[date])
      result.push(make({ ...fieldsOf(v), date }, date, false));
    for (const [origin, exception] of Object.entries(v.exceptions)) {
      if (!exception.cancelled && exception.override?.date === date)
        result.push(make(exception.override, origin, true));
    }
  }
  return result.sort(
    (a, b) => a.time.localeCompare(b.time) || a.client.localeCompare(b.client),
  );
}
export function changeOccurrence(
  visits: Visit[],
  target: Occurrence,
  draft: VisitFields,
  rule: RecurrenceRule | undefined,
  scope: EditScope,
  id: string,
): Visit[] {
  const series = visits.find((v) => v.id === target.seriesId);
  if (!series) return visits;
  if (!series.recurrenceRule)
    return visits.map((v) =>
      v.id === series.id ? { ...v, ...draft, recurrenceRule: rule } : v,
    );
  if (scope === "one")
    return visits.map((v) =>
      v.id === series.id
        ? {
            ...v,
            exceptions: {
              ...v.exceptions,
              [target.occurrenceDate]: { override: fieldsOf(draft) },
            },
          }
        : v,
    );
  // Split the series at the original occurrence date; earlier occurrences and exceptions stay intact.
  const previous = {
    ...series,
    recurrenceRule: {
      ...series.recurrenceRule,
      endDate: addDays(target.occurrenceDate, -1),
    },
    exceptions: Object.fromEntries(
      Object.entries(series.exceptions).filter(
        ([date]) => date < target.occurrenceDate,
      ),
    ),
  };
  const future: Visit = {
    ...fieldsOf(draft),
    id,
    recurrenceRule: rule,
    exceptions: {},
  };
  return [...visits.map((v) => (v.id === series.id ? previous : v)), future];
}
export function removeOccurrence(visits: Visit[], target: Occurrence): Visit[] {
  return visits.flatMap((v) =>
    v.id !== target.seriesId
      ? [v]
      : v.recurrenceRule
        ? [
            {
              ...v,
              exceptions: {
                ...v.exceptions,
                [target.occurrenceDate]: { cancelled: true },
              },
            },
          ]
        : [],
  );
}
export function recurrenceLabel(rule?: RecurrenceRule) {
  return rule
    ? `毎週 ${[1, 2, 3, 4, 5, 6, 0]
        .filter((d) => rule.weekdays.includes(d))
        .map((d) => weekdayLabels[d])
        .join("・")}`
    : "繰り返しなし";
}
/** Next stored appointment, not an inference about the employee's current activity. */
export function nextRegisteredVisit(
  visits: Visit[],
  staffId: string,
  date: string,
  time: string,
): Occurrence | undefined {
  const candidates = new Set<string>();
  for (const visit of visits) {
    if (visit.staffId === staffId) {
      if (visit.recurrenceRule) {
        const start =
          visit.recurrenceRule.startDate > date
            ? visit.recurrenceRule.startDate
            : date;
        // Each cancelled/overridden date can skip at most one weekly occurrence.
        const days = 8 + Object.keys(visit.exceptions).length * 7;
        for (let i = 0; i < days; i++) candidates.add(addDays(start, i));
      } else candidates.add(visit.date);
    }
    for (const exception of Object.values(visit.exceptions)) {
      if (exception.override?.staffId === staffId)
        candidates.add(exception.override.date);
    }
  }
  for (const candidate of [...candidates].filter((d) => d >= date).sort()) {
    const match = occurrencesOn(visits, candidate).find(
      (v) => v.staffId === staffId && (candidate > date || v.time >= time),
    );
    if (match) return match;
  }
}
export function validateVisit(draft: VisitFields, rule?: RecurrenceRule) {
  if (!draft.client.trim()) return "訪問先を入力してください。";
  if (!draft.date || !draft.time || !draft.end || !draft.staffId)
    return "日付・時間・担当職員を入力してください。";
  if (minutes(draft.time) >= minutes(draft.end))
    return "終了時刻は開始時刻より後にしてください。";
  if (rule && !rule.weekdays.length)
    return "繰り返す曜日を1つ以上選択してください。";
  if (rule?.endDate && rule.endDate < rule.startDate)
    return "繰り返し終了日は開始日以降にしてください。";
  if (rule && !rule.weekdays.includes(dayOfWeek(draft.date)))
    return "開始日の曜日を繰り返し曜日に含めてください。";
  return "";
}
export function timelineLanes(items: Occurrence[], pixelsPerMinute: number) {
  const ends: number[] = [];
  return items.map((item) => {
    const start = minutes(item.time);
    const visualEnd = Math.max(
      minutes(item.end),
      start + 132 / pixelsPerMinute,
    );
    let lane = ends.findIndex((end) => end <= start);
    if (lane < 0) lane = ends.length;
    ends[lane] = visualEnd;
    return { item, lane };
  });
}
