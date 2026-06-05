package com.paytaca.app.plugins;

import android.content.Context;
import android.media.AudioManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioMode")
public class AudioModePlugin extends Plugin {

    @PluginMethod()
    public void isSilentOrDnd(PluginCall call) {
        AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) {
            call.resolve(new JSObject().put("isSilentOrDnd", false).put("ringerMode", -1).put("isDnd", false));
            return;
        }

        int ringerMode = audioManager.getRingerMode();
        boolean isSilent = ringerMode == AudioManager.RINGER_MODE_SILENT;
        boolean isVibrate = ringerMode == AudioManager.RINGER_MODE_VIBRATE;

        int zenMode = Settings.Global.getInt(getContext().getContentResolver(), "zen_mode", 0);
        boolean isDnd = zenMode != 0;

        boolean isSilentOrDnd = isSilent || isVibrate || isDnd;

        JSObject ret = new JSObject();
        ret.put("isSilentOrDnd", isSilentOrDnd);
        ret.put("ringerMode", ringerMode);
        ret.put("isDnd", isDnd);
        call.resolve(ret);
    }
}