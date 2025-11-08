// SPDX-License-Identifier: MIT
//
// MathableEntry (sanitized, vendor-neutral)
// ----------------------------------------
// Purpose:
//   Minimal numeric (x,y) pair with helpers useful for time-series downsampling
//   (e.g., LTTB: Largest-Triangle-Three-Buckets). Implements Map.Entry<Double, Double>
//   so it integrates with map-like collections, and Comparable for x-axis ordering.
//
// Highlights:
//   • Triangle area via the shoelace formula (useful for LTTB "importance" metric)
//   • Numeric ops: add(), divide()
//   • Optional helpers: construct from JSON, convert to MPAndroidChart Entry
//
// Notes:
//   • x and y are required (non-null) Doubles; throws NPE if null is provided.
//   • compareTo orders strictly by x using Double.compare (total order w.r.t NaN/Inf).
//   • Map.Entry#setValue returns the previous value (per the interface contract).

package com.example.lttb;

import org.json.JSONObject;
import com.github.mikephil.charting.data.Entry; // Optional: MPAndroidChart convenience

import java.util.Map;
import java.util.Objects;

public class MathableEntry implements Map.Entry<Double, Double>, Comparable<MathableEntry> {

    protected Double x;
    protected Double y;

    /** Construct from a JSON object using provided keys (missing keys default to 0.0). */
    public MathableEntry(JSONObject j, String xKey, String yKey) {
        this.x = j != null ? j.optDouble(xKey, 0.0) : 0.0;
        this.y = j != null ? j.optDouble(yKey, 0.0) : 0.0;
        requireNonNulls();
    }

    /** Construct from explicit Double coordinates. */
    public MathableEntry(Double x, Double y) {
        this.x = x;
        this.y = y;
        requireNonNulls();
    }

    private void requireNonNulls() {
        if (x == null || y == null) {
            throw new NullPointerException("MathableEntry requires non-null x and y");
        }
    }

    // ---------------------------------------------------------------------
    // Optional: MPAndroidChart adapter (convenience for plotting)
    // Converts to an Entry with x relative to a provided origin (e.g., boot time).
    // ---------------------------------------------------------------------
    public Entry toMPChart(double xOrigin) {
        return new Entry((float) (getX() - xOrigin), getY().floatValue());
    }

    // ---------------------
    // Accessors / Mutators
    // ---------------------
    public Double getX() { return getKey(); }
    public Double getY() { return getValue(); }

    public void setX(Double x) {
        this.x = Objects.requireNonNull(x, "x");
    }

    public void setY(Double y) {
        this.y = Objects.requireNonNull(y, "y");
    }

    // ---------------
    // Numeric helpers
    // ---------------
    /** Vector add: this := this + t */
    public void add(MathableEntry t) {
        Objects.requireNonNull(t, "t");
        setX(getX() + t.getX());
        setY(getY() + t.getY());
    }

    /** Scalar divide: this := this / scalar (no zero guard). */
    public void divide(double scalar) {
        setX(getX() / scalar);
        setY(getY() / scalar);
    }

    // ---------------------------------------------
    // Triangle area (shoelace formula)
    // area = | ax*by + bx*cy + cx*ay − ay*bx − by*cx − cy*ax | / 2
    // ---------------------------------------------
    public double calculateArea(MathableEntry b, MathableEntry c) {
        Objects.requireNonNull(b, "b");
        Objects.requireNonNull(c, "c");
        MathableEntry a = this;
        double area2 =
                a.getX() * b.getY() +
                b.getX() * c.getY() +
                c.getX() * a.getY() -
                a.getY() * b.getX() -
                b.getY() * c.getX() -
                c.getY() * a.getX();
        return Math.abs(area2 / 2.0);
    }

    // --------------------------
    // Map.Entry<Double, Double>
    // --------------------------
    @Override public Double getKey()   { return x; }
    @Override public Double getValue() { return y; }

    /** Per Map.Entry contract, returns the previous value. */
    @Override
    public Double setValue(Double value) {
        Double prev = this.y;
        this.y = Objects.requireNonNull(value, "value");
        return prev;
    }

    // -----------
    // Comparable
    // -----------
    @Override
    public int compareTo(MathableEntry other) {
        return Double.compare(this.getX(), Objects.requireNonNull(other, "other").getX());
    }

    // -------
    // Object
    // -------
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MathableEntry)) return false;
        MathableEntry that = (MathableEntry) o;
        return Objects.equals(x, that.x) && Objects.equals(y, that.y);
    }

    @Override
    public int hashCode() { return Objects.hash(x, y); }

    @Override
    public String toString() {
        return "MathableEntry{x=" + x + ", y=" + y + '}';
    }
}
