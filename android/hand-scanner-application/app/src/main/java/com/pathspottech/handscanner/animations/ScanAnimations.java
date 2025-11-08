package com.pathspottech.handscanner.animations;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.graphics.drawable.Drawable;
import android.widget.ImageView;
import android.widget.TextView;

import com.pathspottech.handscanner.R;

public class ScanAnimations {
    private static final float HANDS_TRANS_TOGETHER = 30.0f;
    private static final float HANDS_TRANS_UP = 130.0f;
    private Activity parent;
    private ImageView left_hand;
    private ImageView right_hand;
    private ImageView scanner;
    private ImageView scanner_light;
    private TextView header;
    private BreatheAnimation light_breath;
    private TranslateAnimation left_hand_slide;
    private TranslateAnimation right_hand_slide;
    private ValueAnimator hand_flip;
    private Drawable hand_up;
    private Drawable hand_down;

    public ScanAnimations(Activity a){
        parent = a;
        this.reloadContentView();
    }

    public void reloadContentView(){
        this.left_hand = parent.findViewById(R.id.left_hand);
        this.right_hand = parent.findViewById(R.id.right_hand);
        this.scanner = parent.findViewById(R.id.scanner_image);
        this.scanner_light = parent.findViewById(R.id.scan_light);
        this.header = parent.findViewById(R.id.scanning_header);
        this.hand_down = parent.getDrawable(R.drawable.ic_single_hands_facing_down);
        this.hand_up = parent.getDrawable(R.drawable.ic_single_hands_facing_up);

        light_breath = new BreatheAnimation(scanner_light, 0.5f, 1.0f, 750*3l);
        left_hand_slide = new TranslateAnimation(left_hand, HANDS_TRANS_TOGETHER, -HANDS_TRANS_UP, 1500);
        right_hand_slide = new TranslateAnimation(right_hand, -HANDS_TRANS_TOGETHER, -HANDS_TRANS_UP, 1500);
        hand_flip = ValueAnimator.ofFloat(1.0f, 0.1f);
        hand_flip.setDuration(1000l);
        hand_flip.setRepeatMode(ValueAnimator.REVERSE);
        hand_flip.setRepeatCount(1);
        hand_flip.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float progress = (float) animation.getAnimatedValue();
                left_hand.setScaleX(progress);
                right_hand.setScaleX(-progress);
                left_hand.invalidate();
                right_hand.invalidate();
            }
        });
        hand_flip.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationRepeat(Animator animation) {
                super.onAnimationRepeat(animation);
                left_hand.setImageDrawable(hand_down);
                right_hand.setImageDrawable(hand_down);
            }
        });

    }

    public void scan_started(){
        left_hand.setImageDrawable(hand_up);
        right_hand.setImageDrawable(hand_up);
        header.setRotation(0.0f);
        header.invalidate();
        header.setText(R.string.scanning_keep_still_header);
        light_breath.start();
        left_hand_slide.start();
        right_hand_slide.start();
    }

    public void hands_flip(){
        header.setText(R.string.scanning_flip_hands_header);
        light_breath.start();
        hand_flip.start();
    }

}
