import { Button } from '@maxhub/max-ui';
import { useCallback, useEffect, useState } from 'react';

import { api } from './api.js';
import { bridge } from './bridge.js';
import { Akinator } from './screens/Akinator.jsx';
import { Catalog } from './screens/Catalog.jsx';
import { EventDetail } from './screens/EventDetail.jsx';
import { Loader, StateBlock } from './ui.jsx';

export function App() {
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [akinatorOpen, setAkinatorOpen] = useState(() => bridge.startParam() === 'akinator');
  const [akinatorKey, setAkinatorKey] = useState(0);
  const [detail, setDetail] = useState(null);
  const [scrollMemo, setScrollMemo] = useState({});

  const loadMeta = useCallback(() => {
    setMetaError('');
    api.meta().then(setMeta).catch((err) => setMetaError(err.message));
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const screen = detail ? 'detail' : akinatorOpen ? 'akinator' : 'catalog';

  const remember = () => setScrollMemo((m) => ({ ...m, [screen]: window.scrollY }));

  const openDetail = (event) => {
    remember();
    setDetail(event);
    window.scrollTo(0, 0);
  };

  const back = useCallback(() => {
    if (detail) setDetail(null);
    else if (akinatorOpen) setAkinatorOpen(false);
  }, [detail, akinatorOpen]);

  useEffect(() => {
    window.scrollTo(0, scrollMemo[screen] ?? 0);
  }, [screen]);

  useEffect(() => {
    if (screen === 'catalog') return undefined;
    return bridge.backButton.show(back);
  }, [screen, back]);

  const openAkinator = () => {
    remember();
    setAkinatorKey((k) => k + 1);
    setAkinatorOpen(true);
  };

  if (metaError) {
    return (
      <div className="app">
        <StateBlock emoji="😕" title="Не удалось загрузить афишу" text={metaError} role="alert">
          <Button onClick={loadMeta}>Попробовать ещё раз</Button>
        </StateBlock>
      </div>
    );
  }
  if (!meta) {
    return (
      <div className="app">
        <Loader text="Загружаю афишу…" />
      </div>
    );
  }

  return (
    <div className="app">
      <div hidden={screen !== 'catalog'}>
        <Catalog meta={meta} today={meta.today} onOpen={openDetail} onAkinator={openAkinator} />
      </div>

      {akinatorOpen && (
        <div hidden={screen !== 'akinator'}>
          <Akinator key={akinatorKey} today={meta.today} onOpen={openDetail} onClose={() => setAkinatorOpen(false)} />
        </div>
      )}

      {detail && <EventDetail event={detail} today={meta.today} onBack={() => setDetail(null)} />}

      <footer className="footnote">Афиша Красноярска · данные из базы проекта</footer>
    </div>
  );
}
