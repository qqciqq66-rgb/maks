import { readXlsx } from './xlsx.js';

export const CATEGORY_ICONS = {
  'концерт': '🎵',
  'спектакль': '🎭',
  'выставка': '🖼️',
  'фестиваль': '🎪',
  'спорт': '⚽',
  'активный отдых': '🏃',
  'экскурсия': '🧭',
  'лекция': '🎓',
  'квест': '🧩',
  'мастер-класс': '🎨',
  'кино': '🎬'
};

export const ACTIVE_TAGS = ['активное', 'энергичное', 'спортивное', 'экстремальное', 'танцевальное', 'шумное', 'азартное', 'командное'];
export const CALM_TAGS = ['спокойное', 'расслабленное', 'уютное', 'душевное', 'атмосферное', 'романтичное', 'ностальгическое'];

export const AGE_LEVELS = [0, 6, 12, 16, 18];

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function excelDate(n) {
  return new Date(EXCEL_EPOCH + n * 86400000).toISOString().slice(0, 10);
}

function parseDateRange(value) {
  if (typeof value === 'number') {
    const d = excelDate(value);
    return [d, d];
  }
  const parts = String(value ?? '')
    .split(/\s+[–—-]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = parts.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
  if (valid.length === 0) return [null, null];
  return [valid[0], valid[valid.length - 1]];
}

function parseTime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const minutes = Math.round((value % 1) * 24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  const m = String(value).match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

const flag = (v) => v === 1 || v === '1' || v === true;
const str = (v) => (v === null || v === undefined ? '' : String(v).trim());

function safeLink(v) {
  const s = str(v);
  return /^https?:\/\//i.test(s) ? s : '';
}

export function loadCatalog(path) {
  const sheets = readXlsx(path);
  const eventsSheet = sheets.events ?? Object.values(sheets)[0];
  if (!eventsSheet?.length) throw new Error('В базе не найден лист с мероприятиями');

  const [header, ...rows] = eventsSheet;
  const col = Object.fromEntries(header.map((h, i) => [str(h), i]));
  const required = ['id', 'title', 'category', 'date', 'address', 'price'];
  const missing = required.filter((c) => !(c in col));
  if (missing.length) throw new Error(`В базе нет колонок: ${missing.join(', ')}`);
  const cell = (row, name) => (name in col ? row[col[name]] : null);

  const events = [];
  const problems = [];
  rows.forEach((row, index) => {
    const title = str(cell(row, 'title'));
    if (!title) return;
    const [dateStart, dateEnd] = parseDateRange(cell(row, 'date'));
    if (!dateStart) {
      problems.push(`строка ${index + 2}: не распознана дата «${str(cell(row, 'date'))}»`);
      return;
    }
    const price = Number(cell(row, 'price'));
    const ageMatch = str(cell(row, 'age_restriction')).match(/\d+/);
    events.push({
      id: str(cell(row, 'id')) || String(index + 1).padStart(4, '0'),
      order: index,
      title,
      description: str(cell(row, 'description')),
      category: str(cell(row, 'category')).toLowerCase(),
      icon: CATEGORY_ICONS[str(cell(row, 'category')).toLowerCase()] ?? '📍',
      tags: ['tag_1', 'tag_2', 'tag_3'].map((t) => str(cell(row, t)).toLowerCase()).filter(Boolean),
      dateStart,
      dateEnd,
      timeStart: parseTime(cell(row, 'time_start')),
      timeEnd: parseTime(cell(row, 'time_end')),
      address: str(cell(row, 'address')),
      indoor: str(cell(row, 'indoor_outdoor')).toLowerCase() !== 'outdoor',
      price: Number.isFinite(price) ? price : 0,
      priceType: str(cell(row, 'price_type')) === 'range' ? 'range' : 'fixed',
      age: ageMatch ? Number(ageMatch[0]) : 0,
      audience: {
        family: flag(cell(row, 'family')),
        pair: flag(cell(row, 'pair')),
        solo: flag(cell(row, 'solo')),
        friends: flag(cell(row, 'group_of_friends'))
      },
      pushkin: flag(cell(row, 'pushkin_card')),
      link: safeLink(cell(row, 'link')),
      recurrence: str(cell(row, 'recurrence')) === 'постоянное' ? 'permanent' : 'once',
      performer: str(cell(row, 'performer'))
    });
  });

  const tagSheet = sheets['теги для акинатора'];
  const dictionary = (tagSheet ?? [])
    .filter((r) => typeof r[0] === 'number' && str(r[1]))
    .map((r) => str(r[1]).toLowerCase());
  const tags = dictionary.length ? dictionary : [...new Set(events.flatMap((e) => e.tags))].sort();

  if (problems.length) console.warn(`[catalog] пропущены строки:\n  ${problems.join('\n  ')}`);

  return {
    events,
    tags,
    categories: [...new Set(events.map((e) => e.category))],
    priceMax: Math.max(0, ...events.map((e) => e.price)),
    loadedAt: new Date().toISOString()
  };
}
