#!/usr/bin/env sh

USER="pi"
PASSWORD="raspberry"
HOST="brauag.fritz.box"

FILES="*.js tilt.service package.json"
DEST_PATH="~/tilt"

SERVICE_COMMANDS="cd $DEST_PATH; \
echo $PASSWORD | sudo -S cp tilt.service /etc/systemd/system/tilt.service; \
echo $PASSWORD | sudo -S systemctl daemon-reload; \
echo $PASSWORD | sudo -S systemctl restart tilt"


scp $FILES $USER@$HOST:$DEST_PATH

ssh -t $USER@$HOST $SERVICE_COMMANDS