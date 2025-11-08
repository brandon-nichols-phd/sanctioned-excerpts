package com.pathspottech.handscanner.animations;

import android.app.Activity;
import android.util.Log;
import android.widget.ImageView;

import java.util.Random;

public class WashingAnimation {
    private static final String TAG = "SCAN_STATE_WASH_ANIMATION";
    private Activity parent;
    private int left_hand_id;
    private int right_hand_id;
    private int soap_id;
    private int[] bubble_ids;
    private ImageView left_hand;
    private ImageView right_hand;
    private ImageView soap;
    private ImageView[] bubble;
    private RotateAnimation left_hand_rotation;
    private RotateAnimation right_hand_rotation;
    private ScaleAnimation soap_scaling;
    private BubbleDrift[] bubble_animations;
    private Random r = new Random();


    public WashingAnimation(Activity parent, int left_hand_id, int right_hand_id, int soap_id, int[] bubbles_id){
        this.parent = parent;
        this.left_hand_id = left_hand_id;
        this.right_hand_id = right_hand_id;
        this.soap_id = soap_id;
        this.bubble_ids = bubbles_id;
        this.reloadContentView();
    }

    public void reloadContentView(){
        this.left_hand = parent.findViewById(left_hand_id);
        this.right_hand = parent.findViewById(right_hand_id);
        this.soap = parent.findViewById(soap_id);
        this.bubble = new ImageView[this.bubble_ids.length];
        this.bubble_animations = new BubbleDrift[this.bubble_ids.length];

        for(int i = 0; i < this.bubble_ids.length; i++){
            this.bubble[i] = parent.findViewById(this.bubble_ids[i]);
            this.bubble_animations[i] = new BubbleDrift(this.bubble[i], 200.0f, -450.0f, 80.0f, 80.0f, 3000l);
        }
        this.left_hand_rotation = new RotateAnimation(left_hand, -15.0f, 35f, 500l);
        this.right_hand_rotation = new RotateAnimation(right_hand, 15.0f, 0f, 500l);
        this.soap_scaling = new ScaleAnimation(soap, 1.15f, 1500l);


    }

    public void start(){
        Log.e(TAG, "Calling animate");
        this.left_hand_rotation.start();
        this.right_hand_rotation.start();
        this.soap_scaling.start();
        for (BubbleDrift b : this.bubble_animations){
            b.setStartDelay(r.nextInt(300));
            b.start();
        }
        Log.e(TAG, "Started");
    }

    public void stop(){
        this.left_hand_rotation.end();
        this.right_hand_rotation.end();
        this.soap_scaling.end();
        for (BubbleDrift b : this.bubble_animations){
            b.end();
        }
    }

}
