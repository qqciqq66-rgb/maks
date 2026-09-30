import { capitalize, formatPrice, formatWhenFull } from '../format.js';
import { bridge } from '../bridge.js';

function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className="fact">
      <dt className="fact__label">{label}</dt>
      <dd className="fact__value">{children}</dd>
    </div>
  );
}

export function EventDetail({ event, today, onBack }) {
  const mapUrl = `https://yandex.ru/maps/62/krasnoyarsk/?text=${encodeURIComponent(`Красноярск, ${event.address}`)}`;

  return (
    <article className="screen">
      <div className="topline">
        <button type="button" className="back-btn" onClick={onBack}>
          <span className="back-btn__arrow" aria-hidden>←</span>
          <span>Назад</span>
        </button>
      </div>

      <header className="detail-head">
        <span className="detail-head__icon" aria-hidden>
          {capitalize(event.category).charAt(0)}
        </span>
        <span className="overline">{capitalize(event.category)}</span>
        <h1 className="h1">{event.title}</h1>
        {event.tags.length > 0 && (
          <div className="event__tags">
            {event.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="card">
        <dl className="facts">
          <Fact label="Когда">{formatWhenFull(event, today)}</Fact>
          <Fact label="Где">{event.address}</Fact>
          <Fact label="Кто выступает">{event.performer}</Fact>
          <Fact label="Стоимость">{formatPrice(event)}</Fact>
          <Fact label="Возраст">{`${event.age}+`}</Fact>
          <Fact label="Формат">{event.indoor ? 'В помещении' : 'На улице'}</Fact>
          <Fact label="Пушкинская карта">{event.pushkin ? 'Можно оплатить' : 'Нельзя'}</Fact>
        </dl>
      </div>

      {event.description && (
        <section className="card">
          <h2 className="h3">О мероприятии</h2>
          <p className="text">{event.description}</p>
        </section>
      )}

      <div className="row cta-row">
        {event.link ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => bridge.openLink(event.link)}
          >
            Билеты / записаться
          </button>
        ) : (
          <span className="free-entry">Вход свободный</span>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => bridge.openLink(mapUrl)}
        >
          На карте
        </button>
      </div>
    </article>
  );
}