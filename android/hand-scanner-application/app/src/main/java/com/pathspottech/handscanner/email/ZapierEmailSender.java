// SPDX-License-Identifier: MIT
//
// ZapierEmailSender (sanitized, vendor-neutral)
// ---------------------------------------------
// Purpose:
//   - Post a simple "email body" payload to a Zapier webhook URL using Volley.
//   - On network failure, fall back to rendering a QR code that encodes the (gzip+base64) payload
//     so support can scan it from the device.
//
// Design highlights:
//   - Uses Application Context for RequestQueue (avoids Activity leaks).
//   - Header/content type set to form-urlencoded (Zapier-friendly).
//   - Callbacks for toast/notification and QR rendering are abstracted via small interfaces.
//   - QR generation uses ZXing; payload is compressed to keep QR dense and scannable.
//
// Security/ops notes:
//   - Prefer HTTPS Zapier hooks. If using Android 9+ and cleartext, update network security config.
//   - Consider rate limiting and payload size limits on the Zap; QR fallback helps when offline.
//   - Do not log full payloads in production (potentially sensitive).
//
// Dependencies:
//   implementation "com.android.volley:volley:<version>"
//   implementation "com.google.zxing:core:<version>"

package com.example.email;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.MainThread;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.GZIPOutputStream;

public class ZapierEmailSender {

    private static final String TAG = "ZapierEmailSender";
    private static final String FORM_CONTENT_TYPE = "application/x-www-form-urlencoded; charset=UTF-8";
    private static final int    DEFAULT_TIMEOUT_MS = 10_000; // tune as needed

    private final String webhookUrl;
    private final RequestQueue queue;
    private final Notifier notifier;
    private final QrDisplayer qrDisplayer;

    /**
     * @param appContext  Application context (not an Activity) to avoid leaks.
     * @param webhookUrl  Zapier catch hook URL (HTTPS strongly recommended).
     * @param notifier    Callback used to surface brief user messages (e.g., Toasts/Snackbars).
     * @param qrDisplayer Callback used to show a QR bitmap when network send fails.
     */
    public ZapierEmailSender(
            @NonNull Context appContext,
            @NonNull String webhookUrl,
            @NonNull Notifier notifier,
            @NonNull QrDisplayer qrDisplayer
    ) {
        this.webhookUrl = webhookUrl;
        this.queue = Volley.newRequestQueue(appContext.getApplicationContext());
        this.notifier = notifier;
        this.qrDisplayer = qrDisplayer;
        this.queue.start();
    }

    /**
     * Sends an email-like message via Zapier.
     *
     * The Zap should expect a single form field "body" (customize here if your Zap differs).
     *
     * @param body        Plaintext content (server-side Zap composes/forwards actual email).
     * @param onSuccess   Optional success listener (may be null).
     * @param onError     Optional error listener (may be null). QR fallback is invoked regardless.
     */
    @MainThread
    public void sendEmail(
            @NonNull final String body,
            @Nullable Response.Listener<String> onSuccess,
            @Nullable Response.ErrorListener onError
    ) {
        StringRequest req = new StringRequest(
                Request.Method.POST,
                webhookUrl,
                response -> {
                    if (onSuccess != null) onSuccess.onResponse(response);
                    notifier.show("Support message sent.");
                },
                error -> {
                    // Network failed — generate a QR fallback with the payload.
                    Bitmap qr = compressToQr(body, /*qrSizePx*/ 450);
                    if (qr != null) {
                        qrDisplayer.showQr(qr, "Scan to capture diagnostics");
                    } else {
                        notifier.show("Unable to send or render QR fallback.");
                    }
                    if (onError != null) onError.onErrorResponse(error);
                }
        ) {
            @Override
            protected Map<String, String> getParams() {
                Map<String, String> p = new HashMap<>();
                p.put("body", body);
                return p;
            }

            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                Map<String, String> h = new HashMap<>();
                h.put("Content-Type", FORM_CONTENT_TYPE);
                return h;
            }
        };

        // Reasonable retry policy; adjust for your environment.
        req.setRetryPolicy(new DefaultRetryPolicy(
                DEFAULT_TIMEOUT_MS,
                /*maxRetries*/ 1,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
        ));

        queue.add(req);
    }

    /**
     * Convenience overload that appends additional details to the body.
     */
    @MainThread
    public void sendEmail(@NonNull final String body, @NonNull final String extraDetails) {
        sendEmail(body + "\n" + extraDetails, null, null);
    }

    /**
     * Sends a structured diagnostics blob by concatenating subsystem states.
     * Customize the formatting to match your Zap/email template.
     */
    @MainThread
    public void sendDiagnostics(
            @NonNull String configuration,
            @NonNull String deviceStatus,
            @NonNull String mqttStatus,
            @NonNull String wifiStatus,
            @Nullable String enhancedWifi // optional supplemental info
    ) {
        StringBuilder sb = new StringBuilder(1024);
        sb.append("CONFIGURATION:\n").append(configuration)
          .append("\n\nSTATUS:\n").append(deviceStatus)
          .append("\n\nMQTT_STATUS: ").append(mqttStatus)
          .append("\n\nWIFI_STATUS: ").append(wifiStatus);

        if (enhancedWifi != null && !enhancedWifi.isEmpty()) {
            sb.append("\n\nWIFI_ENHANCED:\n").append(enhancedWifi);
        }

        sendEmail(sb.toString(), null, null);
    }

    /**
     * GZIP-compresses and Base64-encodes data, then renders a QR containing a mailto-like payload.
     * The compressed body keeps QR density manageable for longer messages.
     *
     * @param data     Plaintext to encode.
     * @param qrSizePx Requested square pixel size for the QR image.
     * @return A QR {@link Bitmap} or null on failure.
     */
    @Nullable
    public Bitmap compressToQr(@NonNull String data, int qrSizePx) {
        try (ByteArrayOutputStream raw = new ByteArrayOutputStream();
             GZIPOutputStream gzip = new GZIPOutputStream(raw)) {

            byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
            gzip.write(bytes);
            gzip.finish();

            String b64 = Base64.encodeToString(raw.toByteArray(), Base64.NO_WRAP);

            // vCard-style mailto payload string understood by many QR mail clients.
            String payload =
                    "MATMSG:" +
                    "TO:support@example.com;" +
                    "SUB:Diagnostics via QR;" +
                    "BODY:" + b64 + ";;";

            return renderQr(payload, qrSizePx);

        } catch (IOException e) {
            Log.e(TAG, "Compression/encoding failed", e);
            return null;
        }
    }

    /**
     * Renders a QR bitmap using ZXing.
     */
    @Nullable
    private static Bitmap renderQr(@NonNull String content, int sizePx) {
        try {
            BitMatrix matrix = new QRCodeWriter().encode(
                    content, BarcodeFormat.QR_CODE, sizePx, sizePx
            );
            int w = matrix.getWidth();
            int h = matrix.getHeight();
            int[] pixels = new int[w * h];
            for (int y = 0; y < h; y++) {
                int row = y * w;
                for (int x = 0; x < w; x++) {
                    pixels[row + x] = matrix.get(x, y) ? Color.BLACK : Color.WHITE;
                }
            }
            Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565);
            bmp.setPixels(pixels, 0, w, 0, 0, w, h);
            return bmp;
        } catch (WriterException e) {
            Log.e(TAG, "QR generation failed", e);
            return null;
        }
    }

    /** Optional hook if your UI needs to recreate dialog views after configuration changes. */
    public void reloadContentView() {
        qrDisplayer.reload();
    }

    // -------------------------
    // Small abstractions for UI hooks
    // -------------------------

    /** Minimal notifier for user-facing messages (Toast/Snackbar/log). */
    public interface Notifier {
        @MainThread void show(@NonNull String message);
    }

    /** Renderer for QR fallback (dialog, activity, or custom view). */
    public interface QrDisplayer {
        @MainThread void showQr(@NonNull Bitmap bitmap, @NonNull String titleOrHint);
        @MainThread default void reload() { /* optional */ }
    }
}
