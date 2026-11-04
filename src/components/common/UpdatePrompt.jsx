import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { applyUpdate } from "../../app/registerSW";
export default function UpdatePrompt() {
  const { t } = useI18n(); const [reg, setReg] = useState(null);
  useEffect(() => { const f = (e) => setReg(e.detail); window.addEventListener("emergeng:update-ready", f); return () => window.removeEventListener("emergeng:update-ready", f); }, []);
  if (!reg) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-[85] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 pl-4 text-sm shadow-float md:bottom-6">
      <span>{t("sys.update")}</span><button onClick={() => applyUpdate(reg)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">{t("sys.update_btn")}</button>
    </div>
  );
}
