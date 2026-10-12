import test from "node:test";
import assert from "node:assert/strict";
import {
  clientMonth,
  completeMemo,
  hasPendingMemo,
  occurrencesOn,
  fieldsOf,
  changeOccurrence,
  cancelOccurrence,
  weekStart,
  resolveClientVisits,
} from "../src/domain.ts";
const seed = () => ({
  id: "v",
  clientId: "c1",
  client: "A様",
  staffId: "s",
  date: "2026-10-05",
  time: "09:00",
  end: "09:30",
  address: "架空",
  phone: "000-0000-0000",
  type: "定期訪問",
  serviceKind: "看護",
  status: "active",
  content: "",
  memo: "書類を持参",
  memoScope: "recurring",
  recurrenceRule: {
    frequency: "weekly",
    weekdays: [1, 3, 5],
    startDate: "2026-10-05",
  },
  exceptions: {},
});
test("master updates use ID rather than duplicate names and preserve cancelled/memo occurrences", () => {
  let visits = [seed(), { ...seed(), id: "v2", clientId: "c2" }];
  visits = completeMemo(visits, occurrencesOn(visits, "2026-10-05")[0]);
  visits = cancelOccurrence(visits, occurrencesOn(visits, "2026-10-07")[0]);
  const clients = [
    {
      id: "c1",
      name: "変更後",
      phone: "000-0000-0001",
      address: "新住所",
      active: false,
    },
    { id: "c2", name: "A様", phone: "000-0000-0002", address: "別住所" },
  ];
  const resolved = resolveClientVisits(visits, clients);
  const cancelled = occurrencesOn(resolved, "2026-10-07").find(
    (v) => v.clientId === "c1",
  );
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.client, "変更後");
  assert.equal(cancelled.phone, "000-0000-0001");
  assert.equal(
    occurrencesOn(resolved, "2026-10-05").find((v) => v.clientId === "c1")
      .memoCompleted,
    true,
  );
  assert.equal(clientMonth(resolved, "c1", "2026-10")[6].visits.length, 1);
  assert.equal(resolved[1].client, "A様");
  assert.equal(visits[0].client, "A様");
});
test("client month uses customer identity, keeps multiple services and cancellations, and handles Monday-first weeks", () => {
  const a = seed();
  const duplicate = { ...a, id: "v2", clientId: "c2" };
  const rehab = { ...a, id: "r", time: "13:30", serviceKind: "リハビリ" };
  let all = [a, duplicate, rehab];
  all = cancelOccurrence(
    all,
    occurrencesOn(all, "2026-10-07").find((v) => v.seriesId === "v"),
  );
  const days = clientMonth(all, "c1", "2026-10");
  assert.equal(days.length, 31);
  const day = days.find((d) => d.date === "2026-10-07");
  assert.equal(day.visits.length, 2);
  assert.equal(day.visits[0].status, "cancelled");
  assert.equal(day.visits[1].time, "13:30");
  assert.equal(day.visits[1].serviceKind, "リハビリ");
  assert.equal(weekStart("2026-10-11"), "2026-10-05");
  assert.equal(clientMonth(all, "c1", "invalid").length, 0);
});
test("single memo belongs only to its originating occurrence, including moved-day exceptions", () => {
  const v = { ...seed(), memoScope: "single", memoDate: "2026-10-05" };
  const first = occurrencesOn([v], "2026-10-05")[0];
  assert.equal(first.memo, "書類を持参");
  assert.equal(occurrencesOn([v], "2026-10-07")[0].memo, "");
  const moved = changeOccurrence(
    [v],
    first,
    { ...fieldsOf(first), date: "2026-10-06" },
    v.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(occurrencesOn(moved, "2026-10-06")[0].memo, "書類を持参");
  assert.equal(occurrencesOn(moved, "2026-10-07")[0].memo, "");
});
test("recurring memo completion is per occurrence, survives time edits, and a changed memo becomes pending", () => {
  let all = [seed()];
  let first = occurrencesOn(all, "2026-10-05")[0];
  all = completeMemo(all, first);
  first = occurrencesOn(all, "2026-10-05")[0];
  assert.equal(hasPendingMemo(first), false);
  assert.equal(hasPendingMemo(occurrencesOn(all, "2026-10-07")[0]), true);
  all = changeOccurrence(
    all,
    first,
    { ...fieldsOf(first), time: "10:00", end: "10:30" },
    first.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(hasPendingMemo(occurrencesOn(all, "2026-10-05")[0]), false);
  first = occurrencesOn(all, "2026-10-05")[0];
  all = changeOccurrence(
    all,
    first,
    { ...fieldsOf(first), memo: "別の持ち物" },
    first.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(hasPendingMemo(occurrencesOn(all, "2026-10-05")[0]), true);
  assert.equal(occurrencesOn(all, "2026-10-07")[0].memo, "書類を持参");
});
