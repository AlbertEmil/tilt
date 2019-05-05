"use strict";

module.exports.buttonEvent = (isRunning) => {
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


module.exports.measurementArray = (singleReading) => {
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
