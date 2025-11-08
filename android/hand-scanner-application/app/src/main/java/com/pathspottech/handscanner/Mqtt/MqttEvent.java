package com.pathspottech.handscanner.Mqtt;

public interface MqttEvent {

    public void isMQTTConnected(Boolean isConnected);

    public void isMQTTDisconnected(Boolean isConnected);
}

