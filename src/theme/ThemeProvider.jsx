import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ls } from "../lib/utils";

const ThemeCtx = createContext({ mode: "light", resolved: "light", setMode: () => {} });
const KEY = "emergeng.theme";
const mq = () => (typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null);

function resolve(mode) {
  if (mode === "system") return mq()?.matches ? "dark" : "light";
  return mode === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => (["light", "dark", "system"].includes(ls.get(KEY)) ? ls.get(KEY) : "light")); // light is the default
  const [resolved, setResolved] = useState(() => resolve(mode));

  useEffect(() => {
    const apply = () => {
      const r = resolve(mode);
      setResolved(r);
      document.documentElement.dataset.theme = r;
    };
    apply();
    const m = mq();
    if (mode === "system" && m) { m.addEventListener("change", apply); return () => m.removeEventListener("change", apply); }
  }, [mode]);

  const setMode = useCallback((m) => { ls.set(KEY, m); setModeState(m); }, []);
  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
