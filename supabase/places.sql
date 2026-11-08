-- «наша»: власні місця (підписи на мапі: заклади, будівлі…), які додають двоє користувачів.
-- Виконайте в Supabase → SQL Editor ОДИН РАЗ, після schema.sql. Безпечно запускати повторно.
create table if not exists public.places (
  id          text primary key,
  name        text not null default '',
  addr        text not null default '',
  x           double precision not null,   -- метри від Ратуші (схід +)
  z           double precision not null,   -- метри від Ратуші (південь +)
  created_by  text default (lower(auth.jwt() ->> 'email')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places
  for each row execute function public.touch_updated_at();

alter table public.places enable row level security;

drop policy if exists "places: editors read"   on public.places;
drop policy if exists "places: editors insert" on public.places;
drop policy if exists "places: editors update" on public.places;
drop policy if exists "places: editors delete" on public.places;

create policy "places: editors read"   on public.places for select to authenticated using (public.is_editor());
create policy "places: editors insert" on public.places for insert to authenticated with check (public.is_editor());
create policy "places: editors update" on public.places for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "places: editors delete" on public.places for delete to authenticated using (public.is_editor());

-- Якщо мапу можна ПЕРЕГЛЯДАТИ без входу (NEXT_PUBLIC_PUBLIC_VIEW=true) — розкоментуйте:
-- create policy "places: public read" on public.places for select to anon using (true);
