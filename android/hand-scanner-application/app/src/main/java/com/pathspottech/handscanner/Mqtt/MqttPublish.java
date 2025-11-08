package com.pathspottech.handscanner.Mqtt;

import android.os.Handler;
import android.util.Log;

import com.amazonaws.mobileconnectors.iot.AWSIotMqttMessageDeliveryCallback;
import com.amazonaws.mobileconnectors.iot.AWSIotMqttQos;

import org.json.JSONException;
import org.json.JSONObject;


public class MqttPublish {
    private Handler handler;
    public void requestEmployeeList(int location_id){
        configureMqttPublish();
        Log.e("EMPLOYEE", "Requesting new employees");
        try{
            JSONObject payload = new JSONObject();
            payload.put("location_id", location_id);
            payload.put("message_version", Constants.MESSAGE_VERSION);
            MqttManager.getInstance().publishString(payload.toString(),
                    Topics.REQUEST_NEW_EMPLOYEES_TOPIC,
                    AWSIotMqttQos.QOS1,
                    new AWSIotMqttMessageDeliveryCallback() {
                        @Override
                        public void statusChanged(MessageDeliveryStatus status, Object userData) {
                            Log.e("EMPLOYEES", "Successfully sent employee request");
                        }
                    },
                    payload);

        } catch (Exception e) {
            Log.e("MQTT_PUB", "Requesting employees failed", e);
        }
        return;
    }


    public void requestNewConfig(Integer device_id, String reason){
        configureMqttPublish();
        Log.e("CONFIG", "Requesting a new config");
        try {
            JSONObject payload= new JSONObject();
            payload.put("device_id", device_id);
            payload.put("software_version", BuildConfig.VERSION_NAME);
            payload.put("message_version", Constants.MESSAGE_VERSION);
            payload.put("request_reason", reason);
            MqttManager.getInstance().publishString(payload.toString(), Topics.REQUEST_NEW_CONFIG_TOPIC, AWSIotMqttQos.QOS1,
                    new AWSIotMqttMessageDeliveryCallback() {
                        @Override
                        public  void statusChanged(MessageDeliveryStatus status, Object userData) {
                           Log.e("Brandon DEBUG", "successfully published our request");
                        }
            }, payload);

        }catch (Exception e){
            Log.e("MQTT_PUB", "Requesting Config failed", e);
        }
    }

    public void configureMqttPublish() {
        if (handler == null){
            handler = new Handler();
        }
    }



    public void updateConfigurationSettings(ConfigurationSettingsModel payload) {
        configureMqttPublish();

        try {
            JSONObject params = new JSONObject(payload.getJSONString());
            JSONObject modifiedPayload = new JSONObject();
            params.put("sender", "mobile");
            modifiedPayload.put("state", params);
            modifiedPayload.put("message_version", Constants.MESSAGE_VERSION);
            String topic = String.format(Topics.REMOTE_CONFIG_REPLY_TOPIC, payload.getStationID());
            Log.e("CONFIG", "Sending config update");
            mqttSendWithRetry(modifiedPayload.toString(), topic, 5000);
        } catch (Exception e) {
            Log.e("CONFIG", "Failed to convert configuration model for sending");
        }
    }
    private void mqttSendWithRetry(final String payload, final String topic, final int retry_delay_ms){
        try{
            final Runnable retry_runnable = new Runnable() {
                @Override
                public void run() {
                    mqttSendWithRetry(payload, topic, retry_delay_ms);
                }
            };

            AWSIotMqttMessageDeliveryCallback callback = new AWSIotMqttMessageDeliveryCallback() {
                @Override
                public  void statusChanged(MessageDeliveryStatus status, Object userData) {
                    Log.e("CONFIG",  "Config send status "+ topic + " " + status + userData.toString());
                    if(status == MessageDeliveryStatus.Fail){
                        handler.postDelayed(retry_runnable, retry_delay_ms);
                    }
                }
            };
            MqttManager.getInstance().publishString(payload,
                    topic,
                    AWSIotMqttQos.QOS1,
                    callback,
                    payload);
        }catch(Exception e){
            Log.e("CONFIG", "Failed to send data to cloud", e);
        }
    }

    public void requestSensors(int department_id, int locationID, String timezone) {
        configureMqttPublish();
        try {
            JSONObject params = new JSONObject();
            params.put("location_id", locationID);
            if (department_id > 0) {
                params.put("department_id", department_id);
            }
            params.put("timezone", timezone);
            params.put("type", "SYNC");
            MqttManager.getInstance().publishString(params.toString(), Topics.SENSOR_UPLOAD_TOPIC, AWSIotMqttQos.QOS1,
                    new AWSIotMqttMessageDeliveryCallback() {
                        @Override
                        public  void statusChanged(MessageDeliveryStatus status, Object userData) {
                            Log.e("SENSOR_CONF", "successfully published our request " +status.name());
                        }
                    }, params);
        } catch (JSONException je){
            Log.e("SENSOR_CONF", "Failed to request sensors", je);
        }

    }
}
