// SPDX-License-Identifier: MIT
//
// DemoScanIntent (sanitized, vendor-neutral)
// -----------------------------------------
// Purpose:
//   Represents a strongly-typed broadcast Intent for triggering or simulating
//   a "scan" event in a demo or test environment. Carries a small integer payload
//   representing the outcome type (e.g., SUCCESS, FAILURE, or NO_HANDS).
//
// Design:
//   • Extends Android’s Intent class to simplify construction and retrieval of extras.
//   • Includes static helper methods for constructing the appropriate IntentFilter.
//   • Encapsulates all Intent action names and extra keys to avoid collisions.
//
// Usage Example:
//
//   // Sending a simulated scan result
//   DemoScanIntent intent = new DemoScanIntent();
//   intent.setTypeSuccess(); // or setTypeFailure(), etc.
//   context.sendBroadcast(intent);
//
//   // Registering a receiver
//   BroadcastReceiver demoReceiver = new BroadcastReceiver() {
//       @Override public void onReceive(Context ctx, Intent i) {
//           DemoScanIntent dsi = new DemoScanIntent(i);
//           int result = dsi.getExpectedResult();
//           switch (result) {
//               case DemoScanIntent.ResultType.PASS:
//                   // handle pass
//                   break;
//               case DemoScanIntent.ResultType.FAIL:
//                   // handle fail
//                   break;
//               case DemoScanIntent.ResultType.NO_HANDS:
//                   // handle no hands
//                   break;
//           }
//       }
//   };
//   context.registerReceiver(demoReceiver, DemoScanIntent.getFilter());
//
// Notes:
//   • Use unique ACTION strings (e.g., include your package name) to avoid broadcast collisions.
//   • Consider LocalBroadcastManager or LiveData for internal-only events to limit scope.

package com.example.broadcastreceivers;

import android.content.Intent;
import android.content.IntentFilter;

/**
 * Custom broadcast {@link Intent} subclass for demo scan events.
 * Carries a single integer extra representing a simulated scan result.
 */
public class DemoScanIntent extends Intent {

    /** Unique action string identifying this broadcast type. */
    private static final String ACTION = "com.example.broadcastreceivers.DEMO_SCAN_INTENT_ACTION";

    /** Extra key name for the demo scan result type. */
    private static final String EXTRA_TYPE = "DEMO_TYPE";

    /**
     * Result types used in demo scans.
     * These integer codes mimic result contract constants from a production system.
     */
    public static final class ResultType {
        public static final int PASS     = 1;  // Simulated success
        public static final int FAIL     = 2;
