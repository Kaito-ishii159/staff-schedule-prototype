import test from "node:test";
import assert from "node:assert/strict";
import {
  occurrencesOn,
  changeOccurrence,
  removeOccurrence,
  fieldsOf,
  timelineLanes,
  validateVisit,
  nextRegisteredVisit,
  cancelOccurrence,
  cancellationsInMonth,
  telephoneHref,
} from "../src/domain.ts";
test("next registered visit includes later dates, transferred exceptions and distant start dates", () => {
  const future = {
    ...series(),
    recurrenceRule: { ...series().recurrenceRule, startDate: "2027-01-04" },
  };
  assert.equal(
    nextRegisteredVisit([future], "staff-1", "2026-10-01", "09:50").date,
    "2027-01-04",
  );
  assert.equal(
    nextRegisteredVisit([series()], "staff-1", "2026-09-30", "11:00").date,
    "2026-10-01",
  );
  const wed = at([series()], "2026-09-30");
  const visits = changeOccurrence(
    [series()],
    wed,
    { ...fieldsOf(wed), staffId: "staff-2", date: "2026-10-10" },
    wed.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(
    nextRegisteredVisit(visits, "staff-2", "2026-09-30", "09:00").date,
    "2026-10-10",
  );
  assert.equal(
    nextRegisteredVisit(visits, "missing", "2026-09-30", "09:00"),
    undefined,
  );
});
const series = () => ({
  phone: "000-0000-0000",
  status: "active",
  id: "series",
  date: "2026-09-28",
  time: "10:00",
  end: "10:30",
  client: "A様",
  address: "架空住所",
  type: "定期訪問",
  content: "自由入力",
  memo: "",
  staffId: "staff-1",
  recurrenceRule: {
    frequency: "weekly",
    weekdays: [1, 3, 4],
    startDate: "2026-09-28",
  },
  exceptions: {},
});
test("cancellation remains visible on Wednesday, preserves original fields and leaves Thursday active", () => {
  const original = [series()];
  const target = at(original, "2026-09-30");
  const updated = cancelOccurrence(original, target);
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 1);
  assert.deepEqual(fieldsOf(at(updated, "2026-09-30")), {
    ...fieldsOf(target),
    status: "cancelled",
  });
  assert.equal(at(updated, "2026-10-01").status, "active");
  assert.equal(
    nextRegisteredVisit(updated, "staff-1", "2026-09-30", "09:00").date,
    "2026-10-01",
  );
  assert.equal(
    occurrencesOn(
      removeOccurrence(updated, at(updated, "2026-09-30")),
      "2026-09-30",
    ).length,
    0,
  );
});
test("standalone cancellation and monthly office filters retain original datetime", () => {
  const original = [{ ...series(), recurrenceRule: undefined }];
  const cancelled = cancelOccurrence(original, at(original, "2026-09-28"));
  const staff = [{ id: "staff-1", officeId: "one" }];
  assert.equal(
    cancellationsInMonth(cancelled, "2026-09", staff, "one").length,
    1,
  );
  assert.equal(
    cancellationsInMonth(cancelled, "2026-10", staff, "one").length,
    0,
  );
  assert.equal(
    cancellationsInMonth(cancelled, "2026-09", staff, "two").length,
    0,
  );
  assert.equal(
    cancellationsInMonth(cancelled, "2026-13", staff, "one").length,
    0,
  );
});
test("moved exception cancellation uses displayed month and keeps its original recurrence key", () => {
  const original = [series()];
  const wed = at(original, "2026-09-30");
  let updated = changeOccurrence(
    original,
    wed,
    { ...fieldsOf(wed), date: "2026-10-02", phone: "000-0000-0001" },
    wed.recurrenceRule,
    "one",
    "unused",
  );
  updated = cancelOccurrence(updated, at(updated, "2026-10-02"));
  assert.equal(at(updated, "2026-10-02").occurrenceDate, "2026-09-30");
  assert.equal(at(updated, "2026-10-02").phone, "000-0000-0001");
  assert.equal(
    cancellationsInMonth(
      updated,
      "2026-10",
      [{ id: "staff-1", officeId: "one" }],
      "one",
    ).length,
    1,
  );
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 0);
});
test("future edits keep cancellation records without restoring a duplicate active occurrence", () => {
  let updated = [series()];
  updated = cancelOccurrence(updated, at(updated, "2026-10-01"));
  const wed = at(updated, "2026-09-30");
  updated = changeOccurrence(
    updated,
    wed,
    { ...fieldsOf(wed), time: "12:00", end: "12:30" },
    { ...wed.recurrenceRule, startDate: wed.date },
    "future",
    "new",
  );
  const thursday = occurrencesOn(updated, "2026-10-01");
  assert.equal(thursday.length, 1);
  assert.equal(thursday[0].status, "cancelled");
  assert.equal(thursday[0].time, "10:00");
  assert.equal(at(updated, "2026-10-05").time, "12:00");
  const editedWednesday = at(updated, '2026-09-30');
  updated = changeOccurrence(updated, editedWednesday, {...fieldsOf(editedWednesday), phone:'000-0000-0002'}, editedWednesday.recurrenceRule, 'future', 'newer');
  assert.equal(occurrencesOn(updated, '2026-10-01').length, 1);
  assert.equal(at(updated, '2026-10-01').status, 'cancelled');
});
test("phone links normalize separators and reject empty or non-phone URLs", () => {
  assert.equal(telephoneHref("000-0000-0000"), "tel:00000000000");
  assert.equal(telephoneHref(""), undefined);
  assert.equal(telephoneHref("javascript:alert(1)"), undefined);
  assert.equal(telephoneHref("000 (0000) 0001"), "tel:00000000001");
});
const at = (visits, date) => occurrencesOn(visits, date)[0];
test("weekly expansion uses selected weekdays and inclusive end date", () => {
  const visit = series();
  visit.recurrenceRule.endDate = "2026-10-01";
  assert.equal(occurrencesOn([visit], "2026-09-29").length, 0);
  assert.equal(at([visit], "2026-09-30").time, "10:00");
  assert.equal(at([visit], "2026-10-01").time, "10:00");
  assert.equal(occurrencesOn([visit], "2026-10-05").length, 0);
});
test("Wednesday-only override changes staff and time without changing Thursday", () => {
  const original = [series()];
  const wed = at(original, "2026-09-30");
  const updated = changeOccurrence(
    original,
    wed,
    { ...fieldsOf(wed), time: "11:00", end: "11:30", staffId: "staff-2" },
    wed.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(at(updated, "2026-09-30").time, "11:00");
  assert.equal(at(updated, "2026-09-30").staffId, "staff-2");
  assert.equal(at(updated, "2026-09-30").isOverride, true);
  assert.equal(at(updated, "2026-10-01").time, "10:00");
  assert.equal(at(updated, "2026-10-01").staffId, "staff-1");
  assert.equal(at(original, "2026-09-30").time, "10:00");
});
test("future edit splits rule and preserves past occurrences", () => {
  const original = [series()];
  const wed = at(original, "2026-09-30");
  const updated = changeOccurrence(
    original,
    wed,
    { ...fieldsOf(wed), time: "11:00", end: "11:30", type: "契約" },
    { ...wed.recurrenceRule, startDate: wed.date },
    "future",
    "new-series",
  );
  assert.equal(at(updated, "2026-09-28").time, "10:00");
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 1);
  assert.equal(at(updated, "2026-09-30").time, "11:00");
  assert.equal(at(updated, "2026-10-01").time, "11:00");
  assert.equal(at(updated, "2026-10-01").type, "契約");
});
test("moved-day override hides original and can be edited and deleted at new date", () => {
  const original = [series()];
  const wed = at(original, "2026-09-30");
  let updated = changeOccurrence(
    original,
    wed,
    { ...fieldsOf(wed), date: "2026-10-02" },
    wed.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 0);
  assert.equal(at(updated, "2026-10-02").occurrenceDate, "2026-09-30");
  const moved = at(updated, "2026-10-02");
  updated = changeOccurrence(
    updated,
    moved,
    { ...fieldsOf(moved), time: "12:00", end: "12:30" },
    moved.recurrenceRule,
    "one",
    "unused",
  );
  assert.equal(at(updated, "2026-10-02").time, "12:00");
  updated = removeOccurrence(updated, at(updated, "2026-10-02"));
  assert.equal(occurrencesOn(updated, "2026-10-02").length, 0);
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 0);
  assert.equal(at(updated, "2026-10-01").time, "10:00");
});
test("one occurrence deletion leaves future series; standalone deletion removes record", () => {
  const original = [series()];
  const updated = removeOccurrence(original, at(original, "2026-09-30"));
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 0);
  assert.equal(at(updated, "2026-10-01").time, "10:00");
  const standalone = [{ ...series(), recurrenceRule: undefined }];
  assert.deepEqual(
    removeOccurrence(standalone, at(standalone, "2026-09-28")),
    [],
  );
});
test("future edit resets only future exceptions as disclosed in the form", () => {
  let visits = [series()];
  const mon = at(visits, "2026-09-28");
  const thu = at(visits, "2026-10-01");
  visits = changeOccurrence(
    visits,
    mon,
    { ...fieldsOf(mon), memo: "過去の例外" },
    mon.recurrenceRule,
    "one",
    "unused",
  );
  visits = changeOccurrence(
    visits,
    thu,
    { ...fieldsOf(thu), memo: "将来の例外" },
    thu.recurrenceRule,
    "one",
    "unused",
  );
  const wed = at(visits, "2026-09-30");
  visits = changeOccurrence(
    visits,
    wed,
    { ...fieldsOf(wed), memo: "新ルール" },
    { ...wed.recurrenceRule, startDate: wed.date },
    "future",
    "new",
  );
  assert.equal(at(visits, "2026-09-28").memo, "過去の例外");
  assert.equal(at(visits, "2026-10-01").memo, "新ルール");
});
test("turn off future repeat preserves past but creates one standalone occurrence", () => {
  const visits = [series()];
  const wed = at(visits, "2026-09-30");
  const updated = changeOccurrence(
    visits,
    wed,
    fieldsOf(wed),
    undefined,
    "future",
    "new",
  );
  assert.equal(occurrencesOn(updated, "2026-09-28").length, 1);
  assert.equal(occurrencesOn(updated, "2026-09-30").length, 1);
  assert.equal(occurrencesOn(updated, "2026-10-01").length, 0);
});
test("timeline lanes account for visual minimum width as well as real overlap", () => {
  const item = at([series()], "2026-09-30");
  const entries = timelineLanes(
    [
      item,
      { ...item, time: "10:20", end: "10:40" },
      { ...item, time: "10:35", end: "10:40" },
      { ...item, time: "11:00", end: "11:30" },
    ],
    3,
  );
  assert.deepEqual(
    entries.map((e) => e.lane),
    [0, 1, 2, 0],
  );
});
test("validation catches reversed time and empty weekdays/end date", () => {
  const v = series();
  assert.ok(validateVisit({ ...v, end: "09:59" }));
  assert.ok(validateVisit(v, { ...v.recurrenceRule, weekdays: [] }));
  assert.ok(validateVisit(v, { ...v.recurrenceRule, endDate: "2026-09-27" }));
  assert.equal(validateVisit(v, v.recurrenceRule), "");
});
