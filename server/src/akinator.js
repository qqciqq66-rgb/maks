import { ACTIVE_TAGS, CALM_TAGS } from './data/catalog.js';
import { isUpcoming, sortEvents, toCard, ValidationError } from './search.js';

export const MAX_QUESTIONS = 4;
export const RESULT_SIZE = 3;

const ANY = 'any';

const DIMENSIONS = {
  energy: {
    active: (e) => e.tags.some((t) => ACTIVE_TAGS.includes(t)),
    calm: (e) => e.tags.some((t) => CALM_TAGS.includes(t))
  },
  company: {
    family: (e) => e.audience.family,
    pair: (e) => e.audience.pair,
    solo: (e) => e.audience.solo,
    friends: (e) => e.audience.friends
  },
  format: {
    indoor: (e) => e.indoor,
    outdoor: (e) => !e.indoor
  },
  budget: {
    free: (e) => e.price === 0,
    upto500: (e) => e.price <= 500,
    upto1500: (e) => e.price <= 1500
  }
};

export const QUESTIONS = [

  { id: 'energy-1', dim: 'energy', emoji: '🔋', text: 'Сколько у вас сегодня энергии?', options: { active: 'Хоть горы сворачивать', calm: 'Хочется поберечь силы', any: 'Где-то посередине' } },
  { id: 'energy-2', dim: 'energy', emoji: '🎚️', text: 'Какой темп вечера вам ближе?', options: { active: 'Движ и драйв', calm: 'Медленно и с чувством', any: 'Без разницы' } },
  { id: 'energy-3', dim: 'energy', emoji: '🌡️', text: 'Если бы настроение было погодой, то какой?', options: { active: 'Солнечно и ветрено', calm: 'Тёплый тихий вечер', any: 'Переменная облачность' } },
  { id: 'energy-4', dim: 'energy', emoji: '🛋️', text: 'Диван или приключения?', options: { active: 'Приключения!', calm: 'Почти диван, но вне дома', any: 'Решите за меня' } },
  { id: 'energy-5', dim: 'energy', emoji: '🎧', text: 'Какая музыка звучит у вас в голове?', options: { active: 'Что-то громкое и быстрое', calm: 'Спокойный лоуфай', any: 'Тишина, я открыт(а) всему' } },

  { id: 'company-1', dim: 'company', emoji: '👥', text: 'С кем идёте?', options: { solo: 'Один / одна', pair: 'Вдвоём', friends: 'С друзьями', family: 'С семьёй', any: 'Пока не знаю' } },
  { id: 'company-2', dim: 'company', emoji: '📸', text: 'Кто будет на совместном фото?', options: { solo: 'Только я, селфи', pair: 'Мы с половинкой', friends: 'Вся наша банда', family: 'Семья, включая детей', any: 'Фото не планируется' } },
  { id: 'company-3', dim: 'company', emoji: '🎟️', text: 'Сколько билетов берём?', options: { solo: 'Один', pair: 'Два, это свидание', friends: 'Много, идём толпой', family: 'Семейный набор', any: 'Посмотрим по ходу' } },
  { id: 'company-4', dim: 'company', emoji: '💬', text: 'С кем потом будете обсуждать впечатления?', options: { solo: 'Сам(а) с собой', pair: 'С любимым человеком', friends: 'В общем чате друзей', family: 'За семейным ужином', any: 'С кем угодно' } },

  { id: 'format-1', dim: 'format', emoji: '🏠', text: 'Под крышей или на свежем воздухе?', options: { indoor: 'Под крышей', outdoor: 'На свежем воздухе', any: 'Неважно' } },
  { id: 'format-2', dim: 'format', emoji: '🧥', text: 'Готовы надеть куртку и выйти на улицу?', options: { outdoor: 'Да, куртка уже на мне', indoor: 'Лучше в тепле', any: 'Как получится' } },
  { id: 'format-3', dim: 'format', emoji: '🌲', text: 'Что вам сейчас нужнее?', options: { outdoor: 'Небо и деревья', indoor: 'Уютный зал', any: 'И то и другое хорошо' } },
  { id: 'format-4', dim: 'format', emoji: '☔', text: 'Если пойдёт дождь, это испортит планы?', options: { indoor: 'Да, хочу под крышу', outdoor: 'Нет, я не сахарный', any: 'Не думал(а) об этом' } },

  { id: 'budget-1', dim: 'budget', emoji: '💸', text: 'Сколько готовы потратить на человека?', options: { free: 'Ничего, только бесплатно', upto500: 'До 500 ₽', upto1500: 'До 1500 ₽', any: 'Не считаю' } },
  { id: 'budget-2', dim: 'budget', emoji: '👛', text: 'Что говорит ваш кошелёк?', options: { free: '«Сегодня без меня»', upto500: '«Ну, по чуть-чуть»', upto1500: '«Можно себя порадовать»', any: '«Гуляем!»' } },
  { id: 'budget-3', dim: 'budget', emoji: '☕', text: 'Досуг дороже чашки кофе — это нормально?', options: { free: 'Нет, хочу бесплатно', upto500: 'Максимум пара чашек (до 500 ₽)', upto1500: 'До 1500 ₽ — нормально', any: 'Цена не главное' } },
  { id: 'budget-4', dim: 'budget', emoji: '🪙', text: 'Какой бюджет на впечатления?', options: { free: '0 ₽', upto500: 'до 500 ₽', upto1500: 'до 1500 ₽', any: 'любой' } }
];

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

function applyAnswer(pool, dim, value) {
  if (value === ANY) return pool;
  return pool.filter(DIMENSIONS[dim][value]);
}

export function pickTop(pool, today, size = RESULT_SIZE) {
  const sorted = sortEvents(pool, 'soon', today);
  const picked = [];
  const cats = new Set();
  for (const e of sorted) {
    if (picked.length >= size) break;
    if (!cats.has(e.category)) {
      picked.push(e);
      cats.add(e.category);
    }
  }
  for (const e of sorted) {
    if (picked.length >= size) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked;
}

function validateAnswers(answers) {
  if (!Array.isArray(answers) || answers.length > MAX_QUESTIONS) throw new ValidationError('Некорректные ответы');
  const seen = new Set();
  return answers.map((a) => {
    const q = QUESTION_BY_ID.get(a?.questionId);
    if (!q || !(a.value in q.options) || seen.has(q.dim)) throw new ValidationError('Некорректный ответ');
    seen.add(q.dim);
    return { dim: q.dim, value: a.value, questionId: q.id };
  });
}

export function akinatorStep(catalog, { answers: rawAnswers = [], avoid = [] } = {}, today, rng = Math.random) {
  const answers = validateAnswers(rawAnswers);
  const avoidSet = new Set(Array.isArray(avoid) ? avoid.filter((x) => typeof x === 'string') : []);

  let pool = catalog.events.filter((e) => isUpcoming(e, today));
  for (const a of answers) {
    const next = applyAnswer(pool, a.dim, a.value);
    if (next.length > 0) pool = next;
  }

  const finish = () => ({
    done: true,
    remaining: pool.length,
    asked: answers.length,
    results: pickTop(pool, today).map((e) => toCard(e, today))
  });

  if (pool.length <= RESULT_SIZE || answers.length >= MAX_QUESTIONS) return finish();

  const answeredDims = new Set(answers.map((a) => a.dim));
  const candidates = Object.keys(DIMENSIONS)
    .filter((dim) => !answeredDims.has(dim))
    .map((dim) => {
      const counts = Object.fromEntries(Object.keys(DIMENSIONS[dim]).map((v) => [v, applyAnswer(pool, dim, v).length]));
      const useful = Object.values(counts).some((n) => n > 0 && n < pool.length);
      return { dim, counts, useful };
    })
    .filter((c) => c.useful);

  if (candidates.length === 0) return finish();

  const { dim, counts } = candidates[Math.floor(rng() * candidates.length)];
  const variants = QUESTIONS.filter((q) => q.dim === dim);
  const fresh = variants.filter((q) => !avoidSet.has(q.id));
  const from = fresh.length ? fresh : variants;
  const question = from[Math.floor(rng() * from.length)];

  const options = Object.entries(question.options)
    .filter(([value]) => value === ANY || counts[value] > 0)
    .map(([value, label]) => ({ value, label }));

  return {
    done: false,
    remaining: pool.length,
    step: answers.length + 1,
    maxSteps: MAX_QUESTIONS,
    question: { id: question.id, emoji: question.emoji, text: question.text, options }
  };
}
