-- Animon usage rates from current completed teams.
-- Usage % = percent of tracked teams containing the Animon at least once.
with uploaded_teams as (
  select
    team_id,
    snapshot
  from public.team_current
  where snapshot->>'format' = 'lumentale-community-team-snapshot'
),
team_total as (
  select count(*)::numeric as total_teams
  from uploaded_teams
),
team_members as (
  select
    teams.team_id,
    nullif(member.value->>'animonName', '') as animon_name,
    nullif(member.value->>'display', '') as display_name,
    nullif(member.value->>'formName', '') as form_name,
    nullif(member.value->>'formId', '') as form_id,
    nullif(member.value->>'dexIndex', '')::int as dex_index
  from uploaded_teams as teams
  cross join lateral jsonb_array_elements(teams.snapshot->'members') as member(value)
),
animon_team_usage as (
  select
    animon_name,
    min(dex_index) as dex_index,
    count(distinct team_id) as teams_used,
    count(*) as appearances,
    count(distinct form_id) as forms_used,
    array_agg(distinct display_name order by display_name) as displays_seen
  from team_members
  where animon_name is not null
  group by animon_name
)
select
  dense_rank() over (order by teams_used desc, appearances desc, animon_name asc) as usage_rank,
  dex_index,
  animon_name,
  teams_used,
  appearances,
  forms_used,
  round((teams_used::numeric / nullif(team_total.total_teams, 0)) * 100, 2) as usage_percent,
  displays_seen
from animon_team_usage
cross join team_total
order by teams_used desc, appearances desc, animon_name asc;
