#!/usr/bin/env sh

USER="pi"
PASSWORD="raspberry"
HOST="brauag.fritz.box"


ssh -t $USER@$HOST "echo $PASSWORD | sudo -S systemctl restart tilt"