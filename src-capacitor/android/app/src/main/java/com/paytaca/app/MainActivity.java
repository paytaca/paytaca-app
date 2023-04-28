package com.paytaca.app;

import android.os.Bundle;

//import com.getcapacitor.Plugin;

//import java.util.ArrayList;
//import com.epicshaggy.biometric.NativeBiometric;
//import com.capacitorjs.plugins.app.AppPlugin;
//import com.paytaca.app.plugins.DeepLinkHelperPlugin;
//import com.getcapacitor.community.barcodescanner.BarcodeScanner;
//import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

import com.google.firebase.FirebaseApp;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Initializes the Bridge
    // Removed to enable auto registration of plugins
    // this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
    //   // Additional plugins you've installed go here
    //   // Ex: add(TotallyAwesomePlugin.class);

    //   add(NativeBiometric.class);
    //   add(AppPlugin.class);
    //   add(DeepLinkHelperPlugin.class);
    //   add(BarcodeScanner.class);
    //   add(PushNotificationsPlugin.class);
    // }});

    FirebaseApp.initializeApp(this.getBaseContext());
  }
}
