package com.pathspottech.handscanner.animations;

import android.animation.ValueAnimator;
import android.widget.ImageView;

public class RotateAnimation extends ValueAnimator{
    ImageView target_surface;
    private float rotate_max;
    private float base_rotation;

    /**
     * Sets to infinite reversing rotation animation
     * @param target thing to rotate
     * @param rotate_amount amount in degrees
     * @param dur duration in miliseconds
     */
    public RotateAnimation(ImageView target, float rotate_amount, float starting_rotation, long dur){
        this(target, rotate_amount, starting_rotation, dur, INFINITE, REVERSE);
    }

    /**
     *
     * @param target thing to rotate
     * @param rotate_amount amount in degrees
     * @param dur duration in miliseconds
     * @param repeat_count -1 for infinite
     * @param repeat_mode  ValueAnimator.RepeatMode
     */
    public RotateAnimation(ImageView target, float rotate_amount, float starting_rotation, long dur, int repeat_count, int repeat_mode){
        super();
        this.rotate_max = rotate_amount;
        this.target_surface = target;
        this.base_rotation = starting_rotation;
        this.setFloatValues(0.0f, 1.0f);
        this.setRepeatCount(repeat_count);
        this.setRepeatMode(repeat_mode);
        this.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float progress = (float) animation.getAnimatedValue();
                target_surface.setRotation(progress * rotate_max + base_rotation);
                target_surface.invalidate();
            }
        });
        this.setDuration(dur);
    }
}
