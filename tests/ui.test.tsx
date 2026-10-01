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

// Seed dates must stay reproducible when CI runs in a later week or timezone.
vi.hoisted(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T00:50:00Z'));
});

beforeEach(() => {
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
describe("prototype interactions", () => {
  it("opens long-press change at 600ms and cancels on scrolling", () => {
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
  });
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
    change("訪問先", "テスト訪問");
    change("住所", "東京都新宿区・架空");
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
    click("職員位置他職員の最終取得位置");
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
    click("テーマ ブルー");
    for (const [name, id] of [
      ["グリーン", "green"],
      ["パープル", "purple"],
      ["オレンジ", "orange"],
      ["シンプル", "simple"],
      ["ブルー", "blue"],
    ]) {
      click(name);
      expect(document.querySelector(".shell")?.getAttribute("data-theme")).toBe(
        id,
      );
    }
    click("パープル");
    expect(localStorage.getItem("visit-theme:staff-1")).toBe("purple");
    cleanup();
    render(<App />);
    expect(document.querySelector(".shell")?.getAttribute("data-theme")).toBe(
      "purple",
    );
    click("ログイン");
    click("通知");
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
