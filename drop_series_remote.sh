#!/usr/bin/env sh

USER="pi"
PASSWORD="raspberry"
HOST="brauag.fritz.box"

DB="beer"
MEASUREMENTS="events,tilt_red"


ssh $USER@$HOST "influx -database '$DB' -execute 'drop SERIES from $MEASUREMENTS'"
