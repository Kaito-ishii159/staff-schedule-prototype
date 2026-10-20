import { weekdayLabels } from "./domain";
import type { StaffWorkPattern } from "./operations";

// Shared by staff registration/editing and the existing work-settings screen.
export function WorkPatternFields({
  patterns,
  onChange,
}: {
  patterns: StaffWorkPattern[];
  onChange: (patterns: StaffWorkPattern[]) => void;
}) {
  return (
    <>
      {patterns.map((p, i) => {
        const update = (change: Partial<StaffWorkPattern>) =>
          onChange(
            patterns.map((item, n) =>
              n === i ? { ...item, ...change } : item,
            ),
          );
        return (
          <div className="work-day" key={p.weekday}>
            <label>
              {weekdayLabels[p.weekday]}
              <select
                aria-label={`${weekdayLabels[p.weekday]}の勤務`}
                value={p.working ? "on" : "off"}
                onChange={(e) => update({ working: e.target.value === "on" })}
              >
                <option value="on">勤務</option>
                <option value="off">休み</option>
              </select>
            </label>
            {p.working && (
              <div className="time-pair">
                <label>
                  開始
                  <input
                    type="time"
                    required
                    aria-label={`${weekdayLabels[p.weekday]}の開始時刻`}
                    value={p.startTime}
                    onChange={(e) => update({ startTime: e.target.value })}
                  />
                </label>
                <label>
                  終了
                  <input
                    type="time"
                    required
                    aria-label={`${weekdayLabels[p.weekday]}の終了時刻`}
                    value={p.endTime}
                    onChange={(e) => update({ endTime: e.target.value })}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
