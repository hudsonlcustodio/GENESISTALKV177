-- manifest: Supervisão agrega o escopo autorizado e expõe a mesma população
-- paginada para inspeção; réguas de espera/frieza são explícitas, sem SLA fictício.
create or replace function public.fn_genesis_supervisao(
  p_org uuid, p_from timestamptz, p_to timestamptz,
  p_owner uuid default null, p_agent uuid default null,
  p_channel uuid default null, p_pipeline uuid default null,
  p_wait_minutes int default null, p_cold_days int default null,
  p_kind text default 'queue', p_offset int default 0, p_automatico boolean default true
) returns jsonb language plpgsql stable security invoker
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  if not (coalesce(public.fn_role_at_least(p_org, 'manager'), false)
      or public.fn_is_platform_admin()) then
    raise exception 'Supervisão exige gestor da organização' using errcode='42501';
  end if;
  if p_from is null or p_to is null or p_kind is null or p_offset is null or p_from >= p_to or p_to - p_from > interval '90 days'
      or p_offset < 0 or p_offset > 100000
      or p_wait_minutes not between 1 and 10080
      or p_cold_days not between 1 and 365
      or p_kind not in ('queue','ai','human','waiting','cold','followup','failures','handoff','calls','won','lost','response','handoff_pending','channel_down','observed') then
    raise exception 'Filtros de supervisão inválidos' using errcode='22023';
  end if;
  with
  leads as materialized (
    select l.* from public.crm_leads l where l.organization_id=p_org
      and not exists (select 1 from public.contacts ct where ct.id=l.contact_id and ct.organization_id=p_org and ct.is_personal)
      and (p_owner is null or l.owner_user_id=p_owner)
      and (p_agent is null or l.owner_agent_id=p_agent)
      and (p_pipeline is null or l.pipeline_id=p_pipeline)
      and (p_channel is null or exists (select 1 from public.conversations c
        where c.organization_id=p_org and c.contact_id=l.contact_id and c.channel_session_id=p_channel))
  ), conv_scoped as materialized (
    select c.*,public.comando_da_conversa(c) as command from public.conversations c
      join public.contacts ct on ct.id=c.contact_id and ct.organization_id=c.organization_id
      join public.channel_sessions cs on cs.id=c.channel_session_id and cs.organization_id=c.organization_id
      where c.organization_id=p_org and not coalesce(ct.is_personal,false)
      and coalesce(cs.metadata->>'disabled','false')<>'true'
      and (p_owner is null or c.assigned_to_user_id=p_owner)
      and (p_channel is null or c.channel_session_id=p_channel)
      and (p_pipeline is null or exists (select 1 from leads l where l.contact_id=c.contact_id))
  ), conv as materialized (
    select * from conv_scoped c where p_agent is null or c.active_ai_agent_id=p_agent
  ), contacts_in_scope as (
    select contact_id from conv union select contact_id from leads
  ), calls as materialized (
    select l.* from public.llm_calls l where l.organization_id=p_org
      and l.created_at>=p_from and l.created_at<p_to
      and (p_agent is null or l.agent_id=p_agent)
      and ((p_owner is null and p_channel is null and p_pipeline is null)
        or l.contact_id in (select contact_id from contacts_in_scope))
  ), population_base as materialized (
    select case when c.command='humano' then 'human'
        when c.command='automatico' and p_automatico then 'ai' else 'queue' end as kind,
      c.id, c.id as conversation_id, null::uuid as lead_id,
      coalesce(c.last_message_at,c.created_at) as at, c.assigned_to_user_id as owner_id,
      c.active_ai_agent_id as agent_id, c.status as reason,
      null::numeric as cost_cents, null::bigint as tokens
      from conv c where c.status not in ('resolved','closed','archived')
    union all
    select 'waiting', c.id,c.id,null,c.awaiting_since,c.assigned_to_user_id,c.active_ai_agent_id,
      'Aguardando resposta além da régua',null,null from conv c
      where c.status not in ('resolved','closed','archived') and p_wait_minutes is not null
        and c.awaiting_since < now()-make_interval(mins=>p_wait_minutes)
    union all
    select 'cold',l.id,null,l.id,coalesce(l.last_activity_at,l.created_at),l.owner_user_id,l.owner_agent_id,
      'Sem atividade além da régua',null,null from leads l
      where l.status='open' and p_cold_days is not null
        and coalesce(l.last_activity_at,l.created_at)<now()-make_interval(days=>p_cold_days)
    union all
    select 'followup',f.id,f.conversation_id,null,f.next_eval_at,null,f.agent_id,
      f.status,null,null from public.followup_enrollments f
      where f.organization_id=p_org and f.status in ('active','waiting_reply') and f.next_eval_at<now()
        and (p_agent is null or f.agent_id=p_agent)
        and ((p_owner is null and p_channel is null and p_pipeline is null)
          or f.contact_id in (select contact_id from contacts_in_scope))
    union all
    select 'failures',j.id,null,null,j.created_at,null,null,'job: '||j.kind,null,null
      from public.job_queue j where j.organization_id=p_org and j.status='dead'
        and j.created_at>=p_from and j.created_at<p_to
        and (p_agent is null or j.payload->>'agent_id'=p_agent::text)
        and ((p_owner is null and p_channel is null and p_pipeline is null)
          or j.contact_id in (select contact_id from contacts_in_scope))
    union all
    select 'failures',m.id,m.conversation_id,null,m.created_at,c.assigned_to_user_id,c.active_ai_agent_id,
      'mensagem: '||coalesce(m.error_code,m.status),null,null from public.messages m
      join conv c on c.id=m.conversation_id and c.organization_id=m.organization_id
      where m.organization_id=p_org and m.status='failed' and m.created_at>=p_from and m.created_at<p_to
    union all
    select 'failures',l.id,null,null,l.created_at,null,l.agent_id,
      'provedor IA: '||coalesce(l.error_code,l.status),null,null from calls l where l.status='erro'
    union all
    select 'handoff',h.id,c.id,null,h.criado_em,c.assigned_to_user_id,ha.id,
      h.motivo_codigo,null,null from public.passagens_de_atendimento h
      join conv_scoped c on c.id=h.conversation_id and c.organization_id=h.organization_id
      left join lateral (select e.payload->>'agent_id' as agent_id from public.event_log e
        where e.organization_id=p_org and e.event_type='ai.handoff_triggered'
          and coalesce(e.payload->>'conversation_id',e.entity_id::text)=c.id::text
          and e.created_at between h.criado_em-interval '5 seconds' and h.criado_em+interval '5 seconds'
        order by abs(extract(epoch from e.created_at-h.criado_em)),e.id limit 1) executor on true
      left join public.ai_agents ha on ha.id::text=executor.agent_id and ha.organization_id=p_org
      where h.organization_id=p_org and h.criado_em>=p_from and h.criado_em<p_to
        and (p_agent is null or ha.id=p_agent)
    union all
    select 'handoff',e.id,c.id,null,e.created_at,c.assigned_to_user_id,ha.id,
      coalesce(e.payload->>'reason','Motivo não informado'),null,null
      from public.event_log e join conv_scoped c on c.id::text=coalesce(e.payload->>'conversation_id',e.entity_id::text)
      left join public.ai_agents ha on ha.id::text=e.payload->>'agent_id' and ha.organization_id=p_org
      where e.organization_id=p_org and e.event_type='ai.handoff_triggered'
        and (p_agent is null or ha.id=p_agent)
        and not exists (select 1 from public.passagens_de_atendimento h
          where h.organization_id=p_org and h.conversation_id=c.id
            and h.criado_em between e.created_at-interval '5 seconds' and e.created_at+interval '5 seconds')
        and e.created_at>=p_from and e.created_at<p_to
    union all
    select 'calls',l.id,null,null,l.created_at,null,l.agent_id,l.provider||' / '||l.model,
      l.cost_cents,(l.input_tokens::bigint+l.output_tokens::bigint) from calls l
    union all
    select l.status,l.id,null,l.id,l.closed_at,l.owner_user_id,l.owner_agent_id,
      coalesce(l.won_reason,l.lost_reason,l.status),null,null from leads l
      where l.status in ('won','lost') and l.closed_at>=p_from and l.closed_at<p_to
  ), observed_conversations as materialized (
    select c.id,c.assigned_to_user_id,c.active_ai_agent_id,max(m.created_at) as at
      from public.messages m join conv c on c.id=m.conversation_id
      where m.organization_id=p_org and m.created_at>=p_from and m.created_at<p_to
      group by c.id,c.assigned_to_user_id,c.active_ai_agent_id
    union all
    select c.id,c.assigned_to_user_id,c.active_ai_agent_id,max(h.at)
      from population_base h join conv_scoped c on c.id=h.conversation_id
      where h.kind='handoff' and not exists (select 1 from public.messages m
        where m.organization_id=p_org and m.conversation_id=c.id and m.created_at>=p_from and m.created_at<p_to
          and m.conversation_id in (select id from conv))
      group by c.id,c.assigned_to_user_id,c.active_ai_agent_id
  ), response_times as materialized (
    select c.id,c.assigned_to_user_id,c.active_ai_agent_id,fr.first_in,fr.first_human_out
      from conv c cross join lateral (
        select min(m.sent_at) filter(where m.direction='inbound') as first_in,
          min(m.sent_at) filter(where m.direction='outbound' and m.sent_by_user_id is not null
            and m.status in ('sent','delivered','read')) as first_human_out
        from public.messages m where m.organization_id=p_org and m.conversation_id=c.id
      ) fr where fr.first_human_out>=p_from and fr.first_human_out<p_to
        and fr.first_human_out>=fr.first_in
  ), population as materialized (
    select b.*,null::numeric as duration_seconds from population_base b
    union all
    select 'response',r.id,r.id,null,r.first_human_out,r.assigned_to_user_id,r.active_ai_agent_id,
      'Primeira resposta humana',null,null,extract(epoch from r.first_human_out-r.first_in) from response_times r
    union all
    select 'handoff_pending',h.id,c.id,null,h.criado_em,c.assigned_to_user_id,null,
      h.motivo_codigo,null,null,null from public.passagens_de_atendimento h
      join conv_scoped c on c.id=h.conversation_id and c.organization_id=h.organization_id
      where h.organization_id=p_org and h.reconhecido_em is null and p_agent is null
        and c.status not in ('resolved','closed','archived')
    union all
    select 'observed',o.id,o.id,null,o.at,o.assigned_to_user_id,o.active_ai_agent_id,
      'Conversa observada no período',null,null,null from observed_conversations o
    union all
    select 'channel_down',cs.id,null,null,now(),null,null,cs.status,null,null,null
      from public.channel_sessions cs where cs.organization_id=p_org and cs.status in ('FAILED','STOPPED')
        and coalesce(cs.metadata->>'disabled','false')<>'true'
        and (p_channel is null or cs.id=p_channel)
        and ((p_owner is null and p_pipeline is null and p_agent is null)
          or cs.id in (select channel_session_id from conv))
  ), totals as (
    select kind,count(*) as total from population group by kind
  ), detail as (
    select * from population where kind=p_kind order by at desc nulls last,id limit 50 offset p_offset
  ) select jsonb_build_object(
    'definition',1,'observed_at',now(),'from',p_from,'to',p_to,
    'wait_minutes',p_wait_minutes,'cold_days',p_cold_days,
    'totals',coalesce((select jsonb_object_agg(kind,total) from totals),'{}'::jsonb),
    'cost_cents',(select sum(cost_cents) from calls),
    'unpriced_calls',(select count(*) from calls where cost_cents is null),
    'tokens',(select coalesce(sum(input_tokens::bigint+output_tokens::bigint),0) from calls),
    'first_response_seconds',(select avg(duration_seconds) from population where kind='response'),
    'unattributed_handoffs',(select count(*) from population where kind='handoff' and agent_id is null),
    'handoff_conversations',(select count(distinct conversation_id) from population where kind='handoff'),
    'active_period_conversations',(select count(*) from observed_conversations),
    'attendants',coalesce((select jsonb_agg(x order by x.owner_id) from (
      select owner_id,count(*) filter(where kind='human') as active,
        count(*) filter(where kind='waiting') as waiting,
        count(*) filter(where kind='won') as won,count(*) filter(where kind='lost') as lost,
        avg(duration_seconds) as first_response_seconds
      from population where owner_id is not null group by owner_id) x),'[]'::jsonb),
    'agents',coalesce((select jsonb_agg(x order by x.agent_id) from (
      select agent_id,count(*) filter(where kind='calls') as calls,
        sum(cost_cents) as cost_cents,count(*) filter(where kind='failures') as failures,
        count(*) filter(where kind='handoff') as handoffs
      from population where agent_id is not null group by agent_id) x),'[]'::jsonb),
    'reasons',coalesce((select jsonb_agg(x order by x.total desc) from (
      select reason,count(*) as total from population where kind='handoff' group by reason) x),'[]'::jsonb),
    'kind',p_kind,'offset',p_offset,'rows',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object(
      'handoff_state',case when h.id is null then null when h.reconhecido_em is null then 'pending'
        when h.reconhecido_por is null then 'returned_to_ai' else 'assumed' end,
      'time_to_assume_seconds',case when h.reconhecido_por is not null
        then greatest(0,extract(epoch from h.reconhecido_em-h.criado_em)) else null end)
      order by d.at desc nulls last,d.id) from detail d
      left join public.passagens_de_atendimento h on d.kind in ('handoff','handoff_pending')
        and h.id=d.id and h.organization_id=p_org),'[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;
revoke execute on function public.fn_genesis_supervisao(uuid,timestamptz,timestamptz,uuid,uuid,uuid,uuid,int,int,text,int,boolean) from public,anon;
grant execute on function public.fn_genesis_supervisao(uuid,timestamptz,timestamptz,uuid,uuid,uuid,uuid,int,int,text,int,boolean) to authenticated,service_role;

-- Batch enrichment replaces one Auth HTTP request per attendant per refresh.
-- The existing availability endpoint exposes this same roster to agent+.
create or replace function public.fn_genesis_nomes_do_roster(p_org uuid)
returns table(user_id uuid, name text, email text)
language plpgsql stable security definer set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not (coalesce(public.fn_role_at_least(p_org,'agent'),false)
      or public.fn_is_platform_admin()) then
    raise exception 'Sem acesso ao roster' using errcode='42501';
  end if;
  return query select u.id,u.raw_user_meta_data->>'full_name',u.email::text
    from auth.users u join public.user_organizations m on m.user_id=u.id
    where m.organization_id=p_org and m.revoked_at is null and m.accepted_at is not null
      and m.role in ('owner','admin','manager','agent');
end $$;
revoke execute on function public.fn_genesis_nomes_do_roster(uuid) from public,anon,service_role;
grant execute on function public.fn_genesis_nomes_do_roster(uuid) to authenticated;

create or replace function public.fn_genesis_operator_counts(p_org uuid,p_since timestamptz,p_agent uuid default null)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp
as $$
declare result jsonb;
begin
  if not (coalesce(public.fn_role_at_least(p_org,'manager'),false) or public.fn_is_platform_admin()) then
    raise exception 'Sem acesso às métricas do operador' using errcode='42501';
  end if;
  select jsonb_build_object('dias',30,'turnos',count(*),
    'agiu',count(*) filter(where payload->'ferramentas_chamadas'->>0 is not null),
    'promessas',jsonb_build_object(
      'declaradas',count(*) filter(where payload->>'promessas_declaradas'<>'0'),
      'assumidas',count(*) filter(where payload->>'promessa_assumida_por' is not null),
      'semDono',count(*) filter(where payload->>'promessa_sem_dono_porque' is not null)),
    'quisAgirENaoPode',count(*) filter(where payload->>'promessa_sem_dono_porque'='operador_sem_ferramentas'))
    into result from public.event_log where organization_id=p_org
      and event_type='agent.operator_turn' and created_at>=p_since
      and (p_agent is null or payload->>'agent_id'=p_agent::text);
  return result;
end $$;
revoke execute on function public.fn_genesis_operator_counts(uuid,timestamptz,uuid) from public,anon;
grant execute on function public.fn_genesis_operator_counts(uuid,timestamptz,uuid) to authenticated,service_role;
