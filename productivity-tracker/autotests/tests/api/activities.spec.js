// API-тесты активностей: валидация, расчёт длительности, права доступа
const { test, expect } = require('@playwright/test');
const { API, createUser, auth } = require('../helpers');

const good = (over = {}) => ({
  date: '31.10.2026', type: 'good', startTime: '10:00', endTime: '12:30',
  category: 'Работа', action: 'Тестирование', ...over,
});

test.describe('Активности', () => {
  let user;
  test.beforeAll(async ({ request }) => { user = await createUser(request, 'act'); });

  test('TC-12: создание полезной активности, длительность считается автоматически', async ({ request }) => {
    const res = await request.post(`${API}/activities`, { headers: auth(user.token), data: good() });
    expect(res.status()).toBe(201);
    const { activity } = await res.json();
    expect(activity.duration).toBe(2.5);
  });

  test('TC-13: активность через полночь (23:00 → 01:00) длится 2 часа', async ({ request }) => {
    const res = await request.post(`${API}/activities`, {
      headers: auth(user.token), data: good({ startTime: '23:00', endTime: '01:00' }),
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).activity.duration).toBe(2);
  });

  test('TC-14: без обязательного поля action → 400', async ({ request }) => {
    const data = good(); delete data.action;
    const res = await request.post(`${API}/activities`, { headers: auth(user.token), data });
    expect(res.status()).toBe(400);
  });

  test('TC-15: граница — время 23:59 принимается', async ({ request }) => {
    const res = await request.post(`${API}/activities`, {
      headers: auth(user.token), data: good({ startTime: '23:59', endTime: '23:59' }),
    });
    expect(res.status()).toBe(201);
  });

  for (const [start, end] of [['24:00', '24:00'], ['25:99', '99:00']]) {
    test(`TC-15 / BUG-005: несуществующее время ${start} отклоняется`, async ({ request }) => {
      test.fail(true, 'BUG-005: недопустимое время принимается');
      const res = await request.post(`${API}/activities`, {
        headers: auth(user.token), data: good({ startTime: start, endTime: end }),
      });
      expect(res.status()).toBe(400);
    });
  }

  test('TC-16 / BUG-006: дата в неверном формате отклоняется', async ({ request }) => {
    test.fail(true, 'BUG-006: поле date принимает любую строку');
    const res = await request.post(`${API}/activities`, {
      headers: auth(user.token), data: good({ date: 'не дата' }),
    });
    expect(res.status()).toBe(400);
  });

  test('TC-17 / BUG-008: недопустимый type → 400, а не 500', async ({ request }) => {
    test.fail(true, 'BUG-008: ошибка валидации возвращается как 500');
    const res = await request.post(`${API}/activities`, {
      headers: auth(user.token), data: { date: '31.10.2026', type: 'neutral' },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-18: без токена список активностей недоступен (401)', async ({ request }) => {
    expect((await request.get(`${API}/activities`)).status()).toBe(401);
  });

  test('TC-19: чужую активность нельзя прочитать, изменить и удалить', async ({ request }) => {
    const created = await request.post(`${API}/activities`, { headers: auth(user.token), data: good() });
    const { id } = (await created.json()).activity;
    const stranger = await createUser(request, 'stranger');

    expect((await request.get(`${API}/activities/single/${id}`, { headers: auth(stranger.token) })).status()).toBe(404);
    expect((await request.put(`${API}/activities/${id}`, { headers: auth(stranger.token), data: { action: 'взлом' } })).status()).toBe(404);
    expect((await request.delete(`${API}/activities/${id}`, { headers: auth(stranger.token) })).status()).toBe(404);

    // владелец по-прежнему видит свою активность без изменений
    const own = await request.get(`${API}/activities/single/${id}`, { headers: auth(user.token) });
    expect(own.status()).toBe(200);
    expect((await own.json()).activity.action).toBe('Тестирование');
  });

  test('TC-20 / BUG-008: нечисловой id → 400/404, а не 500', async ({ request }) => {
    test.fail(true, 'BUG-008: id "abc" приводит к 500 и тексту ошибки базы данных');
    const res = await request.get(`${API}/activities/single/abc`, { headers: auth(user.token) });
    expect([400, 404]).toContain(res.status());
  });

  test('TC-27 / BUG-012: через PUT нельзя перенести активность в чужой аккаунт', async ({ request }) => {
    test.fail(true, 'BUG-012: поле userId принимается из тела запроса');
    const victim = await createUser(request, 'victim');
    const me = await (await request.get(`${API}/auth/me`, { headers: auth(victim.token) })).json();
    const created = await request.post(`${API}/activities`, {
      headers: auth(user.token), data: good({ date: '05.11.2026' }),
    });
    const { id } = (await created.json()).activity;

    await request.put(`${API}/activities/${id}`, { headers: auth(user.token), data: { userId: me.user.id } });

    const victimList = await request.get(`${API}/activities/05.11.2026`, { headers: auth(victim.token) });
    expect((await victimList.json()).count).toBe(0);
  });

  test('TC-28 / BUG-012: через PUT нельзя перенести цель в чужой аккаунт', async ({ request }) => {
    test.fail(true, 'BUG-012: поле userId принимается из тела запроса');
    const victim = await createUser(request, 'victimgoal');
    const me = await (await request.get(`${API}/auth/me`, { headers: auth(victim.token) })).json();
    const created = await request.post(`${API}/goals`, {
      headers: auth(user.token), data: { date: '05.11.2026', text: 'Чужая цель' },
    });
    const { id } = (await created.json()).goal;

    await request.put(`${API}/goals/${id}`, { headers: auth(user.token), data: { userId: me.user.id } });

    const victimGoals = await request.get(`${API}/goals/05.11.2026`, { headers: auth(victim.token) });
    expect((await victimGoals.json()).goals).toHaveLength(0);
  });

  test('TC-29 / BUG-013: ошибка не раскрывает текст из базы данных', async ({ request }) => {
    test.fail(true, 'BUG-013: в ответе текст ошибки PostgreSQL');
    const res = await request.get(`${API}/activities/single/abc`, { headers: auth(user.token) });
    expect(await res.text()).not.toContain('invalid input syntax');
  });
});
