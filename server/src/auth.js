import { createHmac, timingSafeEqual } from 'node:crypto';

export function validateInitData(initData, botToken, { maxAgeSec = 86400, now = Date.now() } = {}) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hashes = params.getAll('hash');
  if (hashes.length !== 1) return null;
  const hash = hashes[0];

  const pairs = [];
  for (const [key, value] of params) {
    if (key !== 'hash') pairs.push([key, value]);
  }
  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const checkString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(hash.toLowerCase(), 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const authDateRaw = Number(params.get('auth_date'));
  if (!Number.isFinite(authDateRaw) || authDateRaw <= 0) return null;
  const authDateMs = authDateRaw > 1e12 ? authDateRaw : authDateRaw * 1000;
  if (now - authDateMs > maxAgeSec * 1000) return null;

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }
  if (!user || user.id === undefined || user.id === null) return null;

  return {
    user: {
      id: String(user.id),
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || ''
    },
    startParam: params.get('start_param') || '',
    authDate: new Date(authDateMs).toISOString()
  };
}

export const DEV_USER = { id: 'dev-user', firstName: 'Тестовый пользователь', lastName: '', username: '' };
