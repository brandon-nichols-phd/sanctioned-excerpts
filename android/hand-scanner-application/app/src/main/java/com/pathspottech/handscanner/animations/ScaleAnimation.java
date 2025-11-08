package com.pathspottech.handscanner.animations;

import android.animation.ValueAnimator;
import android.widget.ImageView;

public class ScaleAnimation extends ValueAnimator {
    ImageView target_surface;
    private float scale_max;

    /**
     * Sets to infinite reversing rotation animation
     * @param target thing to rotate
     * @param scale_amount multiplicative scale
     * @param dur duration in miliseconds
     */
    public ScaleAnimation(ImageView target, float scale_amount, long dur){
        this(target, scale_amount, dur, INFINITE, REVERSE);
    }

    /**
     *
     * @param target thing to rotate
     * @param scale_amount multiplicative scale
     * @param dur duration in miliseconds
     * @param repeat_count -1 for infinite
     * @param repeat_mode  ValueAnimator.RepeatMode
     */
    public ScaleAnimation(ImageView target, float scale_amount, long dur, int repeat_count, int repeat_mode){
        super();
        this.scale_max = scale_amount;
        target_surface = target;
        this.setFloatValues(1.0f, this.scale_max);
        this.setRepeatCount(repeat_count);
        this.setRepeatMode(repeat_mode);
        this.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float progress = (float) animation.getAnimatedValue();
                target_surface.setScaleX(progress);
                target_surface.setScaleY(progress);
                target_surface.invalidate();
            }
        });
        this.setDuration(dur);
    }

}
