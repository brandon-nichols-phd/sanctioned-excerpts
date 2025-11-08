package com.pathspottech.handscanner.Mqtt;


import android.util.Log;

import com.pathspottech.handscanner.constants.Topics;
import com.pathspottech.handscanner.interfaces.SubscriptionCallbacks;
import com.amazonaws.mobileconnectors.iot.AWSIotMqttNewMessageCallback;
import com.amazonaws.mobileconnectors.iot.AWSIotMqttQos;

import org.json.JSONObject;


public class MqttSubscribe {

    private static String finalData;

    public void subscribeToTopic(String topic, final SubscriptionCallbacks subscriptionCallbacks, final String deviceId) {
        Log.e("SUB", "Subscribe runned!!!" + String.format(topic, deviceId));
        try {
            MqttManager.getInstance().subscribeToTopic(String.format(topic, deviceId), AWSIotMqttQos.QOS1,
                    new AWSIotMqttNewMessageCallback() {
                        @Override
                        public void onMessageArrived(final String topic, byte[] data) {
                            finalData = new String(data);
                            Log.e("subscribeToTopic",
                                    finalData +"   "+ topic + "  ");

                            try {
                                if(topic.equals(String.format(Topics.REMOTE_CONFIG_REPLY_TOPIC, deviceId))) {
                                    JSONObject response = new JSONObject(finalData);
                                    Log.e("UPDATE:", response.toString());
                                    subscriptionCallbacks.updateSoftware(response);

                                }
                            } catch (Exception e) {
                                Log.e("UPDATE", "Failed to handle new data");
                            }
                        }
                    });
        } catch (Exception e) {
            Log.e("MainActivity", "Subscription error: ", e);
        }
    }
}

