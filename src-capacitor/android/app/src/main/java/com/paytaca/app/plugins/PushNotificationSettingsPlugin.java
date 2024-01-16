package com.paytaca.app.plugins;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;

import androidx.activity.result.ActivityResult;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PushNotificationSettings")
public class PushNotificationSettingsPlugin extends Plugin {
    @PluginMethod()
    public void getNotificationStatus(PluginCall call) {
        Context context = getContext();
        boolean isEnabled = isNotificationEnabled();
        JSObject ret = new JSObject();
        ret.put("isEnabled", isEnabled);
        call.resolve(ret);
    }

    @PluginMethod()
    public void openNotificationSettingsPrompt(PluginCall call) {
        String message = call.getString("message", "Enable notification for the app");
        String title = call.getString("title", "Enable Notifications");

        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle(title).setMessage(message);
        builder.setPositiveButton("Go to settings", new DialogInterface.OnClickListener() {
          @Override
          public void onClick(DialogInterface dialog, int which) {
            if (which == AlertDialog.BUTTON_POSITIVE) {
              openNotificationSettings(call);
              return;
            }
            call.resolve();
          }
        });

        builder.setOnCancelListener(new DialogInterface.OnCancelListener() {
          @Override
          public void onCancel(DialogInterface dialog) {
            call.resolve();
          }
        });

        AlertDialog dialog = builder.create();
        dialog.setCanceledOnTouchOutside(true);
        dialog.show();
    }

    @PluginMethod()
    public void openNotificationSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
        startActivityForResult(call, intent, "sendNotificationStatus");
    }

    @ActivityCallback
    private void sendNotificationStatus(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject ret = new JSObject();
        ret.put("resultCode", result.getResultCode());
        ret.put("data", result.getData());
        ret.put("isEnabled", isNotificationEnabled());

        call.resolve(ret);
    }

    private boolean isNotificationEnabled() {
        Context context = getContext();
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }
}
