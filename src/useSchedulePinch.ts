import { useEffect, useRef, type RefObject } from "react";
import { pinchMode, type ScheduleMode } from "./operations";

export function useSchedulePinch(
  container: RefObject<HTMLDivElement | null>,
  onMode: (mode: ScheduleMode) => void,
) {
  const gesture = useRef({ active: false, version: 0 });
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let start = 0;
    let switched = false;
    let hadTwo = false;
    const inside = (e: TouchEvent) =>
      Array.from(e.touches).filter(
        (t) => t.target instanceof Node && el.contains(t.target),
      );
    const distance = (touches: Touch[]) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    const begin = (e: TouchEvent) => {
      const touches = inside(e);
      if (touches.length >= 2 && !hadTwo) {
        hadTwo = true;
        gesture.current.active = true;
        gesture.current.version++;
        start = e.touches.length === 2 ? distance(touches) : 0;
      }
    };
    const move = (e: TouchEvent) => {
      const touches = inside(e);
      if (touches.length < 2) return;
      if (e.cancelable) e.preventDefault();
      const mode = pinchMode(
        start,
        distance(touches),
        e.touches.length,
        switched,
      );
      if (mode) {
        switched = true;
        onMode(mode);
      }
    };
    const end = (e: TouchEvent) => {
      if (!e.touches.length) {
        start = 0;
        switched = false;
        hadTwo = false;
        gesture.current.active = false;
      }
    };
    el.addEventListener("touchstart", begin, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: true });
    el.addEventListener("touchcancel", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", begin);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [container, onMode]);
  return gesture;
}
