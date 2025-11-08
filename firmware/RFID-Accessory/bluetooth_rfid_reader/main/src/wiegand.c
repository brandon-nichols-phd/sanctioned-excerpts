/*
 * Wiegand.cpp
 *
 *  Created on: Aug 13, 2020
 *      Author: bsn
 */

#include "wiegand.h"

#define ESP_INTR_FLAG_DEFAULT 0

/*********************************************************************************
 ** Helper Functions
 *********************************************************************************/
void shift_left(volatile unsigned char *ar, int size, int shift)
{
  while (shift--) {   // for each bit to shift ...
    int carry = 0;    // clear the initial carry bit.
    int lastElement = size-1;
    for (int i = 0; i < size; i++) {    // for each element of the array, from low byte to high byte
      if (i!=lastElement) {
        // condition ? valueIfTrue : valueIfFalse
        carry = (ar[i+1] & 0x80) ? 1 : 0;
        ar[i] = carry | (ar[i]<<1);
      }
      else {
        ar[i] <<=1;
      }
    }
  }
}



unsigned long millis(void) {
	return (unsigned long) (esp_timer_get_time() / 1000ULL);
  }

/*********************************************************************************
 ** Initialization/Closing Methods
 *********************************************************************************/
void newWiegand(uint8_t pinD0, uint8_t pinD1, unsigned int nBits, unsigned int packetGap) {
	_pinD0 = (gpio_num_t)pinD0;
	_pinD1 = (gpio_num_t)pinD1;
	_dataQ = xQueueCreate(nBits, sizeof(uint8_t));
	_packetGap = packetGap;
}

/*********************************************************************************
 ** Get Methods
 *********************************************************************************/
unsigned int getPacketGap(){
  return _packetGap;
}

unsigned int getBitCount(){
  return _bitCount;
}

/*******************************************************************************
 ** Interrupt Service Routines
 *********************************************************************************/

static void IRAM_ATTR ReadD0(void *args){
	_lastPulseTime = millis();  // keep track of time last wiegand bit received
	_bitCount++;  // increment bit count for wiegand data packet
	uint8_t _currentBitD0 = 0;
	xQueueSendToBackFromISR(_dataQ, (void *) &_currentBitD0, NULL);

}

static void IRAM_ATTR ReadD1(void *args){
	_lastPulseTime = millis();  // keep track of time last wiegand bit received
	_bitCount++;  // increment bit count for wiegand data packet
	uint8_t _currentBitD1 = 1;
	xQueueSendToBackFromISR(_dataQ, (void *) &_currentBitD1, NULL);
}


/*********************************************************************************
 ** Wiegand Methods
 *********************************************************************************/
bool startWiegand(void) {
	//Queue instead of buffer
	ESP_LOGI(WG_TAG, "Starting Wiegand interpreter...");
	_lastPulseTime = 0;
	_bitCount = 0;

	gpio_config_t io_conf;
	//set as input mode
	io_conf.mode = GPIO_MODE_INPUT;
	//interrupt on falling edge
	io_conf.intr_type = GPIO_INTR_NEGEDGE;
	//bit mask of the pins
	io_conf.pin_bit_mask = ((BIT(_pinD0)) | (BIT(_pinD1)));
	ESP_LOGI(WG_TAG, "Pin bit mask is %llu", io_conf.pin_bit_mask);

	//enable pull-up mode
	io_conf.pull_up_en = GPIO_PULLUP_ENABLE;
	//disable pull-down mode
	io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
	gpio_config(&io_conf);

	//install gpio isr service
	gpio_install_isr_service(ESP_INTR_FLAG_DEFAULT);
	//hook isr handler for D0 data line
	gpio_isr_handler_add(_pinD0, ReadD0, NULL);
	//hook isr handler for D1 data line
	gpio_isr_handler_add(_pinD1, ReadD1, NULL);
	return true;
}

void RFIDLEDInit(void){

	ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));
	ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));
	//Fade install is required for PWM use. TODO: Unclear as to why.
	ESP_ERROR_CHECK(ledc_fade_func_install(0));
    ESP_LOGI(WG_TAG, "LED PWM created...");

	return;
}

void RFIDLEDToggleState(uint64_t ms_duration){
	static bool currentState = true;
	if(currentState){
		RFIDLEDLo(ms_duration);
		currentState = false;
	} else {
		RFIDLEDHi(ms_duration);
		currentState = true;
	}
	return;
}

void RFIDLEDHi(uint64_t ms_duration){
	//LED on (output high)
	ESP_LOGI(WG_TAG,"LED High (Red)");
	gpio_set_level(RFID_LED_PIN, 1);
	vTaskDelay(ms_duration / portTICK_PERIOD_MS);
	return;
}

void RFIDLEDLo(uint64_t ms_duration){
	//LED off (output low)
	ESP_LOGI(WG_TAG, "LED low (Green)");
	gpio_set_level(RFID_LED_PIN, 0);
	vTaskDelay(ms_duration / portTICK_PERIOD_MS);
	return;
}

/*
 * RFIDLEDStartBlink
 * Initializes GPIO to PWM and toggles reader LED line.
 */
void RFIDLEDStartBlink(uint64_t delay){
	ESP_LOGI(WG_TAG, "Starting LED blinking...");
	vTaskDelay(delay / portTICK_PERIOD_MS);
	ESP_ERROR_CHECK(ledc_set_duty_and_update(ledc_channel.speed_mode, ledc_channel.channel, (uint32_t) BLINK_DUTY, (uint32_t) 0));
	ESP_LOGI(WG_TAG, "Blinking started...");

}

void RFIDLEDStopBlink(bool endState, uint64_t delay){
	uint32_t local_duty = 0;
	ESP_LOGI(WG_TAG, "Stopping LED blinking...");
	vTaskDelay(delay / portTICK_PERIOD_MS);
	ESP_LOGI(WG_TAG, "Blinking ended...");
	//Reset GPIO
	//gpio_reset_pin(RFID_LED_PIN);
	//Set the GPIO as a push/pull output
	//gpio_set_direction(RFID_LED_PIN, GPIO_MODE_OUTPUT);
    if (endState){
    	local_duty = 0;
    	ESP_LOGI(WG_TAG, "Setting duty cycle to %d...", local_duty);
    } else {
    	local_duty = (1<<LEDC_TIMER_20_BIT) - 1;
    	ESP_LOGI(WG_TAG, "Setting duty cycle to %d...", local_duty);
    }

	ESP_ERROR_CHECK(ledc_set_duty_and_update(ledc_channel.speed_mode, ledc_channel.channel, (uint32_t) local_duty, (uint32_t) 0));

}


void RFIDBuzzerInit(void){
	//Test buzzer on RFID reader
	gpio_reset_pin(RFID_BUZZ_PIN);
	//Set the GPIO as a push/pull output
	gpio_set_direction(RFID_BUZZ_PIN, GPIO_MODE_OUTPUT);
	RFIDBuzzerOff(10);
	return;
}

void RFIDBuzzerToggleState(uint64_t ms_duration){
	static bool currentState = true;
	if(currentState){
		RFIDBuzzerOff(ms_duration);
		currentState = false;
	} else {
		RFIDBuzzerOn(ms_duration);
		currentState = true;
	}
	return;
}

void RFIDBuzzerOff(uint64_t ms_duration){
	//Buzzer off (output high)
	ESP_LOGI(WG_TAG,"Buzzer Hi (off)");
	gpio_set_level(RFID_BUZZ_PIN, 1);
	vTaskDelay(ms_duration / portTICK_PERIOD_MS);
	return;
}

void RFIDBuzzerOn(uint64_t ms_duration){
    //Buzzer on (output low)
	ESP_LOGI(WG_TAG, "Buzzer Lo (on)");
	gpio_set_level(RFID_BUZZ_PIN, 0);
	vTaskDelay(ms_duration / portTICK_PERIOD_MS);
	return;
}
void wiegandClear(void){   // reset variables to start new capture
  _bitCount=0;
  _lastPulseTime = millis();
}

bool bitsRecieved(void){
	if(_bitCount > 0){
		return true;
	} else {
		return false;
	}
}

bool wiegandAvailable(void){
	bool availability=false;
	unsigned long lastPulseTime = _lastPulseTime;
	unsigned long sysTick = millis(); //get current clock value in milliseconds

	if ((sysTick - lastPulseTime) > _packetGap) {
		//no bits received for at least the duration
		//of the anticipated length of a full Wiegand data packet
		//if bit count is also greater than 0, interpret packet
		availability = true;
	}
	return availability;
}

uint8_t validWiegandAvailable(void){
	uint8_t received;
	BaseType_t bitVal = xQueueReceive(_dataQ, (void *) &received, 0);
	if(bitVal){
	return received;
	} else {
		return 255;
	}
}

