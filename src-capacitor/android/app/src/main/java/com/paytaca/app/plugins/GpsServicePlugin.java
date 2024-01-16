package com.paytaca.app.plugins;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.location.LocationManager;


@CapacitorPlugin(name = "GpsService")
public class GpsServicePlugin extends Plugin {
    private LocationManager locationManager;

    @Override
    public void load() {
        Context context = getContext();
        locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
    }

    @PluginMethod()
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isEnabled", isGpsEnabled());
        call.resolve(ret);
    }

    @PluginMethod()
    public void openLocationSettingsPrompt(PluginCall call) {
       String message = call.getString("message", "Enable GPS to enable features in the app");
        String title = call.getString("title", "Enable GPS");

        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle(title).setMessage(message);
        builder.setPositiveButton("Go to settings", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if (which == AlertDialog.BUTTON_POSITIVE) {
                    openLocationSettings(call);
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
    public void openLocationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        startActivityForResult(call, intent, "sendStatus");
    }

    @ActivityCallback
    private void sendStatus(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject ret = new JSObject();
        ret.put("resultCode", result.getResultCode());
        ret.put("data", result.getData());
        ret.put("isEnabled",isGpsEnabled());

        call.resolve(ret);
    }

    private boolean isGpsEnabled() {
       return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
    }
}
