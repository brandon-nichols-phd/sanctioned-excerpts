package com.pathspottech.handscanner.animations;

import android.animation.ValueAnimator;
import android.widget.ImageView;

public class TranslateAnimation extends ValueAnimator {
    float x_max;
    float y_max;
    ImageView target_surface;
    public TranslateAnimation(ImageView target, float x_trans, float y_trans, long dur){
        super();
        x_max = x_trans;
        y_max = y_trans;
        target_surface = target;
        this.setFloatValues(0.0f, 1.0f);
        this.setRepeatCount(0);
        this.setRepeatMode(RESTART);
        this.addUpdateListener(new AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float progress = (float) animation.getAnimatedValue();
                target_surface.setTranslationX(progress * x_max);
                target_surface.setTranslationY(progress * y_max);
                target_surface.invalidate();
            }
        });
        this.setDuration(dur);
    }


}
