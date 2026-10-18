import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal, Empty } from "./components";
import {
  newId,
  telephoneHref,
  type Client,
  type Office,
  type Staff,
} from "./domain";

export function ClientEditor({
  existing,
  offices,
  staff,
  onSave,
  onCancel,
}: {
  existing?: Client;
  offices: Office[];
  staff: Staff[];
  onSave: (client: Client) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Client>(
    () =>
      existing || {
        id: newId(),
        name: "",
        kana: "",
        phone: "",
        address: "",
        officeId: offices[0].id,
        ownerId: staff[0].id,
        active: true,
        nextDueMonth: "",
      },
  );
  return (
    <form
      className="request-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draft.name.trim() || !draft.kana.trim()) return;
        onSave({ ...draft, name: draft.name.trim(), kana: draft.kana.trim() });
      }}
    >
      <p className="field-note">利用者ID：{draft.id}（自動採番・変更不可）</p>
      {(
        [
          ["name", "氏名"],
          ["kana", "フリガナ"],
          ["phone", "電話番号"],
          ["address", "住所"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            required={key === "name" || key === "kana"}
            type={key === "phone" ? "tel" : "text"}
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
        </label>
      ))}
      <label>
        所属事業所
        <select
          value={draft.officeId}
          onChange={(e) => setDraft({ ...draft, officeId: e.target.value })}
        >
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        担当職員
        <select
          value={draft.ownerId}
          onChange={(e) => setDraft({ ...draft, ownerId: e.target.value })}
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        計画書の次回更新月（任意）
        <input
          type="month"
          value={draft.nextDueMonth}
          onChange={(e) => setDraft({ ...draft, nextDueMonth: e.target.value })}
        />
      </label>
      <p className="field-note">
        架空の情報のみ入力してください。変更はこのデモの画面内に反映され、再読み込みで初期化されます。
      </p>
      <button className="primary full">利用者を保存</button>
      <button type="button" className="secondary full" onClick={onCancel}>
        戻る
      </button>
    </form>
  );
}

export function ClientPicker({
  clients,
  offices,
  staff,
  value,
  onSelect,
  onSave,
}: {
  clients: Client[];
  offices: Office[];
  staff: Staff[];
  value?: string;
  onSelect: (client: Client) => void;
  onSave: (client: Client) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const selected = clients.find((c) => c.id === value);
  const matches = clients.filter(
    (c) =>
      c.active &&
      `${c.name} ${c.kana} ${c.id}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div className="client-picker">
      <label>
        利用者を検索
        <input
          type="search"
          placeholder="氏名・フリガナ・利用者ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {selected && (
        <div className="client-selected">
          <b>
            選択中：{selected.name}
            {!selected.active && "（利用停止）"}
          </b>
          <small>{selected.id}</small>
          <small>
            {selected.address || "住所未登録"} /{" "}
            {selected.phone || "電話未登録"}
          </small>
        </div>
      )}
      <div
        className="client-options"
        role="group"
        aria-label="登録済み利用者の候補"
      >
        {matches.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={value === c.id}
            onClick={() => onSelect(c)}
          >
            <b>{c.name}</b>
            <small>
              {c.kana} · {offices.find((o) => o.id === c.officeId)?.name}
            </small>
            <small>{c.id}</small>
          </button>
        ))}
      </div>
      {!matches.length && <p>該当する利用中の利用者はいません。</p>}
      <button
        type="button"
        className="text-action"
        onClick={() => setAdding(true)}
      >
        ＋ 新しい利用者を登録
      </button>
      {adding &&
        createPortal(
          <Modal title="新しい利用者を登録" onClose={() => setAdding(false)}>
            <ClientEditor
              offices={offices}
              staff={staff}
              onCancel={() => setAdding(false)}
              onSave={(c) => {
                onSave(c);
                onSelect(c);
                setAdding(false);
              }}
            />
          </Modal>,
          document.body,
        )}
    </div>
  );
}

export function ClientManagement({
  onDelete,
  clients,
  offices,
  staff,
  onSave,
  onCalendar,
  onDocuments,
}: {
  onDelete: (c: Client) => void;
  clients: Client[];
  offices: Office[];
  staff: Staff[];
  onSave: (c: Client) => void;
  onCalendar: (c: Client) => void;
  onDocuments: (c: Client) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [editor, setEditor] = useState<Client | "new">();
  const [stopping, setStopping] = useState(false);
  const selected = clients.find((c) => c.id === selectedId);
  const matches = clients.filter((c) =>
    `${c.name} ${c.kana} ${c.id}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div className="page">
      <h1>{selected ? "利用者詳細" : "利用者管理"}</h1>
      {selected ? (
        <>
          <button
            className="text-action"
            onClick={() => setSelectedId(undefined)}
          >
            利用者一覧へ
          </button>
          <article className="document-card">
            <h2>{selected.name}</h2>
            <p>{selected.kana}</p>
            <p className="client-id">利用者ID：{selected.id}</p>
            <p>{selected.active ? "利用中" : "利用停止"}</p>
            <p>
              所属事業所：
              {offices.find((o) => o.id === selected.officeId)?.name}
            </p>
            <p>住所：{selected.address || "未登録"}</p>
            <p>電話番号：{selected.phone || "未登録"}</p>
            {telephoneHref(selected.phone) && (
              <a
                className="secondary full"
                href={telephoneHref(selected.phone)}
              >
                電話をかける
              </a>
            )}
          </article>
          <div className="client-actions">
            <button className="primary" onClick={() => onCalendar(selected)}>
              月間予定
            </button>
            <button className="secondary" onClick={() => onDocuments(selected)}>
              報告書 / 計画書
            </button>
            <button className="secondary" onClick={() => setEditor(selected)}>
              利用者を編集
            </button>
            <button className="secondary" onClick={() => setStopping(true)}>
              {selected.active ? "利用を停止" : "利用を再開"}
            </button>
            <button
              className="secondary danger"
              onClick={() => onDelete(selected)}
            >
              利用者を削除
            </button>
          </div>
          <p className="field-note">
            利用停止しても既存の予定・メモ・キャンセル履歴・書類チェックは残ります。新しい予定の候補には表示しません。
          </p>
        </>
      ) : (
        <>
          <button className="primary full" onClick={() => setEditor("new")}>
            ＋ 新しい利用者を登録
          </button>
          <label className="search">
            <input
              aria-label="利用者名検索"
              placeholder="氏名・フリガナ・IDで検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {matches.map((c) => (
            <button
              key={c.id}
              className="client-list-item"
              onClick={() => setSelectedId(c.id)}
            >
              <b>
                {c.name} · {c.active ? "利用中" : "利用停止"}
              </b>
              <small>
                {c.kana} · {offices.find((o) => o.id === c.officeId)?.name}
              </small>
              <small>{c.id}</small>
            </button>
          ))}
          {!matches.length && <Empty>該当する利用者はいません。</Empty>}
        </>
      )}
      {editor && (
        <Modal
          title={editor === "new" ? "新しい利用者を登録" : "利用者を編集"}
          onClose={() => setEditor(undefined)}
        >
          <ClientEditor
            existing={editor === "new" ? undefined : editor}
            offices={offices}
            staff={staff}
            onCancel={() => setEditor(undefined)}
            onSave={(c) => {
              onSave(c);
              setSelectedId(c.id);
              setEditor(undefined);
            }}
          />
        </Modal>
      )}
      {stopping && selected && (
        <Modal
          title={
            selected.active
              ? "この利用者の利用を停止しますか？"
              : "この利用者の利用を再開しますか？"
          }
          onClose={() => setStopping(false)}
        >
          <p>既存の予定や履歴は削除しません。</p>
          <button
            className="primary full"
            onClick={() => {
              onSave({ ...selected, active: !selected.active });
              setStopping(false);
            }}
          >
            確定する
          </button>
        </Modal>
      )}
    </div>
  );
}
