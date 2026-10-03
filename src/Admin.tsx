import { useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { Avatar, Empty, Footer } from "./components";
import { newId, type Office, type Staff } from "./domain";
export function StaffList({
  staff,
  offices,
  onAdd,
}: {
  staff: Staff[];
  offices: Office[];
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const [office, setOffice] = useState("all");
  const members = staff.filter(
    (s) =>
      (office === "all" || office === s.officeId) &&
      `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page admin">
      <label className="selectline">
        <Building2 size={18} />
        <select
          aria-label="所属事業所で絞り込み"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
        >
          <option value="all">すべての事業所</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="search">
        <Search size={18} />
        <input
          placeholder="氏名・メールアドレスで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="list-heading">
        <span>{members.length}名</span>
        <button className="text-action" onClick={onAdd}>
          <Plus size={16} />
          職員を追加
        </button>
      </div>
      {members.map((s) => (
        <article className="admin-row" key={s.id}>
          <Avatar staff={s} />
          <div>
            <b>{s.name}</b>
            <p>{offices.find((o) => o.id === s.officeId)?.name}</p>
            <p className="wrap-anywhere">{s.email}</p>
            <small>
              {s.role} · 利用{s.active ? "有効" : "無効"}
            </small>
          </div>
        </article>
      ))}
      {!members.length && <Empty>該当する職員はいません。</Empty>}
    </div>
  );
}
export function StaffForm({
  offices,
  staff,
  onSave,
  onCancel,
}: {
  offices: Office[];
  staff: Staff[];
  onSave: (s: Staff) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    officeId: offices[0]?.id || "",
    role: "一般職員" as Staff["role"],
    active: true,
  });
  const [error, setError] = useState("");
  return (
    <form
      className="page form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim()) {
          setError("氏名を入力してください。");
          return;
        }
        if (
          staff.some(
            (s) => s.email.toLowerCase() === draft.email.trim().toLowerCase(),
          )
        ) {
          setError("このメールアドレスは登録済みです。");
          return;
        }
        onSave({
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
          id: newId(),
          color: "#397d91",
        });
      }}
    >
      <div className="formcard">
        <label>
          氏名
          <input
            required
            placeholder="例：職員サンプル"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          メールアドレス
          <input
            required
            type="email"
            autoCapitalize="none"
            placeholder="staff@example.test"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </label>
        <label>
          所属事業所
          <select
            required
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
          権限
          <select
            value={draft.role}
            onChange={(e) =>
              setDraft({ ...draft, role: e.target.value as Staff["role"] })
            }
          >
            <option>一般職員</option>
            <option>管理者</option>
          </select>
        </label>
        <label>
          利用状態
          <select
            value={draft.active ? "on" : "off"}
            onChange={(e) =>
              setDraft({ ...draft, active: e.target.value === "on" })
            }
          >
            <option value="on">有効</option>
            <option value="off">無効</option>
          </select>
        </label>
      </div>
      <p className="field-note">
        デモ内の登録です。招待メールは送信されません。再読み込みで登録データはリセットされます。
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Footer label="登録する" onCancel={onCancel} />
    </form>
  );
}
export function OfficeList({
  offices,
  staff,
  onAdd,
}: {
  offices: Office[];
  staff: Staff[];
  onAdd: () => void;
}) {
  return (
    <div className="page admin">
      <div className="list-heading">
        <span>{offices.length}事業所</span>
        <button className="text-action" onClick={onAdd}>
          <Plus size={16} />
          事業所を追加
        </button>
      </div>
      {offices.map((o) => (
        <article className="admin-row" key={o.id}>
          <Building2 />
          <div>
            <b>{o.name}</b>
            <p>{o.address}</p>
            <p>{o.phone}</p>
            <small>
              所属職員 {staff.filter((s) => s.officeId === o.id).length}名
            </small>
          </div>
        </article>
      ))}
    </div>
  );
}
export function OfficeForm({
  offices,
  onSave,
  onCancel,
}: {
  offices: Office[];
  onSave: (o: Office) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ name: "", address: "", phone: "" });
  const [error, setError] = useState("");
  return (
    <form
      className="page form"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          !draft.name.trim() ||
          !draft.address.trim() ||
          !draft.phone.trim()
        ) {
          setError("すべての項目を入力してください。");
          return;
        }
        if (offices.some((o) => o.name === draft.name.trim())) {
          setError("この事業所名は登録済みです。");
          return;
        }
        onSave({
          id: newId(),
          name: draft.name.trim(),
          address: draft.address.trim(),
          phone: draft.phone.trim(),
        });
      }}
    >
      <div className="formcard">
        <label>
          事業所名
          <input
            required
            placeholder="例：中野事業所"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          住所
          <input
            required
            placeholder="東京都中野区・サンプル住所"
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
        </label>
        <label>
          電話番号
          <input
            required
            type="tel"
            placeholder="03-0000-0000"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </label>
      </div>
      <p className="field-note">
        デモ内の登録です。再読み込みで登録データはリセットされます。
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Footer label="登録する" onCancel={onCancel} />
    </form>
  );
}
