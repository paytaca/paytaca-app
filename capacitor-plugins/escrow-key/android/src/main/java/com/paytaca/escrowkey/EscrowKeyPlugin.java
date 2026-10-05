package com.paytaca.escrowkey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.blockstore.Blockstore;
import com.google.android.gms.auth.blockstore.BlockstoreClient;
import com.google.android.gms.auth.blockstore.BlockstoreData;
import com.google.android.gms.auth.blockstore.DeleteBytesRequest;
import com.google.android.gms.auth.blockstore.RetrieveBytesRequest;
import com.google.android.gms.auth.blockstore.StoreBytesData;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

/**
 * Portable escrow storage backed by Google Block Store.
 *
 * Stores opaque strings (the Paytaca seed-vault payload) under a caller-provided
 * key. Values are backed up to the user's Google account and restore to a new
 * device after sign-in + unlock. Never receives plaintext mnemonics.
 */
@CapacitorPlugin(name = "EscrowKey")
public class EscrowKeyPlugin extends Plugin {

    private BlockstoreClient client;

    @Override
    public void load() {
        client = Blockstore.getClient(getContext());
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        if (client == null) {
            resolveBoolean(call, false);
            return;
        }
        client.isBlockstoreAvailable()
            .addOnSuccessListener(available -> resolveBoolean(call, Boolean.TRUE.equals(available)))
            .addOnFailureListener(e -> resolveBoolean(call, false));
    }

    @PluginMethod
    public void get(PluginCall call) {
        final String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("key is required");
            return;
        }
        if (client == null) {
            resolveValue(call, null);
            return;
        }

        RetrieveBytesRequest request = new RetrieveBytesRequest.Builder()
            .setKeys(Collections.singletonList(key))
            .build();

        client.retrieveBytes(request)
            .addOnSuccessListener(response -> {
                Map<String, BlockstoreData> dataMap = response.getBlockstoreDataMap();
                BlockstoreData data = dataMap != null ? dataMap.get(key) : null;
                byte[] bytes = data != null ? data.getBytes() : null;
                resolveValue(call, bytes != null ? new String(bytes, StandardCharsets.UTF_8) : null);
            })
            .addOnFailureListener(e -> call.reject("Escrow read failed: " + e.getMessage(), e));
    }

    @PluginMethod
    public void set(PluginCall call) {
        final String key = call.getString("key");
        final String value = call.getString("value");
        if (key == null || key.isEmpty() || value == null) {
            call.reject("key and value are required");
            return;
        }
        if (client == null) {
            resolveBoolean(call, false);
            return;
        }

        StoreBytesData data = StoreBytesData.Builder()
            .setKey(key)
            .setBytes(value.getBytes(StandardCharsets.UTF_8))
            .setShouldBackupToCloud(true)
            .build();

        client.storeBytes(data)
            .addOnSuccessListener(result -> resolveBoolean(call, true))
            .addOnFailureListener(e -> call.reject("Escrow write failed: " + e.getMessage(), e));
    }

    @PluginMethod
    public void remove(PluginCall call) {
        final String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("key is required");
            return;
        }
        if (client == null) {
            resolveBoolean(call, false);
            return;
        }

        DeleteBytesRequest request = new DeleteBytesRequest.Builder()
            .setKeys(Collections.singletonList(key))
            .build();

        client.deleteBytes(request)
            .addOnSuccessListener(unused -> resolveBoolean(call, true))
            .addOnFailureListener(e -> call.reject("Escrow delete failed: " + e.getMessage(), e));
    }

    private void resolveBoolean(PluginCall call, boolean value) {
        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }

    private void resolveValue(PluginCall call, String value) {
        JSObject ret = new JSObject();
        ret.put("value", value == null ? JSONObject.NULL : value);
        call.resolve(ret);
    }
}
