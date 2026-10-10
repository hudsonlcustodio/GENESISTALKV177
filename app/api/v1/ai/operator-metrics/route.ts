/**
 * GET /api/v1/ai/operator-metrics — o papel que organiza o sistema, medido.
 *
 * ═══ AS TRÊS MEDIDAS QUE A SPEC 16 §7 PROMETEU ═══
 *
 * A spec escreveu: *"Métricas que passam a existir: taxa de ação por turno,
 * promessas declaradas vs quitadas, turnos em que o Operador quis agir e não
 * pôde. Se ele parar de agir, alguém vê."* Nenhuma das três existia — o desfecho
 * do papel morria num `log.info` de contêiner, e sem uma linha por execução não
 * havia denominador para calcular nada.
 *
 * Agora existe: `event_log` recebe `agent.operator_turn` a cada execução, e o
 * payload foi escolhido para que cada medida seja uma CONTAGEM, não uma varredura
 * de linhas — por isso `promessa_assumida_por` e `promessa_sem_dono_porque` são
 * escalares no payload em vez de derivados de um array.
 *
 * ═══ "QUITADAS" VIROU "ASSUMIDAS", E A TROCA É DELIBERADA ═══
 *
 * O sistema não sabe se a promessa foi CUMPRIDA — agendar um retorno não é
 * cumprir, e mandar mensagem depois também não. Ele sabe se alguém ficou
 * responsável. Medir "quitadas" seria publicar um número que nenhuma linha apura,
 * que é o mesmo defeito do aviso que dizia "ninguém cumpriu ainda".
 *
 * ═══ CLIENT DE SESSÃO ═══
 *
 * `event_log` tem isolamento por organização, e a RLS faz a tenancy. O filtro
 * explícito por `organization_id` continua no SQL porque um usuário pode
 * pertencer a mais de uma organização — a RLS deixaria passar as duas.
 */
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

/** Janela fixa. Um seletor de período aqui seria configuração antes de haver uso. */
const DIAS = 30;

/**
 * QUAL agente. O painel que consome isto vive em `/app/ai/agents/[id]` e as
 * frases dele mandam agir sobre AQUELE agente ("marcar abaixo"). Agregar a
 * organização inteira ali aponta ação concreta e errada quando há mais de um
 * agente — que é o desenho normal (lista, roteadores, mapa por funil). Sem o
 * parâmetro a rota segue devolvendo o agregado da organização.
 */
const querySchema = z.object({ agent_id: z.string().uuid().optional() });

export async function GET(req: Request): Promise<Response> {
  const authz = await requireRole("manager", { resource: "ai_operator_metrics" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { org } = authz;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
  if (!parsed.success) {
    return fail("validation_failed", t("Filtros inválidos."), 422, {
      details: parsed.error.flatten(),
    });
  }
  const agenteDaTela = parsed.data.agent_id ?? null;

  const db = await createClient();

  // O agente pedido tem de ser da organização da sessão. O filtro por
  // `organization_id` abaixo já impede ler turno alheio, mas sem esta conferência
  // um id de outra organização responderia "zero turnos" — uma afirmação sobre
  // um agente que esta organização não tem.
  if (agenteDaTela !== null) {
    const { data: agente, error } = await db
      .from("ai_agents")
      .select("id")
      .eq("id", agenteDaTela)
      .eq("organization_id", org.orgId)
      .maybeSingle();
    if (error) return fail("read_failed", error.message, 500);
    if (!agente) return fail("not_found", t("Agente não encontrado."), 404);
  }

  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db.rpc("fn_genesis_operator_counts", {
    p_org: org.orgId,
    p_since: desde,
    p_agent: agenteDaTela ?? undefined,
  });
  if (error) return fail("read_failed", t("falha ao ler"), 503);
  return ok(data);
}
