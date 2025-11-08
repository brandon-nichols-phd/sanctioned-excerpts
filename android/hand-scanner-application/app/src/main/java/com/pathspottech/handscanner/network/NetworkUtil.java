// SPDX-License-Identifier: MIT
//
// NetworkUtil (sanitized, vendor-neutral)
// ---------------------------------------
// Purpose:
//   Helpers for determining current connectivity and optionally verifying
//   real internet reachability (vs. just having an active interface).
//
// Permissions required:
//   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
//   <uses-permission android:name="android.permission.INTERNET" />
//
// Notes:
//   • Modern Android: prefer NetworkCapabilities over deprecated NetworkInfo.
//   • "Reachability" MUST be done off the main thread (blocking I/O).
//   • HEAD to a known HTTPS endpoint is a reasonable, low-cost probe.
//   • Captive portals/Walled gardens may still return HTTP 200; consider a
//     portal-detection endpoint if you need strict validation.

package com.example.net;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo; // legacy fallback
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;

public final class NetworkUtil {

    private static final String TAG = "NetworkUtil";

    private NetworkUtil() { /* no instances */ }

    // Modern result taxonomy
    public enum NetworkType {
        WIFI,
        CELLULAR,
        ETHERNET,
        OTHER,
        NONE
    }

    // -------- Modern API: NetworkCapabilities (API 21+) --------

    /**
     * Returns the current {@link NetworkType} using NetworkCapabilities when available.
     * Falls back to legacy NetworkInfo on older devices.
     */
    @NonNull
    public static NetworkType getNetworkType(@NonNull Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return NetworkType.NONE;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // API 23+: active network + capabilities
            Network active = cm.getActiveNetwork();
            if (active == null) return NetworkType.NONE;

            NetworkCapabilities caps = cm.getNetworkCapabilities(active);
            if (caps == null) return NetworkType.NONE;

            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))     return NetworkType.WIFI;
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) return NetworkType.CELLULAR;
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) return NetworkType.ETHERNET;

            // Bluetooth/LoWPAN/VPN or anything else
            return NetworkType.OTHER;
        } else {
            // Legacy fallback (deprecated, but works pre-M)
            @SuppressWarnings("deprecation")
            NetworkInfo ni = cm.getActiveNetworkInfo();
            if (ni == null || !ni.isConnectedOrConnecting()) return NetworkType.NONE;

            @SuppressWarnings("deprecation")
            int type = ni.getType();
            if (type == ConnectivityManager.TYPE_WIFI)     return NetworkType.WIFI;
            if (type == ConnectivityManager.TYPE_MOBILE)   return NetworkType.CELLULAR;
            if (type == ConnectivityManager.TYPE_ETHERNET) return NetworkType.ETHERNET;
            return NetworkType.OTHER;
        }
    }

    /** True if there is *some* active or connecting network (does NOT guarantee internet). */
    public static boolean isNetworkInterfaceAvailable(@NonNull Context context) {
        return getNetworkType(context) != NetworkType.NONE;
    }

    // -------- Internet reachability (blocking; call off main thread) --------

    /**
     * Performs a real network request (HEAD) to the given HTTPS URL with timeouts.
     * Use a small, reliable endpoint that your app controls, or a well-known one.
     *
     * @param urlString e.g. "https://clients3.google.com/generate_204" or your own endpoint
     * @param connectTimeoutMs connect timeout in ms
     * @param readTimeoutMs read timeout in ms
     * @return true if connection was established and a non-error HTTP code returned
     */
    public static boolean isInternetReachable(@NonNull String urlString,
                                              int connectTimeoutMs,
                                              int readTimeoutMs) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("HEAD");
            conn.setConnectTimeout(connectTimeoutMs);
            conn.setReadTimeout(readTimeoutMs);
            conn.connect();
            int code = conn.getResponseCode();
            // Consider any 2xx/3xx as "reachable"; adjust for your policy.
            return (code >= 200 && code < 400);
        } catch (IOException e) {
            Log.d(TAG, "Reachability check failed: " + e.getMessage());
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    // -------- Compatibility shims (to replace your original calls) --------
    // Keep these if you want minimal code churn in the rest of your project.

    public static final int TYPE_WIFI = 1;
    public static final int TYPE_MOBILE = 2;
    public static final int TYPE_NOT_CONNECTED = 0;

    public static final int NETWORK_STATUS_NOT_CONNECTED = 0;
    public static final int NETWORK_STATUS_WIFI = 1;
    public static final int NETWORK_STATUS_MOBILE = 2;

    /**
     * Legacy-style: returns TYPE_WIFI / TYPE_MOBILE / TYPE_NOT_CONNECTED.
     * Uses modern getNetworkType() internally.
     */
    public static int getConnectivityStatus(@NonNull Context context) {
        NetworkType t = getNetworkType(context);
        switch (t) {
            case WIFI:     return TYPE_WIFI;
            case CELLULAR: return TYPE_MOBILE;
            case ETHERNET:
            case OTHER:
            case NONE:
            default:       return TYPE_NOT_CONNECTED;
        }
    }

    /**
     * Legacy-style: returns NETWORK_STATUS_WIFI if the active network is Wi-Fi; else NOT_CONNECTED.
     * (Preserves your original semantics.)
     */
    public static int isInternetConnected(@NonNull Context context) {
        NetworkType t = getNetworkType(context);
        return (t == NetworkType.WIFI) ? NETWORK_STATUS_WIFI : NETWORK_STATUS_NOT_CONNECTED;
    }

    /**
     * Legacy-style: attempts a real connection to a URL with a connect timeout only.
     * Prefer {@link #isInternetReachable(String, int, int)} for more control.
     */
    public static boolean isAbleToConnect(@NonNull String url, int timeoutMs) {
        HttpURLConnection conn = null;
        try {
            URL u = new URL(url);
            conn = (HttpURLConnection) u.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("HEAD");
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.connect();
            int code = conn.getResponseCode();
            return (code >= 200 && code < 400);
        } catch (Exception e) {
            Log.d(TAG, "Simple connect failed: " + e.getMessage());
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
