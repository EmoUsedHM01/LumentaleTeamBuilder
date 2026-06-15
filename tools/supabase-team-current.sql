create table if not exists public.team_current (
  team_id text primary key,
  snapshot_hash text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revision integer not null default 1,
  snapshot jsonb not null,
  constraint team_current_team_id_format check (team_id ~ '^[a-zA-Z0-9_-]{16,80}$'),
  constraint team_current_hash_format check (snapshot_hash ~ '^[a-f0-9]{16}$'),
  constraint team_current_snapshot_hash_matches check (snapshot->>'snapshotHash' = snapshot_hash),
  constraint team_current_snapshot_team_matches check (snapshot->>'teamId' = team_id),
  constraint team_current_snapshot_format check (snapshot->>'format' = 'lumentale-community-team-snapshot'),
  constraint team_current_members_count check (
    jsonb_typeof(snapshot->'members') = 'array'
    and jsonb_array_length(snapshot->'members') = 6
  )
);

create index if not exists team_current_snapshot_gin on public.team_current using gin (snapshot);
create index if not exists team_current_last_seen_idx on public.team_current (last_seen desc);

create or replace function public.touch_team_current()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.first_seen := old.first_seen;
    new.last_seen := now();
    if old.snapshot_hash is distinct from new.snapshot_hash then
      new.revision := old.revision + 1;
    else
      new.revision := old.revision;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists touch_team_current on public.team_current;
create trigger touch_team_current
before update on public.team_current
for each row
execute function public.touch_team_current();

alter table public.team_current enable row level security;

grant usage on schema public to anon;
revoke select, insert, update, delete on public.team_current from anon;

create or replace function public.submit_team_current(
  payload_team_id text,
  payload_snapshot_hash text,
  payload_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if payload_team_id is null or payload_team_id !~ '^[a-zA-Z0-9_-]{16,80}$' then
    raise exception 'Invalid team id' using errcode = '22023';
  end if;

  if payload_snapshot_hash is null or payload_snapshot_hash !~ '^[a-f0-9]{16}$' then
    raise exception 'Invalid snapshot hash' using errcode = '22023';
  end if;

  if payload_snapshot->>'format' is distinct from 'lumentale-community-team-snapshot' then
    raise exception 'Invalid snapshot format' using errcode = '22023';
  end if;

  if payload_snapshot->>'snapshotHash' is distinct from payload_snapshot_hash then
    raise exception 'Snapshot hash mismatch' using errcode = '22023';
  end if;

  if payload_snapshot->>'teamId' is distinct from payload_team_id then
    raise exception 'Team id mismatch' using errcode = '22023';
  end if;

  if jsonb_typeof(payload_snapshot->'members') is distinct from 'array' then
    raise exception 'Snapshot members must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(payload_snapshot->'members') <> 6 then
    raise exception 'Snapshot must contain 6 members' using errcode = '22023';
  end if;

  insert into public.team_current (team_id, snapshot_hash, snapshot)
  values (payload_team_id, payload_snapshot_hash, payload_snapshot)
  on conflict (team_id) do update
  set
    snapshot_hash = excluded.snapshot_hash,
    snapshot = excluded.snapshot;
end;
$$;

revoke all on function public.submit_team_current(text, text, jsonb) from public;
grant execute on function public.submit_team_current(text, text, jsonb) to anon;

drop policy if exists "Allow public completed team current inserts" on public.team_current;
create policy "Allow public completed team current inserts"
on public.team_current
for insert
to anon
with check (
  snapshot->>'format' = 'lumentale-community-team-snapshot'
  and snapshot->>'snapshotHash' = snapshot_hash
  and snapshot->>'teamId' = team_id
  and jsonb_typeof(snapshot->'members') = 'array'
  and jsonb_array_length(snapshot->'members') = 6
);

drop policy if exists "Allow public completed team current updates" on public.team_current;
create policy "Allow public completed team current updates"
on public.team_current
for update
to anon
using (true)
with check (
  snapshot->>'format' = 'lumentale-community-team-snapshot'
  and snapshot->>'snapshotHash' = snapshot_hash
  and snapshot->>'teamId' = team_id
  and jsonb_typeof(snapshot->'members') = 'array'
  and jsonb_array_length(snapshot->'members') = 6
);

-- Optional one-time migration from the old append-only table. Existing snapshots
-- become their own current teams, with team_id set to the old snapshot hash.
do $$
begin
  if to_regclass('public.team_snapshots') is not null then
    insert into public.team_current (team_id, snapshot_hash, first_seen, last_seen, snapshot)
    select
      hash as team_id,
      hash as snapshot_hash,
      submitted_at as first_seen,
      submitted_at as last_seen,
      jsonb_set(snapshot, '{teamId}', to_jsonb(hash), true) as snapshot
    from public.team_snapshots
    where snapshot->>'format' = 'lumentale-community-team-snapshot'
    on conflict (team_id) do nothing;
  end if;
end;
$$;
