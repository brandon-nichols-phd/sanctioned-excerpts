// SPDX-License-Identifier: MIT
//
// SendGridEmailSender (sanitized, vendor-neutral)
// -----------------------------------------------
// Purpose:
//   Utility class for asynchronously sending an email through SendGrid using
//   RxJava and the SendGrid Android SDK.
//
// Highlights:
//   • Demonstrates background work using RxJava (IO → Main thread pattern).
//   • Handles optional file attachments safely.
//   • Separates configuration (API key, addresses) from implementation.
//
// Security Notes:
//   • Never hard-code API keys in source control. Inject them at runtime
//     via BuildConfig, environment variables, or encrypted storage.
//   • Limit SendGrid key scope to "Mail Send" and revoke/regenerate regularly.
//
// Example usage:
//
//   SendGridEmailSender sender = new SendGridEmailSender("YOUR_API_KEY");
//   sender.sendEmail(
//       "System Report",
//       "Attached is the latest device report.",
//       subscriber,
//       new File(context.getCacheDir(), "report.txt")
//   );

package com.example.email;

import android.util.Log;

import java.io.File;
import java.io.IOException;

import rx.Single;
import rx.SingleSubscriber;
import rx.android.schedulers.AndroidSchedulers;
import rx.schedulers.Schedulers;
import uk.co.jakebreen.sendgridandroid.SendGrid;
import uk.co.jakebreen.sendgridandroid.SendGridMail;
import uk.co.jakebreen.sendgridandroid.SendGridResponse;

/**
 * Asynchronous helper for sending emails via SendGrid.
 */
public class SendGridEmailSender {

    private static final String TAG = "SendGridEmailSender";

    private final SendGrid sendGrid;

    /**
     * Creates a new sender instance using the provided SendGrid API key.
     *
     * @param apiKey your SendGrid API key (Mail Send scope only)
     */
    public SendGridEmailSender(String apiKey) {
        this.sendGrid = SendGrid.create(apiKey);
    }

    /**
     * Sends an email with optional file attachment asynchronously.
     *
     * @param subject      the email subject line
     * @param body         the plain text body
     * @param onComplete   Rx subscriber to receive {@link SendGridResponse}
     * @param attachment   optional file attachment (nullable)
     */
    public void sendEmail(
            String subject,
            String body,
            SingleSubscriber<? super SendGridResponse> onComplete,
            File attachment
    ) {
        SendGridMail mail = new SendGridMail();

        // In production, these should be configurable (not hardcoded)
        mail.setFrom("noreply@example.com", "Device Monitor");
        mail.addRecipient("support@example.com", "Support Team");
        mail.addRecipientBlindCarbonCopy("audit@example.com", "Audit BCC");

        mail.setSubject(subject);
        mail.setContent(body);

        if (attachment != null && attachment.exists()) {
            try {
                mail.addAttachment(attachment);
            } catch (IOException e) {
                Log.e(TAG, "Failed to attach file: " + attachment.getName(), e);
            }
        }

        // Use fromCallable() with a lambda to ensure lazy execution.
        Single.fromCallable(() -> sendGrid.send(mail))
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(onComplete);
    }
}
