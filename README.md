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
  score integer not null check (score >= 0 and score <= 100000),
  best_streak integer not null check (best_streak >= 20 and best_streak <= 1000),
  correct_answers integer not null check (correct_answers >= 20 and correct_answers <= 5000),
  wrong_answers integer not null check (wrong_answers >= 0 and wrong_answers <= 5000),
  game_seconds integer not null default 0 check (game_seconds >= 0 and game_seconds <= 86400),
  created_at timestamptz not null default now()
);

create index leaderboard_scores_rank_idx
on public.leaderboard_scores (score desc, best_streak desc, created_at asc);

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
  and score <= 100000
  and best_streak >= 20
  and best_streak <= 1000
  and correct_answers >= best_streak
  and correct_answers <= 5000
  and wrong_answers >= 0
  and wrong_answers <= 5000
  and game_seconds >= 0
  and game_seconds <= 86400
);
```

Stejný SQL je připravený i v souboru `supabase/leaderboard.sql`. Do aplikace ani do GitHubu nikdy nevkládejte `service_role` key; použijte pouze Supabase publishable key nebo legacy anon key.

Pokud tabulka už existuje, doplňte sloupec času hry a index:

```sql
alter table public.leaderboard_scores
add column if not exists game_seconds integer not null default 0 check (game_seconds >= 0 and game_seconds <= 86400);

create index if not exists leaderboard_scores_rank_idx
on public.leaderboard_scores (score desc, best_streak desc, created_at asc);
```

## GitHub Pages

Workflow v `.github/workflows/deploy.yml` nasadí aplikaci na GitHub Pages z větve `main`. V nastavení repozitáře nastavte Pages source na GitHub Actions a přidejte repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Výsledná adresa bude:

```text
https://<github-uzivatel>.github.io/mala-nasobilka/
```
