create table if not exists public.team_snapshots (
  hash text primary key,
  submitted_at timestamptz not null default now(),
  snapshot jsonb not null,
  constraint team_snapshots_hash_format check (hash ~ '^[a-f0-9]{16}$'),
  constraint team_snapshots_snapshot_hash_matches check (snapshot->>'snapshotHash' = hash),
  constraint team_snapshots_snapshot_format check (snapshot->>'format' = 'lumentale-community-team-snapshot'),
  constraint team_snapshots_members_count check (
    jsonb_typeof(snapshot->'members') = 'array'
    and jsonb_array_length(snapshot->'members') = 6
  )
);

alter table public.team_snapshots enable row level security;

grant usage on schema public to anon;
grant insert on public.team_snapshots to anon;

drop policy if exists "Allow public completed team snapshots" on public.team_snapshots;
create policy "Allow public completed team snapshots"
on public.team_snapshots
for insert
to anon
with check (
  snapshot->>'format' = 'lumentale-community-team-snapshot'
  and snapshot->>'snapshotHash' = hash
  and jsonb_typeof(snapshot->'members') = 'array'
  and jsonb_array_length(snapshot->'members') = 6
);
