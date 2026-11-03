package com.paytaca.app.plugins;

import android.content.Context;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeferredReferral")
public class DeferredReferralPlugin extends Plugin {

  @PluginMethod()
  public void getInstallReferrer(final PluginCall call) {
    final Context context = getContext();
    final InstallReferrerClient referrerClient = InstallReferrerClient.newBuilder(context).build();

    referrerClient.startConnection(new InstallReferrerStateListener() {
      private boolean resolved = false;

      private void finish(String referrer) {
        if (resolved) {
          return;
        }
        resolved = true;
        try {
          referrerClient.endConnection();
        } catch (Exception ignored) {
        }
        JSObject ret = new JSObject();
        ret.put("referrer", referrer == null ? "" : referrer);
        call.resolve(ret);
      }

      @Override
      public void onInstallReferrerSetupFinished(int responseCode) {
        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
          try {
            ReferrerDetails details = referrerClient.getInstallReferrer();
            finish(details.getInstallReferrer());
            return;
          } catch (Exception e) {
            finish("");
            return;
          }
        }
        finish("");
      }

      @Override
      public void onInstallReferrerServiceDisconnected() {
        finish("");
      }
    });
  }
}
