import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { Button } from "../../components/ui";

export default function SystemPage({ icon: Icon, title, body, children, tone = "bg-surface-3 text-ink" }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 py-16 text-center animate-rise">
      <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-[32%] ${tone}`}><Icon className="h-9 w-9" aria-hidden /></div>
      <h1 className="text-2xl sm:text-3xl">{title}</h1><p className="mt-2 text-ink-2">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{children}<Button href="tel:112" variant="danger" icon={Phone}>112</Button></div>
    </div>
  );
}
