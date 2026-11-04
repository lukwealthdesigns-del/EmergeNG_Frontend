import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/** Isolates render failures. The fallback never hides the 112 call link: emergency tools must survive a crashed screen. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { if (import.meta.env?.DEV) console.error(error); }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    const t = this.props.t || ((k) => ({ "err.boundary": "This part of the page failed to load. The rest of the app still works.", "act.retry": "Try again", "sys.home": "Back to home" }[k] || k));
    return (
      <div role="alert" className="mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft"><AlertTriangle className="h-6 w-6 text-danger" /></div>
        <p className="text-ink">{t("err.boundary")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg" onClick={() => this.setState({ error: null })}>{t("act.retry")}</button>
          <a className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink" href="/">{t("sys.home")}</a>
          <a className="rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white" href="tel:112">112</a>
        </div>
      </div>
    );
  }
}
