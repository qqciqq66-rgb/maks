import { ACTIVE_TAGS, AGE_LEVELS, CALM_TAGS } from './data/catalog.js';

export const PAGE_SIZE = 10;
export const SORTS = ['soon', 'new', 'price_asc', 'price_desc'];

export const QUICK = {
  pair: { label: 'Для пар', icon: '💞', test: (e) => e.audience.pair },
  family: { label: 'Семьям', icon: '👨‍👩‍👧', test: (e) => e.audience.family },
  solo: { label: 'Соло', icon: '🧘', test: (e) => e.audience.solo },
  friends: { label: 'Компаниям', icon: '🎉', test: (e) => e.audience.friends },
  active: { label: 'Активные', icon: '⚡', test: (e) => e.tags.some((t) => ACTIVE_TAGS.includes(t)) },
  calm: { label: 'Спокойные', icon: '🍃', test: (e) => e.tags.some((t) => CALM_TAGS.includes(t)) }
};

export class ValidationError extends Error {}

export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function stem(word) {
  if (word.length >= 7) return word.slice(0, -2);
  if (word.length >= 5) return word.slice(0, -1);
  return word;
}

export function queryWords(q) {
  return normalizeText(q).split(' ').filter(Boolean).map(stem);
}

function haystack(e) {
  if (!e.searchText) {
    e.searchText = normalizeText([e.title, e.performer, e.address, e.tags.join(' ')].join(' '));
  }
  return e.searchText;
}

export function matchesQuery(event, words) {
  const text = haystack(event);
  return words.every((w) => text.includes(w));
}

export function effectiveDate(e, today) {
  return e.dateStart >= today ? e.dateStart : today;
}

export function isUpcoming(e, today) {
  return e.dateEnd >= today;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function optNumber(v, name) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`Некорректное значение: ${name}`);
  return n;
}

function optPattern(v, re, name) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !re.test(v)) throw new ValidationError(`Некорректное значение: ${name}`);
  return v;
}

export function normalizeFilters(f = {}, catalog) {
  const filters = {
    dateFrom: optPattern(f.dateFrom, DATE_RE, 'дата с'),
    dateTo: optPattern(f.dateTo, DATE_RE, 'дата по'),
    timeFrom: optPattern(f.timeFrom, TIME_RE, 'время с'),
    timeTo: optPattern(f.timeTo, TIME_RE, 'время по'),
    priceFrom: optNumber(f.priceFrom, 'цена от'),
    priceTo: optNumber(f.priceTo, 'цена до'),
    freeOnly: f.freeOnly === true,
    types: Array.isArray(f.types) ? [...new Set(f.types)] : [],
    format: f.format ?? 'any',
    maxAge: f.maxAge === undefined || f.maxAge === null || f.maxAge === '' ? null : Number(f.maxAge),
    pushkin: f.pushkin === true
  };
  if (filters.types.some((t) => !catalog.categories.includes(t))) throw new ValidationError('Неизвестный тип мероприятия');
  if (!['any', 'indoor', 'outdoor'].includes(filters.format)) throw new ValidationError('Некорректный формат');
  if (filters.maxAge !== null && !AGE_LEVELS.includes(filters.maxAge)) throw new ValidationError('Некорректный возраст');
  return filters;
}

export function normalizeParams(p = {}, catalog) {
  const q = typeof p.q === 'string' ? p.q.slice(0, 100) : '';
  const params = {
    q,
    filters: normalizeFilters(p.filters, catalog),
    quick: p.quick ?? null,
    tags: Array.isArray(p.tags) ? [...new Set(p.tags)] : [],
    sort: p.sort ?? 'soon',
    page: Number.isInteger(p.page) && p.page > 0 ? p.page : 1
  };
  if (params.quick !== null && !(params.quick in QUICK)) throw new ValidationError('Неизвестная категория');
  if (params.tags.some((t) => !catalog.tags.includes(t))) throw new ValidationError('Неизвестный тег');
  if (!SORTS.includes(params.sort)) throw new ValidationError('Неизвестная сортировка');
  return params;
}

export function matchesFilters(e, f) {
  if (f.dateFrom && e.dateEnd < f.dateFrom) return false;
  if (f.dateTo && e.dateStart > f.dateTo) return false;
  if (f.timeFrom || f.timeTo) {
    if (!e.timeStart) return false;
    if (f.timeFrom && e.timeStart < f.timeFrom) return false;
    if (f.timeTo && e.timeStart > f.timeTo) return false;
  }
  if (f.freeOnly && e.price !== 0) return false;
  if (f.priceFrom !== null && e.price < f.priceFrom) return false;
  if (f.priceTo !== null && e.price > f.priceTo) return false;
  if (f.types.length && !f.types.includes(e.category)) return false;
  if (f.format === 'indoor' && !e.indoor) return false;
  if (f.format === 'outdoor' && e.indoor) return false;
  if (f.maxAge !== null && e.age > f.maxAge) return false;
  if (f.pushkin && !e.pushkin) return false;
  return true;
}

export function sortEvents(list, sort, today) {
  const byDate = (a, b) =>
    effectiveDate(a, today).localeCompare(effectiveDate(b, today)) ||
    (a.timeStart ?? '99:99').localeCompare(b.timeStart ?? '99:99') ||
    a.order - b.order;
  const sorted = [...list];
  if (sort === 'new') sorted.sort((a, b) => b.order - a.order);
  else if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price || byDate(a, b));
  else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price || byDate(a, b));
  else sorted.sort(byDate);
  return sorted;
}

export function toCard(e, today) {
  const { searchText, order, ...rest } = e;
  return { ...rest, nextDate: effectiveDate(e, today) };
}

export function searchEvents(catalog, rawParams, today) {
  const params = normalizeParams(rawParams, catalog);
  const words = queryWords(params.q);
  const searching = words.length > 0;

  let list = catalog.events.filter((e) => isUpcoming(e, today));
  if (searching) list = list.filter((e) => matchesQuery(e, words));
  else {
    if (params.quick) list = list.filter(QUICK[params.quick].test);
    if (params.tags.length) list = list.filter((e) => e.tags.some((t) => params.tags.includes(t)));
  }
  list = list.filter((e) => matchesFilters(e, params.filters));
  list = sortEvents(list, params.sort, today);

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, pages);
  return {
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((e) => toCard(e, today)),
    total,
    page,
    pages,
    pageSize: PAGE_SIZE,
    categoriesIgnored: searching && (params.quick !== null || params.tags.length > 0)
  };
}
