package com.pathspottech.handscanner.interfaces;


import org.json.JSONObject;

public interface OnBoardingAPIResponse {

    void onSuccess(JSONObject config);
    void onFailure(boolean was_network_issue, boolean was_mac_request);
    void onCriticalFailure(Exception e);
}
