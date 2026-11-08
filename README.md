# наша — спільна 3D-мапа місць

Next.js (App Router) + React + TypeScript + Tailwind CSS v4. 3D-модель Львова (Three.js) з вашого `nasha-mapa.html`, усі 25 наявних місць збережено.
Нове: вхід лише для двох пошт, спільна база (Supabase), додавання/редагування місць двома людьми з живими оновленнями, режим **«Ходити»** (рух камери з поточного виду).

## Вхід

Заходити можуть лише дві пошти (`src/config.js` → `ALLOWED_EMAILS`): `1chaikovskam@gmail.com` і `pavlokostereva@gmail.com`. Вхід — пошта + пароль.

## Швидкий старт (без бекенду)

```bash
npm install
npm run dev      # розробка
npm run typecheck
```

Без `.env.local` сайт працює в **локальному режимі**: форма входу, усі 25 місць на місці, зміни лишаються лише в цьому браузері. Тут пароль перевіряється в браузері (в коді лежить тільки його хеш) — це «замок» інтерфейсу, а не справжній захист: хто відкриє код сторінки, може його обійти. Для справжнього захисту та спільного редагування використовуйте Supabase.

## Спільний режим для двох людей (Supabase, безкоштовно)

1. Створіть проєкт на https://supabase.com.
2. **SQL Editor** → виконайте `supabase/schema.sql` (там уже вписано ваші дві пошти), потім `supabase/seed.sql` (25 початкових місць).
3. **Authentication → Users → Add user → Create new user**: додайте обидві пошти з паролем, увімкніть «Auto Confirm User».
4. **Authentication → Sign In / Providers → Email**: вимкніть «Allow new users to sign up» (щоб ніхто сторонній не міг створити акаунт).
5. **Project Settings → API**: скопіюйте `Project URL` і `anon public` key.
6. `cp .env.example .env.local` і заповніть `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. `npm run dev` → увійдіть поштою й паролем. Доступ до даних перевіряє сама база (RLS): навіть із чужим акаунтом нічого не прочитати й не змінити.

### Додати людину / забрати доступ

```sql
insert into public.editors (email) values ('new@email.com');
delete from public.editors where email = 'old@email.com';
```

### Хто може лише дивитись?

За замовчуванням — ніхто: без дозволеної пошти нічого не видно. Якщо потрібно показувати мапу всім за посиланням — див. закоментований рядок `marks: public read` у `schema.sql` і `NEXT_PUBLIC_PUBLIC_VIEW=true`.

## Деплой

`npm run build` → `npm start`, або деплой на Vercel (найпростіше для Next.js). Додайте ті ж `NEXT_PUBLIC_*` змінні в налаштуваннях хостингу й адресу сайту — в Redirect URLs Supabase.

## Керування

- **+ Позначити подію** → клік на будівлю/вулицю → заповніть підпис (зберігається автоматично).
- **Ходити**: камера їде з поточного виду, як у скролі. `W A S D` / стрілки — вперед/назад/вбік, `Пробіл` — вгору, `C` — вниз, `Shift` — швидше; мишею обертаєте, колесом масштабуєте; `Esc` — зупинити. На телефоні — екранні кнопки. **«Позначити в центрі»** ставить місце в центрі кадру.
- **Маршрут до Винників** — автоекскурсія, **Позначки** — список, **Назви** — підписи місць.

## Структура

```
src/engine/createCityEngine.js   3D-рушій (місто, світло, позначки, ходіння) — код моделі з оригіналу
src/data/osm.js                  будівлі/вулиці/вода з OpenStreetMap (з оригіналу)
src/data/initialMarks.json       25 початкових місць
src/vendor/                      three.js r128 + OrbitControls (як в оригіналі, без npm-залежності)
src/config.js                    дозволені пошти
src/lib/                         Supabase, API (remote/local), вхід
src/components/                  інтерфейс на React
supabase/                        schema.sql, seed.sql
```

## Стилі й кольори
Усі кольори, шрифти й тіні задані в одному місці — `@theme` у `src/styles/globals.css` (bg, paper, ink, muted, rule, warm, danger…).
У компонентах використовуються лише токени (`bg-paper`, `text-muted`, `border-ink`, `text-danger`), без hex-значень.
Класи елементів, які створює 3D-рушій (`.pin`, `.lm`…), описані там само у `@layer components`.
