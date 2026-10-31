const API = process.env.API_URL || 'http://localhost:3001/api';

// Уникальный email для каждого прогона, чтобы тесты не зависели друг от друга
const uniqueEmail = (prefix = 'qa') =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@test.ru`;

// Регистрирует пользователя через API и возвращает { email, password, token }
async function createUser(request, prefix = 'qa') {
  const email = uniqueEmail(prefix);
  const password = 'secret12';
  const res = await request.post(`${API}/auth/register`, {
    data: { email, password, name: 'QA Tester' },
  });
  if (res.status() !== 201) {
    throw new Error(`Не удалось создать пользователя: ${res.status()} ${await res.text()}`);
  }
  const { token } = await res.json();
  return { email, password, token };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { API, uniqueEmail, createUser, auth };
