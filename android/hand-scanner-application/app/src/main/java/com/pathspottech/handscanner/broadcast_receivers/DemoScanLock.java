// SPDX-License-Identifier: MIT
//
// DemoScanLock (sanitized, vendor-neutral)
// ---------------------------------------
// Purpose:
//   A tiny, thread-safe latch/flag for “expected demo scan result” used by UI/tests
//   to coordinate simulated outcomes (PASS/FAIL/NO_HANDS).
//
// Notes:
//   - Uses AtomicInteger for simple, lock-free thread-safety.
//   - Mirrors the original API semantics but with clearer names and Javadoc.
//   - Consider adding wait/notify semantics if you need blocking waits (not included here).
//
// Example:
//   DemoScanLock lock = new DemoScanLock();
//   lock.setExpectedPass();
//   if (lock.isActive()) { ... }
//   int code = lock.getResult(); // compare to DemoScanLock.ResultType.PASS
//   lock.reset();

package com.example.broadcastreceivers;

import java.util.concurrent.atomic.AtomicInteger;

public final class DemoScanLock {

    /** Integer result codes for demo scans. Keep in sync with any senders/listeners. */
    public static final class ResultType {
        public static final int PASS     = 1;
        public static final int FAIL     = 2;
        public static final int NO_HANDS = 3;
        public static final int ERROR    = -1; // “no expectation set” / inactive
        private ResultType() {}
    }

    private final AtomicInteger expectedResult = new AtomicInteger(ResultType.ERROR);

    /** Creates a new lock with no expected result (inactive). */
    public DemoScanLock() {
        // no-op; starts at ERROR
    }

    /** Sets the expected result to PASS. */
    public void setExpectedPass() {
        expectedResult.set(ResultType.PASS);
    }

    /** Sets the expected result to FAIL (contamination). */
    public void setExpectedFail() {
        expectedResult.set(ResultType.FAIL);
    }

    /** Sets the expected result to NO_HANDS. */
    public void setExpectedNoHands() {
        expectedResult.set(ResultType.NO_HANDS);
    }

    /** Sets a specific expected result code. */
    public void setExpectedResult(int resultCode) {
        expectedResult.set(resultCode);
    }

    /** Clears any expectation and marks this lock as inactive. */
    public void reset() {
        expectedResult.set(ResultType.ERROR);
    }

    /** Returns the current expected result code (or {@link ResultType#ERROR} if none). */
    public int getResult() {
        return expectedResult.get();
    }

    /** True if an expectation is currently set (i.e., not ERROR). */
    public boolean isActive() {
        return expectedResult.get() != ResultType.ERROR;
    }

    @Override
    public String toString() {
        final int v = expectedResult.get();
        String label = switch (v) {
            case ResultType.PASS     -> "PASS";
            case ResultType.FAIL     -> "FAIL";
            case ResultType.NO_HANDS -> "NO_HANDS";
            case ResultType.ERROR    -> "ERROR";
            default                  -> "UNKNOWN(" + v + ")";
        };
        return "DemoScanLock{expectedResult=" + label + "}";
    }
}
