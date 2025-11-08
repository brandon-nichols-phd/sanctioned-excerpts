/*
 * Wiegand.h
 *
 *  Created on: Aug 13, 2020
 *      Author: bsn
 */

#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include "stddef.h"
#include "inttypes.h"

#include "soc/gpio_reg.h"
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>
#include "esp_intr_alloc.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "sdkconfig.h"

#include "driver/gpio.h"
#include "driver/ledc.h"

#define WG_TAG "WGD"
#define RFID_LED_PIN (25)
#define RFID_BUZZ_PIN (27)

#define TIMER_DIVIDER 16  //  Hardware timer clock divider
#define TIMER_SCALE (TIMER_BASE_CLK / TIMER_DIVIDER)  // convert counter value to seconds

#define LEDC_LS_CH0_GPIO       RFID_LED_PIN
#define LEDC_LS_CH0_CHANNEL    LEDC_CHANNEL_0
#define LEDC_LS_MODE           LEDC_LOW_SPEED_MODE
#define LEDC_LS_TIMER          LEDC_TIMER_0

#define BLINK_DUTY (1<<19)

#ifndef MAIN_WIEGAND_H_
#define MAIN_WIEGAND_H_

/*********************************************************************************
** Interrupt Service Routines
*********************************************************************************/
static volatile void ReadD0(void *args);
static volatile void ReadD1(void *args);
static volatile unsigned long _bitCount;


/*********************************************************************************
** Wiegand Data Manipulation Methods
*********************************************************************************/
static bool DoWiegandConversion ();
static unsigned long GetCardId (volatile unsigned long *codehigh, volatile unsigned long *codelow, volatile unsigned int bitlength);
/*********************************************************************************/
static unsigned int _packetGap;  // gap between wiegand packet in millisecond
static unsigned long _lastPulseTime; // time last bits received
static volatile uint8_t _currentBit;
gpio_num_t _pinD0;
gpio_num_t _pinD1;
static QueueHandle_t _dataQ; // data queue to speed up interrupt handler routine

/*
 * PWM Variables
 */
static ledc_timer_config_t ledc_timer = {
    .duty_resolution = LEDC_TIMER_20_BIT, // resolution of PWM duty
    .freq_hz = 1,                      // frequency of PWM signal
    .speed_mode = LEDC_LS_MODE,           // timer mode
    .timer_num = LEDC_LS_TIMER,            // timer index
    .clk_cfg = LEDC_AUTO_CLK,              // Auto select the source clock
};
static ledc_channel_config_t ledc_channel = {
    .channel    = LEDC_LS_CH0_CHANNEL,
    .duty       = 0,
    .gpio_num   = LEDC_LS_CH0_GPIO,
    .speed_mode = LEDC_LS_MODE,
    .hpoint     = 0,
    .timer_sel  = LEDC_LS_TIMER
};

/*********************************************************************************
** Wiegand Methods
*********************************************************************************/
void newWiegand(uint8_t pinD0, uint8_t pinD1, unsigned int nBits, unsigned int packetGap);
bool startWiegand(void);
bool wiegandAvailable(void);
bool bitsRecieved(void);
uint8_t validWiegandAvailable(void);
void wiegandClear(void);
void RFIDLEDInit(void);
void RFIDLEDToggleState(uint64_t ms_duration);
void RFIDLEDHi(uint64_t ms_duration);
void RFIDLEDLo(uint64_t ms_duration);
void RFIDLEDStartBlink(uint64_t ms_duration);
void RFIDLEDStopBlink(bool endState, uint64_t ms_duration);
void RFIDBuzzerInit(void);
void RFIDBuzzerToggleState(uint64_t ms_duration);
void RFIDBuzzerOff(uint64_t ms_duration);
void RFIDBuzzerOn(uint64_t ms_duration);

/*********************************************************************************
** Get/Set Methods
*********************************************************************************/
unsigned int getBitCount();
unsigned int getPacketGap();


#endif /* MAIN_WIEGAND_H_ */
