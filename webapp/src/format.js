const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function addDays(iso, n) {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function formatDay(iso, today) {
  if (today && iso === today) return 'Сегодня';
  if (today && iso === addDays(today, 1)) return 'Завтра';
  const { m, d, wd } = parts(iso);
  return `${WEEKDAYS[wd]}, ${d} ${MONTHS[m - 1]}`;
}

function formatDateOnly(iso) {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatTimeRange(e) {
  if (!e.timeStart) return '';
  return e.timeEnd ? `${e.timeStart}–${e.timeEnd}` : `с ${e.timeStart}`;
}

export function formatWhenShort(e, today) {
  const time = e.timeStart ? `, ${e.timeStart}` : '';
  if (e.dateStart !== e.dateEnd) {
    if (e.dateStart <= today) return `Каждый день до ${formatDateOnly(e.dateEnd)}${time}`;
    return `${formatDateOnly(e.dateStart)} – ${formatDateOnly(e.dateEnd)}${time}`;
  }
  return `${formatDay(e.dateStart, today)}${time}`;
}

export function formatWhenFull(e, today) {
  const time = formatTimeRange(e);
  const date =
    e.dateStart === e.dateEnd
      ? formatDay(e.dateStart, today)
      : `с ${formatDateOnly(e.dateStart)} по ${formatDateOnly(e.dateEnd)}`;
  return time ? `${date}, ${time}` : date;
}

export function formatPrice(e) {
  if (e.price === 0) return 'Бесплатно';
  const sum = `${e.price.toLocaleString('ru-RU')} ₽`;
  return e.priceType === 'range' ? `от ${sum}` : sum;
}

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function plural(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
