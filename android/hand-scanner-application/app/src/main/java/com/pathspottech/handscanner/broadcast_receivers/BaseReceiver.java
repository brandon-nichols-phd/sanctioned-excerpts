// SPDX-License-Identifier: MIT
//
// BaseReceiver (sanitized, vendor-neutral)
// ---------------------------------------
// Purpose:
//   Defines a minimal contract for classes that wrap or manage Android BroadcastReceivers.
//   Implementations should handle their own registration and unregistration logic
//   within the Android component lifecycle (Activity, Service, etc.).
//
// Why:
//   Android BroadcastReceivers must be registered and unregistered at the correct times
//   to avoid memory leaks and crashes. This interface provides a consistent pattern
//   for encapsulating that logic across multiple receiver implementations.
//
// Usage Example:
//   public class BatteryReceiver implements BaseReceiver {
//       private final BroadcastReceiver receiver = new BroadcastReceiver() { ... };
//
//       @Override
//       public void register(Context context) {
//           context.registerReceiver(receiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
//       }
//
//       @Override
//       public void deregister(Context context) {
//           try {
//               context.unregisterReceiver(receiver);
//           } catch (IllegalArgumentException ignored) { } // Receiver already unregistered
//       }
//   }
//
// Notes:
//   • Always unregister receivers in onPause/onStop/onDestroy depending on use case.
//   • Use application context for long-lived receivers to avoid leaks.
//   • Prefer context-registered receivers over manifest-registered ones for dynamic behavior.

package com.example.broadcastreceivers;

import android.content.Context;

/**
 * Defines a contract for objects that can register and deregister
 * Android broadcast receivers against a {@link Context}.
 */
public interface BaseReceiver {

    /**
     * Registers the broadcast receiver(s) managed by this object.
     *
     * @param context a valid {@link Context}; usually an Activity, Service,
     *                or the Application context if the receiver is long-lived.
     */
    void register(Context context);

    /**
     * Unregisters the broadcast receiver(s) managed by this object.
     *
     * @param context the same {@link Context} instance used during registration.
     */
    void deregister(Context context);
}
