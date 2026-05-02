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
