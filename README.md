# QA Portfolio — Андрей Голубев

Портфолио ручного тестирования, тестирования API и автоматизации. Для практики я тестирую свои pet-проекты: так в портфолио реальные баги, реальные данные и автотесты, которые запускаются.

[GitHub](https://github.com/golubev21312-afk) · [Telegram](https://t.me/blac_aqua94) · [hh.ru](https://hh.ru/resume/13293c48ff0ff894370039ed1f41494b46336d)

## Проекты

| Проект | Что сделано | Итог |
|---|---|---|
| [Productivity Tracker](productivity-tracker/) | Чек-лист, тест-кейсы, баг-репорты, Postman, SQL-проверки, автотесты на Playwright | 13 багов (1 critical, 7 major), 47 автотестов |

## Что здесь можно посмотреть

- **Баг-репорты** — шаги воспроизведения, ожидаемый и фактический результат, severity и priority, скриншоты, предложение по исправлению: [пример](productivity-tracker/bug-reports.md)
- **Тест-дизайн** — классы эквивалентности, граничные значения, негативные проверки: [тест-кейсы](productivity-tracker/test-cases.md)
- **API-тестирование** — статус-коды, тела ответов, авторизация по токену, доступ к чужим данным, подмена владельца записи: [Postman](productivity-tracker/postman/), [автотесты](productivity-tracker/autotests/tests/api/)
- **SQL** — поиск некорректных данных, JOIN, GROUP BY / HAVING, аналитика воронки: [запросы](productivity-tracker/sql/data-checks.sql)
- **Автоматизация** — Playwright, API + UI, тесты на известные баги через `test.fail`: [автотесты](productivity-tracker/autotests/)

## Инструменты

Chrome DevTools · Postman / Newman · SQL (PostgreSQL) · Playwright · Git · Jira / YouGile
