"use strict";


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