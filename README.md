# Lumentale Team Builder

Static GitHub Pages team builder for Lumentale.

## Local Use

Generate app data from the workspace exports:

```powershell
node .\scripts\build-data.mjs
```

Serve locally:

```powershell
node .\scripts\serve.mjs
```

Then open `http://localhost:4173`.

## Data Sources

- `../DamageCalculatorResearch/data/forms.json`
- `../DamageCalculatorResearch/data/moves.json`
- `../DamageCalculatorResearch/data/stat_formula.json`
- `../DamageCalculatorResearch/data/type_chart.json`
- `../AnimonInventoryGifs_Scale1_12fps/manifest.json`

The builder stores level-100 BP allocation and previews level-50 battle stats for PvP/damage-calculator checks.

## Community Usage

Completed-team usage is stored in Supabase. GitHub Pages submits with the public anon key through a validated RPC function; Row Level Security stays enabled on the table.

Run the setup in the Supabase SQL Editor. The same SQL is available at `tools/supabase-team-current.sql`.

```sql
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
```

Supabase project URL and public anon key in `index.html`

When a team has all 6 slots filled, 5 moves on each Animon, and all BP spent, the app creates a normalized usage snapshot, hashes it, and upserts it into `team_current`. Each saved team slot keeps a local usage team id. Move, item, BP, ability, hidden type, form, and one-Animon composition edits update that same current row. If two or more Animon/Form entries differ from that team id's baseline, the app starts a new usage team id. The hash ignores party slot order, so swapping two slots does not create a new usage entry. Usage sharing is opt-in, saved locally, and can be changed from the top bar. Team names are not included in usage snapshots.
