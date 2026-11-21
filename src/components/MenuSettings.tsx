import { useState } from "react";
import {
  hideable,
  useHiddenMenus,
  saveHiddenMenus,
} from "../data/menuVisibility";

export default function MenuSettings() {
  const hidden = useHiddenMenus();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(hidden);
  const [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>القوائم الظاهرة</h2>
      <button
        type="button"
        className="tl-button"
        aria-expanded={open}
        onClick={() => {
          setDraft([...hidden]);
          setMessage("");
          setOpen(!open);
        }}
      >
        التحكم بإظهار وإخفاء القوائم
      </button>
      {open && (
        <div>
          {hideable.map((name) => (
            <label key={name} style={{ display: "flex", gap: 12, padding: 12 }}>
              <input
                type="checkbox"
                checked={!draft.includes(name)}
                onChange={(event) => {
                  setDraft((current) =>
                    event.target.checked
                      ? current.filter((value) => value !== name)
                      : [...current, name],
                  );
                  setMessage("");
                }}
              />
              <span>{name}</span>
            </label>
          ))}
          <button
            type="button"
            className="tl-button primary"
            onClick={() => {
              setMessage(
                saveHiddenMenus(draft)
                  ? "تم حفظ التغييرات."
                  : "تعذر حفظ إعدادات العرض.",
              );
            }}
          >
            حفظ التغييرات
          </button>
          <p>إعداد عرض على هذا الجهاز.</p>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
