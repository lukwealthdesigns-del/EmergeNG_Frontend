import { Card } from "../../components/ui";
export default function AuthFrame({ title, sub, children, footer }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-8 sm:py-14 animate-rise">
      <h1 className="text-center text-3xl">{title}</h1>{sub && <p className="mt-2 text-center text-ink-2">{sub}</p>}
      <Card className="mt-6">{children}</Card>
      {footer && <div className="mt-5 text-center text-sm text-ink-2">{footer}</div>}
    </div>
  );
}
