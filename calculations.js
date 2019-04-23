"use strict";


module.exports.alcoholByVolume = (specificGravity) => {
    return ( 95.82 * specificGravity * (specificGravityAtStart-specificGravity) / (1.775-specificGravityAtStart) ) / 100;
}


module.exports.alcoholByMass = (alcoholByVolume) => {
    return ( (0.789*alcoholByVolume) / (1 - 0.211*alcoholByVolume) );
}