import { Capacitor } from '@capacitor/core';

export interface WidgetStats {
  completed: number;
  total: number;
  percent: number;
  streak: number;
}

export function syncWidgetData(stats: WidgetStats) {
  if (Capacitor.isNativePlatform()) {
    try {
      // Access the dynamically registered custom WidgetHelper plugin
      const WidgetHelper = (window as any).Capacitor?.Plugins?.WidgetHelper;
      if (WidgetHelper) {
        WidgetHelper.updateWidgetData({
          completed: stats.completed,
          total: stats.total,
          percent: stats.percent,
          streak: stats.streak
        });
      }
    } catch (err) {
      console.error('Failed to sync widget data to Android host:', err);
    }
  }
}
