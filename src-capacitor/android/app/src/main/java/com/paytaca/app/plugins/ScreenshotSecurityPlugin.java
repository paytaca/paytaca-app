package com.paytaca.app.plugins;

import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin to control screenshot and screen recording prevention
 * Uses FLAG_SECURE to prevent screenshots and hide content in app switcher
 */
@CapacitorPlugin(name = "ScreenshotSecurity")
public class ScreenshotSecurityPlugin extends Plugin {

    @PluginMethod()
    public void setSecureFlag(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        
        getActivity().runOnUiThread(() -> {
            if (enabled) {
                // Enable FLAG_SECURE - prevent screenshots and hide content in app switcher
                getActivity().getWindow().setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                );
            } else {
                // Disable FLAG_SECURE - allow screenshots
                getActivity().getWindow().clearFlags(
                    WindowManager.LayoutParams.FLAG_SECURE
                );
            }
            
            // Resolve only after the flag has been applied on the UI thread
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("enabled", enabled);
            call.resolve(ret);
        });
    }

    @PluginMethod()
    public void isSecureFlagEnabled(PluginCall call) {
        Boolean isEnabled = (getActivity().getWindow().getAttributes().flags & 
                            WindowManager.LayoutParams.FLAG_SECURE) != 0;
        
        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled);
        call.resolve(ret);
    }
}

