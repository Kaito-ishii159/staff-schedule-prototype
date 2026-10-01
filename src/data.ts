import {
  addDays,
  dayOfWeek,
  today,
  visitTypes,
  type Office,
  type Staff,
  type Visit,
  type Notice,
} from "./domain";
export const loginStaffId = "staff-1";
export const officeSeed: Office[] = [
  "新宿",
  "池袋",
  "渋谷",
  "上野",
  "品川",
  "東京",
  "中野",
].map((name, i) => ({
  id: `office-${i + 1}`,
  name: `${name}事業所`,
  address: `東京都・${name}エリア（架空住所）`,
  phone: "03-0000-0000",
}));
const colors = ["#137c89", "#5268aa", "#8b61a1", "#af7342", "#558568"];
export const staffSeed: Staff[] = Array.from({ length: 70 }, (_, i) => ({
  id: `staff-${i + 1}`,
  name: i < 26 ? `職員${String.fromCharCode(65 + i)}` : `職員${i + 1}`,
  email: `staff${i + 1}@example.test`,
  officeId: `office-${Math.floor(i / 10) + 1}`,
  role: i % 10 === 0 ? "管理者" : "一般職員",
  active: true,
  color: colors[i % colors.length],
  ...(i % 10 < 5
    ? {
        location: {
          x: 65 + (i % 3) * 110,
          y: 110 + Math.floor((i % 10) / 3) * 125,
          updatedAt: `${today} 09:${48 - (i % 10) * 3}`,
        },
      }
    : {}),
}));
const monday = addDays(today, -((dayOfWeek(today) + 6) % 7));
export const visitSeed: Visit[] = staffSeed.flatMap((staff, i) => {
  const number = i === 0 ? 4 : 2;
  return Array.from({ length: number }, (_, j): Visit => ({
    id: `visit-${i + 1}-${j + 1}`,
    date: i === 0 && j === 0 ? monday : today,
    time: ["10:00", "11:45", "13:30", "15:00"][j],
    end: ["10:30", "12:30", "14:15", "15:45"][j],
    client: `${String.fromCharCode(65 + ((i * 2 + j) % 26))}様`,
    address: `${officeSeed[Math.floor(i / 10)].address} ${j + 1}番（サンプル）`,
    type: visitTypes[(i + j) % visitTypes.length],
    content: j === 0 ? "ご家族への説明と書類の確認" : "ご本人・ご家族との相談",
    memo: j === 0 ? "書類を持参してください。" : "",
    staffId: staff.id,
    recurrenceRule: {
      frequency: "weekly",
      weekdays: i === 0 && j === 0 ? [1, 3, 4] : [0, 1, 2, 3, 4, 5, 6],
      startDate: monday,
    },
    exceptions: {},
  }));
});
export const noticeSeed: Notice[] = [
  {
    id: "notice-1",
    title: "訪問内容が更新されました",
    body: "A様の訪問内容に書類の確認が追加されました。",
    date: today,
    time: "09:30",
    read: false,
    visitId: "visit-1-1",
  },
  {
    id: "notice-2",
    title: "予定が登録されました",
    body: "B様の訪問予定が登録されました。",
    date: today,
    time: "09:00",
    read: false,
    visitId: "visit-1-2",
  },
  {
    id: "notice-3",
    title: "予定が更新されました",
    body: "C様のメモが更新されました。",
    date: today,
    time: "08:45",
    read: true,
    visitId: "visit-1-3",
  },
];
