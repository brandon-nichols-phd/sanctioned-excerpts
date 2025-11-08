package com.pathspottech.handscanner.animations;

import android.animation.Animator;
import android.animation.ValueAnimator;
import android.widget.ImageView;

import java.util.Random;

public class BubbleDrift extends ValueAnimator  implements Animator.AnimatorListener {
    ImageView target_surface;
    private float y_max;
    private float x_max;
    private float base_y;
    private float base_x;
    private float base_range_x;
    private float base_range_y;
    private Random r;
    private float major_period;
    private float minor_period;


    public BubbleDrift(ImageView target, float x_max, float y_max, float x_base, float y_base, long dur) {
        this(target, x_max, y_max, x_base, y_base, dur, INFINITE, RESTART);
    }

    private float get_ranged_float(double a){
        return this.get_ranged_float((float) a);
    }
    private float get_ranged_float(float absolute_bound){
        float ret = r.nextFloat() * 2.0f - 1.0f;
        return ret * absolute_bound;
    }

    private float get_bounded_range(double min, double max){
        double ret = r.nextFloat() * (max - min) + min;
        if (r.nextBoolean()){
            ret *= -1.0f;
        }
        return (float)ret;
    }

    private void randomize_motion(){
        this.base_x = get_ranged_float(base_range_x);
        this.base_y = get_ranged_float(base_range_y);
        this.major_period = get_bounded_range(Math.PI / 4 ,Math.PI / 2.0);
        this.minor_period = get_bounded_range( 2 * Math.PI,  5.0 * Math.PI);

    }
    public BubbleDrift(ImageView target, float x_trans, float y_trans, float x_base, float y_base, long dur, int repeat_count, int repeat_mode){
        super();
        this.r = new Random();
        this.y_max = y_trans;
        this.x_max = x_trans;
        this.base_range_x = x_base;
        this.base_range_y = y_base;

        target_surface = target;
        this.setFloatValues(0.0f, 1.0f);
        this.setRepeatCount(repeat_count);
        this.setRepeatMode(repeat_mode);
        this.setInterpolator(null);
        this.addListener(this);
        this.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float progress = (float) animation.getAnimatedValue();
                // 10 could be a randomly generated value from 0 to 10 on animation restart
                float x_drift =(float) (x_max * Math.sin(progress * major_period) * Math.sin(progress * minor_period));
                target_surface.setTranslationY(base_y + progress*y_max);
                target_surface.setTranslationX(base_x + x_drift);
                target_surface.setAlpha(1 - progress);
                target_surface.setScaleX( 1 + 3 * progress);
                target_surface.setScaleY( 1 + 3 * progress);
                target_surface.invalidate();
            }
        });

        this.setDuration(dur);
    }

    @Override
    public void onAnimationStart(Animator animation) {
        this.randomize_motion();
    }

    @Override
    public void onAnimationEnd(Animator animation) {
        //not called for infinite
    }

    @Override
    public void onAnimationCancel(Animator animation) {
        //not called for infinite

    }

    @Override
    public void onAnimationRepeat(Animator animation) {
        this.randomize_motion();
    }
}
