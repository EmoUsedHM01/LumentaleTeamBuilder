-- Move usage rates from current completed teams.
-- Usage % = percent of tracked teams containing the move at least once.
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
team_moves as (
  select
    teams.team_id,
    nullif(move.value->>'id', '') as move_id,
    nullif(move.value->>'name', '') as move_name,
    nullif(move.value->>'type', '') as move_type,
    nullif(move.value->>'category', '') as category,
    nullif(move.value->>'power', '')::numeric as power,
    nullif(move.value->>'target', '') as target
  from uploaded_teams as teams
  cross join lateral jsonb_array_elements(teams.snapshot->'members') as member(value)
  cross join lateral jsonb_array_elements(member.value->'moves') as move(value)
  where move.value->>'id' is not null
),
move_team_usage as (
  select
    move_id,
    max(move_name) as move_name,
    max(move_type) as move_type,
    max(category) as category,
    max(power) as power,
    max(target) as target,
    count(distinct team_id) as teams_used,
    count(*) as appearances
  from team_moves
  where move_id is not null
  group by move_id
)
select
  dense_rank() over (order by teams_used desc, appearances desc, move_name asc) as usage_rank,
  move_id,
  move_name,
  move_type,
  category,
  power,
  target,
  teams_used,
  appearances,
  round((teams_used::numeric / nullif(team_total.total_teams, 0)) * 100, 2) as usage_percent
from move_team_usage
cross join team_total
order by teams_used desc, appearances desc, move_name asc;
