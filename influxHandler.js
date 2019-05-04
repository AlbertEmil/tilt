"use strict";

const Influx = require('influx');
const config = require('./config');


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



const writeData = async (data) => {
  return await influx.writeMeasurement(
    config.DATA_MEASUREMENT_NAME,
    data.map(x => createMeasurementArray(x))
  )
}


// https://maxchadwick.xyz/blog/grafana-influxdb-annotations
const writeEvent = async (event) => {
  return await influx.writeMeasurement(
    config.EVENT_MEASUREMENT_NAME,
    [{
      fields: {
        title: event.title,
        text: event.text,
        tags: event.tags.join(','),
      },
    }]
  )
}


module.exports.influx = influx;
module.exports.writeData = writeData;
module.exports.writeEvent = writeEvent;