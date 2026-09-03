import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const META = {
  auto: { Icon: MonitorSmartphone, label: 'Thème : selon votre appareil' },
  light: { Icon: Sun, label: 'Thème : clair' },
  dark: { Icon: Moon, label: 'Thème : sombre' }
};

/** Bouton clair / sombre / automatique. `tone="light"` sur les fonds foncés. */
export default function ThemeToggle({ tone = 'default' }) {
  const { preference, cycle } = useTheme();
  const { Icon, label } = META[preference] || META.auto;

  return (
    <button
      type="button"
      className={`theme-toggle ${tone === 'light' ? 'on-dark' : ''}`}
      onClick={cycle}
      title={`${label} — cliquez pour changer`}
      aria-label={label}
    >
      <Icon size={18} />
    </button>
  );
}
