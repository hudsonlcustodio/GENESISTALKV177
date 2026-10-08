"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import { useAttendants } from "@/hooks/team/useAttendants";
import { useAttendantMetrics } from "@/hooks/metrics/useAttendantMetrics";
import { Card } from "@/components/ui/card";
import { useT } from "@/hooks/i18n/useT";

type OperatorMetrics = {
  dias: number;
  turnos: number;
  agiu: number;
  promessas: { declaradas: number; assumidas: number; semDono: number };
  quisAgirENaoPode: number;
};

function Fonte({
  titulo,
  query,
}: {
  titulo: string;
  query: { isError: boolean; isPending: boolean; dataUpdatedAt: number };
}) {
  const t = useT();
  return (
    <p className="text-xs text-muted-foreground" role="status">
      {titulo}:{" "}
      {query.isError ? (
        t("Fonte indisponível")
      ) : query.isPending ? (
        t("Carregando")
      ) : (
        <>
          {t("Última atualização")}:{" "}
          <time dateTime={new Date(query.dataUpdatedAt).toISOString()}>
            {new Date(query.dataUpdatedAt).toLocaleTimeString()}
          </time>
        </>
      )}
    </p>
  );
}

function Numero({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: number | string;
  detalhe?: string;
}) {
  return (
    <Card className="min-w-0 p-4">
      <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
      {detalhe ? <div className="mt-1 text-xs text-muted-foreground">{detalhe}</div> : null}
    </Card>
  );
}

export function Supervisao360Client({ orgId }: { orgId: string }) {
  const t = useT();
  const counts = useConversationCounts(orgId);
  const attendants = useAttendants({ orgId, refetchInterval: 30_000 });
  const performance = useAttendantMetrics(null, { orgId, refetchInterval: 30_000 });
  const operator = useQuery({
    queryKey: ["supervisao-360", "ai-operator-metrics", orgId],
    queryFn: () =>
      apiClient.get<{ data: OperatorMetrics }>("/api/v1/ai/operator-metrics").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const equipe = attendants.isError ? [] : (attendants.data?.data ?? []);
  const perf = performance.isError ? undefined : performance.data?.data;
  const ai = operator.isError ? undefined : operator.data;
  const c = counts.isError ? undefined : counts.data;
  const equipeDisponivel = !attendants.isError && attendants.data !== undefined;

  const presentes = equipe.filter((a) => a.present).length;
  const dePlantao = equipe.filter((a) => a.is_available).length;
  const carga = equipe.reduce((total, a) => total + (a.current_load ?? 0), 0);

  const indisponivel =
    counts.isError || attendants.isError || performance.isError || operator.isError;

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="genesis-supervisao-360">
      {indisponivel ? (
        <Card className="border-warning p-3 text-sm">
          {t("Parte da telemetria está indisponível. Os números abaixo podem estar incompletos.")}
        </Card>
      ) : null}

      <section aria-labelledby="operacao-agora">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="operacao-agora" className="font-semibold">
              {t("Operação agora")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("Atualização operacional a cada ~30 segundos.")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Numero titulo={t("Fila humana")} valor={c?.fila ?? c?.unassigned ?? "—"} />
          <Numero titulo={t("Em IA")} valor={c?.automatico ?? "—"} />
          <Numero titulo={t("Minhas")} valor={c?.mine ?? "—"} />
          <Numero titulo={t("Abertas no escopo")} valor={c?.all ?? "—"} />
          <Numero
            titulo={t("Pessoas presentes")}
            valor={equipeDisponivel ? presentes : "—"}
            detalhe={equipeDisponivel ? `${dePlantao} ${t("de plantão")}` : undefined}
          />
          <Numero titulo={t("Carga atribuída")} valor={equipeDisponivel ? carga : "—"} />
        </div>
        <Fonte titulo={t("Conversas")} query={counts} />
      </section>

      <section aria-labelledby="equipe">
        <h2 id="equipe" className="mb-3 font-semibold">
          {t("Equipe")}
        </h2>
        <Fonte titulo={t("Equipe")} query={attendants} />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {equipe.map((a) => (
            <Card key={a.user_id} className="min-w-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.name ?? a.email ?? t("Sem nome")}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.role ?? "—"}</div>
                </div>
                <span className="text-xs">
                  {a.present ? t("presente") : t("sem presença recente")}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <span>
                  {t("Carga")}: <b>{a.current_load}</b>
                </span>
                <span>
                  {t("Capacidade")}: <b>{a.capacity ?? "—"}</b>
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="resultado">
        <h2 id="resultado" className="mb-3 font-semibold">
          {t("Últimos 30 dias")}
        </h2>
        <div className="grid gap-2 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="border-b border-border p-4 font-medium">{t("Atendentes")}</div>
            <Fonte titulo={t("Atendentes")} query={performance} />
            <div className="divide-y divide-border">
              {(perf?.attendants ?? []).map((a) => (
                <div
                  key={a.user_id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name ?? a.email ?? t("Sem nome")}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.conversations_handled} {t("atendimentos")}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <div>
                      {t("ganhos")}: {a.won}
                    </div>
                    <div>
                      {t("perdidos")}: {a.lost}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="font-medium">{t("Agentes de IA")}</div>
            <Fonte titulo={t("Agentes de IA")} query={operator} />
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Métrica operacional do executor; não equivale sozinha a resolução de atendimento.",
              )}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Numero titulo={t("Turnos")} valor={ai?.turnos ?? "—"} />
              <Numero titulo={t("Com ação")} valor={ai?.agiu ?? "—"} />
              <Numero titulo={t("Promessas sem dono")} valor={ai?.promessas.semDono ?? "—"} />
              <Numero titulo={t("Sem ferramenta")} valor={ai?.quisAgirENaoPode ?? "—"} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
