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

## Community Usage Snapshots

Completed-team usage is stored in Supabase. GitHub Pages submits with the public anon key; Row Level Security allows anonymous inserts only.

Create this table and policies in the Supabase SQL Editor. The same SQL is also available at `tools/supabase-team-snapshots.sql`.

```sql
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
```

Then set the Supabase project URL and public anon key in `index.html`:

```html
<meta name="lumentale-community-usage-supabase-url" content="https://your-project-ref.supabase.co">
<meta name="lumentale-community-usage-supabase-anon-key" content="your-public-anon-key">
<meta name="lumentale-community-usage-table" content="team_snapshots">
```

When a team has all 6 slots filled, 5 moves on each Animon, and all BP spent, the app creates a normalized usage snapshot, hashes it, and sends it once per unique team from that browser.
