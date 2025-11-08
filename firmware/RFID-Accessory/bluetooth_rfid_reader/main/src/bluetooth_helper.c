#include "bluetooth_helper.h"
#include "esp_err.h"
#include "errno.h"
#include "stdio.h"
#include "esp_log.h"
#include "unistd.h"
#include <stdlib.h>
#include <string.h>
#include "freertos/task.h"

#define WG_TAG "WGND"
#define BT_TAG "BT_SENDER"
#define RFID_TAG "RFID_READER"
#define ESP_INTR_FLAG_DEFAULT 0


typedef enum bt_return {SUCCESS, FAILURE} bt_return;
/**
 * write all bytes in the buffer to the file descriptor
 */

static uint8_t pinD0 = 22;
static uint8_t pinD1 = 23;
unsigned int maxWiegandBits = 128;
unsigned int packetGap = 100;      //max ms between rfid data packets

static bt_return safe_fd_write(int fd,  uint8_t data[], int data_length){
	if (-1 == fd){
		ESP_LOGI(BT_TAG, "No active bluetooth connection, dropping %s", (char *) data);
		return FAILURE;
	}
	int bytes_written = 0;
	while (bytes_written != data_length){
		int bytes_just_sent = write(fd, &(data[bytes_written]), data_length - bytes_written);
		if( bytes_just_sent != -1){
			bytes_written += bytes_just_sent;
		} else {
			ESP_LOGE(BT_TAG, "Failed to write out all bytes");
			ESP_LOGE(BT_TAG, "%d - %s" , errno, esp_err_to_name(errno));
			return FAILURE;
		}
	}
	return SUCCESS;
}


void data_publisher_task(void * params){
	ESP_LOGI(BT_TAG, "STARTED");
	bluetooth_conn * connection = (bluetooth_conn *) params;
	bt_message received_message;
	while (1){
		if( xQueueReceive( connection->to_publish, &received_message, BLOCKING_TICKS)){
			while (xSemaphoreTake(connection->fd_mutex, BLOCKING_TICKS ) != pdTRUE){
				; // Block until we have the mutex retrying
			}
			if (FAILURE == safe_fd_write(connection->fd,
										 received_message.data,
										 received_message.data_len)){
				//TODO something went wrong with the Bluetooth publish

			} else {
				ESP_LOGI(BT_TAG, "Sent: %s", received_message.data);
			}
			xSemaphoreGive(connection->fd_mutex);
			free(received_message.data);
		}
	}
}


esp_err_t configure_RFID_pins(){
	newWiegand(pinD0, pinD1, maxWiegandBits, packetGap);
	if(startWiegand()){
		return ESP_OK;
	} else {
		return ESP_FAIL;
	}

}
/**
 * Returns SUCCESS / FAILURE
 */

static bt_return read_RFID_input(uint8_t * data_buffer, uint8_t  * data_len, uint8_t buffer_size){
	static int counter = 0;
    uint8_t qVal=255;
    unsigned long bitNumber = 0;
    uint8_t decimalConversion = 0;
    uint8_t byteIdx = 0;


	qVal = validWiegandAvailable();
	if (qVal<255){
		while(((qVal = validWiegandAvailable()) < 255)) {
			ESP_LOGI(WG_TAG, "Rx bit %lu val: %hu", bitNumber, qVal);
			bitNumber++;

			if(bitNumber>0){
				decimalConversion = decimalConversion << 1;
				decimalConversion = decimalConversion + qVal;
				if((bitNumber%8)==0){
					ESP_LOGI(WG_TAG, "Byte %hu val: %hu", byteIdx/2, decimalConversion);
					byteIdx += snprintf((char *) &data_buffer[byteIdx], buffer_size - byteIdx, "%.2x", decimalConversion);

					if(byteIdx >= buffer_size){
						ESP_LOGI(WG_TAG, "BT buffer size exceeded...");

						break;
					}
					decimalConversion = 0;

				}
			} else {
					decimalConversion = qVal;
				}
			}
		if ((bitNumber%8) && (byteIdx < buffer_size)){
			ESP_LOGI(WG_TAG, "Byte %hu val: %hu", byteIdx/2, decimalConversion);
			byteIdx += snprintf((char *) &data_buffer[byteIdx], buffer_size - byteIdx, "%.2x", decimalConversion);
		}


	}
	*data_len = byteIdx;
	//*data_len = snprintf((char *) data_buffer, buffer_size, "Packet %d", counter);
	if (byteIdx > 0){
		ESP_LOGI(RFID_TAG, "Read %s", (char *) data_buffer);
	}
	counter++;
	return SUCCESS;
}

void RFID_reader_task(void * params){

	ESP_LOGI(RFID_TAG, "STARTED");
	bluetooth_conn * connection = (bluetooth_conn *) params;
	bt_message to_send;
	uint8_t recv_buffer[BT_SEND_MAX_MESSAGE_SIZE];
	while (1){

		if (pdTRUE == xSemaphoreTake(connection->fd_mutex, 0) &&  -1 != connection->fd){
			//TODO Unlikely to need, but this could be wrapped in a while loop if we are sending a lot of data.
			int size = read (connection->fd, recv_buffer, BT_SEND_MAX_MESSAGE_SIZE);
			if (-1 == size) {
				ESP_LOGI(RFID_TAG, "No bluetooth data");
			} else if (size){
				//TODO configure RFID mode
			}
		}

		xSemaphoreGive(connection->fd_mutex);
		if (SUCCESS == read_RFID_input(recv_buffer, &(to_send.data_len), BT_SEND_MAX_MESSAGE_SIZE) && to_send.data_len > 0){
			to_send.data = malloc(sizeof(uint8_t) * (to_send.data_len + 1));
			if (NULL != to_send.data){
				memcpy(to_send.data, recv_buffer, sizeof(uint8_t) * to_send.data_len);
				to_send.data[to_send.data_len] = 0; // Null terminate the string
				if (pdTRUE != xQueueSend(connection->to_publish, &to_send, BLOCKING_TICKS)){
					free(to_send.data);
					ESP_LOGE(RFID_TAG, "Failed to send the RFID badge");
				}
			} else {
				ESP_LOGE(RFID_TAG, "Failed to allocate sufficient data to send");
				ESP_LOGE(RFID_TAG, "%d - %s" , errno, esp_err_to_name(errno));
			}
		    // TODO REMOVE SLEEP (or shorten)
		}
		vTaskDelay(250 / portTICK_PERIOD_MS);
	}
}
