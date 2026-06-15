'use client';

import { useEffect } from 'react';

export const ACCENTS: Record<string, { name: string; start: string; end: string; glow: string }> = {
  lime: { name: 'Volt Lime', start: '#a3e635', end: '#0d9488', glow: '163, 230, 53' },
  blue: { name: 'Hyper Blue', start: '#2563eb', end: '#00f2fe', glow: '37, 99, 235' },
  pink: { name: 'Cyber Pink', start: '#f43f5e', end: '#db2777', glow: '244, 63, 94' },
  emerald: { name: 'Emerald', start: '#059669', end: '#34d399', glow: '5, 150, 105' },
  orange: { name: 'Sunset Orange', start: '#f97316', end: '#e11d48', glow: '249, 115, 22' },
  purple: { name: 'Electric Purple', start: '#7c3aed', end: '#db2777', glow: '124, 58, 237' },
};

export default function ClientAccentLoader() {
  useEffect(() => {
    // Load setting from local storage and update CSS variables on document element
    const stored = localStorage.getItem('hyperify-accent') || 'lime';
    const accent = ACCENTS[stored] || ACCENTS.lime;
    
    const root = document.documentElement;
    root.style.setProperty('--accent-start', accent.start);
    root.style.setProperty('--accent-end', accent.end);
    root.style.setProperty('--accent-glow-rgb', accent.glow);
  }, []);

  return null;
}
export function applyAccent(key: string) {
  if (typeof window === 'undefined') return;
  const accent = ACCENTS[key] || ACCENTS.lime;
  const root = document.documentElement;
  root.style.setProperty('--accent-start', accent.start);
  root.style.setProperty('--accent-end', accent.end);
  root.style.setProperty('--accent-glow-rgb', accent.glow);
  localStorage.setItem('hyperify-accent', key);
  
  // Dispatch event to notify tabs/components
  window.dispatchEvent(new Event('accent-change'));
}
