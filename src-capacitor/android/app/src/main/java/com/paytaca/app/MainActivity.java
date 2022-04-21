package com.paytaca.app;

import android.os.Bundle;

import com.epicshaggy.biometric.NativeBiometric;
import com.capacitorjs.plugins.app.AppPlugin;
import com.paytaca.app.plugins.DeepLinkHelperPlugin;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Initializes the Bridge
    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      // Additional plugins you've installed go here
      // Ex: add(TotallyAwesomePlugin.class);

      add(NativeBiometric.class);
      add(AppPlugin.class);
      add(DeepLinkHelperPlugin.class);
    }});
  }
}
