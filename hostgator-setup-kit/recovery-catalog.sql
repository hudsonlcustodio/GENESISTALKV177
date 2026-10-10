-- Stable public-schema contract. Object IDs and database names are deliberately
-- excluded so this can be compared in a different, compatible recovery database.
with settings as materialized (
  select set_config('search_path', 'pg_catalog,public', true) as path
), contract as (
  select jsonb_build_object(
    'schema', (select jsonb_build_array(pg_get_userbyid(n.nspowner),
      (select jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
        case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
        a.privilege_type, a.is_grantable) order by case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type)
        from aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a))
      from pg_namespace n where n.nspname = 'public'),
    'defaults', coalesce((select jsonb_agg(jsonb_build_array(pg_get_userbyid(d.defaclrole), d.defaclobjtype,
      (select jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
        case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
        a.privilege_type, a.is_grantable) order by case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type)
        from aclexplode(d.defaclacl) a)) order by pg_get_userbyid(d.defaclrole), d.defaclobjtype)
      from pg_default_acl d where d.defaclnamespace = 0 or d.defaclnamespace = 'public'::regnamespace), '[]'::jsonb),
    'relations', coalesce((select jsonb_agg(jsonb_build_object(
      'name', c.relname, 'kind', c.relkind, 'owner', pg_get_userbyid(c.relowner),
      'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
      'view', case when c.relkind in ('v','m') then pg_get_viewdef(c.oid) end,
      'acl', (select jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
        case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
        a.privilege_type, a.is_grantable) order by case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type)
        from aclexplode(coalesce(c.relacl, acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner))) a),
      'columns', (select jsonb_agg(jsonb_build_array(a.attname, format_type(a.atttypid, a.atttypmod),
        a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin, d.adrelid),
        (select jsonb_agg(jsonb_build_array(pg_get_userbyid(x.grantor),
          case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
          x.privilege_type, x.is_grantable) order by case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end, x.privilege_type)
          from aclexplode(a.attacl) x)) order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
      'constraints', (select jsonb_agg(jsonb_build_array(x.conname, pg_get_constraintdef(x.oid)) order by x.conname)
        from pg_constraint x where x.conrelid = c.oid),
      'policies', (select jsonb_agg(jsonb_build_array(p.polname, p.polcmd, p.polpermissive,
        (select jsonb_agg(case when r = 0 then 'PUBLIC' else pg_get_userbyid(r) end order by case when r = 0 then 'PUBLIC' else pg_get_userbyid(r) end) from unnest(p.polroles) r),
        pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)) order by p.polname)
        from pg_policy p where p.polrelid = c.oid),
      'triggers', (select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname)
        from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal)
    ) order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p','v','m','S','f')), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text, 'owner', pg_get_userbyid(p.proowner),
      'definition', pg_get_functiondef(p.oid),
      'acl', (select jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
        case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
        a.privilege_type, a.is_grantable) order by case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type)
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a)
    ) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind in ('f','p')), '[]'::jsonb),
    'indexes', coalesce((select jsonb_agg(pg_get_indexdef(i.indexrelid) order by c.relname)
      from pg_index i join pg_class c on c.oid = i.indexrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'), '[]'::jsonb)
  ) as value from settings where path is not null
)
select jsonb_build_object('format', 2,
  'postgres_major', current_setting('server_version_num')::int / 10000,
  'schema_fingerprint', md5(contract.value::text)) as catalog from contract;
