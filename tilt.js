"use strict";

const Bleacon = require('bleacon');
const Gpio = require('onoff').Gpio;

const config = require('./config');
// TODO: Merge beaconParser and calculations since they depent on each other
const tiltParser = require('./beaconParser');
const calc = require('./calculations');
const influxHandler = require('./influxHandler');

// TODO: Summarize/refactor all GPIO related calls in own module ?
const button = new Gpio(config.BUTTON_PIN, 'in', 'rising', { debounceTimeout: config.BUTTON_DEBOUNCE_MS });
const led = new Gpio(config.LED_PIN, 'out');


let specificGravityAtStart = null;
// TODO: Remove after influx queries are fully merged to influxHandler
const influx = influxHandler.influx;


const prepareDatabase = async () => {
  const databaseNames = await influx.getDatabaseNames()
  if (!databaseNames.includes(config.DATABASE_NAME)) {
    influx.createDatabase(config.DATABASE_NAME)
  }
}


const queryIsFermentationRunning = async () => {
  const foundRows = await influx.query(`
    SELECT * FROM events
    ORDER BY time DESC
    LIMIT 1
  `)

  if (foundRows[0]) {
    const timestamp = foundRows[0].time.getNanoTime();
    return (foundRows[0].tags.split(',').includes("start") ? true : false);
  }
  else {
    return false;
  }
}


const queryLastStartTime = async () => {
  const foundRows = await influx.query(`
    SELECT time,tags FROM events
    WHERE tags =~ /start/
    ORDER BY time DESC
    LIMIT 1
  `)

  if (foundRows[0]) {
    return (foundRows[0].time.getNanoTime());
  }
  else {
    return false;
  }
}


const querySpecificGravityAtTime = async (timestamp) => {
  // TODO: Fix duplicate if-else clauses for return statements (scope issues)
  if (timestamp)
  {
    const foundRows = await influx.query(`
      SELECT value FROM tilt_red
      WHERE measured_variable='specific_gravity'
      AND time <= ${timestamp}
      ORDER BY time DESC
      LIMIT 1
    `)
    if (foundRows[0]) {
      return (foundRows[0].value);
    }
    else {
      return false;
    }
  }
  else
  {
    const foundRows = await influx.query(`
      SELECT value FROM tilt_red
      WHERE measured_variable='specific_gravity'
      ORDER BY time DESC
      LIMIT 1
    `)
    if (foundRows[0]) {
      return (foundRows[0].value);
    }
    else {
      return false;
    }
  }
}

// TODO: Refactor this function to other module ?
const createButtonEvent = (isRunning) => {
  const startEvent = {
    title: "Fermentation started",
    text: "Button was pressed",
    tags: ["button", "fermentation", "start"],
  }
  const stopEvent = {
    title: "Fermentation stopped",
    text: "Button was pressed",
    tags: ["button", "fermentation", "stop"],
  }
  return (isRunning) ? stopEvent : startEvent;
}


const ledOn = () => led.writeSync(1)


const ledOff = () => led.writeSync(0)


// (https://github.com/fivdi/onoff#blink-an-led-using-the-synchronous-api)
const ledBlink = (interval=200, duration=1200) => {
  const blinkInterval = setInterval(() => {
    led.writeSync(led.readSync() === 0 ? 1 : 0);
  }, interval)

  setTimeout(() => {
    clearInterval(blinkInterval);
    ledOff();
  }, duration);
}


const setInitialLedStatus = async () => {
  const isFermentationRunning = await queryIsFermentationRunning()
  console.log(`isFermentationRunning: ${isFermentationRunning}`)
  if (!isFermentationRunning) return false;

  const lastStartTime = await queryLastStartTime()
  console.log(`lastStartTime: ${lastStartTime}`)
  if (!lastStartTime) return false;

  const specificGravityAtLastStart = await querySpecificGravityAtTime(lastStartTime)
  console.log(`specificGravityAtLastStart: ${specificGravityAtLastStart}`)
  if (!specificGravityAtLastStart) return false;
  specificGravityAtStart = specificGravityAtLastStart;

  ledOn();
}


(async () => {
  console.log('Tilt client started');
  prepareDatabase();
  setInitialLedStatus();
  Bleacon.startScanning()


  Bleacon.on('discover', function (bleacon) {
    if (bleacon.uuid == config.TILT_RED_UUID) {
      const timestamp = Date.now()
      const temperature = tiltParser.temperatureCelsius(bleacon)
      const specificGravity = tiltParser.specificGravity(bleacon);
      const alcoholByVolume = calc.alcoholByVolume(specificGravityAtStart, specificGravity);
      const alcoholByMass = calc.alcoholByMass(alcoholByVolume);

      const data = [
        {
          variable: 'temperature',
          value: temperature,
          unit: '°C',
        },
        {
          variable: 'specific_gravity',
          value: specificGravity,
          unit: '-',
        },
        {
          variable: 'alcohol_by_volume',
          value: alcoholByVolume,
          unit: 'vol.-%',
        },
        {
          variable: 'alcohol_by_mass',
          value: alcoholByMass,
          unit: 'wt.-%',
        }
      ]

      const filteredData = data.filter(x => x.value !== null)
      console.log('Got data')
      // console.log(filteredData)

      influxHandler.writeData(filteredData);

    }
  })


  button.watch(async (err, value) => {
    if (err) {
      console.log(err);
    }

    console.log('Button was pressed.')

    const isFermentationRunning = await queryIsFermentationRunning()
    console.log(`isFermentationRunning: ${isFermentationRunning}`)

    const buttonEvent = createButtonEvent(isFermentationRunning)
    console.log(`buttonEvent: ${buttonEvent.title}`)

    const specificGravity = await querySpecificGravityAtTime()
    console.log(`specificGravity: ${specificGravity}`)

    if (!isFermentationRunning && !specificGravity)
    {
      console.log('unable to start fermentation')
      ledBlink();
    }
    else
    {
      influxHandler.writeEvent(buttonEvent);
      (!isFermentationRunning ? ledOn() : ledOff());
    }

  })


  process.on('SIGINT', () => {
    Bleacon.stopScanning();
    led.unexport();
    button.unexport();
  });

})();
