package com.saathi.app;

import android.content.Intent;
import android.location.Location;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundLocation")
public class BackgroundLocationPlugin extends Plugin {

    private static BackgroundLocationPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @PluginMethod
    public void startBackgroundLocation(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), BackgroundLocationService.class);
            ContextCompat.startForegroundService(getContext(), intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start background location service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopBackgroundLocation(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), BackgroundLocationService.class);
            getContext().stopService(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop background location service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isBackgroundLocationActive(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("active", BackgroundLocationService.isServiceRunning());
        call.resolve(ret);
    }

    public static void handleLocationUpdate(Location location) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("latitude", location.getLatitude());
            data.put("longitude", location.getLongitude());
            data.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : null);
            data.put("speed", location.hasSpeed() ? location.getSpeed() : null);
            data.put("heading", location.hasBearing() ? location.getBearing() : null);
            data.put("timestamp", location.getTime() > 0 ? location.getTime() : System.currentTimeMillis());

            instance.notifyListeners("onLocationUpdate", data);
        }
    }
}
