import { Button } from '@maxhub/max-ui';
import { useState } from 'react';

import { capitalize } from '../format.js';
import { Pill, Sheet } from '../ui.jsx';

export function TagSheet({ tags, value, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  const toggle = (t) => setDraft((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]));

  return (
    <Sheet
      title="Настроение"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={() => setDraft([])}>
            Сбросить
          </Button>
          <Button onClick={() => onApply(draft)}>{draft.length ? `Выбрать (${draft.length})` : 'Показать все'}</Button>
        </>
      }
    >
      <p className="text muted">Отметьте одно или несколько настроений: покажем мероприятия, подходящие хотя бы под одно.</p>
      <div className="pills pills_wrap">
        {tags.map((t) => (
          <Pill key={t} selected={draft.includes(t)} onClick={() => toggle(t)}>
            {capitalize(t)}
          </Pill>
        ))}
      </div>
    </Sheet>
  );
}