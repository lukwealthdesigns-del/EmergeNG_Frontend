export const fmtN = (n) => (n == null ? "—" : new Intl.NumberFormat("en-NG").format(n));
export const toSeries = (obj, label = (k) => k) => Object.entries(obj || {}).map(([k, v]) => ({ key: k, name: label(k), value: v })).sort((a, b) => b.value - a.value);
