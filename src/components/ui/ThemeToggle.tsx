import { useStore } from '../../store/useStore';
import { toggleTheme } from '../../theme/theme';

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <span className="theme-toggle__icon" data-theme-icon={theme} aria-hidden="true">
        <span />
      </span>
      <span className="label theme-toggle__text">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
