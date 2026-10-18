import test from "node:test";
import assert from "node:assert/strict";
import {
  cancelOccurrence,
  changeOccurrence,
  fieldsOf,
  occurrencesOn,
} from "../src/domain.ts";
import {
  deletionReasons,
  matchingClientIds,
  filterClients,
  validateTransport,
  vehicleHistory,
  vehicleUse,
  travelSummary,
  filterAlcohol,
  saveAlcoholRecord,
  nonWorkingRanges,
  pinchMode,
  travelTimeGuide,
} from "../src/operations.ts";

const staff = [
  { id: "s", officeId: "o" },
  { id: "other", officeId: "o2" },
];
const visit = () => ({
  id: "v",
  clientId: "c",
  client: "同名",
  staffId: "s",
  date: "2026-10-05",
  time: "10:00",
  end: "10:30",
  phone: "",
  address: "",
  type: "定期訪問",
  content: "",
  memo: "",
  status: "active",
  transportType: "company",
  vehicleId: "car",
  recurrenceRule: {
    frequency: "weekly",
    weekdays: [1, 3, 5],
    startDate: "2026-10-05",
    endDate: "2026-10-09",
  },
  exceptions: {},
});
const context = () => ({
  visits: [],
  clients: [],
  staff: [],
  offices: [],
  vehicles: [],
  vehicleArchive: [],
  alcohol: [],
  patterns: [],
  workExceptions: [],
  requests: [],
  selfId: "login",
  localEntries: [],
});

test("unused masters can be deleted; all master IDs block live and persisted references", () => {
  for (const kind of ["client", "staff", "office", "vehicle"])
    assert.deepEqual(deletionReasons(kind, "unused", context()), []);
  const data = {
    ...context(),
    visits: [visit()],
    staff,
    clients: [
      { id: "c", officeId: "o", ownerId: "s", nextDueMonth: "2026-12" },
    ],
    vehicles: [{ id: "car", officeId: "o" }],
  };
  for (const [kind, id] of [
    ["client", "c"],
    ["staff", "s"],
    ["office", "o"],
    ["vehicle", "car"],
  ])
    assert.ok(deletionReasons(kind, id, data).length);
  const override = {
    ...fieldsOf(visit()),
    clientId: "moved-client",
    staffId: "moved-staff",
    vehicleId: "moved-car",
    status: "cancelled",
  };
  data.visits[0].exceptions["2026-10-07"] = { override };
  for (const [kind, id] of [
    ["client", "moved-client"],
    ["staff", "moved-staff"],
    ["vehicle", "moved-car"],
  ])
    assert.ok(deletionReasons(kind, id, data).length);
});
test("document checks, private/shared notes, requests, alcohol and archived vehicles prevent hard deletion", () => {
  const data = context();
  data.localEntries = [
    ["visit-documents:s", JSON.stringify({ "c:報告書:2026-10": false })],
    ["visit-free-notes:s", JSON.stringify([{ id: "note", text: "memo" }])],
    [
      "visit-office-notes:o",
      JSON.stringify([{ authorStaffId: "s", text: "shared" }]),
    ],
  ];
  assert.ok(deletionReasons("client", "c", data).includes("書類履歴"));
  assert.ok(deletionReasons("staff", "s", data).includes("個人メモ"));
  assert.ok(deletionReasons("staff", "s", data).includes("作成した共有メモ"));
  assert.ok(deletionReasons("office", "o", data).includes("事業所共有メモ"));
  data.vehicleArchive = [
    { vehicleId: "car", staffId: "s2", clientId: "c2", officeId: "o2" },
  ];
  data.alcohol = [
    {
      vehicleId: "alcohol-car",
      driverStaffId: "d",
      checkerStaffId: "checker",
      officeId: "o3",
    },
  ];
  data.requests = [
    {
      clientId: "requested",
      requesterStaffId: "requester",
      requesterOfficeId: "o4",
    },
  ];
  for (const [kind, id] of [
    ["vehicle", "car"],
    ["client", "c2"],
    ["staff", "s2"],
    ["office", "o2"],
    ["vehicle", "alcohol-car"],
    ["staff", "checker"],
    ["office", "o3"],
    ["client", "requested"],
    ["staff", "requester"],
    ["office", "o4"],
  ])
    assert.ok(deletionReasons(kind, id, data).length);
});
test("customer name/kana/ID searches filter by stable ID, retaining inactive historical customers", () => {
  const clients = [
    { id: "c", name: "同名", kana: "ドウメイ", active: false },
    { id: "c2", name: "同名", kana: "ベツメイ", active: true },
  ];
  const items = occurrencesOn(
    [visit(), { ...visit(), id: "v2", clientId: "c2" }],
    "2026-10-05",
  );
  assert.equal(
    filterClients(items, matchingClientIds(clients, "同名")).length,
    2,
  );
  assert.equal(
    filterClients(items, matchingClientIds(clients, "ドウメイ"))[0].clientId,
    "c",
  );
  assert.equal(
    filterClients(items, matchingClientIds(clients, "c2"))[0].clientId,
    "c2",
  );
  assert.equal(
    filterClients(items, matchingClientIds(clients, "missing")).length,
    0,
  );
  assert.equal(filterClients(items, matchingClientIds(clients, " ")).length, 2);
});
test("private transport needs no vehicle; company transport requires an active vehicle from the office", () => {
  const cars = [
    { id: "car", officeId: "o", active: true },
    { id: "old", officeId: "o", active: false },
  ];
  assert.equal(
    validateTransport(
      { ...visit(), transportType: "private", vehicleId: undefined },
      cars,
      "o",
    ),
    "",
  );
  assert.equal(validateTransport(visit(), cars, "o"), "");
  assert.ok(validateTransport({ ...visit(), vehicleId: undefined }, cars, "o"));
  assert.ok(validateTransport(visit(), cars, "o2"));
  assert.ok(validateTransport({ ...visit(), vehicleId: "old" }, cars, "o"));
  const old = { ...visit(), vehicleId: "old" };
  assert.equal(validateTransport(old, cars, "o", old), "");
  assert.equal(
    fieldsOf({ ...visit(), transportType: "private" }).vehicleId,
    undefined,
  );
});
test("vehicle history expands recurring exceptions and preserves archived identity after a change", () => {
  let visits = [visit()];
  const first = occurrencesOn(visits, "2026-10-05")[0];
  const archive = [
    { ...vehicleUse(first, staff), archived: true, id: "archive" },
  ];
  visits = changeOccurrence(
    visits,
    first,
    { ...fieldsOf(first), transportType: "private", vehicleId: undefined },
    first.recurrenceRule,
    "one",
    "unused",
  );
  visits = cancelOccurrence(visits, occurrencesOn(visits, "2026-10-07")[0]);
  const history = vehicleHistory(visits, staff, "2026-10", archive);
  assert.equal(history.length, 3);
  assert.equal(history.find((r) => r.date === "2026-10-07").cancelled, true);
  assert.ok(
    history.some(
      (r) =>
        r.archived &&
        r.clientId === "c" &&
        r.staffId === "s" &&
        r.officeId === "o",
    ),
  );
  assert.equal(vehicleHistory(visits, staff, "2026-11", archive).length, 0);
});
test("monthly travel averages only days with active planned legs; transport split, zero cases and exceptions agree", () => {
  const privateVisit = {
    ...visit(),
    id: "private",
    transportType: "private",
    vehicleId: undefined,
    time: "11:00",
    end: "11:30",
  };
  let visits = [visit(), privateVisit];
  visits = cancelOccurrence(visits, occurrencesOn(visits, "2026-10-07")[0]);
  const total = travelSummary(visits, "s", "2026-10");
  assert.equal(total.days, 3);
  assert.equal(total.duration, 26);
  assert.ok(Math.abs(total.companyDistance - 2.4) < 1e-9);
  assert.ok(Math.abs(total.privateDistance - 2.8) < 1e-9);
  assert.equal(total.averageDuration, 26 / 3);
  assert.equal(travelSummary(visits, "other", "2026-10").averageDuration, 0);
  assert.equal(travelSummary(visits, "s", "invalid").days, 0);
});
test("new alcohol records are prepended without modifying existing records", () => {
  const existing = { id: "existing", notes: "original" };
  const records = [existing];
  const added = { id: "new", notes: "new entry" };
  assert.deepEqual(saveAlcoholRecord(records, added), [added, existing]);
  assert.deepEqual(records, [existing]);
});
test("editing an alcohol record retains ID, count, order and other records", () => {
  const original = { id: "a", startTemperature: 36.5, notes: "before" };
  const other = { id: "b", startTemperature: 36.7, notes: "untouched" };
  const records = [other, original];
  const edited = { ...original, startTemperature: 36.8, notes: "after" };
  const result = saveAlcoholRecord(records, edited);
  assert.equal(result.length, records.length);
  assert.equal(result[1].id, original.id);
  assert.deepEqual(result[1], edited);
  assert.equal(result[0], other);
  assert.equal(records[1], original);
  assert.equal(original.notes, "before");
});
test("alcohol filters combine month, office, vehicle and stable driver ID", () => {
  const a = {
    id: "a",
    date: "2026-10-05",
    officeId: "o",
    vehicleId: "car",
    driverStaffId: "s",
  };
  const records = [
    a,
    { ...a, id: "b", driverStaffId: "s2" },
    { ...a, id: "c", officeId: "o2" },
    { ...a, id: "d", date: "2026-09-05" },
  ];
  assert.equal(filterAlcohol(records, "2026-10", "o").length, 2);
  assert.deepEqual(filterAlcohol(records, "2026-10", "o", "car", "s"), [a]);
  assert.equal(filterAlcohol(records, "2026-10", "o", "other").length, 0);
});
test("working hours and holidays honor dated exceptions without treating missing settings as leave", () => {
  const patterns = [
    {
      staffId: "s",
      weekday: 1,
      working: true,
      startTime: "09:00",
      endTime: "17:00",
    },
  ];
  assert.deepEqual(
    nonWorkingRanges("s", "2026-10-05", patterns, [], 480, 1080),
    [
      { start: 480, end: 540 },
      { start: 1020, end: 1080 },
    ],
  );
  const exceptions = [{ staffId: "s", date: "2026-10-05", working: false }];
  assert.deepEqual(
    nonWorkingRanges("s", "2026-10-05", patterns, exceptions, 480, 1080),
    [{ start: 480, end: 1080 }],
  );
  assert.deepEqual(
    nonWorkingRanges("s", "2026-10-06", patterns, [], 480, 1080),
    [],
  );
  assert.deepEqual(
    nonWorkingRanges(
      "s",
      "2026-10-06",
      patterns,
      [
        {
          staffId: "s",
          date: "2026-10-06",
          working: true,
          startTime: "10:00",
          endTime: "16:00",
        },
      ],
      480,
      1080,
    ),
    [
      { start: 480, end: 600 },
      { start: 960, end: 1080 },
    ],
  );
});
test("two-state pinch recognizes in/out only beyond threshold and only once per gesture", () => {
  assert.equal(pinchMode(100, 84, 2, false), "overview");
  assert.equal(pinchMode(100, 116, 2, false), "detail");
  assert.equal(pinchMode(100, 90, 2, false), undefined);
  assert.equal(pinchMode(100, 110, 2, false), undefined);
  assert.equal(pinchMode(100, 50, 1, false), undefined);
  assert.equal(pinchMode(100, 50, 3, false), undefined);
  assert.equal(pinchMode(100, 150, 2, true), undefined);
  assert.equal(pinchMode(0, 150, 2, false), undefined);
});
test("customer-provided time guidance has explicit non-overlapping boundaries", () => {
  assert.equal(travelTimeGuide(60), "非常に効率的");
  assert.equal(travelTimeGuide(90), "理想的な範囲");
  assert.equal(travelTimeGuide(120), "許容範囲");
  assert.equal(travelTimeGuide(149), "改善を検討");
  assert.equal(travelTimeGuide(150), "移動負担が大きい");
});
