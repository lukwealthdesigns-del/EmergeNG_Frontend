import { useCallback, useState } from "react";
import { validate as run } from "../lib/validators";

/** Tiny form helper: values, per-field i18n-key errors, touched-on-blur validation, and server-side field errors. */
export function useForm(initial, rules = {}) {
  const [values, setValues] = useState(initial); const [errors, setErrors] = useState({}); const [touched, setTouched] = useState({});
  const set = useCallback((k, v) => { setValues((x) => ({ ...x, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)); }, []);
  const bind = (k, { transform } = {}) => ({ name: k, value: values[k] ?? "", onChange: (e) => set(k, transform ? transform(e.target.value) : e.target.value), onBlur: () => { setTouched((t) => ({ ...t, [k]: true })); if (rules[k]) { const err = run(values, { [k]: rules[k] })[k]; setErrors((e) => ({ ...e, [k]: err })); } } });
  const check = useCallback(() => { const e = run(values, rules); setErrors(e); setTouched(Object.fromEntries(Object.keys(rules).map((k) => [k, true]))); return Object.keys(e).length === 0; }, [values, rules]);
  const setServerErrors = (fe) => setErrors((e) => ({ ...e, ...fe }));
  return { values, errors, touched, set, bind, check, setErrors: setServerErrors, setValues };
}
