package com.pathspottech.handscanner.animations;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.graphics.drawable.Drawable;
import android.view.animation.Animation;
import android.widget.ImageView;
import android.widget.TextView;

public class FadeTransition extends ValueAnimator {
    protected ImageView target_surface;
    protected Drawable initial_image;
    protected Drawable final_image;
    protected TextView header;
    protected long dur;
    public FadeTransition(ImageView surface_to_animate, Drawable starting_image, Drawable end_image, long duration, TextView header_to_animate){
        super();
        target_surface = surface_to_animate;
        initial_image = starting_image;
        final_image = end_image;
        dur = duration;
        header = header_to_animate;

        this.setFloatValues(1.0f, 0.0f);
        this.setDuration(this.dur);
        this.setRepeatMode(Animation.REVERSE);
        this.setRepeatCount(1);
        this.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationRepeat(Animator animation) {
                super.onAnimationRepeat(animation);
                target_surface.setImageDrawable(final_image);
                invalidate();
            }

            @Override
            public void onAnimationEnd(Animator animation) {
                super.onAnimationEnd(animation);
                header.setRotation(0.0f);
                target_surface.setImageDrawable(final_image);
                target_surface.setAlpha(1.0f);
                invalidate();
            }

        });
        this.addUpdateListener(new AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float  alpha = (float) animation.getAnimatedValue();
                target_surface.setAlpha(alpha);
                header.setRotation(alpha * 180);
                invalidate();
            }
        });


    }
    private void invalidate(){
        header.invalidate();
        target_surface.invalidate();
    }
    @Override
    public void start() {
        target_surface.setImageDrawable(initial_image);
        target_surface.setAlpha(1.0f);
        header.setRotation(0.0f);
        this.setRepeatCount(1);
        super.start();
    }
}
