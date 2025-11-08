package com.pathspottech.handscanner.Mqtt;

import com.amazonaws.mobileconnectors.iot.AWSIotMqttManager;
import com.pathspottech.handscanner.Constants;

public class MqttManager{

    private static AWSIotMqttManager mqttManager = null;

    public static synchronized  AWSIotMqttManager getInstance() {
        if (mqttManager == null) { //if there is no instance available... create new one
            mqttManager = new AWSIotMqttManager(Math.random() + "", Constants.clientendpoint);
            mqttManager.setAutoReconnect(false);
            mqttManager.setKeepAlive(30);
            mqttManager.setCleanSession(true);  // No need for broker to hold onto messages for us. We will request new ones on connect (TPS) limit
            mqttManager.setAutoResubscribe(false);
            mqttManager.setOfflinePublishQueueEnabled(false);  // database serves as our publish queue
        }
        return mqttManager;
    }

}
