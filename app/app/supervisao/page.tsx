import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { traduzir } from "@/lib/i18n/dicionario";
import { Supervisao360Client } from "./_components/Supervisao360Client";
import { createClient } from "@/lib/supabase/server";

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
  const db = await createClient();
  const [agents, channels, pipelines] = await Promise.all([
    db
      .from("ai_agents")
      .select("id,name")
      .eq("organization_id", activeOrg.orgId)
      .is("archived_at", null)
      .order("name")
      .limit(500),
    db
      .from("channel_sessions")
      .select("id,display_name")
      .eq("organization_id", activeOrg.orgId)
      .limit(500),
    db
      .from("crm_pipelines")
      .select("id,name")
      .eq("organization_id", activeOrg.orgId)
      .eq("is_archived", false)
      .order("name")
      .limit(500),
  ]);
  const options = {
    agents: agents.data ?? [],
    pipelines: pipelines.data ?? [],
    channels: (channels.data ?? []).map((c) => ({
      id: c.id,
      name: c.display_name || t("Canal sem nome"),
    })),
    unavailable: Boolean(
      agents.error ||
      channels.error ||
      pipelines.error ||
      agents.data?.length === 500 ||
      channels.data?.length === 500 ||
      pipelines.data?.length === 500,
    ),
  };
  return (
    <div className="min-w-0 space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Supervisão 360")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Operação humana e IA em uma visão única, com dados que apontam para a fonte.")}
        </p>
      </header>
      <Supervisao360Client orgId={activeOrg.orgId} options={options} />
    </div>
  );
}
