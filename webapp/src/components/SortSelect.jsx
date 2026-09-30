import { useEffect, useRef, useState } from 'react';

export function SortSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
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

  const current = options.find((o) => o.value === value);

  return (
    <div className="ss" ref={ref}>
      <button
        type="button"
        className={`ss__field${open ? ' ss__field_open' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ss__value">{current?.label || 'Выберите'}</span>
        <span className="ss__chevron" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="ss__popup" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`ss__option${o.value === value ? ' ss__option_on' : ''}`}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}