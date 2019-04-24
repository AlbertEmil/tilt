"use strict";

const Bleacon = require('bleacon');
const Gpio = require('onoff').Gpio;
const Influx = require('influx');

const config = require('./config');
const calc = require('./calculations');
const tiltParser = require('./tiltParser');


const button = new Gpio(24, 'in', 'rising', {debounceTimeout: 100});
const led = new Gpio(27, 'out');

let specificGravityAtStart = null;


// create InfluxDB connector
const influx = new Influx.InfluxDB({
  host: config.DATABASE_HOST,
  database: config.DATABASE_NAME,
  schema: [{
    measurement: 'tilt_red',
    fields: {
      value: Influx.FieldType.FLOAT,
    },
    tags: [
      'unit',
      'measured_variable',
    ]
  },
  {
    measurement: 'events',
    fields: {
      title: Influx.FieldType.STRING,
      text: Influx.FieldType.STRING,
      tags: Influx.FieldType.STRING,
    },
    tags: []
  }]
})


// check if database name exists
influx.getDatabaseNames()
  .then(names => {
    if (!names.includes(config.DATABASE_NAME)) {
      return influx.createDatabase(config.DATABASE_NAME);
    }
  })


// helper function to create data array written to InfluxDB from a single measurment reading
const createMeasurementArray = (singleReading) => {
  return {
    fields: {
      value: singleReading.value,
    },
    tags: {
      unit: singleReading.unit,
      measured_variable: singleReading.variable,
    }
  }
}


// query InfluxDB for events and decide whether a fermentation is currently running
const isFermentationRunning = () => {
  return influx.query(`
    SELECT * FROM events
    ORDER BY time DESC
    LIMIT 1
  `)
  .then(rows => {
    if (rows[0]) {
      const timestamp = rows[0].time.getNanoTime();
      return (rows[0].tags.split(',').includes("start") ? true : false);
    }
    else {
      return false;
    }
  })
}


// query InfluxDB for lasst fermentations start time
const queryLastStartTime = () => {
  return influx.query(`
    SELECT time,tags FROM events
    WHERE tags =~ /start/ 
    ORDER BY time DESC
    LIMIT 1
  `)
  .then(rows => {
    return rows[0].time.getNanoTime();
  })
}


// query InfluxDB for original specific gravity
const querySpecificGravityAtStart = () => {
  return queryLastStartTime()
  .then(timestamp => {
      return influx.query(`
          SELECT value FROM tilt_red
          WHERE measured_variable='specific_gravity'
          AND time <= ${timestamp}
          ORDER BY time DESC
          LIMIT 1
      `)
  })
  .then(rows => {
      // console.log(rows);
      return Promise ((resolve, reject) => {
          if (rows[0].value)
          {
              resolve(rows[0].value)
          }
          else
          {
              reject('No value for specificGravityAtStart found.')
          }

      })
  })
  // .catch(err => {
  //     console.log('Caught error');
  //     console.log(err);
  // })    
}


// read and set value for original specific gravity which is needed for alcohol calculations
const setSpecificGravityAtStart = () => {
  return querySpecificGravityAtStart()
    .then(val => {
      specificGravityAtStart = val;
      console.log(specificGravityAtStart);
      // return val;
      return Promise((resolve, reject) => {
        resolve(val)
      })
    })
}


// write measured data to the InfluxDB instance
const writeDataToInfluxDb = (data, measurementName) => {
  return influx.writeMeasurement(
    measurementName,
    data.map(x => createMeasurementArray(x))
  )
}


// https://maxchadwick.xyz/blog/grafana-influxdb-annotations
const writeEventToInfluxDb = (event) => {
  console.log(event)
  return influx.writeMeasurement(
    'events',
    [{
      fields: {
        title: event.title,
        text: event.text,
        tags: event.tags.join(','),
      },
    }]
  )
}


// check if a fermentation is running on start-up
isFermentationRunning()
.then(isRunning => {
  console.log(`Fermentation is ${(isRunning ? '' : 'not ')}running`);
  switchLedForFermentationStatus(isRunning);
  if (isRunning) {
    setSpecificGravityAtStart();
  }
})


// start scanning for bleacons
Bleacon.startScanning()


// listen for bleacon messages
Bleacon.on('discover', function (bleacon) {
  if (bleacon.uuid == config.TILT_RED_UUID) {
    const specificGravity = tiltParser.specificGravity(bleacon);
    const alcoholByVolume = calc.alcoholByVolume(specificGravity);
    const alcoholByMass = calc.alcoholByMass(alcoholByVolume);

    console.log(specificGravityAtStart, specificGravity, alcoholByVolume, alcoholByMass);

    const data = [
      {
        variable: 'temperature',
        value: tiltParser.temperatureCelsius(bleacon),
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
    // console.log(data);
    writeDataToInfluxDb(data, 'tilt_red')
      .catch(err => {
        console.log(err)
      })
  }
})


// create button event depending on fermentation status
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


// switch LED on/off if fermentation is running
const switchLedForFermentationStatus = (isRunning) => { (isRunning ? led.writeSync(1) : led.writeSync(0))}


// blink LED (https://github.com/fivdi/onoff#blink-an-led-using-the-synchronous-api)
const blinkLed = (interval=200, duration=1200) => {
  const blinkInterval = setInterval(() => {
    led.writeSync(led.readSync() === 0 ? 1 : 0);
  }, interval)

  setTimeout(() => {
    clearInterval(blinkInterval);
    led.writeSync(0);
  }, duration);
}


// detect button presses
button.watch((err, value) => {
  if (err) {
    console.log(err);
    //   throw err;
  }

  isFermentationRunning()
  // .then(isRunning => {
  //     writeEventToInfluxDb( createButtonEvent(isRunning) )
  //     .then( result => {
  //         // use inverted `isRunning` since this is 'old' status
  //         if (!isRunning) { setSpecificGravityAtStart() }
  //         switchLedForFermentationStatus(!isRunning);
  //     })
  // })

  .then(isRunning => {
    console.log(`isRunning: ${isRunning}`)
    // return writeEventToInfluxDb( createButtonEvent(isRunning) )
    // TODO: Write event only if start/stop event is valid
    writeEventToInfluxDb(createButtonEvent(isRunning))
    // })
    // .then( result => {
    // use inverted `isRunning` since this is 'old' status
    // console.log(`result: ${result}`)
    if (!isRunning) { return setSpecificGravityAtStart() }
  })
  .then(val => {
    console.log(`val: ${val}`)
    switchLedForFermentationStatus(!isRunning)
    return Promise((resolve, reject) => {
      resolve(val);
    })
  })


  .catch(err => {
    blinkLed();
    console.log(err);
  })
})
  
  
// stop BLE scanning and free GPIO resources on program exit
process.on('SIGINT', () => {
  Bleacon.stopScanning();      
  led.unexport();
  button.unexport();
});