package com.hyperdiaper.hyperify;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class HyperifyWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Perform update for each widget instance
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // 1. Read stats from SharedPreferences saved by the app
        SharedPreferences prefs = context.getSharedPreferences("WidgetData", Context.MODE_PRIVATE);
        int completed = prefs.getInt("completed", 0);
        int total = prefs.getInt("total", 0);
        int percent = prefs.getInt("percent", 0);
        int streak = prefs.getInt("streak", 0);

        // 2. Load the RemoteViews layout
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.hyperify_widget);

        // 3. Update Text and Progress Indicators
        views.setTextViewText(R.id.widget_title, "Daily Progress");
        views.setTextViewText(R.id.widget_stats, completed + " / " + total + " Habits");
        views.setProgressBar(R.id.widget_progress_bar, 100, percent, false);
        
        // 4. Update Streak flame indicator
        views.setTextViewText(R.id.widget_streak, "🔥 " + streak);

        // 5. Instruct the manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
