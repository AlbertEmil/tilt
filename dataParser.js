"use strict";

module.exports.temperatureCelsius = (bleacon) => {
  return (bleacon.major - 32) / 1.8;
}


module.exports.specificGravity = (bleacon) => {
  return bleacon.minor / 1000;
}


module.exports.alcoholByVolume = (specificGravityAtStart, specificGravity) => {
  if (specificGravityAtStart)
  {
    return (95.82 * specificGravity * (specificGravityAtStart - specificGravity) / (1.775 - specificGravityAtStart)) / 100;
  }
  else {
    return null
  }
}


module.exports.alcoholByMass = (alcoholByVolume) => {
  if (alcoholByVolume) {
    return ((0.789 * alcoholByVolume) / (1 - 0.211 * alcoholByVolume));
  }
  else
  {
    return null
  }
}
