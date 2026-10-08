import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { traduzir } from "@/lib/i18n/dicionario";
import { Supervisao360Client } from "./_components/Supervisao360Client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supervisão 360" };

export default async function Supervisao360Page() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (!(user.is_platform_admin && !user.support) && ROLE_RANK[activeOrg.role] < ROLE_RANK.manager) {
    redirect("/403");
  }
  const t = (texto: string) => traduzir(texto, user.idioma);
  return (
    <div className="min-w-0 space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Supervisão 360")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Operação humana e IA em uma visão única, com dados que apontam para a fonte.")}
        </p>
      </header>
      <Supervisao360Client orgId={activeOrg.orgId} />
    </div>
  );
}
