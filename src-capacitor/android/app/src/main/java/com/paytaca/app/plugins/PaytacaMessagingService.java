package com.paytaca.app.plugins;

import androidx.annotation.NonNull;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.util.Map;

/**
 * FCM entry point that understands live-activity data messages.
 *
 * Live-activity pushes carry a normalized {@code OrderLiveActivity} payload and
 * update the ongoing order notification directly, so they must NOT be forwarded
 * to the JavaScript push pipeline (which would mis-route a Marketplace order to
 * the P2P order screen). Every other message is delegated to the Capacitor
 * plugin unchanged.
 *
 * Data contract (data-only, high priority message):
 * - {@code live_activity} = "1"      marks a live-activity message
 * - {@code payload}                   JSON of the normalized activity
 * - {@code action} = "update" | "end" (optional, defaults to "update")
 * - {@code activity_id}               required when action = "end" and no payload
 */
public class PaytacaMessagingService extends MessagingService {

    private static final String KEY_LIVE_ACTIVITY = "live_activity";
    private static final String KEY_PAYLOAD = "payload";
    private static final String KEY_ACTION = "action";
    private static final String KEY_ACTIVITY_ID = "activity_id";
    private static final String ACTION_END = "end";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data != null && "1".equals(data.get(KEY_LIVE_ACTIVITY))) {
            handleLiveActivity(data);
            return;
        }
        super.onMessageReceived(remoteMessage);
    }

    private void handleLiveActivity(Map<String, String> data) {
        JSONObject activity = parsePayload(data.get(KEY_PAYLOAD));

        if (ACTION_END.equals(data.get(KEY_ACTION))) {
            String activityId = data.get(KEY_ACTIVITY_ID);
            if ((activityId == null || activityId.isEmpty()) && activity != null) {
                activityId = activity.optString("id", "");
            }
            OrderLiveActivityNotification.cancel(getApplicationContext(), activityId);
            return;
        }

        if (activity == null) return;

        if (activity.optBoolean("isTerminal", false)) {
            OrderLiveActivityNotification.showFinal(getApplicationContext(), activity);
        } else {
            OrderLiveActivityNotification.show(getApplicationContext(), activity);
        }
    }

    private static JSONObject parsePayload(String rawPayload) {
        if (rawPayload == null || rawPayload.isEmpty()) return null;
        try {
            return new JSONObject(rawPayload);
        } catch (Exception error) {
            // Malformed payload: ignore instead of crashing the messaging service.
            return null;
        }
    }
}
