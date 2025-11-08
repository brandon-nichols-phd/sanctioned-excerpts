package com.pathspottech.handscanner.interfaces;

import org.json.JSONObject;

public interface MqttSubscribeInterface {
    public void updateSoftware(JSONObject payloadData);
}
