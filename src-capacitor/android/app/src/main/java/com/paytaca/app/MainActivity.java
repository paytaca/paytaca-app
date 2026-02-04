package com.paytaca.app;

import android.os.Bundle;
import android.view.WindowManager;

//import com.getcapacitor.Plugin;

//import java.util.ArrayList;
//import com.epicshaggy.biometric.NativeBiometric;
//import com.capacitorjs.plugins.app.AppPlugin;
//import com.getcapacitor.community.barcodescanner.BarcodeScanner;
//import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

import com.google.firebase.FirebaseApp;
import com.getcapacitor.BridgeActivity;
import com.paytaca.app.plugins.GpsServicePlugin;
import com.paytaca.app.plugins.PushNotificationSettingsPlugin;
import com.paytaca.app.plugins.DeepLinkHelperPlugin;
import com.paytaca.app.plugins.SaveToGalleryPlugin;
import com.paytaca.app.plugins.ScreenshotSecurityPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(GpsServicePlugin.class);
    registerPlugin(PushNotificationSettingsPlugin.class);
    registerPlugin(DeepLinkHelperPlugin.class);
    registerPlugin(SaveToGalleryPlugin.class);
    registerPlugin(ScreenshotSecurityPlugin.class);

    // CapacitorV3 to V4 upgrade required to move this after registerPlugin()
    super.onCreate(savedInstanceState);

    // SECURITY: Screenshot prevention is now controlled dynamically via ScreenshotSecurityPlugin
    // FLAG_SECURE is set/cleared based on the active wallet's lock app setting
    // This allows screenshots when lock is disabled, while maintaining security when enabled

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
