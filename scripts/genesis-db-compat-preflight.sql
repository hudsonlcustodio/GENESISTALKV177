-- GENESIS TALK v0.7 READ-ONLY preflight
select current_database() database_name, now() captured_at;
select table_schema,table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by 1,2;
select table_schema,table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema not in ('pg_catalog','information_schema') order by 1,2,ordinal_position;
select schemaname,tablename,policyname,permissive,roles,cmd from pg_policies order by 1,2,3;
select n.nspname schema_name,p.proname function_name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema') order by 1,2;
