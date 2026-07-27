-- Fixes "permission denied for table events" etc. RLS policies gate which
-- ROWS a role can see; a role still needs base object privileges before RLS
-- is even evaluated. service_role bypasses RLS (BYPASSRLS attribute) but
-- still requires these grants — bypassing RLS isn't the same as bypassing
-- privileges.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;

grant execute on function has_role(uuid, app_role) to anon, authenticated, service_role;
