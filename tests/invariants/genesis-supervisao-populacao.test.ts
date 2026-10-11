import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "./psql-transporte";

const org = randomUUID(),
  other = randomUUID(),
  manager = randomUUID(),
  agent = randomUUID(),
  viewer = randomUUID();
const contact = randomUUID(),
  session = randomUUID(),
  conversation = randomUUID();
const signature =
  "public.fn_genesis_supervisao(uuid,timestamptz,timestamptz,uuid,uuid,uuid,uuid,int,int,text,int,boolean)";
function asUser(user: string, body: string) {
  return sql(
    `set role authenticated; select set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated"}',false); ${body}`,
  )
    .split("\n")
    .at(-1)!;
}
function call(kind = "calls", offset = 0, organization = org) {
  return `select public.fn_genesis_supervisao('${organization}','2026-10-08','2026-10-10',null,null,null,null,30,7,'${kind}',${offset},false)::text;`;
}
beforeAll(() => {
  sql(`
    insert into auth.users(id,email,raw_user_meta_data) values
      ('${manager}','${manager}@fixture.test','{"full_name":"Gestor"}'),
      ('${agent}','${agent}@fixture.test','{"full_name":"Atendente"}'),
      ('${viewer}','${viewer}@fixture.test','{}');
    insert into organizations(id,slug,legal_name,display_name) values
      ('${org}','supervisao-${org}','A','A'), ('${other}','supervisao-${other}','B','B');
    insert into user_organizations(user_id,organization_id,role,accepted_at) values
      ('${manager}','${org}','manager',now()),('${agent}','${org}','agent',now()),('${viewer}','${org}','viewer',now());
    insert into contacts(id,organization_id,display_name,force_human) values('${contact}','${org}','Contato',true);
    insert into channel_sessions(id,organization_id,waha_session_name,webhook_secret_encrypted)
      values('${session}','${org}','supervisao-${session}','\\x00'::bytea);
    insert into conversations(id,organization_id,contact_id,channel_session_id,awaiting_since)
      values('${conversation}','${org}','${contact}','${session}',now()-interval '2 hours');
    insert into llm_calls(organization_id,contact_id,provider,model,status,cost_cents,input_tokens,created_at)
      select '${org}','${contact}','fixture','fixture',case when g=1 then 'erro' else 'ok' end,
        case when g<=1200 then 1 else null end,10,'2026-10-09T12:00Z' from generate_series(1,1205) g;
    insert into llm_calls(organization_id,provider,model,cost_cents,created_at)
      values('${other}','fixture','fixture',999,'2026-10-09T12:00Z');
    insert into job_queue(organization_id,contact_id,kind,status,created_at)
      values('${org}','${contact}','inbound_turn','dead','2026-10-09T12:00Z');
    insert into messages(organization_id,conversation_id,contact_id,channel_session_id,type,direction,status,created_at)
      values('${org}','${conversation}','${contact}','${session}','text','outbound','failed','2026-10-09T12:00Z');
    insert into messages(organization_id,conversation_id,contact_id,channel_session_id,type,direction,status,sent_at,created_at,sent_by_user_id)
      values('${org}','${conversation}','${contact}','${session}','text','inbound','delivered','2026-10-09T11:00Z','2026-10-09T11:00Z',null),
      ('${org}','${conversation}','${contact}','${session}','text','outbound','sent','2026-10-09T11:03Z','2026-10-09T11:03Z','${manager}');
    insert into event_log(organization_id,event_type,entity_kind,entity_id,payload,created_at)
      select '${org}','ai.handoff_triggered','conversation','${conversation}',
        '{"conversation_id":"${conversation}","reason":"pedido do cliente"}','2026-10-09T12:00Z' from generate_series(1,2);
    insert into passagens_de_atendimento(organization_id,contact_id,conversation_id,motor,origem,motivo_codigo,body,criado_em)
      select '${org}','${contact}','${conversation}',case when g=1 then 'engine' else 'crm' end,
        'pedido_explicito','requested_human','Fixture de contexto','2026-10-09T12:00Z' from generate_series(1,2) g;
    insert into event_log(organization_id,event_type,entity_kind,entity_id,payload,created_at)
      values('${org}','agent.operator_turn','conversation','${conversation}',
        '{"ferramentas_chamadas":["fixture"],"promessas_declaradas":1,"promessa_sem_dono_porque":"operador_sem_ferramentas"}','2026-10-09T12:00Z');
  `);
});
describe("Supervisão: agregado e população autorizada", () => {
  it("agrega mais de mil chamadas sem truncar e mantém custo desconhecido explícito", () => {
    const result = JSON.parse(asUser(manager, call()));
    expect(result.totals.calls).toBe(1205);
    expect(result.cost_cents).toBe(1200);
    expect(result.unpriced_calls).toBe(5);
    expect(result.tokens).toBe(12050);
    expect(result.rows).toHaveLength(50);
  });
  it("pagina a mesma população e não muda o total", () => {
    const result = JSON.parse(asUser(manager, call("calls", 1200)));
    expect(result.totals.calls).toBe(1205);
    expect(result.rows).toHaveLength(5);
  });
  it("falhas incluem mensagem, job e provedor de IA", () => {
    const result = JSON.parse(asUser(manager, call("failures")));
    expect(result.totals.failures).toBe(3);
    expect(result.rows).toHaveLength(3);
  });
  it("passagens repetidas não inflacionam conversas nem taxa", () => {
    const result = JSON.parse(asUser(manager, call("handoff")));
    expect(result.totals.handoff).toBe(2);
    expect(result.handoff_conversations).toBe(1);
    expect(result.active_period_conversations).toBe(1);
    expect(result.reasons).toEqual([{ reason: "requested_human", total: 2 }]);
    expect(result.unattributed_handoffs).toBe(2);
  });
  it("usa o comando canônico e a régua explícita de espera", () => {
    const result = JSON.parse(asUser(manager, call("queue")));
    expect(result.totals.queue).toBe(1);
    expect(result.totals.waiting).toBe(1);
    expect(result.rows[0].conversation_id).toBe(conversation);
  });
  it("primeira resposta humana mede o envio efetivo e permite inspecionar o denominador", () => {
    const result = JSON.parse(asUser(manager, call("response")));
    expect(result.totals.response).toBe(1);
    expect(result.first_response_seconds).toBe(180);
    expect(result.rows[0].duration_seconds).toBe(180);
    const observed = JSON.parse(asUser(manager, call("observed")));
    expect(observed.rows).toHaveLength(observed.active_period_conversations);
    expect(observed.rows[0].conversation_id).toBe(conversation);
  });
  it("passagens pendentes e tempo até assumir refletem o registro canônico", () => {
    const pending = JSON.parse(asUser(manager, call("handoff_pending")));
    expect(pending.totals.handoff_pending).toBe(2);
    expect(
      pending.rows.every((r: { handoff_state: string }) => r.handoff_state === "pending"),
    ).toBe(true);
    sql(
      `update passagens_de_atendimento set reconhecido_em=criado_em+interval '2 minutes',reconhecido_por='${manager}' where organization_id='${org}' and motor='engine';`,
    );
    try {
      const result = JSON.parse(asUser(manager, call("handoff")));
      expect(result.totals.handoff_pending).toBe(1);
      expect(
        result.rows.find((r: { handoff_state: string }) => r.handoff_state === "assumed")
          .time_to_assume_seconds,
      ).toBe(120);
    } finally {
      sql(
        `update passagens_de_atendimento set reconhecido_em=null,reconhecido_por=null where organization_id='${org}';`,
      );
    }
  });
  it("canais indisponíveis respeitam organização, desativação e filtro", () => {
    sql(`update channel_sessions set status='FAILED' where id='${session}';`);
    try {
      const result = JSON.parse(asUser(manager, call("channel_down")));
      expect(result.rows.map((r: { id: string }) => r.id)).toEqual([session]);
      sql(`update channel_sessions set metadata='{"disabled":true}' where id='${session}';`);
      expect(JSON.parse(asUser(manager, call("channel_down"))).totals.channel_down ?? 0).toBe(0);
    } finally {
      sql(`update channel_sessions set status='STOPPED',metadata='{}' where id='${session}';`);
    }
  });
  it("bloqueia outra organização que comprovadamente tem dados", () => {
    expect(sql(`select count(*) from llm_calls where organization_id='${other}';`)).toBe("1");
    expect(() => asUser(manager, call("calls", 0, other))).toThrow(/Supervisão exige gestor/);
  });
  it("bloqueia viewer e agent no RPC, sem depender da rota HTTP", () => {
    for (const user of [viewer, agent])
      expect(() => asUser(user, call())).toThrow(/Supervisão exige gestor/);
  });
  it("é invoker e anon não executa", () => {
    expect(sql(`select prosecdef from pg_proc where oid='${signature}'::regprocedure;`)).toBe("f");
    expect(sql(`select has_function_privilege('anon','${signature}','execute');`)).toBe("f");
  });
  it("filtro por canal seleciona o contato e não inventa zeros para o canal existente", () => {
    const filtered = (id: string) =>
      call().replace("null,null,null,null,30", `null,null,'${id}',null,30`);
    expect(JSON.parse(asUser(manager, filtered(session))).totals.calls).toBe(1205);
    expect(JSON.parse(asUser(manager, filtered(randomUUID()))).totals.calls ?? 0).toBe(0);
  });
  it("agregado do operador preserva as seis contagens em uma consulta", () => {
    const query = `select public.fn_genesis_operator_counts('${org}','2026-10-08')::text;`;
    expect(JSON.parse(asUser(manager, query))).toEqual({
      dias: 30,
      turnos: 1,
      agiu: 1,
      promessas: { declaradas: 1, assumidas: 0, semDono: 1 },
      quisAgirENaoPode: 1,
    });
    expect(() => asUser(viewer, query)).toThrow(/Sem acesso/);
    expect(() => asUser(manager, query.replace(org, other))).toThrow(/Sem acesso/);
  });
  it("roster em lote só retorna membros ativos agent+ da própria organização", () => {
    const rows = JSON.parse(
      asUser(
        agent,
        `select coalesce(jsonb_agg(r),'[]') from public.fn_genesis_nomes_do_roster('${org}') r;`,
      ),
    );
    expect(rows.map((r: { user_id: string }) => r.user_id).sort()).toEqual([agent, manager].sort());
    expect(() =>
      asUser(agent, `select * from public.fn_genesis_nomes_do_roster('${other}');`),
    ).toThrow(/Sem acesso/);
    expect(() =>
      asUser(viewer, `select * from public.fn_genesis_nomes_do_roster('${org}');`),
    ).toThrow(/Sem acesso/);
  });
});
