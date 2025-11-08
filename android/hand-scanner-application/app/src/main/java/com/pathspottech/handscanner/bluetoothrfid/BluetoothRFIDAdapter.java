// SPDX-License-Identifier: MIT
//
// BluetoothRfidAdapter (sanitized, vendor-neutral)
// ------------------------------------------------
// Purpose:
//   - Discover/pair with a specific Bluetooth "RFID" device by name
//   - Reconnect to an already-bonded device if possible
//   - Establish a data connection (via a pluggable RfidConnection)
//   - Expose lifecycle callbacks for UI (onConnect/onDisconnect/onSearching)
//   - Provide a safe, commented template without proprietary dependencies
//
// Notes:
//   - This sample assumes a classic Bluetooth Serial Port Profile (SPP) device.
//     If your device is BLE/GATT, replace SPP logic/UUID with GATT equivalents.
//   - Android 12+ requires BLUETOOTH_* runtime permissions. See comments below.
//   - Discovery is battery-expensive. Start/stop it deliberately.
//   - Always unregister BroadcastReceivers to avoid leaks.

package com.example.bluetoothrfid;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import androidx.annotation.MainThread;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.io.Closeable;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;

public abstract class BluetoothRfidAdapter {
    private static final String TAG = "BluetoothRfid"; // concise, filterable Log tag

    // Classic Bluetooth Serial Port Profile UUID. Replace if your device uses another service.
    private static final UUID SPP_SERIAL_UUID =
            UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final Context context;
    private final BluetoothAdapter adapter;

    @Nullable private volatile RfidConnection connection; // pluggable transport
    private volatile boolean continueScan = false;
    private volatile boolean connected = false;
    @Nullable private volatile String targetDeviceName;   // device name to match on discovery

    // -------------------------
    // Public API
    // -------------------------

    /**
     * @param context any Context; application context is preferred to avoid leaks
     * @throws NoBluetoothException if the device has no Bluetooth adapter
     */
    public BluetoothRfidAdapter(@NonNull Context context) throws NoBluetoothException {
        this.context = context.getApplicationContext();
        this.adapter = BluetoothAdapter.getDefaultAdapter();
        if (this.adapter == null) {
            Log.w(TAG, "No Bluetooth adapter on this device");
            throw new NoBluetoothException();
        }
    }

    /** Name to match against {@link BluetoothDevice#getName()} during discovery/bonding. */
    public synchronized void setTargetDeviceName(@Nullable String name) {
        Log.d(TAG, "Configuring target RFID name: " + name);
        // If the name changes, close any existing connection to avoid stale state.
        if (targetDeviceName != null && !targetDeviceName.equals(name)) {
            closeConnectionQuietly();
        }
        this.targetDeviceName = name;
    }

    @Nullable
    public synchronized String getTargetDeviceName() {
        return targetDeviceName;
    }

    /**
     * Enables Bluetooth (if off) and begins reconnect/scan flow.
     * Call from UI or a foreground service.
     *
     * @throws NoBluetoothException if the adapter cannot be turned on
     */
    @MainThread
    public void startAdapter() throws NoBluetoothException {
        Log.d(TAG, "Starting Bluetooth adapter workflow");
        if (connection != null && connection.isOpen()) {
            Log.d(TAG, "Already connected; startAdapter is a no-op");
            return;
        }

        // NOTE: On modern Android, adapter.enable() may be restricted. Prefer user consent:
        // context.startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE));
        // For kiosk devices under Device Owner, enable() may be permitted.
        adapter.enable();

        if (adapter.getState() != BluetoothAdapter.STATE_ON) {
            Log.w(TAG, "Bluetooth is not ON; cannot proceed");
            throw new NoBluetoothException();
        }

        scanForDevice();
    }

    /** Stops discovery, disconnects, and disables the adapter (optional). */
    @MainThread
    public void stopAdapter() {
        Log.d(TAG, "Stopping Bluetooth adapter workflow");
        try {
            adapter.cancelDiscovery();
        } catch (Exception ignored) {}

        try {
            context.unregisterReceiver(receiver);
        } catch (Exception e) {
            Log.d(TAG, "Receiver was not registered or already unregistered", e);
        }

        // Close connection and update state
        closeConnectionQuietly();
        connected = false;
        synchronized (this) {
            onDisconnect(); // UI callback
        }

        // Disabling Bluetooth is optional; comment out if you don’t want to force-disable.
        try {
            adapter.disable();
        } catch (Exception e) {
            Log.d(TAG, "Adapter disable failed/ignored", e);
        }
    }

    // -------------------------
    // Discovery & bonding flow
    // -------------------------

    /** Attempts to reconnect to a bonded device matching {@link #targetDeviceName}. */
    private boolean reconnectToBondedTarget() {
        if (connection != null && connection.isOpen()) {
            Log.d(TAG, "Already connected");
            return true;
        }
        final Set<BluetoothDevice> bonded = adapter.getBondedDevices();
        if (bonded == null || bonded.isEmpty()) {
            Log.d(TAG, "No bonded devices");
            return false;
        }

        final String name = getTargetDeviceName();
        if (name == null || name.isEmpty()) {
            Log.w(TAG, "Target device name not set; cannot reconnect");
            return false;
        }

        for (BluetoothDevice d : bonded) {
            final String dn = d.getName();
            if (dn != null && dn.equals(name)) {
                try {
                    adapter.cancelDiscovery();
                    connectToDevice(d);
                    Log.d(TAG, "Reconnected to bonded device: " + dn + " [" + d.getAddress() + "]");
                    return true;
                } catch (IOException e) {
                    Log.e(TAG, "Reconnect failed to " + d.getAddress(), e);
                }
            }
        }
        return false;
    }

    /**
     * Begins scanning for the target device name.
     * Registers a receiver for discovery/bonding events.
     */
    public void scanForDevice() {
        if (connection != null && connection.isOpen()) {
            Log.d(TAG, "Already connected; scanForDevice is a no-op");
            return;
        }

        synchronized (this) {
            onSearching(); // UI callback for “searching” state
        }

        if (reconnectToBondedTarget()) {
            Log.d(TAG, "Reconnected to existing bonded device; skipping discovery");
            return;
        }

        // NOTE: Android 12+ requires BLUETOOTH_SCAN permission; Android 12+ also requires
        // BLUETOOTH_CONNECT when calling getBondedDevices() or createBond(), and precise location
        // if you want to see non-bonded device names on some devices.
        // Make sure your app requests/grants these at runtime.

        final IntentFilter f = new IntentFilter();
        f.addAction(BluetoothAdapter.ACTION_DISCOVERY_STARTED);
        f.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        f.addAction(BluetoothDevice.ACTION_FOUND);
        f.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
        context.registerReceiver(receiver, f);

        if (!adapter.isDiscovering()) {
            Log.d(TAG, "Starting discovery");
            continueScan = true;
            adapter.startDiscovery();
        } else {
            Log.d(TAG, "Discovery already running");
        }
    }

    // Receives discovery + bonding events; pairs with matching device name and connects.
    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context ctx, Intent intent) {
            final String action = intent.getAction();
            if (action == null) return;

            switch (action) {
                case BluetoothAdapter.ACTION_DISCOVERY_STARTED:
                    Log.d(TAG, "Discovery started");
                    break;

                case BluetoothAdapter.ACTION_DISCOVERY_FINISHED:
                    Log.d(TAG, "Discovery finished");
                    if (continueScan) {
                        // Try bonded reconnect first; otherwise restart discovery.
                        if (!reconnectToBondedTarget()) {
                            Log.d(TAG, "Restarting discovery");
                            adapter.startDiscovery();
                        } else {
                            continueScan = false;
                        }
                    }
                    break;

                case BluetoothDevice.ACTION_FOUND: {
                    final BluetoothDevice device =
                            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (device == null) return;

                    final String dn = device.getName();
                    final String tn = getTargetDeviceName();
                    Log.d(TAG, "Found device " + dn + " [" + device.getAddress() + "]");

                    if (dn == null || tn == null) return;

                    if (dn.equals(tn)) {
                        // Attempt pairing if not already bonded.
                        if (device.getBondState() != BluetoothDevice.BOND_BONDED) {
                            // Requires BLUETOOTH_CONNECT permission on Android 12+.
                            boolean started = device.createBond();
                            Log.d(TAG, "Bonding initiated: " + started);
                        }
                    }
                    break;
                }

                case BluetoothDevice.ACTION_BOND_STATE_CHANGED: {
                    final BluetoothDevice device =
                            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    final int state = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, -1);
                    if (device == null) return;

                    switch (state) {
                        case BluetoothDevice.BOND_BONDED:
                            Log.d(TAG, "Bonded with " + device.getName());
                            try {
                                adapter.cancelDiscovery();
                                connectToDevice(device);
                            } catch (IOException e) {
                                Log.e(TAG, "Connect after bond failed", e);
                            }
                            break;
                        case BluetoothDevice.BOND_BONDING:
                            Log.d(TAG, "Bonding in progress…");
                            break;
                        case BluetoothDevice.BOND_NONE:
                            Log.w(TAG, "Bonding failed/cleared for " + device.getName());
                            break;
                        default:
                            Log.d(TAG, "Unknown bond state: " + state);
                    }
                    break;
                }
            }
        }
    };

    // -------------------------
    // Connection wiring
    // -------------------------

    /**
     * Establishes a logical connection to the device.
     * Replace {@link DefaultSppConnection} with your own implementation if needed.
     */
    private void connectToDevice(@NonNull BluetoothDevice device) throws IOException {
        final BluetoothRfidAdapter self = this;

        // Close any prior connection first.
        closeConnectionQuietly();

        // Choose your connection strategy:
        // - Classic SPP (RFCOMM) for serial-like devices (shown here)
        // - BLE GATT (use BluetoothGatt) for BLE peripherals
        final DefaultSppConnection conn = new DefaultSppConnection(device, SPP_SERIAL_UUID) {
            @Override public void onError(@NonNull Throwable e) {
                connected = false;
                Log.e(TAG, "RFID connection error", e);
                synchronized (self) { self.onDisconnect(); } // UI callback
            }

            @Override public void onMessage(@NonNull String message) {
                // Hook for incoming messages; override in your subclass to route where you need.
                BluetoothRfidAdapter.this.onMessage(message);
            }

            @Override public void onConnect() {
                connected = true;
                synchronized (self) { self.onConnect(); } // UI callback
            }
        };

        this.connection = conn;
        this.continueScan = false;
        adapter.cancelDiscovery(); // connecting while discovering hurts success rate
        conn.open();               // initiate socket connect (may block; do off main thread in prod)
    }

    private void closeConnectionQuietly() {
        final RfidConnection c = this.connection;
        this.connection = null;
        if (c != null) {
            try { c.close(); } catch (Exception ignored) {}
        }
    }

    // -------------------------
    // Callbacks to implement in your app
    // -------------------------

    /** Called when a connection to the target device is established. Update UI here. */
    public abstract void onConnect();

    /** Called when the connection is lost/closed or an error occurs. Update UI here. */
    public abstract void onDisconnect();

    /** Called when scanning/searching begins. Show a “searching” indicator here. */
    public abstract void onSearching();

    /** Optional hook for inbound device messages (override if you need payloads). */
    protected void onMessage(@NonNull String message) {
        // no-op by default
    }

    // -------------------------
    // Errors
    // -------------------------

    /** Thrown when Bluetooth is unavailable or cannot be enabled. */
    public static class NoBluetoothException extends Exception { }

    // -------------------------
    // Pluggable connection layer (sanitize-friendly)
    // -------------------------

    /**
     * Minimal abstraction for an RFID link.
     * Implement with RFCOMM sockets, GATT, or your transport of choice.
     */
    public interface RfidConnection extends Closeable {
        /** Open the connection. Prefer to do blocking work off the main thread. */
        void open() throws IOException;
        /** True if the link is open/usable. */
        boolean isOpen();
    }

    /**
     * Default classic SPP connection skeleton. Replace with your real implementation.
     * This class should encapsulate:
     *   - Socket connect
     *   - Reader loop -> calling onMessage(String)
     *   - Error handling -> calling onError(Throwable)
     *   - Clean close
     */
    public static abstract class DefaultSppConnection implements RfidConnection {
        private final BluetoothDevice device;
        private final UUID serviceUuid;
        private volatile boolean open = false;

        public DefaultSppConnection(@NonNull BluetoothDevice device, @NonNull UUID serviceUuid) {
            this.device = device;
            this.serviceUuid = serviceUuid;
        }

        /** Implement your socket connect + reader thread here. */
        @Override
        public void open() throws IOException {
            // TODO: Implement:
            // - bluetoothSocket = device.createRfcommSocketToServiceRecord(serviceUuid);
            // - bluetoothSocket.connect();
            // - start a thread that reads InputStream, parse frames -> onMessage(...)
            // - set open = true; then onConnect();
            onConnect(); // placeholder so the adapter flows; remove once implemented
            open = true;
        }

        @Override
        public boolean isOpen() {
            return open;
        }

        @Override
        public void close() {
            // TODO: Close streams/socket, stop reader thread, set open=false
            open = false;
        }

        // Callbacks the adapter relies on:
        public abstract void onError(@NonNull Throwable e);
        public abstract void onMessage(@NonNull String message);
        public abstract void onConnect();
    }
}
