#ifndef MAIN_INCLUDE_BLUETOOTH_HELPER_H_
#define MAIN_INCLUDE_BLUETOOTH_HELPER_H_

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "wiegand.h"

#define BT_SEND_MAX_MESSAGE_SIZE 100
#define BLOCKING_TICKS ( TickType_t ) ( 10 / portTICK_PERIOD_MS )

typedef struct bluetooth_conn {
	int fd;
	QueueHandle_t to_publish;
	SemaphoreHandle_t fd_mutex;
	uint32_t conn_handle;
	uint8_t conn_active;
} bluetooth_conn;

// Must malloc and free data
typedef struct bt_message{
	uint8_t * data;
	uint8_t data_len;
} bt_message;


/**
 * Target of Virtual task creation.
 * Reads RFID data from pins
 * Reads Pin configuration from BT
 * params should be bluetooth_conn type
 * Puts read RFID data into connection->to_publish
 */
void RFID_reader_task(void * params);

/**
 * Target of virtual task creation
 * params should be bluetooth_conn type
 * Reads data from connection->to_publish and sends via bluetooth
 */
void data_publisher_task(void * params);

/**
 * Configure the pins used to communicate with the RFID chips.
 * should be called prior to task creation.
 * returns 0 on success
 */
esp_err_t configure_RFID_pins();

#endif /* MAIN_INCLUDE_BLUETOOTH_HELPER_H_ */
