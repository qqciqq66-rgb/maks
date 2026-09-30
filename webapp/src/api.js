import { bridge } from './bridge.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(bridge.initData() ? { 'X-Max-Init-Data': bridge.initData() } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Что-то пошло не так. Попробуйте ещё раз.');
  return data;
}

export const api = {
  meta: () => request('GET', '/api/meta'),
  me: () => request('GET', '/api/me'),
  search: (params) => request('POST', '/api/events/search', params),
  event: (id) => request('GET', `/api/events/${encodeURIComponent(id)}`),
  akinator: (body) => request('POST', '/api/akinator', body)
};
