// UI-тесты: регистрация, вход, цели
const { test, expect } = require('@playwright/test');
const { createUser, uniqueEmail } = require('../helpers');

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByPlaceholder('test@example.com').fill(email);
  await page.getByPlaceholder('Минимум 6 символов').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
}

test('TC-21: регистрация через форму открывает главную страницу', async ({ page }) => {
  await page.goto('/register');
  await page.getByPlaceholder('Иван Иванов').fill('Андрей');
  await page.getByPlaceholder('your@email.com').fill(uniqueEmail('ui'));
  await page.getByPlaceholder('Минимум 6 символов').fill('secret12');
  await page.getByPlaceholder('Повторите пароль').fill('secret12');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Цели на сегодня' })).toBeVisible();
});

test('TC-22: неавторизованного пользователя перенаправляет на вход', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('TC-23 / BUG-008: при слишком длинном имени понятное сообщение, а не «Ошибка сервера»', async ({ page }) => {
  test.fail(true, 'BUG-008: пользователь видит «Ошибка сервера при регистрации»');
  await page.goto('/register');
  await page.getByPlaceholder('Иван Иванов').fill('А'.repeat(60));
  await page.getByPlaceholder('your@email.com').fill(uniqueEmail('uilong'));
  await page.getByPlaceholder('Минимум 6 символов').fill('secret12');
  await page.getByPlaceholder('Повторите пароль').fill('secret12');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page.getByText(/Ошибка сервера/)).toHaveCount(0, { timeout: 3000 });
});

test('TC-24: добавленная цель появляется в списке', async ({ page, request }) => {
  const u = await createUser(request, 'goal');
  await login(page, u.email, u.password);
  const input = page.getByPlaceholder('Добавить новую цель...');
  await input.fill('Пройти раунд вопросов по SQL');
  await input.press('Enter');
  await expect(page.getByText('Пройти раунд вопросов по SQL')).toBeVisible();
});

test('TC-25: граница — цель из 200 символов сохраняется', async ({ page, request }) => {
  const u = await createUser(request, 'goal200');
  await login(page, u.email, u.password);
  const input = page.getByPlaceholder('Добавить новую цель...');
  const text = 'ц'.repeat(200);
  await input.fill(text);
  await input.press('Enter');
  await expect(page.getByText(text)).toBeVisible();
});

test('TC-25 / BUG-007: цель из 201 символа — понятная ошибка, текст не теряется', async ({ page, request }) => {
  test.fail(true, 'BUG-007: только alert «❌ Ошибка», поле очищается');
  const u = await createUser(request, 'goal201');
  await login(page, u.email, u.password);
  const dialogs = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const input = page.getByPlaceholder('Добавить новую цель...');
  const text = 'ц'.repeat(201);
  await input.fill(text);
  await input.press('Enter');
  await expect(input).toHaveValue(text, { timeout: 3000 });
  expect(dialogs.join(' ')).toContain('200');
});

test('TC-26 / BUG-010: без активностей поле «Час» не показывает выдуманное 07:00', async ({ page, request }) => {
  test.fail(true, 'BUG-010: при пустом дне показывается 07:00');
  const u = await createUser(request, 'hour');
  await login(page, u.email, u.password);
  const hourCard = page.getByText('Час', { exact: true }).locator('..');
  await expect(hourCard).not.toContainText('07:00', { timeout: 3000 });
});
