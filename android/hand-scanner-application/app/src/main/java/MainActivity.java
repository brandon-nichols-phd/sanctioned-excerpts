// SPDX-License-Identifier: MIT
//
// Simplified non-proprietary MainActivity skeleton showing patterns for:
// - USB/UVC camera lifecycle callbacks
// - Wi-Fi scan & connectivity UI feedback
// - Captive portal handoff via WebView
// - Generic MQTT client status handling (interface-based)
// - Permission checks & guarded ops
//
// This is a sanitized rewrite: all product-, company-, and customer-specific
// code paths have been removed. Fill the TODOs with your own app’s wiring.

package com.example.handscanner;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;

// If you keep the UVC/USB flow, use Serenegiant libs (Apache-2.0) or your own handler.
// Remove these if you don’t use UVC on Android.
import com.serenegiant.usb.DeviceFilter;
import com.serenegiant.usb.USBMonitor;
import com.serenegiant.usb.USBMonitor.OnDeviceConnectListener;
import com.serenegiant.usb.USBMonitor.UsbControlBlock;
import com.serenegiant.usb.UVCCamera;

/**
 * Minimal, IP-safe showcase of device-ops patterns:
 * 1) USB camera lifecycle with error handling
 * 2) Wi-Fi scan/rotate & captive portal detection handoff
 * 3) Generic MQTT connectivity status reactions (via interface)
 *
 * Replace layouts/ids with your own. All strings shown inline for brevity.
 */
public final class MainActivity extends Activity implements OnDeviceConnectListener {

    private static final String TAG = "MainActivity";

    // ------------------------
    // USB/UVC camera members
    // ------------------------
    private USBMonitor usbMonitor;
    private volatile UvcCameraHandler cameraHandler; // <— interface wrapper, see bottom

    // Track repeated camera failures for safe recovery/exit.
    private int consecutiveCameraOpenFailures = 0;
    private static final int MAX_CAMERA_OPEN_FAILURES_BEFORE_RESET = 5;

    // ------------------------
    // Wi-Fi members
    // ------------------------
    private WifiManager wifiManager;
    private long lastWifiRotateAt = 0L;
    private static final long WIFI_ROTATE_MIN_INTERVAL_MS = 5 * 60 * 1000L;

    // UI (replace with your IDs/views)
    private ImageView wifiIcon;     // TODO: bind (e.g., findViewById(R.id.wifi_icon))
    private WebView captivePortal;  // TODO: bind (e.g., findViewById(R.id.webview))

    // Simple state flag for demo
    private boolean created = false;

    // ------------------------
    // MQTT (generic interface)
    // ------------------------
    private MqttClient mqtt; // Pluggable; not tied to any vendor SDK

    // ------------------------
    // Lifecycle
    // ------------------------
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // TODO: setContentView(R.layout.activity_main);
        created = true;

        // TODO: wifiIcon = findViewById(R.id.wifi_icon);
        // TODO: captivePortal = findViewById(R.id.webview);

        wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);

        // ---- OPTIONAL: USB/UVC camera setup (remove if not needed) ----
        try {
            usbMonitor = new USBMonitor(this, this);
            // Optional: restrict to specific device filter
            // DeviceFilter filter = DeviceFilter.getDeviceFilters(this, R.xml.device_filter).get(0);
            // usbMonitor = new USBMonitor(this, this, filter);
            cameraHandler = new DefaultUvcCameraHandler(getApplicationContext(), new CameraCb());
        } catch (Throwable t) {
            Log.e(TAG, "USB/UVC not available on this device", t);
        }

        // ---- MQTT wiring (generic) ----
        mqtt = new NoopMqttClient(); // replace with your real implementation
        mqtt.setStatusCallback(this::onMqttStatusChanged);

        // ---- Wi-Fi/change listeners ----
        registerReceiver(wifiReceiver, new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
        registerReceiver(wifiReceiver, new IntentFilter(WifiManager.NETWORK_STATE_CHANGED_ACTION));

        // Ask for runtime permissions if needed (camera, storage, location for Wi-Fi scans, etc.)
        requestRuntimePermissionsIfNeeded();
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (usbMonitor != null) usbMonitor.register(); // USB attach/detach callbacks
    }

    @Override
    protected void onStop() {
        if (usbMonitor != null) usbMonitor.unregister();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        try {
            unregisterReceiver(wifiReceiver);
        } catch (Exception ignored) { }
        if (usbMonitor != null) {
            usbMonitor.destroy();
            usbMonitor = null;
        }
        if (cameraHandler != null) cameraHandler.release();
        super.onDestroy();
    }

    // ------------------------
    // Permissions
    // ------------------------
    private static final int REQ_PERMS = 101;

    private void requestRuntimePermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT >= 23) {
            // TODO: list the minimal set your sample requires
            String[] perms = new String[] {
                android.Manifest.permission.CAMERA,
                android.Manifest.permission.ACCESS_FINE_LOCATION, // needed for Wi-Fi scans on modern Android
                android.Manifest.permission.ACCESS_WIFI_STATE,
                android.Manifest.permission.CHANGE_WIFI_STATE
            };
            ActivityCompat.requestPermissions(this, perms, REQ_PERMS);
        }
        // Optional: ask for write settings if you tweak system settings
        if (!Settings.System.canWrite(this)) {
            // Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS,
            //     Uri.parse("package:" + getPackageName()));
            // startActivity(intent);
        }
    }

    // ------------------------
    // USB/UVC camera callbacks
    // ------------------------
    @Override
    public void onAttach(final UsbDevice device) {
        Log.d(TAG, "USB attached: " + device);
        if (cameraHandler != null) cameraHandler.open(device);
    }

    @Override
    public void onConnect(final UsbDevice device, final UsbControlBlock ctrlBlock, final boolean createNew) {
        Log.d(TAG, "USB connected");
        if (cameraHandler != null) cameraHandler.startPreview();
        consecutiveCameraOpenFailures = 0;
    }

    @Override
    public void onDisconnect(final UsbDevice device, final UsbControlBlock ctrlBlock) {
        Log.d(TAG, "USB disconnected");
        if (cameraHandler != null) cameraHandler.stopPreview();
    }

    @Override
    public void onDetach(final UsbDevice device) {
        Log.d(TAG, "USB detached");
        if (cameraHandler != null) cameraHandler.close();
    }

    @Override
    public void onCancel(final UsbDevice device) {
        Log.d(TAG, "USB request canceled");
    }

    private final class CameraCb implements UvcCameraHandler.Callback {
        @Override public void onOpen() {
            Log.d(TAG, "Camera opened");
            consecutiveCameraOpenFailures = 0;
        }
        @Override public void onStartPreview(int width, int height) {
            Log.d(TAG, "Preview started: " + width + "x" + height);
            // TODO: adjust your TextureView/SurfaceView aspect ratio here if needed.
        }
        @Override public void onError(Exception e) {
            Log.e(TAG, "Camera error", e);
            consecutiveCameraOpenFailures++;
            if (consecutiveCameraOpenFailures >= MAX_CAMERA_OPEN_FAILURES_BEFORE_RESET) {
                Toast.makeText(MainActivity.this, "Camera failure, restarting app", Toast.LENGTH_LONG).show();
                // Minimal “self-heal” for kiosk devices:
                // finish(); startActivity(getIntent()); OR schedule a process restart.
            } else {
                // Attempt a soft recover
                if (cameraHandler != null) {
                    cameraHandler.stopPreview();
                    cameraHandler.close();
                    cameraHandler.reopenLast();
                }
            }
        }
    }

    // ------------------------
    // Wi-Fi handling
    // ------------------------
    private enum ScanRequester { USER, DISCONNECTED, UNKNOWN }
    private ScanRequester scanRequested = ScanRequester.UNKNOWN;

    private final BroadcastReceiver wifiReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context ctx, Intent intent) {
            final String action = intent.getAction();
            if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(action)) {
                onWifiScanResults();
            } else if (WifiManager.NETWORK_STATE_CHANGED_ACTION.equals(action)) {
                onNetworkStateChanged(intent);
            }
        }
    };

    private void onWifiScanResults() {
        // Show scan results only when user requested OR we’re offline for a while.
        final boolean show = (scanRequested == ScanRequester.USER);
        scanRequested = ScanRequester.UNKNOWN;

        final var results = wifiManager.getScanResults();
        if (results == null || results.isEmpty()) {
            Toast.makeText(this, "No Wi-Fi networks found", Toast.LENGTH_SHORT).show();
            return;
        }
        if (show) {
            // TODO: show your Wi-Fi picker dialog; for now we just log
            Log.d(TAG, "Wi-Fi networks: " + results.size());
        }
    }

    private void onNetworkStateChanged(Intent intent) {
        final NetworkInfo ni = intent.getParcelableExtra(WifiManager.EXTRA_NETWORK_INFO);
        if (ni == null) return;

        switch (ni.getDetailedState()) {
            case AUTHENTICATING:
            case OBTAINING_IPADDR:
                setWifiStatusUi(StatusUi.CONNECTING);
                break;
            case CONNECTED:
                setWifiStatusUi(StatusUi.ONLINE);
                // On connect, you might re-check captive portal and reconnect MQTT
                checkCaptivePortalAsync();
                mqtt.reconnect();
                break;
            case DISCONNECTED:
            case FAILED:
            case BLOCKED:
                setWifiStatusUi(StatusUi.OFFLINE);
                requestWifiScan(ScanRequester.DISCONNECTED);
                break;
            default:
                // ignore other states
        }
    }

    private enum StatusUi { ONLINE, OFFLINE, CONNECTING, CAPTIVE }

    private void setWifiStatusUi(StatusUi state) {
        // Minimal visual feedback; replace with your UI.
        if (wifiIcon == null) return;
        switch (state) {
            case ONLINE:
                wifiIcon.setAlpha(1.0f);
                break;
            case CONNECTING:
                wifiIcon.setAlpha(0.6f);
                break;
            case OFFLINE:
                wifiIcon.setAlpha(0.3f);
                break;
            case CAPTIVE:
                wifiIcon.setAlpha(1.0f);
                // Optionally tint icon to a warning color.
                break;
        }
    }

    private void requestWifiScan(ScanRequester requester) {
        scanRequested = requester;
        if (wifiManager != null) {
            boolean started = wifiManager.startScan();
            Log.d(TAG, "Wi-Fi scan started: " + started);
        }
    }

    /** Example policy: rotate among known networks if MQTT offline and we’ve waited long enough. */
    private boolean rotateWifiIfStuck() {
        long since = SystemClock.elapsedRealtime() - lastWifiRotateAt;
        if (since < WIFI_ROTATE_MIN_INTERVAL_MS) return false;

        if (wifiManager == null) return false;
        final var known = wifiManager.getConfiguredNetworks();
        if (known == null || known.size() < 2) return false;

        int currentNetId = -1;
        try {
            currentNetId = wifiManager.getConnectionInfo().getNetworkId();
        } catch (Exception ignored) { }
        int nextId = known.get(0).networkId;
        for (WifiConfiguration conf : known) {
            if (conf.networkId > currentNetId) {
                nextId = conf.networkId;
                break;
            }
        }
        boolean ok = wifiManager.enableNetwork(nextId, true);
        if (ok) lastWifiRotateAt = SystemClock.elapsedRealtime();
        Log.d(TAG, "Rotated Wi-Fi to netId=" + nextId + " success=" + ok);
        return ok;
    }

    // ------------------------
    // Captive portal detection (simplified)
    // ------------------------
    private void checkCaptivePortalAsync() {
        // In production, perform a known URL fetch (e.g., http://connectivitycheck.gstatic.com/generate_204)
        // and detect redirects/content that indicates a portal.
        // Here we just show how you’d handoff to a WebView.
        boolean portalDetected = false; // TODO: set true if your check sees a redirect
        if (portalDetected) {
            setWifiStatusUi(StatusUi.CAPTIVE);
            showCaptivePortalWebView("https://example.portal/login", null, null);
        }
    }

    private void showCaptivePortalWebView(@Nullable String redirectUrl,
                                          @Nullable String data,
                                          @Nullable String mimeType) {
        if (captivePortal == null) return;
        captivePortal.setVisibility(View.VISIBLE);
        captivePortal.getSettings().setJavaScriptEnabled(true);
        captivePortal.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                view.loadUrl(req.getUrl().toString()); return true;
            }
            @Override public void onPageStarted(WebView v, String url, Bitmap icon) { Log.d(TAG, "Portal start: " + url); }
            @Override public void onPageFinished(WebView v, String url) { Log.d(TAG, "Portal done: " + url); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                Log.e(TAG, "Portal error: " + e);
            }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler h, SslError e) {
                // In a captive portal, certs may be untrusted; decide your policy.
                h.proceed(); // NOTE: Only proceed in a controlled kiosk flow.
            }
        });
        if (redirectUrl != null) {
            captivePortal.loadUrl(redirectUrl);
        } else if (data != null && mimeType != null) {
            captivePortal.loadData(data, mimeType, "UTF-8");
        }
        Toast.makeText(this, "Complete captive portal sign-in to continue", Toast.LENGTH_LONG).show();
    }

    // ------------------------
    // MQTT status reactions (generic)
    // ------------------------
    private void onMqttStatusChanged(MqttClient.Status status, @Nullable Throwable t) {
        Log.d(TAG, "MQTT status: " + status);
        if (t != null) Log.e(TAG, "MQTT error", t);

        switch (status) {
            case CONNECTED:
                setWifiStatusUi(StatusUi.ONLINE);
                break;
            case RECONNECTING:
                // Example: if Wi-Fi is up but MQTT struggles, check captive portal and optionally rotate.
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                NetworkInfo ni = cm != null ? cm.getActiveNetworkInfo() : null;
                boolean wifiUp = (ni != null && ni.isConnected() && ni.getType() == ConnectivityManager.TYPE_WIFI);
                if (wifiUp) {
                    checkCaptivePortalAsync();
                    rotateWifiIfStuck();
                } else {
                    requestWifiScan(ScanRequester.DISCONNECTED);
                }
                break;
            case DISCONNECTED:
                setWifiStatusUi(StatusUi.OFFLINE);
                break;
        }
    }

    // ------------------------
    // Helper interfaces & lightweight implementations
    // ------------------------

    /** Camera wrapper so this sample doesn’t depend on a specific library/handler. */
    interface UvcCameraHandler {
        interface Callback {
            void onOpen();
            void onStartPreview(int width, int height);
            void onError(Exception e);
        }
        void open(Object usbDevice);
        void startPreview();
        void stopPreview();
        void close();
        void reopenLast();
        void release();
    }

    /** Example no-op UVC handler (replace with Serenegiant or your own). */
    static final class DefaultUvcCameraHandler implements UvcCameraHandler {
        private final Context ctx;
        private final Callback cb;
        DefaultUvcCameraHandler(Context c, Callback cb) { this.ctx = c; this.cb = cb; }
        @Override public void open(Object usbDevice) { cb.onOpen(); }
        @Override public void startPreview() { cb.onStartPreview(UVCCamera.DEFAULT_PREVIEW_WIDTH, UVCCamera.DEFAULT_PREVIEW_HEIGHT); }
        @Override public void stopPreview() {}
        @Override public void close() {}
        @Override public void reopenLast() { /* try reopen logic */ }
        @Override public void release() {}
    }

    /** Generic MQTT interface to keep this sample vendor-agnostic. */
    interface MqttClient {
        enum Status { CONNECTED, RECONNECTING, DISCONNECTED }
        interface StatusCallback { void onStatusChanged(Status s, @Nullable Throwable t); }
        void setStatusCallback(StatusCallback cb);
        void reconnect();
    }

    /** No-op MQTT for compilation; swap for real client (Paho, AWS, etc.) in your app. */
    static final class NoopMqttClient implements MqttClient {
        private StatusCallback cb;
        @Override public void setStatusCallback(StatusCallback cb) { this.cb = cb; }
        @Override public void reconnect() {
            if (cb != null) cb.onStatusChanged(Status.RECONNECTING, null);
        }
    }
}
