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
