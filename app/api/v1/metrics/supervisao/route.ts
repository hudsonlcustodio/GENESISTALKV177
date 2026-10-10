import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { supervisionQuery } from "@/lib/metrics/supervisao";
import { orgTemAutomatico } from "@/lib/ai/agents/org-tem-automatico";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const authz = await requireRole("manager", {
    resource: "supervisao",
    allowPlatformAdmin: "leitura",
  });
  if (!authz.ok) return authz.response;
  const parsed = supervisionQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success)
    return fail("validation_failed", "Filtros inválidos; período máximo de 90 dias.", 422);
  const q = parsed.data;
  const db = await createClient();
  const automatico = await orgTemAutomatico(db, authz.org.orgId);
  if (automatico === undefined)
    return fail("read_failed", "Não foi possível verificar o atendimento automático.", 503);
  const { data, error } = await db.rpc("fn_genesis_supervisao", {
    p_org: authz.org.orgId,
    p_from: q.from,
    p_to: q.to,
    p_owner: q.owner,
    p_agent: q.agent,
    p_channel: q.channel,
    p_pipeline: q.pipeline,
    p_wait_minutes: q.wait_minutes,
    p_cold_days: q.cold_days,
    p_kind: q.kind,
    p_offset: q.offset,
    p_automatico: automatico,
  });
  if (error)
    return fail("read_failed", "Não foi possível carregar a supervisão. Tente novamente.", 503);
  return ok(data);
}
