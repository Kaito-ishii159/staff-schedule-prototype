import { addDays, today } from "./domain";
import { officeSeed, staffSeed } from "./data";
import type {
  AlcoholCheckRecord,
  StaffWorkPattern,
  Vehicle,
  VehicleUseRecord,
} from "./operations";

export const vehicleSeed: Vehicle[] = officeSeed.flatMap((o, i) =>
  [0, 1].map((n) => ({
    id: `vehicle-${i + 1}-${n + 1}`,
    label: `${o.name.replace("事業所", "")}・デモ車${n + 1}`,
    number: `架空 ${i + 1}00 あ 00-0${n + 1}`,
    officeId: o.id,
    active: true,
  })),
);
export const workPatternSeed: StaffWorkPattern[] = staffSeed.flatMap((s) =>
  Array.from({ length: 7 }, (_, weekday) => ({
    staffId: s.id,
    weekday,
    working: weekday >= 1 && weekday <= 5,
    startTime: "09:00",
    endTime: "17:00",
  })),
);
export const vehicleArchiveSeed: VehicleUseRecord[] = [
  {
    id: "demo-archived-use",
    date: addDays(today, -2),
    time: "09:00",
    end: "10:00",
    vehicleId: "vehicle-1-1",
    staffId: "staff-1",
    clientId: "client-1-1",
    officeId: "office-1",
    cancelled: false,
    archived: true,
  },
];
export const alcoholSeed: AlcoholCheckRecord[] = officeSeed.map((o, i) => ({
  id: `alcohol-demo-${i}`,
  date: today,
  officeId: o.id,
  vehicleId: `vehicle-${i + 1}-1`,
  driverStaffId: `staff-${i * 10 + 1}`,
  checkerStaffId: `staff-${i * 10 + 2}`,
  startAlcoholDetected: false,
  endAlcoholDetected: false,
  startTemperature: 36.5,
  drivingInstruction: "allowed",
  notes: "入力済みの架空サンプルです。",
}));
