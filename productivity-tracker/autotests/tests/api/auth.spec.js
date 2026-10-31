// API-тесты регистрации и входа
// Тесты, помеченные test.fail(), проверяют ОЖИДАЕМОЕ поведение и сейчас падают
// из-за найденного бага. Playwright считает их «ожидаемо упавшими» (зелёными).
// Когда баг починят, такой тест станет красным — это сигнал убрать test.fail().
const { test, expect } = require('@playwright/test');
const { API, uniqueEmail, createUser, auth } = require('../helpers');

test.describe('Регистрация', () => {
  test('TC-01: успешная регистрация возвращает 201 и токен', async ({ request }) => {
    const email = uniqueEmail();
    const res = await request.post(`${API}/auth/register`, {
      data: { email, password: 'secret12', name: 'Андрей' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(email);
    expect(body.user).not.toHaveProperty('password');
  });

  test('TC-02: повторная регистрация с тем же email отклоняется (400)', async ({ request }) => {
    const { email } = await createUser(request);
    const res = await request.post(`${API}/auth/register`, {
      data: { email, password: 'secret12', name: 'Дубль' },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-03 / BUG-003: email в другом регистре считается тем же пользователем', async ({ request }) => {
    test.fail(true, 'BUG-003: сервер создаёт второй аккаунт для того же email в другом регистре');
    const { email } = await createUser(request, 'case');
    const res = await request.post(`${API}/auth/register`, {
      data: { email: email.toUpperCase(), password: 'secret12', name: 'Дубль' },
    });
    expect(res.status()).toBe(400);
  });

  for (const email of ['info@shop.online', 'info@company.info', 'user+qa@gmail.com']) {
    test(`TC-04 / BUG-004: валидный email ${email} принимается`, async ({ request }) => {
      test.fail(true, 'BUG-004: регулярное выражение отклоняет валидные адреса');
      const unique = email.replace('@', `.${Date.now()}@`);
      const res = await request.post(`${API}/auth/register`, {
        data: { email: unique, password: 'secret12', name: 'Почта' },
      });
      expect(res.status()).toBe(201);
    });
  }

  for (const email of ['mail.ru', '@mail.ru', 'user@', 'user@mail', '']) {
    test(`TC-04: невалидный email "${email}" отклоняется (400)`, async ({ request }) => {
      const res = await request.post(`${API}/auth/register`, {
        data: { email, password: 'secret12', name: 'Почта' },
      });
      expect(res.status()).toBe(400);
    });
  }

  for (const [title, data] of [
    ['без email', { password: 'secret12', name: 'A' }],
    ['без пароля', { email: 'np@test.ru', name: 'A' }],
    ['без имени', { email: 'nn@test.ru', password: 'secret12' }],
  ]) {
    test(`TC-02b: обязательные поля — ${title} → 400`, async ({ request }) => {
      const res = await request.post(`${API}/auth/register`, { data });
      expect(res.status()).toBe(400);
    });
  }

  // TC-05: граничные значения длины пароля (допустимо 6–100)
  for (const [len, expected] of [[5, 400], [6, 201], [100, 201]]) {
    test(`TC-05: пароль из ${len} символов → ${expected}`, async ({ request }) => {
      const res = await request.post(`${API}/auth/register`, {
        data: { email: uniqueEmail(`pw${len}`), password: 'p'.repeat(len), name: 'Пароль' },
      });
      expect(res.status()).toBe(expected);
    });
  }

  test('TC-05 / BUG-008: пароль из 101 символа → 400, а не 500', async ({ request }) => {
    test.fail(true, 'BUG-008: 500 и неверный текст «минимум 6 символов»');
    const res = await request.post(`${API}/auth/register`, {
      data: { email: uniqueEmail('pw101'), password: 'p'.repeat(101), name: 'Пароль' },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-06 / BUG-009: имя из одних пробелов отклоняется', async ({ request }) => {
    test.fail(true, 'BUG-009: имя "   " принимается');
    const res = await request.post(`${API}/auth/register`, {
      data: { email: uniqueEmail('spaces'), password: 'secret12', name: '   ' },
    });
    expect(res.status()).toBe(400);
  });

  // TC-07: граничные значения длины имени (допустимо 1–50)
  for (const len of [1, 50]) {
    test(`TC-07: имя из ${len} символов принимается`, async ({ request }) => {
      const res = await request.post(`${API}/auth/register`, {
        data: { email: uniqueEmail(`name${len}`), password: 'secret12', name: 'а'.repeat(len) },
      });
      expect(res.status()).toBe(201);
    });
  }

  test('TC-07 / BUG-008: имя из 51 символа → 400, а не 500', async ({ request }) => {
    test.fail(true, 'BUG-008: ошибка валидации возвращается как 500');
    const res = await request.post(`${API}/auth/register`, {
      data: { email: uniqueEmail('name51'), password: 'secret12', name: 'а'.repeat(51) },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Вход и токен', () => {
  test('TC-08: вход с верными данными возвращает токен', async ({ request }) => {
    const { email, password } = await createUser(request);
    const res = await request.post(`${API}/auth/login`, { data: { email, password } });
    expect(res.status()).toBe(200);
    expect((await res.json()).token).toBeTruthy();
  });

  test('TC-09: вход с неверным паролем → 401 без подсказки, что именно неверно', async ({ request }) => {
    const { email } = await createUser(request);
    const res = await request.post(`${API}/auth/login`, { data: { email, password: 'wrong123' } });
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe('Неверный email или пароль');
  });

  test('TC-10: /auth/me без токена → 401, с токеном → данные пользователя', async ({ request }) => {
    expect((await request.get(`${API}/auth/me`)).status()).toBe(401);
    const { email, token } = await createUser(request);
    const res = await request.get(`${API}/auth/me`, { headers: auth(token) });
    expect(res.status()).toBe(200);
    expect((await res.json()).user.email).toBe(email);
  });

  test('TC-11: поддельный токен → 401', async ({ request }) => {
    const res = await request.get(`${API}/auth/me`, { headers: auth('abc.def.ghi') });
    expect(res.status()).toBe(401);
  });
});
