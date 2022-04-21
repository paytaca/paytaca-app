package com.paytaca.app.plugins;

import com.getcapacitor.JSObject;
//import com.getcapacitor.NativePlugin;
import android.content.Intent;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin()
public class DeepLinkHelperPlugin extends Plugin {

  @PluginMethod()
  public void finishActivity(PluginCall call) {
    bridge.getActivity().finishAfterTransition();
  }

  @PluginMethod()
  public void returnActivity(PluginCall call) {
    Intent intent = new Intent(bridge.getActivity().getCallingActivity().toString());
    intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
    bridge.getContext().startActivity(intent);
  }
}
