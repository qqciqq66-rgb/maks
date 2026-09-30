import { Button } from '@maxhub/max-ui';
import { useEffect, useState } from 'react';

import { api } from '../api.js';
import { DatePicker } from '../components/DatePicker.jsx';
import { TimePicker } from '../components/TimePicker.jsx';
import { capitalize, plural } from '../format.js';
import { Pill, Sheet } from '../ui.jsx';

export const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  timeFrom: '',
  timeTo: '',
  priceFrom: '',
  priceTo: '',
  freeOnly: false,
  types: [],
  format: 'any',
  maxAge: null,
  pushkin: false
};

export function countFilters(f) {
  let n = 0;
  if (f.dateFrom || f.dateTo) n += 1;
  if (f.timeFrom || f.timeTo) n += 1;
  if (f.freeOnly || f.priceFrom !== '' || f.priceTo !== '') n += 1;
  if (f.types.length) n += 1;
  if (f.format !== 'any') n += 1;
  if (f.maxAge !== null) n += 1;
  if (f.pushkin) n += 1;
  return n;
}

export function toApiFilters(f) {
  return {
    ...f,
    priceFrom: f.freeOnly || f.priceFrom === '' ? null : Number(f.priceFrom),
    priceTo: f.freeOnly || f.priceTo === '' ? null : Number(f.priceTo),
    dateFrom: f.dateFrom || null,
    dateTo: f.dateTo || null,
    timeFrom: f.timeFrom || null,
    timeTo: f.timeTo || null
  };
}

const FORMATS = [
  ['any', 'Неважно'],
  ['indoor', 'В помещении'],
  ['outdoor', 'На улице']
];

export function FilterSheet({ meta, value, baseParams, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  const [preview, setPreview] = useState(null);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const invalidDate = draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo;
  const invalidTime = draft.timeFrom && draft.timeTo && draft.timeFrom > draft.timeTo;
  const invalidPrice = !draft.freeOnly && draft.priceFrom !== '' && draft.priceTo !== '' && Number(draft.priceFrom) > Number(draft.priceTo);
  const invalid = invalidDate || invalidTime || invalidPrice;

  useEffect(() => {
    if (invalid) {
      setPreview(null);
      return undefined;
    }
    let alive = true;
    const t = setTimeout(() => {
      api
        .search({ ...baseParams, filters: toApiFilters(draft), page: 1 })
        .then((r) => alive && setPreview(r.total))
        .catch(() => alive && setPreview(null));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [draft, baseParams, invalid]);

  const toggleType = (t) => set({ types: draft.types.includes(t) ? draft.types.filter((x) => x !== t) : [...draft.types, t] });

  const footer = (
    <>
      <button
        type="button"
        className="sheet-action sheet-action_secondary"
        onClick={() => setDraft(EMPTY_FILTERS)}
      >
        Сбросить
      </button>
      <button
        type="button"
        className="sheet-action sheet-action_primary"
        disabled={invalid || preview === 0}
        onClick={() => onApply(draft)}
      >
        {preview === null ? 'Показать' : preview === 0 ? 'Ничего не найдено' : `Показать ${preview}`}
      </button>
    </>
  );

  return (
    <Sheet title="Подобрать" onClose={onClose} footer={footer}>
      <fieldset className="field">
        <legend className="label">Дата</legend>
        <div className="range">
          <DatePicker
            value={draft.dateFrom}
            min={meta.today}
            max={meta.dateMax}
            onChange={(v) => set({ dateFrom: v })}
            ariaLabel="Дата с"
          />
          <span className="range__sep">—</span>
          <DatePicker
            value={draft.dateTo}
            min={draft.dateFrom || meta.today}
            max={meta.dateMax}
            onChange={(v) => set({ dateTo: v })}
            ariaLabel="Дата по"
            alignRight
          />
        </div>
        {invalidDate && <p className="error-text">Дата «с» позже даты «по»</p>}
      </fieldset>

      <fieldset className="field">
        <legend className="label">Время начала</legend>
        <div className="range">
          <TimePicker value={draft.timeFrom} onChange={(v) => set({ timeFrom: v })} ariaLabel="Время с" />
          <span className="range__sep">—</span>
          <TimePicker value={draft.timeTo} onChange={(v) => set({ timeTo: v })} ariaLabel="Время по" alignRight />
        </div>
        {invalidTime && <p className="error-text">Время «с» позже времени «по»</p>}
      </fieldset>

      <fieldset className="field">
        <legend className="label">Цена, ₽</legend>
        <div className="range">
          <input type="number" inputMode="numeric" min="0" className="control" placeholder="от 0" aria-label="Цена от" disabled={draft.freeOnly} value={draft.freeOnly ? '' : draft.priceFrom} onChange={(e) => set({ priceFrom: e.target.value })} />
          <span className="range__sep">—</span>
          <input type="number" inputMode="numeric" min="0" className="control" placeholder={`до ${meta.priceMax}`} aria-label="Цена до" disabled={draft.freeOnly} value={draft.freeOnly ? '' : draft.priceTo} onChange={(e) => set({ priceTo: e.target.value })} />
        </div>
        <label className="check">
          <input type="checkbox" checked={draft.freeOnly} onChange={(e) => set({ freeOnly: e.target.checked })} />
          Только бесплатные
        </label>
        {invalidPrice && <p className="error-text">Цена «от» больше цены «до»</p>}
      </fieldset>

      <fieldset className="field">
        <legend className="label">Тип мероприятия</legend>
        <div className="pills pills_wrap">
          {meta.categories.map((c) => (
            <Pill
              key={c.value}
              selected={draft.types.includes(c.value)}
              onClick={() => toggleType(c.value)}
              dataCat={c.value}
            >
              {capitalize(c.value)}
            </Pill>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="label">Формат</legend>
        <div className="pills pills_wrap">
          {FORMATS.map(([v, l]) => (
            <Pill key={v} selected={draft.format === v} onClick={() => set({ format: v })}>
              {l}
            </Pill>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="label">Возраст: не старше</legend>
        <div className="pills pills_wrap">
          <Pill selected={draft.maxAge === null} onClick={() => set({ maxAge: null })}>
            Любой
          </Pill>
          {meta.ageLevels.map((a) => (
            <Pill key={a} selected={draft.maxAge === a} onClick={() => set({ maxAge: a })}>
              {a}+
            </Pill>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <label className="check">
          <input type="checkbox" checked={draft.pushkin} onChange={(e) => set({ pushkin: e.target.checked })} />
          Можно по «Пушкинской карте»
        </label>
      </fieldset>

      {preview !== null && preview > 0 && (
        <p className="text muted">
          Найдётся {preview} {plural(preview, 'мероприятие', 'мероприятия', 'мероприятий')}
        </p>
      )}
    </Sheet>
  );
}