import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import { validateInitData } from '../src/auth.js';

const TOKEN = 'test-bot-token';

function sign(params, token = TOKEN) {
  const pairs = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const check = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

const nowSec = Math.floor(Date.now() / 1000);
const base = {
  auth_date: String(nowSec),
  query_id: 'q1',
  user: JSON.stringify({ id: 42, first_name: 'Анна', username: 'anna' })
};

test('принимает корректно подписанные данные', () => {
  const result = validateInitData(sign(base), TOKEN);
  assert.equal(result.user.id, '42');
  assert.equal(result.user.firstName, 'Анна');
});

test('отклоняет данные с чужой подписью', () => {
  assert.equal(validateInitData(sign(base, 'other-token'), TOKEN), null);
});

test('отклоняет изменённые данные', () => {
  const tampered = sign(base).replace('%D0%90%D0%BD%D0%BD%D0%B0', 'Hacker');
  assert.equal(validateInitData(tampered, TOKEN), null);
});

test('отклоняет устаревшие данные', () => {
  const old = sign({ ...base, auth_date: String(nowSec - 3 * 86400) });
  assert.equal(validateInitData(old, TOKEN, { maxAgeSec: 86400 }), null);
});

test('отклоняет данные без hash и пустые строки', () => {
  assert.equal(validateInitData('auth_date=1&user=%7B%7D', TOKEN), null);
  assert.equal(validateInitData('', TOKEN), null);
});
