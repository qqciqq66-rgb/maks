import { useEffect, useMemo, useRef, useState } from 'react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function parseIso(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}
function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function firstWeekday(y, m) {
  const wd = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return (wd + 6) % 7;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function DatePicker({ value, min, max, onChange, ariaLabel, alignRight }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const p = parseIso(value) || parseIso(min) || { y: 2026, m: 1, d: 1 };
    return { y: p.y, m: p.m };
  });
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = parseIso(value);
  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const grid = useMemo(() => {
    const dim = daysInMonth(view.y, view.m);
    const shift = firstWeekday(view.y, view.m);
    const cells = [];
    for (let i = 0; i < shift; i += 1) cells.push(null);
    for (let d = 1; d <= dim; d += 1) {
      const iso = toIso(view.y, view.m, d);
      cells.push({
        d,
        iso,
        disabled: (min && iso < min) || (max && iso > max),
        today: iso === todayIso
      });
    }
    return cells;
  }, [view, min, max, todayIso]);

  const prevMonth = () => setView((v) => (v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => setView((v) => (v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 }));

  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const label = value
    ? `${selected.d} ${MONTHS[selected.m - 1].toLowerCase()} ${selected.y}`
    : 'дд.мм.гггг';

  return (
    <div className="dp" ref={ref}>
      <button
        type="button"
        className={`dp__field${value ? '' : ' dp__field_empty'}${open ? ' dp__field_open' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dp__value">{label}</span>
        {value ? (
          <span className="dp__clear" onClick={clear} role="button" aria-label="Очистить">✕</span>
        ) : (
          <span className="dp__icon"><CalendarIcon /></span>
        )}
      </button>

      {open && (
        <div className={`dp__popup${alignRight ? ' dp__popup_right' : ''}`} role="dialog">
          <div className="dp__head">
            <button type="button" className="dp__nav" onClick={prevMonth} aria-label="Предыдущий месяц">‹</button>
            <span className="dp__month">{MONTHS[view.m - 1]} {view.y}</span>
            <button type="button" className="dp__nav" onClick={nextMonth} aria-label="Следующий месяц">›</button>
          </div>

          <div className="dp__week">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dp__weekday">{w}</span>
            ))}
          </div>

          <div className="dp__grid">
            {grid.map((c, i) => {
              if (!c) return <span key={`e${i}`} className="dp__empty" />;
              const isSel = selected && selected.y === view.y && selected.m === view.m && selected.d === c.d;
              return (
                <button
                  key={c.iso}
                  type="button"
                  disabled={c.disabled}
                  className={`dp__cell${isSel ? ' dp__cell_on' : ''}${c.today ? ' dp__cell_today' : ''}`}
                  onClick={() => pick(c.iso)}
                >
                  {c.d}
                </button>
              );
            })}
          </div>

          <div className="dp__foot">
            <button
              type="button"
              className="dp__action"
              onClick={() => pick(todayIso)}
              disabled={(min && todayIso < min) || (max && todayIso > max)}
            >
              Сегодня
            </button>
            <button type="button" className="dp__action dp__action_ghost" onClick={clear}>Сбросить</button>
          </div>
        </div>
      )}
    </div>
  );
}