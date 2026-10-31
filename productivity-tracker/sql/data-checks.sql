-- ============================================================
-- SQL-проверки целостности данных — Productivity Tracker
-- База: PostgreSQL. Таблицы: users, activities, goals, day_data
-- Каждый запрос ищет «плохие» данные: в идеале результат пустой.
-- ============================================================


-- 1. Дубли пользователей с одинаковым email в разном регистре (BUG-003)
--    Ожидаемо: 0 строк
SELECT LOWER(email)           AS email_normalized,
       COUNT(*)               AS accounts,
       STRING_AGG(email, ', ') AS variants
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;


-- 2. Пользователи с пустым именем или именем из пробелов (BUG-009)
--    Ожидаемо: 0 строк
SELECT id, email, '"' || name || '"' AS name
FROM users
WHERE TRIM(name) = '';


-- 3. Активности с датой не в формате ДД.ММ.ГГГГ, который использует интерфейс (BUG-006)
--    Такие записи не видны пользователю в приложении. Ожидаемо: 0 строк
SELECT id, "userId", date, "createdAt"
FROM activities
WHERE date !~ '^\d{2}\.\d{2}\.\d{4}$';


-- 4. Активности с несуществующим временем, например 25:99 (BUG-005)
--    Ожидаемо: 0 строк
SELECT id, "userId", "startTime", "endTime", duration
FROM activities
WHERE ("startTime" IS NOT NULL AND "startTime" !~ '^([01]\d|2[0-3]):[0-5]\d$')
   OR ("endTime"   IS NOT NULL AND "endTime"   !~ '^([01]\d|2[0-3]):[0-5]\d$');


-- 5. Подозрительно длинные активности (больше 16 часов)
--    Ожидаемо: 0 строк или единичные исключения, которые можно объяснить
SELECT id, "userId", date, "startTime", "endTime", duration
FROM activities
WHERE duration > 16
ORDER BY duration DESC;


-- 6. Сумма часов полезных активностей за день больше 24 — физически невозможно
--    Ожидаемо: 0 строк
SELECT "userId", date, ROUND(SUM(duration)::numeric, 2) AS total_hours
FROM activities
WHERE type = 'good'
GROUP BY "userId", date
HAVING SUM(duration) > 24
ORDER BY total_hours DESC;


-- 7. «Осиротевшие» записи: активности пользователей, которых нет в users
--    Ожидаемо: 0 строк (проверка внешнего ключа)
SELECT a.id, a."userId"
FROM activities a
LEFT JOIN users u ON u.id = a."userId"
WHERE u.id IS NULL;


-- 8. Аналитика: активность пользователей — сколько записей и часов у каждого
--    Пример отчёта, а не проверка на ошибки
SELECT u.id,
       u.email,
       COUNT(a.id)                                     AS activities,
       COALESCE(ROUND(SUM(a.duration)::numeric, 1), 0) AS hours,
       MAX(a."createdAt")::date                        AS last_activity
FROM users u
LEFT JOIN activities a ON a."userId" = u.id
GROUP BY u.id, u.email
ORDER BY activities DESC;


-- 9. Аналитика: пользователи, которые зарегистрировались, но ничего не добавили
--    Точка оттока в воронке «регистрация → первая активность»
SELECT u.id, u.email, u."createdAt"::date AS registered
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM activities a WHERE a."userId" = u.id)
ORDER BY u."createdAt" DESC;


-- 10. Аналитика: конверсия из регистрации в первую активность, %
SELECT COUNT(*)                                                 AS registered,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM activities a WHERE a."userId" = u.id))   AS activated,
       ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM activities a WHERE a."userId" = u.id)) / NULLIF(COUNT(*), 0), 1) AS conversion_pct
FROM users u;
