import { useEffect, useRef, useState } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function TimePicker({ value, onChange, ariaLabel, alignRight }) {
  const [open, setOpen] = useState(false);
  const [hh, mm] = value ? value.split(':') : ['', ''];
  const ref = useRef(null);
  const listHRef = useRef(null);
  const listMRef = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    const center = (list) => {
      if (!list) return;
      const el = list.querySelector('.tp__item_on');
      if (el) {
        const top = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
        list.scrollTop = Math.max(0, top);
      } else {
        list.scrollTop = 0;
      }
    };
    center(listHRef.current);
    center(listMRef.current);
  }, [open]);

  const pick = (h, m) => {
    onChange(`${h}:${m}`);
    setOpen(false);
  };
  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="tp" ref={ref}>
      <button
        type="button"
        className={`tp__field${value ? '' : ' tp__field_empty'}${open ? ' tp__field_open' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tp__value">{value || '--:--'}</span>
        {value ? (
          <span className="tp__clear" onClick={clear} role="button" aria-label="Очистить">✕</span>
        ) : (
          <span className="tp__icon"><ClockIcon /></span>
        )}
      </button>

      {open && (
        <div className={`tp__popup${alignRight ? ' tp__popup_right' : ''}`} role="dialog">
          <div className="tp__col">
            <div className="tp__label">Часы</div>
            <div className="tp__list" ref={listHRef}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`tp__item${h === hh ? ' tp__item_on' : ''}`}
                  onClick={() => pick(h, mm || '00')}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="tp__col">
            <div className="tp__label">Минуты</div>
            <div className="tp__list" ref={listMRef}>
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`tp__item${m === mm ? ' tp__item_on' : ''}`}
                  onClick={() => pick(hh || '00', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="tp__foot">
            <button type="button" className="tp__action" onClick={() => pick('00', '00')}>00:00</button>
            <button type="button" className="tp__action tp__action_ghost" onClick={clear}>Сбросить</button>
          </div>
        </div>
      )}
    </div>
  );
}