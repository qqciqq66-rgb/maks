import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { akinatorStep, QUESTIONS } from '../src/akinator.js';
import { loadCatalog } from '../src/data/catalog.js';
import { matchesQuery, queryWords, searchEvents, ValidationError } from '../src/search.js';

const DB = fileURLToPath(new URL('../db/events.xlsx', import.meta.url));
const catalog = loadCatalog(DB);

const TODAY = '2026-09-01';

test('база загружается целиком: 87 мероприятий и 28 тегов', () => {
  assert.equal(catalog.events.length, 87);
  assert.equal(catalog.tags.length, 28);
  for (const e of catalog.events) {
    assert.match(e.dateStart, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(e.dateEnd >= e.dateStart);
  }
});

test('поиск: регистр, пунктуация и формы слова', () => {
  const variants = ['концерт', 'КОНЦЕРТЫ', 'концертом!'].map((q) => searchEvents(catalog, { q }, TODAY).total);
  assert.ok(variants[0] > 0);
  assert.equal(new Set(variants).size, 1);
});

test('поиск: все слова запроса должны совпасть (логика «И»)', () => {
  const words = queryWords('Гранд Холл Sting');
  const found = catalog.events.filter((e) => matchesQuery(e, words));
  assert.ok(found.length >= 1);
  for (const e of found) assert.match(e.address + e.title, /Гранд/i);
  assert.equal(searchEvents(catalog, { q: 'Гранд несуществующееслово' }, TODAY).total, 0);
});

test('поиск отменяет быструю категорию и теги', () => {
  const plain = searchEvents(catalog, { q: 'выставка' }, TODAY);
  const withQuick = searchEvents(catalog, { q: 'выставка', quick: 'friends', tags: ['экстремальное'] }, TODAY);
  assert.equal(withQuick.total, plain.total);
  assert.equal(withQuick.categoriesIgnored, true);
});

test('фильтры работают через «И»', () => {
  const r = searchEvents(catalog, { filters: { freeOnly: true, format: 'indoor', maxAge: 6 } }, TODAY);
  assert.ok(r.total > 0);
  for (const e of r.items) {
    assert.equal(e.price, 0);
    assert.equal(e.indoor, true);
    assert.ok(e.age <= 6);
  }
});

test('теги объединяются через «ИЛИ»', () => {
  const a = searchEvents(catalog, { tags: ['мистическое'] }, TODAY).total;
  const b = searchEvents(catalog, { tags: ['экстремальное'] }, TODAY).total;
  const both = searchEvents(catalog, { tags: ['мистическое', 'экстремальное'] }, TODAY).total;
  assert.ok(both >= Math.max(a, b));
});

test('сортировка и пагинация', () => {
  const asc = searchEvents(catalog, { sort: 'price_asc' }, TODAY).items.map((e) => e.price);
  assert.deepEqual(asc, [...asc].sort((x, y) => x - y));
  const soon = searchEvents(catalog, { sort: 'soon' }, TODAY).items.map((e) => e.nextDate);
  assert.deepEqual(soon, [...soon].sort());
  const p1 = searchEvents(catalog, { page: 1 }, TODAY);
  assert.equal(p1.items.length, 10);
  assert.equal(p1.pages, Math.ceil(p1.total / 10));
  const last = searchEvents(catalog, { page: 999 }, TODAY);
  assert.equal(last.page, p1.pages);
});

test('прошедшие мероприятия не показываются', () => {
  const r = searchEvents(catalog, {}, '2026-10-20');
  assert.ok(r.total < catalog.events.length);
  for (const e of r.items) assert.ok(e.nextDate >= '2026-10-20');
});

test('некорректные параметры отклоняются', () => {
  assert.throws(() => searchEvents(catalog, { sort: 'random' }, TODAY), ValidationError);
  assert.throws(() => searchEvents(catalog, { filters: { types: ['рыбалка'] } }, TODAY), ValidationError);
  assert.throws(() => searchEvents(catalog, { filters: { dateFrom: '01.10.2026' } }, TODAY), ValidationError);
});

test('акинатор: не больше 4 вопросов, результат — до 3 событий', () => {
  let answers = [];
  let step = akinatorStep(catalog, { answers }, TODAY);
  let guard = 0;
  while (!step.done && guard < 10) {
    guard += 1;
    answers = [...answers, { questionId: step.question.id, value: step.question.options[0].value }];
    step = akinatorStep(catalog, { answers }, TODAY);
  }
  assert.ok(step.done);
  assert.ok(answers.length <= 4);
  assert.ok(step.results.length >= 1 && step.results.length <= 3);
});

test('акинатор: недавние формулировки не повторяются, пока есть свежие', () => {
  const firstDim = akinatorStep(catalog, {}, TODAY, () => 0).question;
  const dim = QUESTIONS.find((q) => q.id === firstDim.id).dim;
  const variants = QUESTIONS.filter((q) => q.dim === dim).map((q) => q.id);
  const avoid = variants.slice(0, -1);
  const next = akinatorStep(catalog, { avoid }, TODAY, () => 0).question;
  assert.equal(next.id, variants.at(-1));
});

test('акинатор: варианты ответа без тупиков', () => {
  for (let i = 0; i < 20; i += 1) {
    const step = akinatorStep(catalog, {}, TODAY);
    for (const o of step.question.options) {
      const r = akinatorStep(catalog, { answers: [{ questionId: step.question.id, value: o.value }] }, TODAY);
      assert.ok(r.done ? r.results.length > 0 : r.remaining > 0);
    }
  }
});
