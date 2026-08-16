import { useEffect, useRef, useState } from 'preact/hooks';

const OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

export default function ThemeToggle({ theme, setTheme, compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = OPTIONS.find((o) => o.id === theme)?.label || 'Light';

  if (!compact) {
    return (
      <div class="theme-toggle" role="group" aria-label="Theme mode">
        {OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.id}
            class={`theme-option ${theme === opt.id ? 'active' : ''}`}
            onClick={() => setTheme(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div class={`theme-control ${compact ? 'compact' : ''}`} ref={rootRef}>
      <button
        type="button"
        class="theme-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
      </button>
      {open ? (
        <div class="theme-menu" role="listbox" aria-label="Appearance">
          <p>APPEARANCE</p>
          {OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.id}
              role="option"
              aria-selected={theme === opt.id}
              class={theme === opt.id ? 'active' : ''}
              onClick={() => {
                setTheme(opt.id);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
