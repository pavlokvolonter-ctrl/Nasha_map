-- «наша»: схема бази для Supabase. Виконайте в Supabase → SQL Editor (один раз).
-- Потім виконайте seed.sql (початкові місця) і додайте дві пошти — див. внизу.

-- ---------- 1) Хто має доступ ----------
create table if not exists public.editors (
  email text primary key check (email = lower(email))
);
alter table public.editors enable row level security;

-- кожен бачить лише свій рядок (так застосунок дізнається, що пошта дозволена)
drop policy if exists "editors: see own row" on public.editors;
create policy "editors: see own row" on public.editors
  for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create or replace function public.is_editor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.editors e
    where e.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- 2) Місця на мапі ----------
create table if not exists public.marks (
  seq         bigint generated always as identity,       -- порядок у списку
  id          text primary key,                          -- створює застосунок; зберігаємо id з оригінальної мапи
  x           double precision not null,                 -- метри від Ратуші (схід +)
  z           double precision not null,                 -- метри від Ратуші (південь +)
  top         double precision not null default 1,       -- висота, на якій висить підпис
  bid         integer          not null default -1,       -- 1 = прив'язано до будівлі, -1 = на землі
  lx          double precision not null,                 -- де ставити світлову пляму
  lz          double precision not null,
  ly          double precision not null default 4,
  date_label  text    not null default '',
  title       text    not null default '',
  body        text    not null default '',
  is_example  boolean not null default false,
  created_by  text    default (lower(auth.jwt() ->> 'email')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists marks_touch on public.marks;
create trigger marks_touch before update on public.marks
  for each row execute function public.touch_updated_at();

alter table public.marks enable row level security;

drop policy if exists "marks: editors read"   on public.marks;
drop policy if exists "marks: editors insert" on public.marks;
drop policy if exists "marks: editors update" on public.marks;
drop policy if exists "marks: editors delete" on public.marks;

create policy "marks: editors read"   on public.marks for select to authenticated using (public.is_editor());
create policy "marks: editors insert" on public.marks for insert to authenticated with check (public.is_editor());
create policy "marks: editors update" on public.marks for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "marks: editors delete" on public.marks for delete to authenticated using (public.is_editor());

-- Якщо хочете, щоб мапу могли ПЕРЕГЛЯДАТИ всі з посиланням (без входу) — розкоментуйте
-- і поставте NEXT_PUBLIC_PUBLIC_VIEW=true у .env.local:
-- create policy "marks: public read" on public.marks for select to anon using (true);

-- ---------- 3) Живі оновлення (щоб обоє бачили нові місця одразу) ----------
do $$
begin
  alter publication supabase_realtime add table public.marks;
exception when duplicate_object then null;
end $$;

-- ---------- 4) ДВІ ПОШТИ З ДОСТУПОМ ----------
insert into public.editors (email) values
  ('1chaikovskam@gmail.com'),
  ('pavlokostereva@gmail.com')
on conflict do nothing;

-- Самі акаунти (пошта + пароль) створюються в Supabase → Authentication → Users → Add user → Create new user
-- (поставте «Auto Confirm User»). Пароль задаєте там — у код і в базу відкритим текстом він не потрапляє.
