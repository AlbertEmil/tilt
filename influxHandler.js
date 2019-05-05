"use strict";

const Influx = require('influx');
const config = require('./config');
const {measurementArray} = require('./helpers');


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


const createDatabase = async () => {
  const databaseNames = await influx.getDatabaseNames()
  if (!databaseNames.includes(config.DATABASE_NAME)) {
    influx.createDatabase(config.DATABASE_NAME)
  }
}


const writeData = async (data) => {
  return await influx.writeMeasurement(
    config.DATA_MEASUREMENT_NAME,
    data.map(x => measurementArray(x))
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


const querySpecificGravity = async (timestamp) => {
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


module.exports.createDatabase = createDatabase;
module.exports.writeData = writeData;
module.exports.writeEvent = writeEvent;
module.exports.queryIsFermentationRunning = queryIsFermentationRunning;
module.exports.queryLastStartTime = queryLastStartTime;
module.exports.querySpecificGravity = querySpecificGravity;