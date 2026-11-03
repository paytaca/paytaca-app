package com.paytaca.app.plugins;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.paytaca.app.MainActivity;
import com.paytaca.app.R;

import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Android counterpart of iOS Live Activities.
 *
 * Each tracked order gets a single ongoing, low-importance notification that
 * mirrors the order status and, when a deadline exists, a chronometer that
 * counts down to it. Notifications are deliberately masked: they only carry the
 * section title, the order reference and the status/countdown, never amounts or
 * counterparty names.
 *
 * The payload is the shared {@code OrderLiveActivity} shape produced by
 * {@code src/services/order-live-activity/model.js}.
 */
final class OrderLiveActivityNotification {

    static final String CHANNEL_ID = "order_live_activity";

    private static final String PREFS_NAME = "order_live_activity";
    private static final String PREFS_KEY_IDS = "active_notification_ids";
    private static final String EXTRA_ACTIVITY_ID = "orderLiveActivityId";
    private static final String DEEP_LINK_PREFIX = "paytaca://live-activity";

    private OrderLiveActivityNotification() {}

    static int notificationId(String activityId) {
        return ("order-live-activity:" + activityId).hashCode();
    }

    /** Show (or refresh) the ongoing notification for an in-progress order. */
    static void show(Context context, JSONObject activity) {
        post(context, activity, false);
    }

    /** Replace the ongoing notification with a dismissible terminal state. */
    static void showFinal(Context context, JSONObject activity) {
        post(context, activity, true);
    }

    static void cancel(Context context, String activityId) {
        if (activityId == null || activityId.isEmpty()) return;
        int id = notificationId(activityId);
        NotificationManagerCompat.from(context).cancel(id);
        untrack(context, id);
    }

    static void cancelAll(Context context) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        for (String raw : trackedIds(context)) {
            try {
                manager.cancel(Integer.parseInt(raw));
            } catch (NumberFormatException ignored) {
                // Stale/corrupt entry; drop it silently.
            }
        }
        prefs(context).edit().remove(PREFS_KEY_IDS).apply();
    }

    private static void post(Context context, JSONObject activity, boolean terminal) {
        if (activity == null) return;
        String activityId = activity.optString("id", "");
        if (activityId.isEmpty()) return;

        ensureChannel(context);

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;

        int id = notificationId(activityId);
        try {
            manager.notify(id, build(context, activity, terminal, activityId, id));
            track(context, id);
        } catch (SecurityException error) {
            // POST_NOTIFICATIONS revoked between the check and the post.
        }
    }

    private static Notification build(
        Context context,
        JSONObject activity,
        boolean terminal,
        String activityId,
        int id
    ) {
        String title = firstNonEmpty(activity.optString("title", ""), context.getString(R.string.app_name));
        String subtitle = activity.optString("subtitle", "");
        String statusLabel = activity.optString("statusLabel", "");
        String countdownLabel = activity.optString("countdownLabel", "");
        long countdownAt = activity.optLong("countdownAt", 0L);
        int stageIndex = activity.optInt("stageIndex", 0);
        int stageCount = activity.optInt("stageCount", 0);
        String deepLink = activity.optString("deepLink", "");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_order_live_activity)
            .setContentTitle(title)
            .setSubText(emptyToNull(subtitle))
            .setContentText(statusLabel)
            .setColor(ContextCompat.getColor(context, R.color.order_live_activity_accent))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setAutoCancel(terminal)
            .setOngoing(!terminal)
            .setCategory(terminal ? NotificationCompat.CATEGORY_STATUS : NotificationCompat.CATEGORY_PROGRESS)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(buildContentIntent(context, deepLink, activityId, id));

        if (terminal) {
            return builder.build();
        }

        if (stageCount > 0 && stageIndex > 0) {
            builder.setProgress(stageCount, Math.min(stageIndex, stageCount), false);
        }

        if (countdownAt > 0) {
            // setChronometerCountDown is API 24+; on older devices a counting-up
            // chronometer would misrepresent a deadline, so only the label shows.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setWhen(countdownAt);
                builder.setUsesChronometer(true);
                builder.setShowWhen(true);
                builder.setChronometerCountDown(true);
            }
            builder.setContentText(joinNonEmpty(statusLabel, countdownLabel));
        }

        return builder.build();
    }

    private static PendingIntent buildContentIntent(
        Context context,
        String deepLink,
        String activityId,
        int requestCode
    ) {
        Intent intent;
        // Only our own live-activity route may be opened from an FCM payload;
        // anything else falls back to the plain MainActivity intent.
        if (deepLink == null || !deepLink.startsWith(DEEP_LINK_PREFIX)) {
            intent = new Intent(context, MainActivity.class);
        } else {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
            intent.setPackage(context.getPackageName());
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra(EXTRA_ACTIVITY_ID, activityId);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.order_live_activity_channel_name),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(context.getString(R.string.order_live_activity_channel_description));
        channel.setShowBadge(false);
        channel.enableVibration(false);
        channel.enableLights(false);
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static Set<String> trackedIds(Context context) {
        return new HashSet<>(prefs(context).getStringSet(PREFS_KEY_IDS, new HashSet<>()));
    }

    private static void track(Context context, int id) {
        Set<String> ids = trackedIds(context);
        ids.add(String.valueOf(id));
        prefs(context).edit().putStringSet(PREFS_KEY_IDS, ids).apply();
    }

    private static void untrack(Context context, int id) {
        Set<String> ids = trackedIds(context);
        if (ids.remove(String.valueOf(id))) {
            prefs(context).edit().putStringSet(PREFS_KEY_IDS, ids).apply();
        }
    }

    private static String firstNonEmpty(String value, String fallback) {
        return (value == null || value.isEmpty()) ? fallback : value;
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isEmpty()) ? null : value;
    }

    private static String joinNonEmpty(String... parts) {
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part == null || part.isEmpty()) continue;
            if (builder.length() > 0) builder.append(" · ");
            builder.append(part);
        }
        return builder.toString();
    }
}
