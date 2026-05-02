# Malá násobilka

Mobilní PWA aplikace pro děti 7-10 let na procvičení malé násobilky. Aplikace sama vyhodnocuje odpovědi, upravuje četnost příkladů podle úspěšnosti, počítá skóre a po 20 správných odpovědích v řadě odemkne oslavu i zápis do tabulky skóre.

## Lokální spuštění

```bash
npm install
npm run dev
```

Produkční kontrola:

```bash
npm test
npm run lint
npm run build
npm run preview
```

## Supabase

Zkopírujte `.env.example` do `.env` a doplňte:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Tabulka:

```sql
create table public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 2 and 18),
  score integer not null check (score >= 0),
  best_streak integer not null check (best_streak >= 20),
  correct_answers integer not null check (correct_answers >= 0),
  wrong_answers integer not null check (wrong_answers >= 0),
  game_seconds integer not null default 0 check (game_seconds >= 0),
  created_at timestamptz not null default now()
);

alter table public.leaderboard_scores enable row level security;

create policy "Anyone can read leaderboard"
on public.leaderboard_scores
for select
to anon
using (true);

create policy "Anyone can add child-safe score"
on public.leaderboard_scores
for insert
to anon
with check (
  char_length(nickname) between 2 and 18
  and score >= 0
  and best_streak >= 20
  and correct_answers >= best_streak
  and wrong_answers >= 0
  and game_seconds >= 0
);
```

Pokud tabulka už existuje, doplňte sloupec času hry:

```sql
alter table public.leaderboard_scores
add column if not exists game_seconds integer not null default 0 check (game_seconds >= 0);
```

## GitHub Pages

Workflow v `.github/workflows/deploy.yml` nasadí aplikaci na GitHub Pages z větve `main`. V nastavení repozitáře nastavte Pages source na GitHub Actions a přidejte repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Výsledná adresa bude:

```text
https://<github-uzivatel>.github.io/mala-nasobilka/
```
