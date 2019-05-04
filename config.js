"use strict";

let config = {};

config.BUTTON_PIN = 24;
config.LED_PIN = 27;
config.BUTTON_DEBOUNCE_MS = 100;

config.TILT_RED_UUID = "a495bb10c5b14b44b5121370f02d74de";
config.DATABASE_HOST = 'localhost';
config.DATABASE_NAME = 'beer';
config.DATA_MEASUREMENT_NAME = 'tilt_red';
config.EVENT_MEASUREMENT_NAME = 'events';

module.exports = config;