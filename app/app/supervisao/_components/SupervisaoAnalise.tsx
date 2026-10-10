"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import {
  supervisionQuery,
  type SupervisionData,
  type SupervisionKind,
} from "@/lib/metrics/supervisao";
import { FRASE_DO_MOTIVO } from "@/lib/escalacao/passagem";

type Option = { id: string; name: string };
export type SupervisionOptions = {
  agents: Option[];
  channels: Option[];
  pipelines: Option[];
  unavailable?: boolean;
};
const LABELS: Record<SupervisionKind, string> = {
  queue: "Fila no escopo",
  ai: "Automático no escopo",
  human: "Com atendentes",
  waiting: "Espera acima da régua",
  cold: "Leads sem atividade",
  followup: "Follow-ups vencidos",
  failures: "Falhas no período",
  handoff: "Passagens para humanos",
  calls: "Chamadas de IA",
  won: "Negócios ganhos",
  lost: "Negócios perdidos",
  response: "Primeiras respostas humanas",
  handoff_pending: "Passagens aguardando humano",
  channel_down: "Canais indisponíveis agora",
  observed: "Conversas observadas no período",
};
const today = () => new Date().toISOString().slice(0, 10);
const usd = (cents: number | null) =>
  cents === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 4,
      }).format(cents / 100);

export function SupervisaoAnalise({
  orgId,
  options,
  attendants,
}: {
  orgId: string;
  options: SupervisionOptions;
  attendants: { user_id: string; name: string | null; email: string | null }[];
}) {
  const t = useT();
  const [draft, setDraft] = useState(() => ({
    from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    to: today(),
    owner: "",
    agent: "",
    channel: "",
    pipeline: "",
    wait_minutes: "",
    cold_days: "",
  }));
  const [applied, setApplied] = useState(draft);
  const [kind, setKind] = useState<SupervisionKind>("queue");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const params = useMemo(() => {
    const query = new URLSearchParams({
      from: `${applied.from}T00:00:00.000Z`,
      to: new Date(Date.parse(`${applied.to}T00:00:00Z`) + 86400000).toISOString(),
      kind,
      offset: String(offset),
    });
    for (const key of [
      "owner",
      "agent",
      "channel",
      "pipeline",
      "wait_minutes",
      "cold_days",
    ] as const)
      if (applied[key]) query.set(key, applied[key]);
    return query.toString();
  }, [applied, kind, offset]);
  const query = useQuery({
    queryKey: ["genesis-supervisao-populacao", orgId, params],
    queryFn: () =>
      apiClient
        .get<{ data: SupervisionData }>(`/api/v1/metrics/supervisao?${params}`)
        .then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const data = query.isError ? undefined : query.data;
  const selectedCount = data?.totals[kind] ?? 0;
  const name = (id: string) =>
    attendants.find((a) => a.user_id === id)?.name ||
    attendants.find((a) => a.user_id === id)?.email ||
    id;
  const agentName = (id: string) => options.agents.find((a) => a.id === id)?.name || id;
  const reason = (value: string) =>
    t(
      Object.hasOwn(FRASE_DO_MOTIVO, value)
        ? FRASE_DO_MOTIVO[value as keyof typeof FRASE_DO_MOTIVO]
        : value,
    );
  function choose(next: SupervisionKind) {
    setKind(next);
    setOffset(0);
  }
  function refine(key: "owner" | "agent", value: string, next: SupervisionKind) {
    const filters = { ...applied, [key]: value };
    setDraft(filters);
    setApplied(filters);
    choose(next);
    document.getElementById("supervisao-populacao")?.scrollIntoView({ block: "start" });
  }
  function select(
    label: string,
    key: "owner" | "agent" | "channel" | "pipeline",
    values: Option[],
  ) {
    return (
      <label className="min-w-0 text-xs font-medium">
        {t(label)}
        <select
          className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={draft[key]}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        >
          <option value="">{t("Todos")}</option>
          {values.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <section className="space-y-4" aria-labelledby="analise-supervisao">
      <div>
        <h2 className="font-semibold" id="analise-supervisao">
          {t("Análise e próximos passos")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(
            "Os filtros abaixo controlam esta análise. A visão geral da organização permanece acima.",
          )}
        </p>
      </div>
      <Card className="p-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !Number.isFinite(Date.parse(draft.from)) ||
              !Number.isFinite(Date.parse(draft.to))
            ) {
              setError(t("Informe um período válido de até 90 dias e réguas positivas."));
              return;
            }
            const values: Record<string, string> = {
              from: `${draft.from}T00:00:00.000Z`,
              to: new Date(Date.parse(`${draft.to}T00:00:00Z`) + 86400000).toISOString(),
            };
            for (const key of [
              "owner",
              "agent",
              "channel",
              "pipeline",
              "wait_minutes",
              "cold_days",
            ] as const)
              if (draft[key]) values[key] = draft[key];
            if (!supervisionQuery.safeParse(values).success) {
              setError(t("Informe um período válido de até 90 dias e réguas positivas."));
              return;
            }
            setError("");
            setApplied(draft);
            setOffset(0);
          }}
        >
          <label className="text-xs font-medium">
            {t("De (UTC)")}
            <Input
              required
              type="date"
              className="mt-1 h-11"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label className="text-xs font-medium">
            {t("Até (UTC)")}
            <Input
              required
              type="date"
              className="mt-1 h-11"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          {select(
            "Atendente",
            "owner",
            attendants.map((a) => ({ id: a.user_id, name: a.name || a.email || a.user_id })),
          )}
          {select("Agente de IA", "agent", options.agents)}
          {select("Canal", "channel", options.channels)}
          {select("Funil", "pipeline", options.pipelines)}
          <label className="text-xs font-medium">
            {t("Régua de espera (minutos)")}
            <Input
              type="number"
              min={1}
              max={10080}
              className="mt-1 h-11"
              placeholder={t("Sem régua configurada")}
              value={draft.wait_minutes}
              onChange={(e) => setDraft({ ...draft, wait_minutes: e.target.value })}
            />
          </label>
          <label className="text-xs font-medium">
            {t("Régua sem atividade (dias)")}
            <Input
              type="number"
              min={1}
              max={365}
              className="mt-1 h-11"
              placeholder={t("Sem régua configurada")}
              value={draft.cold_days}
              onChange={(e) => setDraft({ ...draft, cold_days: e.target.value })}
            />
          </label>
          <Button type="submit" className="min-h-11">
            {t("Aplicar filtros")}
          </Button>
        </form>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {options.unavailable ? (
          <p role="alert" className="mt-2 text-sm text-warning">
            {t("Não foi possível carregar todas as opções de filtro. Recarregue a página.")}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          {t(
            "Fila, espera, leads e follow-ups mostram o estado atual. Falhas, passagens, IA e desfechos usam o período UTC selecionado. Réguas são limites desta análise, sem alterar o roteamento. A equipe é filtrada por atendente; esta versão não possui departamentos cadastráveis.",
          )}
        </p>
      </Card>
      <div
        role="status"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        {query.isError ? (
          <>
            <span>{t("Fonte indisponível. Nenhum zero foi inferido.")}</span>
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t("Tentar novamente")}
            </Button>
          </>
        ) : query.isPending ? (
          t("Carregando análise")
        ) : data ? (
          <>
            {t("Fonte atualizada em")}{" "}
            <time dateTime={data.observed_at}>
              {new Date(data.observed_at).toLocaleTimeString()}
            </time>{" "}
            · {t("Definição")} {data.definition}
            {Date.now() - Date.parse(data.observed_at) > 90_000 ? (
              <span role="alert">{t("Dados sem atualização há mais de 90 segundos.")}</span>
            ) : null}
          </>
        ) : (
          t("Fonte indisponível")
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {(Object.entries(LABELS) as [SupervisionKind, string][]).map(([key, label]) => {
          const noRule =
            (key === "waiting" && !applied.wait_minutes) || (key === "cold" && !applied.cold_days);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={kind === key}
              aria-controls="supervisao-populacao"
              onClick={() => choose(key)}
              className={`min-h-24 min-w-0 rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-ring ${kind === key ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <span className="block text-xs">{t(label)}</span>
              <strong className="block text-2xl tabular-nums">
                {noRule || !data ? "—" : (data.totals[key] ?? 0)}
              </strong>
              {key === "response" && typeof data?.first_response_seconds === "number" ? (
                <span className="block text-xs">
                  {Math.round(data.first_response_seconds)}s {t("em média")}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {t(noRule ? "Defina a régua" : "Ver registros")}
              </span>
            </button>
          );
        })}
      </div>
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs">{t("Custo conhecido de IA (USD)")}</p>
          <strong>{data ? usd(data.cost_cents) : "—"}</strong>
          <p className="text-xs text-muted-foreground">
            {data
              ? `${data.unpriced_calls} ${t("chamadas sem preço; não entram no custo conhecido")}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs">{t("Tokens de entrada + saída")}</p>
          <strong>{data?.tokens ?? "—"}</strong>
        </div>
        <div>
          <p className="text-xs">{t("Conversas com passagem humana / observadas")}</p>
          <strong>
            {data && data.active_period_conversations > 0
              ? `${((100 * data.handoff_conversations) / data.active_period_conversations).toFixed(1)}%`
              : "—"}
          </strong>
          <p className="text-xs text-muted-foreground">
            {data ? `${data.handoff_conversations} / ${data.active_period_conversations}` : "—"} ·{" "}
            {t("Uma conversa conta uma vez. Observadas: mensagem ou passagem no período.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Button variant="outline" onClick={() => choose("calls")}>
            {t("Inspecionar custos e tokens")}
          </Button>
          <Button variant="outline" onClick={() => choose("handoff")}>
            {t("Inspecionar passagens")}
          </Button>
          <Button variant="outline" onClick={() => choose("observed")}>
            {t("Inspecionar conversas observadas")}
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-medium">{t("Resultado por atendente no escopo")}</h3>
          {data?.attendants.map((a) => (
            <div key={a.owner_id} className="mt-2 text-sm break-words">
              <p>
                {name(a.owner_id)}: {a.active} {t("ativas")}, {a.waiting} {t("acima da régua")},{" "}
                {a.won} {t("ganhos")}, {a.lost} {t("perdidos")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Primeira resposta média")}:{" "}
                {typeof a.first_response_seconds === "number"
                  ? `${Math.round(a.first_response_seconds)}s`
                  : "—"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["human", "won", "lost", "response"] as const).map((next) => (
                  <Button
                    key={next}
                    variant="outline"
                    className="min-h-11"
                    onClick={() => refine("owner", a.owner_id, next)}
                  >
                    {t(LABELS[next])}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <h3 className="font-medium">{t("Agentes no escopo")}</h3>
          {data?.agents.map((a) => (
            <div key={a.agent_id} className="mt-2 text-sm break-words">
              <p>
                {agentName(a.agent_id)}: {a.calls} {t("chamadas")}, {usd(a.cost_cents)},{" "}
                {a.failures} {t("falhas")}, {a.handoffs} {t("passagens")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["calls", "failures", "handoff"] as const).map((next) => (
                  <Button
                    key={next}
                    variant="outline"
                    className="min-h-11"
                    onClick={() => refine("agent", a.agent_id, next)}
                  >
                    {t(LABELS[next])}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            {t(
              "Atividade do executor não comprova resolução. Confira ganhos, perdas, falhas e motivos das passagens.",
            )}
          </p>
        </Card>
      </div>
      {data?.reasons.length ? (
        <Card className="p-4">
          <h3 className="font-medium">{t("Motivos das passagens")}</h3>
          {data.reasons.map((r) => (
            <p key={r.reason} className="mt-2 text-sm break-words">
              {reason(r.reason)}: {r.total}
            </p>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            {data.unattributed_handoffs}{" "}
            {t(
              "passagens sem executor identificado; incluídas no total, fora do filtro por agente de IA.",
            )}
          </p>
        </Card>
      ) : null}
      <Card className="p-4" id="supervisao-populacao">
        <h3 className="font-medium">
          {t(LABELS[kind])} · {data ? selectedCount : "—"} {t("registros")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("Mesma fonte e mesmos filtros do indicador; até 50 registros por página.")}
        </p>
        {!data ? (
          <p className="py-4 text-sm">
            {t(query.isError ? "Detalhamento indisponível" : "Carregando registros")}
          </p>
        ) : data.rows.length === 0 ? (
          <p className="py-4 text-sm">{t("Nenhum registro nesta seleção.")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {data.rows.map((row) => (
              <li
                key={`${kind}-${row.id}`}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words">
                    {kind === "handoff" || kind === "handoff_pending"
                      ? reason(row.reason)
                      : row.reason}
                  </p>
                  <p className="text-xs break-all text-muted-foreground">{row.id}</p>
                  {kind === "calls" ? (
                    <p>
                      {usd(row.cost_cents)} · {row.tokens ?? "—"} {t("tokens")}
                    </p>
                  ) : null}
                  {typeof row.duration_seconds === "number" ? (
                    <p>
                      {Math.round(row.duration_seconds)}s {t("até a primeira resposta humana")}
                    </p>
                  ) : null}
                  {row.handoff_state ? (
                    <p>
                      {t(
                        row.handoff_state === "pending"
                          ? "Aguardando assumir"
                          : row.handoff_state === "assumed"
                            ? "Assumida por humano"
                            : "Devolvida ao automático",
                      )}
                      {typeof row.time_to_assume_seconds === "number"
                        ? ` · ${Math.round(row.time_to_assume_seconds)}s`
                        : ""}
                    </p>
                  ) : null}
                  {row.at ? (
                    <time className="text-xs" dateTime={row.at}>
                      {new Date(row.at).toLocaleString()}
                    </time>
                  ) : null}
                </div>
                {row.conversation_id ? (
                  <Link
                    className="inline-flex min-h-11 items-center px-3 text-primary underline"
                    href={`/app/inbox?id=${row.conversation_id}`}
                  >
                    {t("Abrir conversa")}
                  </Link>
                ) : row.lead_id ? (
                  <Link
                    className="inline-flex min-h-11 items-center px-3 text-primary underline"
                    href={`/app/leads/${row.lead_id}`}
                  >
                    {t("Abrir lead")}
                  </Link>
                ) : (
                  <Link
                    className="inline-flex min-h-11 items-center px-3 text-primary underline"
                    href={
                      kind === "calls"
                        ? "/app/ai/runs"
                        : kind === "channel_down"
                          ? "/app/connections"
                          : "/app/radar"
                    }
                  >
                    {t("Investigar")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={offset === 0 || query.isFetching}
            onClick={() => setOffset(Math.max(0, offset - 50))}
          >
            {t("Anterior")}
          </Button>
          <span className="text-xs">
            {t("Página")} {offset / 50 + 1}
          </span>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={!data || offset + 50 >= selectedCount || query.isFetching}
            onClick={() => setOffset(offset + 50)}
          >
            {t("Próxima")}
          </Button>
        </div>
      </Card>
    </section>
  );
}
