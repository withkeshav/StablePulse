export default function ThemeToggle({ theme, setTheme, compact = false }) {
  const options = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div class={`theme-toggle ${compact ? 'compact' : ''}`} role="group" aria-label="Theme mode">
      {options.map((opt) => (
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
