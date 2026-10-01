import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, dateLabel, today, type Staff } from "./domain";
export function Avatar({ staff }: { staff: Staff }) {
  return (
    <span className="avatar" style={{ background: staff.color }}>
      {staff.name.replace("職員", "").slice(0, 2)}
    </span>
  );
}
export function DateControl({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="date-control">
      <button aria-label="前日" onClick={() => onChange(addDays(date, -1))}>
        <ChevronLeft />
      </button>
      <label>
        <span>{dateLabel(date)}</span>
        <input
          aria-label="表示日"
          type="date"
          value={date}
          onInput={(e) =>
            e.currentTarget.value && onChange(e.currentTarget.value)
          }
        />
      </label>
      <button aria-label="翌日" onClick={() => onChange(addDays(date, 1))}>
        <ChevronRight />
      </button>
      <button className="today" onClick={() => onChange(today)}>
        今日
      </button>
    </div>
  );
}
export function Menu({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button className="menu" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <p>{sub}</p>
      </div>
      <ChevronRight />
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dialog-sheet"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-heading">
        <h2>{title}</h2>
        <button aria-label="閉じる" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Footer({
  onCancel,
  label = "保存する",
}: {
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="form-footer">
      <button type="button" className="secondary" onClick={onCancel}>
        キャンセル
      </button>
      <button type="submit" className="primary">
        {label}
      </button>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
