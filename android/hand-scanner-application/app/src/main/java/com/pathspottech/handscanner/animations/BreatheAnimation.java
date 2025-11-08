package com.pathspottech.handscanner.animations;

import android.animation.ValueAnimator;
import android.util.Log;
import android.widget.ImageView;

import java.util.Random;

public class BreatheAnimation extends ValueAnimator {
    ImageView target_surface;
    public BreatheAnimation(ImageView target, float min_alpha, float max_alpha, long dur){
        target_surface = target;
//        int elements = 15;

//        float [] values = new float[elements];
//        values[0]= min_alpha;
//        values[values.length-1] = max_alpha;
//        Random r = new Random();
//        for (int i = 1; i< values.length -1; i++){
//            values[i] = ((float)Math.random()) * (max_alpha - min_alpha) + min_alpha;
////            values[i] = (mean) + stddev* (float)r.nextGaussian();
//        }
        this.setFloatValues(min_alpha, max_alpha);
        this.setDuration(dur);
        this.setRepeatCount(0);
        this.addUpdateListener(new AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float  alpha = (float) animation.getAnimatedValue();
                target_surface.setAlpha(alpha);
                target_surface.invalidate();
            }
        });
    }

}
