'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 32, height: 32 }} />;

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--fg-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-md)',
      }}
    >
      {theme === 'dark' ? (
        <Moon size={18} strokeWidth={1.75} />
      ) : theme === 'light' ? (
        <Sun size={18} strokeWidth={1.75} />
      ) : (
        <Monitor size={18} strokeWidth={1.75} />
      )}
    </button>
  );
}
