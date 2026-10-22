package com.paytaca.app.plugins;

import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * Cross-platform "order live activity" bridge, Android side.
 *
 * Live activities are long-lived, non-interruptive surfaces that track an
 * active order. iOS uses ActivityKit; on Android the same normalized payload is
 * rendered as an ongoing low-importance notification (see
 * {@link OrderLiveActivityNotification}). The JavaScript service
 * ({@code src/services/order-live-activity}) drives both.
 */
@CapacitorPlugin(name = "OrderLiveActivity")
public class OrderLiveActivityPlugin extends Plugin {

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("platform", "android");
        result.put("version", Build.VERSION.SDK_INT);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        show(call);
    }

    @PluginMethod
    public void update(PluginCall call) {
        show(call);
    }

    @PluginMethod
    public void end(PluginCall call) {
        String id = call.getString("id");
        JSObject activity = call.getObject("activity");
        if (activity != null) {
            OrderLiveActivityNotification.showFinal(getContext(), toJson(activity));
        } else {
            OrderLiveActivityNotification.cancel(getContext(), id);
        }
        call.resolve();
    }

    @PluginMethod
    public void endAll(PluginCall call) {
        OrderLiveActivityNotification.cancelAll(getContext());
        call.resolve();
    }

    private void show(PluginCall call) {
        JSObject activity = call.getObject("activity");
        if (activity == null) {
            call.reject("An activity payload is required");
            return;
        }

        JSONObject payload = toJson(activity);
        OrderLiveActivityNotification.show(getContext(), payload);

        JSObject result = new JSObject();
        result.put("id", payload.optString("id", null));
        call.resolve(result);
    }

    private static JSONObject toJson(JSObject activity) {
        try {
            return new JSONObject(activity.toString());
        } catch (Exception error) {
            return new JSONObject();
        }
    }
}
