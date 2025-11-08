// SPDX-License-Identifier: MIT
//
// Bucket (sanitized, vendor-neutral)
// ----------------------------------
// Purpose:
//   A small container for a "bucket" of (x,y) samples used by LTTB
//   (Largest-Triangle-Three-Buckets). Provides:
//     • Average point of the bucket (cached)
//     • Point in this bucket that maximizes the triangle area with a
//       “before” reference point and the “after” bucket’s average.
//
// Design notes:
//   • Extends LinkedList<MathableEntry> for convenience; overrides mutators
//     to invalidate cached values (average/max).
//   • getAverage() is computed lazily and cached; cache is cleared on mutation.
//   • findMaxTriangle(...) caches the chosen max; cache is cleared on mutation.
//   • Safe fallbacks:
//       - Empty bucket average => (0,0)
//       - If “before” is null, picks the first element as max
//       - If “after” is null or empty, uses this bucket’s average as the “after” point
//
// Usage in LTTB:
//   Typically, “before” is the previously selected point; “after” is the next bucket.
//   The chosen point here is the one that maximizes triangle area with:
//        area( before, candidateInThisBucket, afterAverage )
//
// Threading:
//   Not thread-safe. Use from a single thread or add external synchronization.

package com.example.lttb;

import java.util.Collection;
import java.util.LinkedList;

public class Bucket extends LinkedList<MathableEntry> {

    private MathableEntry average = null; // cached bucket average
    private MathableEntry max     = null; // cached argmax result within this bucket

    // -----------------------------
    // Cache management / utilities
    // -----------------------------
    private void invalidateCaches() {
        average = null;
        max     = null;
    }

    private MathableEntry computeAverage() {
        final int n = size();
        if (n == 0) {
            // Neutral element; safe default for downstream math
            return new MathableEntry(0.0, 0.0);
        }
        MathableEntry sum = new MathableEntry(0.0, 0.0);
        for (MathableEntry e : this) {
            sum.add(e);
        }
        sum.divide(n);
        return sum;
    }

    // -----------------------------
    // Public helpers
    // -----------------------------

    /** Returns the cached (or computed) average of all entries in this bucket. */
    public MathableEntry getAverage() {
        if (average == null) {
            average = computeAverage();
        }
        return average;
    }

    /** Returns the previously computed max (if any). Mostly for debugging/introspection. */
    public MathableEntry getMax() {
        return max;
    }

    /**
     * Finds (and caches) the entry in this bucket that maximizes triangle area with
     * a “before” reference point and the “after” bucket’s average.
     *
     * Fallbacks:
     *  - If this bucket is empty, returns null.
     *  - If {@code before} is null, returns the first element.
     *  - If {@code after} is null or empty, uses this bucket’s own average as “after”.
     */
    public MathableEntry findMaxTriangle(Bucket before, Bucket after) {
        if (max != null) {
            return max;
        }
        if (isEmpty()) {
            return null;
        }

        // Determine reference points
        MathableEntry beforeRef = (before != null) ? before.getMax() : null;
        if (beforeRef == null && before != null && !before.isEmpty()) {
            // If “before” exists but has no cached max (not computed yet),
            // choose a reasonable representative — its average.
            beforeRef = before.getAverage();
        }

        MathableEntry afterRef;
        if (after == null || after.isEmpty()) {
            afterRef = this.getAverage(); // fallback
        } else {
            afterRef = after.getAverage();
        }

        // If there is no meaningful "before" reference, pick first element deterministically.
        if (beforeRef == null) {
            max = getFirst();
            return max;
        }

        // Argmax over this bucket
        double bestArea = Double.NEGATIVE_INFINITY;
        MathableEntry best = null;
        for (MathableEntry e : this) {
            double area = e.calculateArea(beforeRef, afterRef);
            if (area > bestArea) {
                bestArea = area;
                best = e;
            }
        }
        max = (best != null) ? best : getFirst();
        return max;
    }

    // ---------------------------------
    // Mutator overrides: invalidate cache
    // ---------------------------------

    @Override
    public boolean add(MathableEntry e) {
        boolean ok = super.add(e);
        if (ok) invalidateCaches();
        return ok;
    }

    @Override
    public void addFirst(MathableEntry e) {
        super.addFirst(e);
        invalidateCaches();
    }

    @Override
    public void addLast(MathableEntry e) {
        super.addLast(e);
        invalidateCaches();
    }

    @Override
    public boolean addAll(Collection<? extends MathableEntry> c) {
        boolean ok = super.addAll(c);
        if (ok) invalidateCaches();
        return ok;
    }

    @Override
    public boolean addAll(int index, Collection<? extends MathableEntry> c) {
        boolean ok = super.addAll(index, c);
        if (ok) invalidateCaches();
        return ok;
    }

    @Override
    public MathableEntry set(int index, MathableEntry element) {
        MathableEntry prev = super.set(index, element);
        invalidateCaches();
        return prev;
    }

    @Override
    public MathableEntry remove() {
        MathableEntry v = super.remove();
        invalidateCaches();
        return v;
    }

    @Override
    public MathableEntry remove(int index) {
        MathableEntry v = super.remove(index);
        invalidateCaches();
        return v;
    }

    @Override
    public boolean remove(Object o) {
        boolean ok = super.remove(o);
        if (ok) invalidateCaches();
        return ok;
    }

    @Override
    public void clear() {
        super.clear();
        invalidateCaches();
    }
}
