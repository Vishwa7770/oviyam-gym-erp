import React, { createContext, useContext, useState, useEffect } from 'react';

export interface GymSettings {
  gym_name: string;
  gym_logo: string;
  address: string;
  phone_number: string;
  email: string;
  theme: string;
  accent_color?: string;
  working_hours?: string;
  currency?: string;
  backup_settings?: string;
  notification_settings?: string;
  website?: string;
  gst_number?: string;
  invoice_footer?: string;
  favicon?: string;
  login_bg?: string;
  dashboard_banner?: string;
  setup_completed?: number;
  license_key?: string;
  license_status?: string;
  license_client_name?: string;
  license_expiry?: string;
  license_install_date?: string;
}

interface GymContextType {
  settings: GymSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<GymSettings>) => Promise<boolean>;
  toggleTheme: () => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const API_BASE = 'http://localhost:5000/api';

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GymSettings>({
    gym_name: 'Oviyam Gym',
    gym_logo: '',
    address: '',
    phone_number: '',
    email: '',
    theme: 'dark',
    accent_color: 'purple',
    working_hours: '06:00 AM - 10:00 PM',
    currency: '₹',
    backup_settings: '',
    notification_settings: '',
    website: '',
    gst_number: '',
    invoice_footer: 'Thank you for training with us!',
    favicon: '',
    login_bg: '',
    dashboard_banner: '',
    setup_completed: 0,
    license_key: 'OV-DEMO-9999-XXXX',
    license_status: 'Activated (Demo Mode)',
    license_client_name: 'Oviyam Gym Enterprise',
    license_expiry: '2030-12-31',
    license_install_date: ''
  });
  const [loading, setLoading] = useState(true);

  // Apply theme class and accent color variable to document root
  const applyTheme = (themeName: string, accentName: string = 'purple') => {
    const root = window.document.documentElement;
    let isDark = themeName === 'dark';
    if (themeName === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const accentMap: Record<string, { light: string, dark: string }> = {
      purple: { light: '262.1 83.3% 57.8%', dark: '263.4 70% 50.4%' },
      blue: { light: '221.2 83.2% 53.3%', dark: '217.2 91.2% 59.8%' },
      green: { light: '142.1 76.2% 36.3%', dark: '142.1 70.6% 45.3%' },
      orange: { light: '24.6 95.0% 53.1%', dark: '20.5 90.2% 48.2%' },
      red: { light: '346.8 77.2% 49.8%', dark: '346.8 77.2% 49.8%' }
    };

    const colors = accentMap[accentName] || accentMap.purple;
    const primaryVal = isDark ? colors.dark : colors.light;

    root.style.setProperty('--primary', primaryVal);
    root.style.setProperty('--ring', primaryVal);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        applyTheme(data.theme, data.accent_color || 'purple');
      }
    } catch (error) {
      console.error('Failed to fetch gym settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<GymSettings>): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const updated = { ...settings, ...newSettings };
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        setSettings(updated);
        applyTheme(updated.theme, updated.accent_color || 'purple');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update gym settings:', error);
      return false;
    }
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings(prev => ({ ...prev, theme: nextTheme }));
    applyTheme(nextTheme, settings.accent_color || 'purple');
    // Persist if logged in
    updateSettings({ theme: nextTheme });
  };

  return (
    <GymContext.Provider value={{ settings, loading, updateSettings, toggleTheme }}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};
