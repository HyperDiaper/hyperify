package com.hyperdiaper.hyperify;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

@CapacitorPlugin(name = "WidgetHelper")
public class WidgetHelperPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        int completed = call.getInt("completed", 0);
        int total = call.getInt("total", 0);
        int percent = call.getInt("percent", 0);
        int streak = call.getInt("streak", 0);

        Context context = getBridge().getContext();
        SharedPreferences prefs = context.getSharedPreferences("WidgetData", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putInt("completed", completed);
        editor.putInt("total", total);
        editor.putInt("percent", percent);
        editor.putInt("streak", streak);
        editor.apply();

        // Broadcast intent to update widgets
        Intent intent = new Intent(context, HyperifyWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(new ComponentName(context, HyperifyWidget.class));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);

        call.resolve();
    }
}
