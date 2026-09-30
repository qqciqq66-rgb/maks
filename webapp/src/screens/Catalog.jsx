import { Button, Icon16SearchOutline, Input, Spinner } from '@maxhub/max-ui';
import { useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../api.js';
import { SortSelect } from '../components/SortSelect.jsx';
import { plural } from '../format.js';
import { EventCard, Pagination, Pill, StateBlock } from '../ui.jsx';
import { countFilters, EMPTY_FILTERS, FilterSheet, toApiFilters } from './FilterSheet.jsx';
import { TagSheet } from './TagSheet.jsx';

const SORT_LABELS = {
  soon: 'Сначала ближайшие',
  new: 'Новинки',
  price_asc: 'Сначала дешевле',
  price_desc: 'Сначала дороже'
};

export function Catalog({ meta, today, onOpen, onAkinator }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [quick, setQuick] = useState(null);
  const [tags, setTags] = useState([]);
  const [sort, setSort] = useState('soon');
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState(null);
  const [result, setResult] = useState({ status: 'loading' });
  const [reload, setReload] = useState(0);
  const listTop = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const onQueryChange = (value) => {
    setQuery(value);
    if (value.trim()) {
      setQuick(null);
      setTags([]);
    }
    setPage(1);
  };

  const selectQuick = (key) => {
    setQuery('');
    setDebouncedQuery('');
    setQuick((q) => (q === key ? null : key));
    setPage(1);
  };

  const params = useMemo(
    () => ({ q: debouncedQuery, filters: toApiFilters(filters), quick, tags, sort }),
    [debouncedQuery, filters, quick, tags, sort]
  );

  const sheetBaseParams = useMemo(() => ({ q: debouncedQuery, quick, tags, sort }), [debouncedQuery, quick, tags, sort]);

  useEffect(() => {
    let alive = true;
    setResult((r) => ({ ...r, status: r.data ? 'refreshing' : 'loading' }));
    api
      .search({ ...params, page })
      .then((data) => alive && setResult({ status: 'ready', data }))
      .catch((err) => alive && setResult({ status: 'error', error: err.message }));
    return () => {
      alive = false;
    };
  }, [params, page, reload]);

  const filterCount = countFilters(filters);
  const anyActive = Boolean(query || quick || tags.length || filterCount);

  const resetAll = () => {
    setQuery('');
    setDebouncedQuery('');
    setFilters(EMPTY_FILTERS);
    setQuick(null);
    setTags([]);
    setPage(1);
  };

  const goPage = (p) => {
    setPage(p);
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const data = result.data;

  return (
    <section className="screen">
      <header className="hero">
        <span className="overline">Решено · {meta.city}</span>
        <h1 className="h1">Куда пойти?</h1>
        <p className="text muted">
          {meta.total} {plural(meta.total, 'мероприятие', 'мероприятия', 'мероприятий')} на ближайшие недели
        </p>
      </header>

      <Input
        type="text"
        inputMode="search"
        mode="default"
        placeholder="Концерт, артист, место…"
        iconBefore={<Icon16SearchOutline />}
        withClearButton
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="Поиск"
        enterKeyHint="search"
      />

      <div className="row cta-row">
        <Button size="small" variant="secondary" onClick={() => setSheet('filters')}>
          Подобрать{filterCount > 0 ? ` · ${filterCount}` : ''}
        </Button>
        <Button size="small" onClick={onAkinator}>
          Найдём вместе
        </Button>
      </div>

      <div className="pills pills_scroll" role="group" aria-label="Категории">
        {meta.quick.map((q) => (
          <Pill key={q.key} selected={quick === q.key} onClick={() => selectQuick(q.key)}>
            {q.label}
          </Pill>
        ))}
        <Pill selected={tags.length > 0} count={tags.length} onClick={() => setSheet('tags')}>
          Теги
        </Pill>
      </div>

      <div className="toolbar" ref={listTop}>
        <div className="toolbar__found">
          {data ? (
            <>
              Найдено <strong>{data.total}</strong>
            </>
          ) : (
            'Ищем…'
          )}
          {result.status === 'refreshing' && <Spinner size={16} className="inline-spinner" />}
        </div>
        <SortSelect
          value={sort}
          ariaLabel="Сортировка"
          options={meta.sorts.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          onChange={(v) => { setSort(v); setPage(1); }}
        />
      </div>

      {anyActive && (
  <div className="row">
    <button type="button" className="reset-btn" onClick={resetAll}>
      <span className="reset-btn__icon" aria-hidden>✕</span>
      <span>Сбросить всё</span>
    </button>
  </div>
)}

      {result.status === 'loading' && !data && (
        <div className="state">
          <Spinner size={28} />
        </div>
      )}

      {result.status === 'error' && (
        <StateBlock title="Не удалось загрузить афишу" text={result.error} role="alert">
          <Button onClick={() => setReload((n) => n + 1)}>Попробовать ещё раз</Button>
        </StateBlock>
      )}

      {data && result.status !== 'error' && data.total === 0 && (
        <StateBlock title="Ничего не нашлось" text="Попробуйте изменить запрос или условия. Или давайте найдём вместе.">
          {anyActive && (
            <Button variant="secondary" onClick={resetAll}>
              Сбросить всё
            </Button>
          )}
          <Button onClick={onAkinator}>Найдём вместе</Button>
        </StateBlock>
      )}

      {data && result.status !== 'error' && data.total > 0 && (
        <>
          <div className={`list${result.status === 'refreshing' ? ' list_busy' : ''}`}>
            {data.items.map((e) => (
              <EventCard key={e.id} event={e} today={today} onOpen={onOpen} />
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={goPage} />
        </>
      )}

      {sheet === 'filters' && (
        <FilterSheet
          meta={meta}
          value={filters}
          baseParams={sheetBaseParams}
          onClose={() => setSheet(null)}
          onApply={(f) => {
            setFilters(f);
            setPage(1);
            setSheet(null);
          }}
        />
      )}

      {sheet === 'tags' && (
        <TagSheet
          tags={meta.tags}
          value={tags}
          onClose={() => setSheet(null)}
          onApply={(t) => {
            setTags(t);
            if (t.length) {
              setQuery('');
              setDebouncedQuery('');
            }
            setPage(1);
            setSheet(null);
          }}
        />
      )}
    </section>
  );
}