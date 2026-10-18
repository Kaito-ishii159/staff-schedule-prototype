import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "../src/App";
import { Schedule } from "../src/Schedule";
import { occurrencesOn } from "../src/domain";
import { officeSeed, staffSeed, visitSeed } from "../src/data";
import {
  alcoholSeed,
  vehicleSeed,
  workPatternSeed,
} from "../src/operationData";
import { WeeklySchedule } from "../src/Additional";
import { AlcoholChecks, SharedNotes } from "../src/OperationsUI";

// Seed dates must stay reproducible when CI runs in a later week or timezone.
vi.hoisted(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T00:50:00Z"));
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.useRealTimers();
  localStorage.clear();
  vi.stubGlobal("PointerEvent", MouseEvent);
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name, exact: true }));
const change = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name, { exact: true }), {
    target: { value },
  });
const login = () => {
  render(<App />);
  click("ログイン");
};
const registerClient = (name: string, phone = "000-0000-0000") => {
  click("＋ 新しい利用者を登録");
  const dialog = screen.getAllByRole("dialog").at(-1)!;
  const field = (label: string, value: string) =>
    fireEvent.change(within(dialog).getByLabelText(label, { exact: true }), {
      target: { value },
    });
  field("氏名", name);
  field("フリガナ", "テストサマ");
  field("電話番号", phone);
  field("住所", "東京都新宿区・架空");
  fireEvent.click(within(dialog).getByRole("button", { name: "利用者を保存" }));
};
describe("vehicle, work settings and schedule v2", () => {
  it("deletes unused clients, staff and offices but blocks linked records", () => {
    login();
    click("設定");
    click("利用者管理 利用者マスタ・基本情報・月間予定");
    change("利用者名検索", "client-1-1");
    fireEvent.click(screen.getByRole("button", { name: /A様 · 利用中/ }));
    click("利用者を削除");
    expect(screen.getByRole("alert").textContent).toContain("削除できません");
    expect(
      screen.queryByRole("button", { name: "削除する", exact: true }),
    ).toBeNull();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "戻る",
        exact: true,
      }),
    );
    click("利用者一覧へ");
    registerClient("削除用利用者");
    click("利用者を削除");
    click("削除する");
    change("利用者名検索", "削除用利用者");
    expect(screen.queryByText("削除用利用者")).toBeNull();
    click("設定");
    click("職員管理 70名の登録職員");
    click("職員を追加");
    change("氏名", "未使用職員");
    change("メールアドレス", "unused@example.test");
    click("登録する");
    fireEvent.change(
      screen.getByPlaceholderText("氏名・メールアドレスで検索"),
      { target: { value: "未使用職員" } },
    );
    click("職員を削除");
    click("削除する");
    expect(screen.queryByText("未使用職員")).toBeNull();
    click("設定");
    click("事業所管理 7事業所");
    click("事業所を追加");
    change("事業所名", "削除用事業所");
    change("住所", "東京都・架空");
    change("電話番号", "03-0000-0000");
    click("登録する");
    const row = screen.getByText("削除用事業所").closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: "事業所を削除" }));
    click("削除する");
    expect(screen.queryByText("削除用事業所")).toBeNull();
  });
  it("combines customer ID and staff filters on daily and weekly schedules and clears them", () => {
    login();
    click("予定");
    change("利用者検索", "client-1-1");
    expect(
      screen.getByRole("button", { name: /10:00–10:30 A様/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /11:45–12:30 B様/ }),
    ).toBeNull();
    change("職員検索", "職員B");
    expect(
      screen.queryByRole("button", { name: /10:00–10:30 A様/ }),
    ).toBeNull();
    click("検索条件クリア");
    click("全体表示");
    change("利用者検索", "client-1-1");
    expect(
      screen.getByRole("button", { name: /10:00–10:30 A様/ }),
    ).toBeTruthy();
    click("ホーム");
    click("週間予定");
    change("週間予定の利用者検索", "client-1-1");
    expect(
      screen.getAllByRole("button", { name: /A様/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /B様/ })).toBeNull();
    change("週間予定の職員検索", "職員B");
    expect(screen.queryByRole("button", { name: /A様/ })).toBeNull();
    click("検索条件クリア");
    expect(
      screen.getAllByRole("button", { name: /B様/ }).length,
    ).toBeGreaterThan(0);
  });
  it("weekly customer filter resolves duplicate display names by ID", () => {
    render(
      <WeeklySchedule
        clients={[
          { id: "one", name: "同名", kana: "ドウメイ", active: true } as never,
          { id: "two", name: "同名", kana: "ドウメイ", active: true } as never,
        ]}
        visits={visitSeed.slice(0, 2).map((v, i) => ({
          ...v,
          clientId: i ? "two" : "one",
          client: "同名",
        }))}
        staff={staffSeed}
        onOpen={vi.fn()}
      />,
    );
    change("週間予定の利用者検索", "one");
    expect(screen.queryByRole("button", { name: /11:45.*同名/ })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /10:00.*同名/ }).length,
    ).toBeGreaterThan(0);
  });
  it("separates private and shared notes, preserving shared metadata through edit and delete", () => {
    login();
    click("フリーメモ");
    change("メモ内容", "個人だけ");
    click("メモを保存");
    click("事業所共有");
    expect(screen.queryByText("個人だけ")).toBeNull();
    change("共有メモ内容", "事業所に共有");
    click("共有メモを保存");
    expect(screen.getByText("作成者：職員A")).toBeTruthy();
    const first = JSON.parse(
      localStorage.getItem("visit-office-notes:office-1")!,
    )[0];
    click("共有メモを編集");
    change("共有メモ内容", "共有を更新");
    click("共有メモの変更を保存");
    const updated = JSON.parse(
      localStorage.getItem("visit-office-notes:office-1")!,
    )[0];
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.authorStaffId).toBe("staff-1");
    click("共有メモを削除");
    click("削除する");
    expect(screen.queryByText("共有を更新")).toBeNull();
    click("個人メモ");
    expect(screen.getByText("個人だけ")).toBeTruthy();
    cleanup();
    render(
      <SharedNotes officeId="office-2" staffId="staff-11" staff={staffSeed} />,
    );
    expect(screen.queryByText("個人だけ")).toBeNull();
    expect(screen.getByText("共有メモはありません。")).toBeTruthy();
  });
  it("registers company/private visits, retains vehicle history and blocks used vehicle deletion", () => {
    login();
    click("設定");
    click("車両管理 登録・利用状態・車両利用履歴");
    click("車両を登録");
    change("車両表示名", "検証用車両");
    change("車両番号（架空）", "架空 000 あ 00-99");
    click("車両を保存");
    const carRow = screen
      .getByRole("heading", { name: "検証用車両" })
      .closest("article")!;
    fireEvent.click(within(carRow).getByRole("button", { name: "車両を編集" }));
    change("車両表示名", "検証用車両改");
    click("車両を保存");
    click("ホーム");
    click("予定登録");
    registerClient("車両利用者");
    change("移動手段", "company");
    const select = screen.getByLabelText("社用車") as HTMLSelectElement;
    const carId = [...select.options].find((o) =>
      o.text.includes("検証用車両改"),
    )!.value;
    change("社用車", carId);
    click("保存する");
    click("10:00–10:30 車両利用者 定期訪問");
    expect(screen.getByText("社用車 · 検証用車両改")).toBeTruthy();
    click("設定");
    click("車両管理 登録・利用状態・車両利用履歴");
    const row = screen
      .getByRole("heading", { name: "検証用車両改" })
      .closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: "利用履歴" }));
    expect(screen.getByText("利用者：車両利用者")).toBeTruthy();
    click("戻る");
    fireEvent.click(
      within(
        screen
          .getByRole("heading", { name: "検証用車両改" })
          .closest("article")!,
      ).getByRole("button", { name: "車両を削除" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("削除できません");
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "戻る",
        exact: true,
      }),
    );
    click("ホーム");
    click("予定登録");
    registerClient("自家用車利用者");
    expect((screen.getByLabelText("移動手段") as HTMLSelectElement).value).toBe(
      "private",
    );
    expect(screen.queryByLabelText("社用車")).toBeNull();
    click("保存する");
    click("10:00–10:30 自家用車利用者 定期訪問");
    expect(screen.getByText("自家用車", { exact: true })).toBeTruthy();
  });
  it("deletes an unused vehicle with confirmation", () => {
    login();
    click("設定");
    click("車両管理 登録・利用状態・車両利用履歴");
    const row = screen
      .getByRole("heading", { name: "新宿・デモ車2" })
      .closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: "車両を削除" }));
    expect(screen.getByText("削除すると元に戻せません。")).toBeTruthy();
    click("削除する");
    expect(screen.queryByRole("heading", { name: "新宿・デモ車2" })).toBeNull();
  });
  it("registers and filters an alcohol check and opens all recorded fields", () => {
    login();
    click("設定");
    click("アルコールチェック 手入力の確認記録（デモ）");
    click("チェックを登録");
    const modal = within(screen.getByRole("dialog"));
    expect(
      (modal.getByLabelText("出勤時 酒気帯び") as HTMLSelectElement).value,
    ).toBe("");
    expect(
      (modal.getByLabelText("退勤時 酒気帯び") as HTMLSelectElement).value,
    ).toBe("");
    expect((modal.getByLabelText("指示事項") as HTMLSelectElement).value).toBe(
      "",
    );
    const set = (name: string, value: string) =>
      fireEvent.change(modal.getByLabelText(name), { target: { value } });
    set("車両", "vehicle-1-2");
    set("運転手", "staff-2");
    set("確認者", "staff-3");
    set("出勤時 酒気帯び", "yes");
    set("退勤時 酒気帯び", "no");
    set("出勤時 体温（℃）", "36.7");
    set("指示事項", "prohibited");
    set("特記事項", "運転を見合わせるサンプル");
    click("チェックを保存");
    change("車両", "vehicle-1-2");
    change("運転手", "staff-2");
    fireEvent.click(
      screen.getByRole("button", { name: /職員B.*職員C.*運転不可/ }),
    );
    expect(screen.getByText("運転を見合わせるサンプル")).toBeTruthy();
    expect(screen.getByText("36.7℃")).toBeTruthy();
    click("閉じる");
    change("事業所", "office-2");
    expect(screen.queryByRole("button", { name: /職員B.*職員C/ })).toBeNull();
  });
  it("edits an existing alcohol check, refreshes detail and list without adding a row", () => {
    login();
    click("設定");
    click("アルコールチェック 手入力の確認記録（デモ）");
    expect(screen.getByText("1件")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /職員A.*職員B.*詳細を見る/ }),
    );
    click("編集");
    expect(
      screen.getByRole("heading", { name: "アルコールチェックを編集" }),
    ).toBeTruthy();
    const modal = within(screen.getByRole("dialog"));
    expect((modal.getByLabelText("車両") as HTMLSelectElement).value).toBe(
      "vehicle-1-1",
    );
    expect((modal.getByLabelText("運転手") as HTMLSelectElement).value).toBe(
      "staff-1",
    );
    fireEvent.change(modal.getByLabelText("出勤時 体温（℃）"), {
      target: { value: "36.8" },
    });
    fireEvent.change(modal.getByLabelText("特記事項"), {
      target: { value: "編集後の特記事項" },
    });
    click("変更を保存");
    expect(screen.getByRole("status").textContent).toBe("変更を保存しました");
    expect(
      screen.getByRole("heading", { name: "アルコールチェック詳細" }),
    ).toBeTruthy();
    expect(screen.getByText("36.8℃")).toBeTruthy();
    expect(screen.getByText("編集後の特記事項")).toBeTruthy();
    click("閉じる");
    expect(screen.getByText("1件")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /詳細を見る/ })).toHaveLength(
      1,
    );
    fireEvent.click(screen.getByRole("button", { name: /職員A.*36.8℃/ }));
    expect(screen.getByText("編集後の特記事項")).toBeTruthy();
    click("編集");
    fireEvent.change(
      within(screen.getByRole("dialog")).getByLabelText("特記事項"),
      { target: { value: "未保存" } },
    );
    click("閉じる");
    expect(screen.getByText("編集後の特記事項")).toBeTruthy();
    expect(screen.queryByText("未保存")).toBeNull();
  });
  it("retains only the original inactive master choices and saves all edited fields with the same ID", () => {
    const onSave = vi.fn();
    render(
      <AlcoholChecks
        records={alcoholSeed}
        offices={officeSeed}
        vehicles={vehicleSeed.map((v) => ({ ...v, active: false }))}
        staff={staffSeed.map((s) => ({ ...s, active: false }))}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /職員A.*詳細を見る/ }));
    click("編集");
    const modal = within(screen.getByRole("dialog"));
    for (const label of ["車両", "運転手", "確認者"]) {
      const select = modal.getByLabelText(label) as HTMLSelectElement;
      expect(select.options).toHaveLength(2);
      expect(select.selectedOptions[0].textContent).toContain("現在利用停止");
    }
    const set = (label: string, value: string) =>
      fireEvent.change(modal.getByLabelText(label), { target: { value } });
    set("日付", "2026-09-30");
    set("出勤時 酒気帯び", "yes");
    set("退勤時 酒気帯び", "yes");
    set("出勤時 体温（℃）", "37.2");
    set("指示事項", "prohibited");
    set("特記事項", "停止後も過去記録を編集");
    click("変更を保存");
    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      ...alcoholSeed[0],
      date: "2026-09-30",
      startAlcoholDetected: true,
      endAlcoholDetected: true,
      startTemperature: 37.2,
      drivingInstruction: "prohibited",
      notes: "停止後も過去記録を編集",
    });
    expect((screen.getByLabelText("対象月") as HTMLInputElement).value).toBe(
      "2026-09",
    );
    click("閉じる");
    click("チェックを登録");
    const create = within(screen.getByRole("dialog"));
    for (const label of ["車両", "運転手", "確認者"]) {
      expect(
        (create.getByLabelText(label) as HTMLSelectElement).options,
      ).toHaveLength(1);
    }
  });
  it("changes the vehicle, driver and checker and resets list filters after editing", () => {
    login();
    click("設定");
    click("アルコールチェック 手入力の確認記録（デモ）");
    change("車両", "vehicle-1-1");
    change("運転手", "staff-1");
    fireEvent.click(screen.getByRole("button", { name: /職員A.*詳細を見る/ }));
    click("編集");
    const modal = within(screen.getByRole("dialog"));
    for (const [label, value] of [
      ["車両", "vehicle-1-2"],
      ["運転手", "staff-2"],
      ["確認者", "staff-3"],
      ["日付", "2026-09-30"],
    ]) {
      fireEvent.change(modal.getByLabelText(label), { target: { value } });
    }
    click("変更を保存");
    expect(
      within(screen.getByRole("dialog")).getByText("新宿・デモ車2"),
    ).toBeTruthy();
    click("閉じる");
    expect(screen.getByText("1件")).toBeTruthy();
    expect((screen.getByLabelText("対象月") as HTMLInputElement).value).toBe(
      "2026-09",
    );
    expect((screen.getByLabelText("車両") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("運転手") as HTMLSelectElement).value).toBe(
      "",
    );
    expect(
      screen.getByRole("button", { name: /職員B.*職員C.*詳細を見る/ }),
    ).toBeTruthy();
    change("対象月", "2026-10");
    expect(screen.getByText("0件")).toBeTruthy();
    change("事業所", "office-2");
    expect(screen.getByText("1件")).toBeTruthy();
  });
  it.each([
    "日付",
    "車両",
    "運転手",
    "確認者",
    "出勤時 酒気帯び",
    "退勤時 酒気帯び",
    "出勤時 体温（℃）",
    "指示事項",
  ])(
    "rejects a missing required alcohol field in both registration and editing: %s",
    (missing) => {
      for (const mode of ["create", "edit"]) {
        const onSave = vi.fn();
        render(
          <AlcoholChecks
            records={alcoholSeed}
            vehicles={vehicleSeed}
            staff={staffSeed}
            offices={officeSeed}
            onSave={onSave}
          />,
        );
        if (mode === "edit") {
          fireEvent.click(
            screen.getByRole("button", { name: /職員A.*詳細を見る/ }),
          );
          click("編集");
        } else click("チェックを登録");
        const dialog = screen.getByRole("dialog");
        const modal = within(dialog);
        for (const [label, value] of [
          ["日付", "2026-10-01"],
          ["車両", "vehicle-1-1"],
          ["運転手", "staff-1"],
          ["確認者", "staff-2"],
          ["出勤時 酒気帯び", "no"],
          ["退勤時 酒気帯び", "no"],
          ["出勤時 体温（℃）", "36.5"],
          ["指示事項", "allowed"],
        ]) {
          fireEvent.change(modal.getByLabelText(label), {
            target: { value: label === missing ? "" : value },
          });
        }
        // Submit directly too: the handler must guard against bypassing native required validation.
        fireEvent.submit(dialog.querySelector("form")!);
        expect(onSave).not.toHaveBeenCalled();
        expect(modal.getByRole("alert")).toBeTruthy();
        cleanup();
      }
    },
  );
  it("saves weekly hours and dated leave, rendering hatch ranges in both modes without blocking a visit", () => {
    login();
    click("設定");
    click("職員管理 70名の登録職員");
    fireEvent.change(
      screen.getByPlaceholderText("氏名・メールアドレスで検索"),
      { target: { value: "staff1@example.test" } },
    );
    click("勤務設定");
    change("木の開始時刻", "09:00");
    change("木の終了時刻", "17:00");
    click("勤務設定を保存");
    click("予定");
    expect(
      document.querySelectorAll('[data-staff-id="staff-1"] .nonworking-range'),
    ).toHaveLength(2);
    click("全体表示");
    expect(
      document.querySelectorAll('[data-staff-id="staff-1"] .nonworking-range'),
    ).toHaveLength(2);
    click("設定");
    click("職員管理 70名の登録職員");
    fireEvent.change(
      screen.getByPlaceholderText("氏名・メールアドレスで検索"),
      { target: { value: "staff1@example.test" } },
    );
    click("勤務設定");
    change("例外日", "2026-10-01");
    change("例外区分", "off");
    click("例外を追加・更新");
    click("勤務設定を保存");
    click("予定");
    const range = document.querySelector(
      '[data-staff-id="staff-1"] .nonworking-range',
    ) as HTMLElement;
    expect(range.style.width).toBe("1800px");
    click("10:00–10:30 A様 定期訪問 繰り返し");
    click("編集");
    change("内容", "休日でも登録可能");
    click("保存する");
    expect(
      screen.getByRole("button", { name: /10:00–10:30 A様/ }),
    ).toBeTruthy();
  });
  it("uses two-finger pinch once per gesture while buttons, taps, single-finger movement and long press still work", () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const onChange = vi.fn();
    render(
      <Schedule
        clients={[]}
        workPatterns={workPatternSeed}
        items={occurrencesOn(visitSeed, "2026-10-01")}
        staff={staffSeed}
        offices={officeSeed}
        officeId="office-1"
        setOfficeId={vi.fn()}
        date="2026-10-01"
        setDate={vi.fn()}
        onOpen={onOpen}
        onChange={onChange}
        onAdd={vi.fn()}
      />,
    );
    const region = screen.getByRole("region");
    const touches = (distance: number) => [
      { clientX: 0, clientY: 0, target: region },
      { clientX: distance, clientY: 0, target: region },
    ];
    const overview = () =>
      screen
        .getByRole("button", { name: "全体表示", exact: true })
        .getAttribute("aria-pressed");
    const mixed = touches(100).map((t, i) =>
      i ? { ...t, target: document.body } : t,
    );
    fireEvent.touchStart(region, { touches: mixed });
    expect(
      fireEvent.touchMove(region, { touches: mixed, cancelable: true }),
    ).toBe(true);
    expect(overview()).toBe("false");
    fireEvent.touchEnd(region, { touches: [] });
    fireEvent.touchStart(region, { touches: touches(100) });
    fireEvent.touchMove(region, { touches: touches(95), cancelable: true });
    expect(overview()).toBe("false");
    fireEvent.touchMove(region, { touches: touches(80), cancelable: true });
    expect(overview()).toBe("true");
    fireEvent.touchMove(region, { touches: touches(150), cancelable: true });
    expect(overview()).toBe("true");
    fireEvent.touchEnd(region, { touches: [] });
    fireEvent.touchStart(region, { touches: touches(100) });
    fireEvent.touchMove(region, { touches: touches(120), cancelable: true });
    expect(overview()).toBe("false");
    fireEvent.touchEnd(region, { touches: [] });
    const card = screen.getByRole("button", {
      name: "10:00–10:30 A様 定期訪問 繰り返し",
    });
    fireEvent.pointerDown(card, { button: 0, clientX: 150, clientY: 30 });
    fireEvent.touchStart(region, { touches: [{ clientX: 150, clientY: 30 }] });
    fireEvent.touchMove(region, { touches: [{ clientX: 200, clientY: 30 }] });
    expect(overview()).toBe("false");
    fireEvent.pointerMove(card, { clientX: 200, clientY: 30 });
    act(() => vi.advanceTimersByTime(700));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.touchEnd(region, { touches: [] });
    fireEvent.pointerDown(card, { button: 0, clientX: 150, clientY: 30 });
    fireEvent.touchStart(region, { touches: touches(100) });
    fireEvent.touchMove(region, { touches: touches(80) });
    fireEvent.touchEnd(region, { touches: [] });
    act(() => vi.advanceTimersByTime(700));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(card);
    expect(onOpen).not.toHaveBeenCalled();
    click("詳細表示");
    fireEvent.pointerDown(card, { button: 0, clientX: 150, clientY: 30 });
    act(() => vi.advanceTimersByTime(600));
    expect(onChange).toHaveBeenCalledOnce();
    fireEvent.pointerUp(card);
    fireEvent.pointerDown(card, { button: 0 });
    fireEvent.pointerUp(card);
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("shows demo travel totals and map workload reference without judging distance", () => {
    login();
    click("設定");
    click("移動集計 月別・職員別の予定ルート推定");
    expect(screen.getByText("月間累積移動距離")).toBeTruthy();
    expect(screen.getByText("自家用車の距離")).toBeTruthy();
    expect(screen.getByText("社用車の距離")).toBeTruthy();
    change("事業所", "office-2");
    change("職員", "staff-12");
    change("対象月", "2026-11");
    expect(screen.getByText("移動予定日数")).toBeTruthy();
    click("訪問先");
    expect(screen.getByText("本日の予定移動時間")).toBeTruthy();
    expect(screen.getByText(/移動時間の目安（参考）/)).toBeTruthy();
    expect(screen.getByText(/距離の平均比/)).toBeTruthy();
  });
});
describe("prototype interactions", () => {
  it("manages client identity, stops selection but retains schedules and document links", () => {
    login();
    click("設定");
    click("利用者管理 利用者マスタ・基本情報・月間予定");
    change("利用者名検索", "client-1-1");
    fireEvent.click(screen.getByRole("button", { name: /A様 · 利用中/ }));
    click("報告書 / 計画書");
    expect(
      screen.getByRole("checkbox", { name: "A様 報告書 完了" }),
    ).toBeTruthy();
    click("設定");
    click("利用者管理 利用者マスタ・基本情報・月間予定");
    change("利用者名検索", "client-1-1");
    fireEvent.click(screen.getByRole("button", { name: /A様 · 利用中/ }));
    click("利用者を編集");
    change("氏名", "改名テスト");
    click("利用者を保存");
    click("利用を停止");
    click("確定する");
    expect(screen.getByText("利用停止", { exact: true })).toBeTruthy();
    click("月間予定");
    expect(screen.getByRole("heading", { name: "改名テスト" })).toBeTruthy();
    click("予定");
    click("10:00–10:30 改名テスト 定期訪問 繰り返し");
    click("編集");
    expect((screen.getByLabelText("訪問先") as HTMLInputElement).readOnly).toBe(
      true,
    );
    change("内容", "停止後の既存予定も編集可能");
    click("保存する");
    click("予定を追加");
    change("利用者を検索", "client-1-1");
    expect(screen.getByText("該当する利用中の利用者はいません。")).toBeTruthy();
  });
  it("opens a linked customer month with multiple services and a cancelled occurrence", () => {
    login();
    click("予定");
    click("10:00–10:30 A様 定期訪問 繰り返し");
    click("A様 月間スケジュールを見る →");
    click("2026-10-02 3件");
    expect(screen.getByText("● 13:00", { exact: false })).toBeTruthy();
    const selected = screen.getByRole("button", { name: "2026-10-02 3件" });
    expect(within(selected).getByText("モニタリング")).toBeTruthy();
    expect(within(selected).getByText("キャンセル")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /16:00.*A様.*キャンセル/ }),
    );
    expect(screen.getByText("キャンセル済み")).toBeTruthy();
  });
  it("completes only today's memo and preserves recurring memo on next scheduled day", () => {
    login();
    click("予定");
    click("A様の未完了メモを見る");
    click("メモ完了");
    expect(screen.queryByRole("button", { name: "メモ完了" })).toBeNull();
    click("予定");
    expect(
      screen.queryByRole("button", { name: "A様の未完了メモを見る" }),
    ).toBeNull();
    fireEvent.input(screen.getByLabelText("表示日"), {
      target: { value: "2026-10-05" },
    });
    expect(
      screen.getByRole("button", { name: "A様の未完了メモを見る" }),
    ).toBeTruthy();
    click("全体表示");
    expect(
      screen
        .getByRole("button", { name: "全体表示", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(document.querySelector(".timeline-scroll.overview")).toBeTruthy();
    expect(
      parseFloat(
        (document.querySelector(".timeline-table") as HTMLElement).style.width,
      ),
    ).toBeLessThan(400);
    expect(document.querySelector(".compact-memo")).toBeTruthy();
    click("詳細表示");
    expect(document.querySelector(".timeline-scroll.overview")).toBeNull();
    expect(
      parseFloat(
        (document.querySelector(".timeline-table") as HTMLElement).style.width,
      ),
    ).toBeGreaterThan(1800);
    expect(screen.queryByLabelText("表示倍率")).toBeNull();
  });
  it("persists document checks by customer, month and logged-in staff without advancing plan month", () => {
    login();
    click("書類管理");
    fireEvent.click(screen.getByRole("checkbox", { name: "A様 報告書 完了" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "A様 計画書 完了" }));
    click("ホーム");
    click("書類管理");
    expect(
      (
        screen.getByRole("checkbox", {
          name: "A様 報告書 完了",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    fireEvent.input(screen.getByLabelText("報告書の対象月"), {
      target: { value: "2026-11" },
    });
    expect(
      (
        screen.getByRole("checkbox", {
          name: "A様 報告書 完了",
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect(
      (
        screen.getByRole("checkbox", {
          name: "A様 計画書 完了",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(localStorage.getItem("visit-documents:staff-1")).toContain(
      "2026-12",
    );
    expect(localStorage.getItem("visit-documents:staff-2")).toBeNull();
  });
  it("saves, edits and deletes a private free note and registers an internal request", () => {
    login();
    click("フリーメモ");
    change("メモ内容", "確認用メモ");
    click("メモを保存");
    click("ホーム");
    click("フリーメモ");
    expect(screen.getByText("確認用メモ")).toBeTruthy();
    click("編集");
    change("メモ内容", "確認完了");
    click("変更を保存");
    click("メモを削除");
    click("削除する");
    expect(screen.queryByText("確認完了")).toBeNull();
    click("ホーム");
    click("新規依頼");
    click("新規依頼をする");
    registerClient("架空のお客様");
    change("依頼元", "新宿事業所");
    change("簡単な利用者情報", "日程相談");
    change("フリー記載欄", "担当者の調整をお願いします");
    click("依頼を登録");
    expect(screen.getByText("架空のお客様")).toBeTruthy();
    expect(screen.getByText("担当者の調整をお願いします")).toBeTruthy();
  });
  it("saves and edits a customer telephone number and exposes a normalized tel link", () => {
    login();
    click("予定");
    click("予定を追加");
    registerClient("電話テスト", "000-0000-0001");
    click("保存する");
    click("10:00–10:30 電話テスト 定期訪問");
    expect(
      screen.getByRole("link", { name: "電話をかける" }).getAttribute("href"),
    ).toBe("tel:00000000001");
    click("設定");
    click("利用者管理 利用者マスタ・基本情報・月間予定");
    change("利用者名検索", "電話テスト");
    fireEvent.click(
      screen.getByRole("button", { name: /電話テスト · 利用中/ }),
    );
    click("利用者を編集");
    change("電話番号", "000-0000-0002");
    click("利用者を保存");
    click("予定");
    click("10:00–10:30 電話テスト 定期訪問");
    expect(
      screen.getByRole("link", { name: "電話をかける" }).getAttribute("href"),
    ).toBe("tel:00000000002");
    click("予定をキャンセル");
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "戻る" }),
    );
    expect(screen.queryByText("キャンセル済み")).toBeNull();
    click("予定をキャンセル");
    click("この予定のみキャンセル");
    click("10:00–10:30 電話テスト 定期訪問 キャンセル");
    expect(screen.getByText("キャンセル済み")).toBeTruthy();
  });
  it("cancels one recurring visit, keeps it in the timeline and excludes it from own route", () => {
    login();
    click("予定");
    click("10:00–10:30 A様 定期訪問 繰り返し");
    click("予定をキャンセル");
    click("この予定のみキャンセル");
    const card = screen.getByRole("button", {
      name: "10:00–10:30 A様 定期訪問 キャンセル",
    });
    expect(card.closest(".cancelled-card")).toBeTruthy();
    fireEvent.input(screen.getByLabelText("表示日"), {
      target: { value: "2026-10-05" },
    });
    expect(
      screen.getByRole("button", { name: "10:00–10:30 A様 定期訪問 繰り返し" }),
    ).toBeTruthy();
    click("訪問先");
    expect(document.querySelectorAll(".destination-pin")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "1 A様 10:00" })).toBeNull();
    click("設定");
    click("キャンセル一覧 月別・事業所別のキャンセル予定");
    expect(screen.getByText("キャンセル 5件")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /10:00.*A様.*定期訪問/ }),
    );
    expect(screen.getByText("キャンセル済み")).toBeTruthy();
  });
  it("filters management cancellations by month and office and keeps filters after detail navigation", () => {
    login();
    click("設定");
    click("キャンセル一覧 月別・事業所別のキャンセル予定");
    expect(screen.getByText("キャンセル 4件")).toBeTruthy();
    change("事業所", "office-2");
    expect(screen.getByText("キャンセル 2件")).toBeTruthy();
    fireEvent.input(screen.getByLabelText("対象月"), {
      target: { value: "2026-09" },
    });
    expect(screen.getByText("キャンセル 1件")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /サンプル9様/ }));
    expect(screen.getByText("キャンセル済み")).toBeTruthy();
    click("戻る");
    expect((screen.getByLabelText("対象月") as HTMLInputElement).value).toBe(
      "2026-09",
    );
    expect((screen.getByLabelText("事業所") as HTMLSelectElement).value).toBe(
      "office-2",
    );
    change("事業所", "office-7");
    expect(
      screen.getByText("この月・事業所のキャンセル予定はありません。"),
    ).toBeTruthy();
  });
  it.each(["詳細表示", "全体表示"])(
    "opens long-press change at 600ms and cancels on scrolling in %s",
    (mode) => {
      vi.useFakeTimers();
      const onChange = vi.fn();
      const onOpen = vi.fn();
      render(
        <Schedule
          items={occurrencesOn(visitSeed, "2026-10-01")}
          staff={staffSeed}
          offices={officeSeed}
          officeId="office-1"
          setOfficeId={vi.fn()}
          date="2026-10-01"
          setDate={vi.fn()}
          onOpen={onOpen}
          onChange={onChange}
          onAdd={vi.fn()}
        />,
      );
      click(mode);
      const card = screen.getByRole("button", {
        name: "10:00–10:30 A様 定期訪問 繰り返し",
      });
      fireEvent.pointerDown(card, { button: 0, clientX: 150, clientY: 50 });
      act(() => vi.advanceTimersByTime(599));
      expect(onChange).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(onChange).toHaveBeenCalledTimes(1);
      fireEvent.pointerUp(card);
      fireEvent.click(card);
      expect(onOpen).not.toHaveBeenCalled();
      onChange.mockClear();
      fireEvent.pointerDown(card, { button: 0, clientX: 150, clientY: 50 });
      fireEvent.pointerMove(card, { clientX: 170, clientY: 50 });
      act(() => vi.advanceTimersByTime(700));
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.pointerDown(card, { button: 0 });
      fireEvent.pointerCancel(card);
      act(() => vi.advanceTimersByTime(700));
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(card);
      expect(onOpen).toHaveBeenCalledTimes(1);
    },
  );
  it("adds office then staff and exposes them to schedule filters", () => {
    login();
    click("設定");
    click("事業所管理 7事業所");
    click("事業所を追加");
    change("事業所名", "テスト事業所");
    change("住所", "東京都・架空住所");
    change("電話番号", "03-0000-0000");
    click("登録する");
    expect(screen.getByText("テスト事業所")).toBeTruthy();
    click("設定");
    click("職員管理 70名の登録職員");
    click("職員を追加");
    change("氏名", "職員テスト");
    change("メールアドレス", "test@example.test");
    const added = [
      ...(screen.getByLabelText("所属事業所") as HTMLSelectElement).options,
    ].find((o) => o.text === "テスト事業所")!;
    change("所属事業所", added.value);
    change("権限", "管理者");
    change("利用状態", "off");
    click("登録する");
    expect(screen.getByText("職員テスト")).toBeTruthy();
    expect(screen.getByText("管理者 · 利用無効")).toBeTruthy();
    click("予定");
    change("事業所", added.value);
    expect(screen.getByText("職員テスト")).toBeTruthy();
  });
  it("supports creation, free content, recurrence, one-day modification and deletion", () => {
    login();
    click("予定");
    click("予定を追加");
    fireEvent.input(screen.getByLabelText("日付"), {
      target: { value: "2026-09-30" },
    });
    registerClient("テスト訪問");
    change("内容", "自由な内容");
    change("予定種別", "契約");
    change("繰り返し", "weekly");
    fireEvent.click(screen.getByRole("checkbox", { name: "木", exact: true }));
    click("保存する");
    click("10:00–10:30 テスト訪問 契約 繰り返し");
    expect(screen.getByText("自由な内容")).toBeTruthy();
    click("担当・時間を変更");
    change("担当職員", "staff-2");
    fireEvent.input(screen.getByLabelText("開始時刻"), {
      target: { value: "11:00" },
    });
    fireEvent.input(screen.getByLabelText("終了時刻"), {
      target: { value: "11:30" },
    });
    click("変更内容を確認");
    click("変更を確定");
    expect(
      screen.getByRole("button", {
        name: "11:00–11:30 テスト訪問 契約 この日の変更",
      }),
    ).toBeTruthy();
    click("翌日");
    click("10:00–10:30 テスト訪問 契約 繰り返し");
    click("削除");
    click("この予定を削除");
    expect(
      screen.queryByRole("button", { name: /テスト訪問 契約/ }),
    ).toBeNull();
    click("前日");
    expect(
      screen.getByRole("button", {
        name: "11:00–11:30 テスト訪問 契約 この日の変更",
      }),
    ).toBeTruthy();
  });
  it("changes future schedule type and time without changing earlier dates", () => {
    login();
    click("予定");
    fireEvent.input(screen.getByLabelText("表示日"), {
      target: { value: "2026-09-30" },
    });
    click("10:00–10:30 A様 定期訪問 繰り返し");
    click("編集");
    fireEvent.click(screen.getByRole("radio", { name: "今後の予定も変更" }));
    change("予定種別", "緊急訪問");
    fireEvent.input(screen.getByLabelText("開始時刻"), {
      target: { value: "12:00" },
    });
    fireEvent.input(screen.getByLabelText("終了時刻"), {
      target: { value: "12:30" },
    });
    click("保存する");
    click("翌日");
    expect(
      screen.getByRole("button", { name: "12:00–12:30 A様 緊急訪問 繰り返し" }),
    ).toBeTruthy();
    fireEvent.input(screen.getByLabelText("表示日"), {
      target: { value: "2026-09-28" },
    });
    expect(
      screen.getByRole("button", { name: "10:00–10:30 A様 定期訪問 繰り返し" }),
    ).toBeTruthy();
  });
  it("separates own stops from colleague locations and selects both kinds of pins", () => {
    login();
    click("訪問先");
    expect(document.querySelectorAll(".colleague-pin")).toHaveLength(0);
    const ownPins = document.querySelectorAll(".destination-pin");
    expect(ownPins.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(ownPins[1]);
    expect(ownPins[1].getAttribute("aria-pressed")).toBe("true");
    click("ホーム");
    click("職員位置 他職員の最終取得位置");
    expect(document.querySelectorAll(".destination-pin")).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "職員Aの最終取得位置" }),
    ).toBeNull();
    click("職員Cの最終取得位置");
    expect(screen.getByRole("heading", { name: "職員C" })).toBeTruthy();
    expect(screen.getByText(/最終位置更新：/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/勤務中|移動中|訪問中/);
  });
  it("applies all themes and preserves choice after remount; notifications still open details", () => {
    login();
    click("設定");
    click("テーマ 白熊");
    for (const [name, id] of [
      ["アニマル", "animals"],
      ["宇宙", "space"],
      ["南国", "tropical"],
      ["花・海・空", "flowers"],
      ["白熊", "polar"],
    ]) {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${name}`) }),
      );
      expect(document.querySelector(".shell")?.getAttribute("data-theme")).toBe(
        id,
      );
    }
    fireEvent.click(screen.getByRole("button", { name: /^宇宙/ }));
    expect(localStorage.getItem("visit-theme:staff-1")).toBe("space");
    cleanup();
    render(<App />);
    expect(document.querySelector(".shell")?.getAttribute("data-theme")).toBe(
      "space",
    );
    click("ログイン");
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "通知",
        exact: true,
      }),
    );
    const notice = screen.getByRole("button", {
      name: /予定が登録されました B様/,
    });
    fireEvent.click(notice);
    expect(screen.getByRole("heading", { name: "B様への訪問" })).toBeTruthy();
    click("設定");
    click("ログアウト");
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "ログアウト" }));
    expect(screen.getByRole("button", { name: "ログイン" })).toBeTruthy();
  });
});
