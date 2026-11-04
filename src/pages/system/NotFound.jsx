import { SearchX } from "lucide-react"; import SystemPage from "./SystemPage"; import { Button } from "../../components/ui"; import { useI18n } from "../../i18n";
export default function NotFound() { const { t } = useI18n(); return <SystemPage icon={SearchX} title={t("sys.404.title")} body={t("sys.404.body")}><Button to="/">{t("sys.home")}</Button></SystemPage>; }
