"use client";

import Link from "next/link";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import { useAttendants } from "@/hooks/team/useAttendants";
import { Card } from "@/components/ui/card";
import { useT } from "@/hooks/i18n/useT";
import { SupervisaoAnalise, type SupervisionOptions } from "./SupervisaoAnalise";

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
  href,
}: {
  titulo: string;
  valor: number | string;
  detalhe?: string;
  href: string;
}) {
  return (
    <Card className="min-w-0 p-4">
      <Link
        href={href}
        className="block rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
        {detalhe ? <div className="mt-1 text-xs text-muted-foreground">{detalhe}</div> : null}
      </Link>
    </Card>
  );
}

export function Supervisao360Client({
  orgId,
  options = { agents: [], channels: [], pipelines: [] },
}: {
  orgId: string;
  options?: SupervisionOptions;
}) {
  const t = useT();
  const counts = useConversationCounts(orgId);
  const attendants = useAttendants({ orgId, refetchInterval: 30_000 });
  const equipe = attendants.isError ? [] : (attendants.data?.data ?? []);
  const c = counts.isError ? undefined : counts.data;
  const equipeDisponivel = !attendants.isError && attendants.data !== undefined;

  const presentes = equipe.filter((a) => a.present).length;
  const dePlantao = equipe.filter((a) => a.is_available).length;
  const carga = equipe.reduce((total, a) => total + (a.current_load ?? 0), 0);

  const indisponivel = counts.isError || attendants.isError;

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
          <Numero
            titulo={t("Fila humana")}
            valor={c?.fila ?? c?.unassigned ?? "—"}
            href="/app/inbox?filter=unassigned"
          />
          <Numero titulo={t("Em IA")} valor={c?.automatico ?? "—"} href="/app/inbox?filter=ai" />
          <Numero titulo={t("Minhas")} valor={c?.mine ?? "—"} href="/app/inbox?filter=mine" />
          <Numero
            titulo={t("Abertas no escopo")}
            valor={c?.all ?? "—"}
            href="/app/inbox?filter=all"
          />
          <Numero
            titulo={t("Pessoas presentes")}
            valor={equipeDisponivel ? presentes : "—"}
            href="#equipe"
            detalhe={equipeDisponivel ? `${dePlantao} ${t("de plantão")}` : undefined}
          />
          <Numero
            titulo={t("Carga atribuída")}
            valor={equipeDisponivel ? carga : "—"}
            href="#equipe"
          />
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

      <SupervisaoAnalise orgId={orgId} options={options} attendants={equipe} />
    </div>
  );
}
