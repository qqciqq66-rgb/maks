import { Button, Spinner } from '@maxhub/max-ui';
import { useEffect } from 'react';

import { bridge } from './bridge.js';
import { capitalize, formatPrice, formatWhenShort } from './format.js';

const CAT_GRADIENTS = {
  'фестиваль':      'linear-gradient(135deg, #FFE066 0%, #FF9500 50%, #FF2D00 100%)',
  'festival':       'linear-gradient(135deg, #FFE066 0%, #FF9500 50%, #FF2D00 100%)',
  'концерт':        'linear-gradient(135deg, #FF6BA8 0%, #FF1E5E 50%, #9F003F 100%)',
  'concert':        'linear-gradient(135deg, #FF6BA8 0%, #FF1E5E 50%, #9F003F 100%)',
  'спектакль':      'linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #3B1370 100%)',
  'театр':          'linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #3B1370 100%)',
  'theatre':        'linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #3B1370 100%)',
  'выставка':       'linear-gradient(135deg, #34E89E 0%, #10B981 50%, #065F46 100%)',
  'exhibition':     'linear-gradient(135deg, #34E89E 0%, #10B981 50%, #065F46 100%)',
  'спорт':          'linear-gradient(135deg, #22D3EE 0%, #0284C7 50%, #0C4A6E 100%)',
  'sport':          'linear-gradient(135deg, #22D3EE 0%, #0284C7 50%, #0C4A6E 100%)',
  'активный отдых': 'linear-gradient(135deg, #BEF264 0%, #65A30D 50%, #14532D 100%)',
  'active':         'linear-gradient(135deg, #BEF264 0%, #65A30D 50%, #14532D 100%)',
  'экскурсия':      'linear-gradient(135deg, #2DD4BF 0%, #0D9488 50%, #134E4A 100%)',
  'excursion':      'linear-gradient(135deg, #2DD4BF 0%, #0D9488 50%, #134E4A 100%)',
  'лекция':         'linear-gradient(135deg, #93C5FD 0%, #2563EB 50%, #1E3A8A 100%)',
  'lecture':        'linear-gradient(135deg, #93C5FD 0%, #2563EB 50%, #1E3A8A 100%)',
  'квест':          'linear-gradient(135deg, #FDBA74 0%, #EA580C 50%, #7C2D12 100%)',
  'quest':          'linear-gradient(135deg, #FDBA74 0%, #EA580C 50%, #7C2D12 100%)',
  'мастер-класс':   'linear-gradient(135deg, #F5B7FF 0%, #D946EF 50%, #86198F 100%)',
  'masterclass':    'linear-gradient(135deg, #F5B7FF 0%, #D946EF 50%, #86198F 100%)',
  'кино':           'linear-gradient(135deg, #A5B4FC 0%, #6366F1 50%, #1E1B4B 100%)',
  'cinema':         'linear-gradient(135deg, #A5B4FC 0%, #6366F1 50%, #1E1B4B 100%)'
};

const CAT_SHADOWS = {
  'фестиваль':      '0 8px 22px rgba(255, 61, 0, 0.55), 0 0 0 3px rgba(255, 224, 102, 0.4)',
  'festival':       '0 8px 22px rgba(255, 61, 0, 0.55), 0 0 0 3px rgba(255, 224, 102, 0.4)',
  'концерт':        '0 8px 22px rgba(176, 0, 70, 0.55), 0 0 0 3px rgba(255, 107, 168, 0.4)',
  'concert':        '0 8px 22px rgba(176, 0, 70, 0.55), 0 0 0 3px rgba(255, 107, 168, 0.4)',
  'спектакль':      '0 8px 22px rgba(76, 29, 149, 0.55), 0 0 0 3px rgba(192, 132, 252, 0.4)',
  'театр':          '0 8px 22px rgba(76, 29, 149, 0.55), 0 0 0 3px rgba(192, 132, 252, 0.4)',
  'theatre':        '0 8px 22px rgba(76, 29, 149, 0.55), 0 0 0 3px rgba(192, 132, 252, 0.4)',
  'выставка':       '0 8px 22px rgba(4, 120, 87, 0.55), 0 0 0 3px rgba(52, 232, 158, 0.4)',
  'exhibition':     '0 8px 22px rgba(4, 120, 87, 0.55), 0 0 0 3px rgba(52, 232, 158, 0.4)',
  'спорт':          '0 8px 22px rgba(7, 89, 133, 0.55), 0 0 0 3px rgba(34, 211, 238, 0.4)',
  'sport':          '0 8px 22px rgba(7, 89, 133, 0.55), 0 0 0 3px rgba(34, 211, 238, 0.4)',
  'активный отдых': '0 8px 22px rgba(20, 83, 45, 0.55), 0 0 0 3px rgba(190, 242, 100, 0.45)',
  'active':         '0 8px 22px rgba(20, 83, 45, 0.55), 0 0 0 3px rgba(190, 242, 100, 0.45)',
  'экскурсия':      '0 8px 22px rgba(19, 78, 74, 0.55), 0 0 0 3px rgba(45, 212, 191, 0.45)',
  'excursion':      '0 8px 22px rgba(19, 78, 74, 0.55), 0 0 0 3px rgba(45, 212, 191, 0.45)',
  'лекция':         '0 8px 22px rgba(30, 58, 138, 0.55), 0 0 0 3px rgba(147, 197, 253, 0.45)',
  'lecture':        '0 8px 22px rgba(30, 58, 138, 0.55), 0 0 0 3px rgba(147, 197, 253, 0.45)',
  'квест':          '0 8px 22px rgba(124, 45, 18, 0.55), 0 0 0 3px rgba(253, 186, 116, 0.5)',
  'quest':          '0 8px 22px rgba(124, 45, 18, 0.55), 0 0 0 3px rgba(253, 186, 116, 0.5)',
  'мастер-класс':   '0 8px 22px rgba(134, 25, 143, 0.55), 0 0 0 3px rgba(245, 183, 255, 0.45)',
  'masterclass':    '0 8px 22px rgba(134, 25, 143, 0.55), 0 0 0 3px rgba(245, 183, 255, 0.45)',
  'кино':           '0 8px 22px rgba(30, 27, 75, 0.55), 0 0 0 3px rgba(165, 180, 252, 0.45)',
  'cinema':         '0 8px 22px rgba(30, 27, 75, 0.55), 0 0 0 3px rgba(165, 180, 252, 0.45)'
};

export function Pill({ selected, onClick, children, count, dataCat }) {
  const classes = ['pill'];
  if (selected) classes.push('pill_on');
  if (dataCat) classes.push('pill_cat');

  const key = dataCat ? String(dataCat).toLowerCase() : '';
  const style = selected && CAT_GRADIENTS[key]
    ? {
        background: CAT_GRADIENTS[key],
        color: '#ffffff',
        fontWeight: 700,
        boxShadow: CAT_SHADOWS[key] || '0 8px 22px rgba(0,0,0,0.3)',
        textShadow: '0 1px 3px rgba(0,0,0,0.25)',
        borderColor: 'transparent'
      }
    : undefined;

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-pressed={selected}
      data-cat={dataCat || undefined}
      style={style}
      onClick={() => {
        bridge.haptic('select');
        onClick();
      }}
    >
      {children}
      {count > 0 && <span className="pill__count">{count}</span>}
    </button>
  );
}

export function Sheet({ title, onClose, footer, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet__backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="sheet__panel">
        <div className="sheet__head">
          <h2 className="h2">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Badges({ event }) {
  return (
    <span className="badges">
      <span className="badge">{event.age}+</span>
      {event.pushkin && <span className="badge badge_pushkin">Пушкинская карта</span>}
    </span>
  );
}

export function EventCard({ event, today, onOpen, highlighted, dimmed }) {
  return (
    <button
      type="button"
      className={`event${highlighted ? ' event_hl' : ''}${dimmed ? ' event_dim' : ''}`}
      onClick={() => onOpen(event)}
    >
      <span className="event__icon" aria-hidden>
        {capitalize(event.category).charAt(0)}
      </span>
      <span className="event__body">
        <span className="event__cat">{capitalize(event.category)}</span>
        <span className="event__title">{event.title}</span>
        <span className="event__when">{formatWhenShort(event, today)}</span>
        {event.tags.length > 0 && (
          <span className="event__tags">
            {event.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </span>
        )}
        <span className="event__foot">
          <span className="event__price">{formatPrice(event)}</span>
          <Badges event={event} />
        </span>
      </span>
    </button>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Страницы">
      <Button size="small" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Назад
      </Button>
      <span className="pager__info">
        {page} из {pages}
        <span className="muted"> · {total}</span>
      </span>
      <Button size="small" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Вперёд →
      </Button>
    </nav>
  );
}

export function Loader({ text }) {
  return (
    <div className="state" role="status">
      <Spinner size={28} />
      <p className="text">{text}</p>
    </div>
  );
}

export function StateBlock({ title, text, children, role = 'status' }) {
  return (
    <div className="state" role={role}>
      {title && <h3 className="h3">{title}</h3>}
      {text && <p className="text muted">{text}</p>}
      {children && <div className="row row_center">{children}</div>}
    </div>
  );
}