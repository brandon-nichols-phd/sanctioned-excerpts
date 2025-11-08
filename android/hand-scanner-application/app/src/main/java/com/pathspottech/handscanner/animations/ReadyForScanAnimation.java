package com.pathspottech.handscanner.animations;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.view.View;
import android.widget.ImageView;


public class ReadyForScanAnimation {
    int left_resource;
    int right_resource;
    int light_resource;
    ImageView right_hand;
    ImageView left_hand;
    ImageView lights;
    Activity parent;
    ValueAnimator hand_movement_animator;
    private static final float fade_factor = 1.0f/3.0f;
    private static final String TAG = "CYCLE_WAITING_ANIMATION";
    float translate_amount;
    private float fade_max;

    public ReadyForScanAnimation(Activity a, float translate, int left_hand_r, int right_hand_r, int light_r){
        left_resource = left_hand_r;
        right_resource = right_hand_r;
        light_resource = light_r;
        this.parent = a;
        this.translate_amount = translate;
        this.fade_max = translate * fade_factor;
        hand_movement_animator = ValueAnimator.ofFloat(0, translate_amount + fade_max);
        hand_movement_animator.setInterpolator(null);
        hand_movement_animator.setDuration(2250);
        hand_movement_animator.setRepeatMode(ValueAnimator.RESTART);
        hand_movement_animator.setRepeatCount(ValueAnimator.INFINITE);
        hand_movement_animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float animation_value = (float) animation.getAnimatedValue();
                float translation = Math.max(animation_value, translate_amount);
                // Math seems backwards but that's because translation is negative.
                float alpha = Math.max(0, translation - animation_value) / fade_max; // this is 0 or to -1
                alpha = 1 + alpha; // Hold at 1 then decrease to 0 during fade period --
                boolean half_way_there = translation / translate_amount >=0.5f;
                left_hand.setTranslationY(translation);
                right_hand.setTranslationY(translation);
                if (half_way_there){
                    lights.setVisibility(View.VISIBLE);
                } else {
                    lights.setVisibility(View.INVISIBLE);
                }
                left_hand.setAlpha(alpha);
                right_hand.setAlpha(alpha);
                lights.setAlpha(alpha);

                left_hand.invalidate();
                right_hand.invalidate();
                lights.invalidate();
            }
        }
        );

        this.reloadContentView();


    }

    public void reloadContentView() {
        this.right_hand = this.parent.findViewById(right_resource);
        this.left_hand = this.parent.findViewById(left_resource);
        this.lights = this.parent.findViewById(light_resource);
    }

    public void restart(){
        this.hand_movement_animator.start();
    }

    public void stop(){
        this.hand_movement_animator.end();
    }
}
