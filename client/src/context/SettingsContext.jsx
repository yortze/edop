import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';

// Coordonnées, taux FCFA et seuils : édités dans le back-office, lus partout.
const FALLBACK = {
  company_name: 'E-DOP',
  tagline: 'Achetez, nous vous livrons',
  corridor: 'France → Gabon et partout ailleurs',
  phone_ga: '+241 074 729 338',
  phone_fr: '+33 7 54 59 76 65',
  email: 'contact@edop.com',
  address_fr: 'Paris, France',
  address_ga: 'Libreville, Gabon',
  facebook_url: '',
  instagram_url: '',
  fcfa_rate: '650',
  declaration_threshold_eur: '300',
  value_surcharge_pct: '10',
  weight_step_kg: '0.1',
  other_carrier_fee_eur: '20',
  departures_per_week: '2',
  oversize_cm: '80',
  deposit_split: '50 % à Paris / 50 % à Libreville'
};

const SettingsContext = createContext({ settings: FALLBACK, refresh: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);

  const refresh = useCallback(() => {
    api.settings()
      .then(s => setSettings({ ...FALLBACK, ...s }))
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext).settings;
}

export function useSettingsRefresh() {
  return useContext(SettingsContext).refresh;
}
