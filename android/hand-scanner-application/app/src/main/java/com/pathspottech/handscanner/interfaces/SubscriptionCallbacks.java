package com.pathspottech.handscanner.interfaces;

import org.json.JSONObject;

public interface SubscriptionCallbacks {
    public void updateSoftware(JSONObject payloadData);
    public void updateSoftwareFromS3Upload(JSONObject payloadData);
}
