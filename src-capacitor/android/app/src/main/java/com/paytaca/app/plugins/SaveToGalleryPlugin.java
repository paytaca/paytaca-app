package com.paytaca.app.plugins;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "SaveToGallery")
public class SaveToGalleryPlugin extends Plugin {

    @PluginMethod
    public void saveImage(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String filename = call.getString("filename");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Must provide base64Data");
            return;
        }

        if (filename == null || filename.isEmpty()) {
            filename = "IMG_" + System.currentTimeMillis() + ".png";
        }

        try {
            // Decode base64 to bitmap
            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

            if (bitmap == null) {
                call.reject("Failed to decode image");
                return;
            }

            // Save using MediaStore (works on all Android versions, no permissions needed for adding new files)
            String savedPath = saveBitmapToGallery(bitmap, filename);
            
            if (savedPath != null) {
                JSObject result = new JSObject();
                result.put("filePath", savedPath);
                call.resolve(result);
            } else {
                call.reject("Failed to save image to gallery");
            }
        } catch (Exception e) {
            call.reject("Error saving image: " + e.getMessage(), e);
        }
    }

    private String saveBitmapToGallery(Bitmap bitmap, String filename) {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues contentValues = new ContentValues();
        
        contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
        contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");
        
        // For Android 10 and above, use relative path
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/Paytaca");
            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);
        }

        Uri imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);
        
        if (imageUri == null) {
            return null;
        }

        try (OutputStream outputStream = resolver.openOutputStream(imageUri)) {
            if (outputStream == null) {
                return null;
            }
            
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
            
            // For Android 10+, clear the IS_PENDING flag to make the image visible
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentValues.clear();
                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(imageUri, contentValues, null, null);
            }
            
            return imageUri.toString();
        } catch (IOException e) {
            // If saving failed, try to delete the created entry
            resolver.delete(imageUri, null, null);
            return null;
        }
    }
}

