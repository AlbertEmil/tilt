"use strict";


module.exports.temperatureCelsius = (bleacon) => {
    return (bleacon.major-32) / 1.8;
}


module.exports.specificGravity = (bleacon) => {
    return bleacon.minor / 1000;
}