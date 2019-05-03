const Influx = require('influx');

// http://docs.grafana.org/features/datasources/influxdb/
// http://docs.grafana.org/reference/annotations/
// http://docs.grafana.org/http_api/annotations/
// https://play.grafana.org/d/000000059/influxdb-table?orgId=1


const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'historian',
    schema: [{
        measurement: 'process',
        fields: {
            value: Influx.FieldType.FLOAT,
        },
        tags: [
            'unit',
            'sensor_name',
            'sensor_type',
        ]
    }]
})



// time                    reading     sensor_type     sensor_name     unit
// <someTimestamp>         450         temperature     T101            °C
// <someTimestamp>         320         pressure        P101            bar(a)



// https://stackoverflow.com/a/1527820/3991125
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


const writeDummyData = () => {
    console.log('writing dummy data to InfluxDB ...')
    return influx.writeMeasurement('process', [
        {
            fields: {
                value: getRandomInt(100, 200),
            },
            tags: {
                unit: 'bar(a)',
                sensor_name: 'P101',
                sensor_type: 'pressure'
            },
        },
        {
            fields: {
                value: getRandomInt(20, 120),
            },
            tags: {
                unit: '°C',
                sensor_name: 'T101',
                sensor_type: 'temperature'
            },
        },
        {
            fields: {
                value: getRandomInt(450, 600),
            },
            tags: {
                unit: 'K',
                sensor_name: 'T102',
                sensor_type: 'temperature'
            },
        },
    ])
    .catch( (err) => console.log(err) )
}

setInterval(writeDummyData, 1000);
