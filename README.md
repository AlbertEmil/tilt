<i>
Remark:

This project needs to be revamped due to several architectural design issues. However, there is another version of this project exporting data into csv files which is recommended to be used. You can find the csv-based version in my [`tiltCsv` repo](https://github.com/AlbertEmil/tiltCsv).
        
</i>        


# TILT Hydrometer @ Carl-Wilhelms-Bräu

Log data from a [TILT Hydrometer](https://tilthydrometer.com/) to an [InfluxDB](https://www.influxdata.com/) using a Raspberry Pi 3 B+. To handle data a [NodeJS](https://nodejs.org/en/) client built on-top of [influx](https://node-influx.github.io/) and [node-bleacon](https://github.com/sandeepmistry/node-bleacon) is used. The GIPOs for a user push button and a LED are accessed with [onoff](https://github.com/fivdi/onoff). For data visualization the open source monitoring platform [Grafana](https://grafana.com/) comes into play.


## Infrastructure
        +---------------+           +---------------+           +---------------+           +---------------+
        |               |           |               |           |               |           |               |
        |     Tilt      | --------> | NodeJS client | <-------> |   InfluxDB    | --------> |    Grafana    |
        |               |           |               |           |               |           |               |
        +---------------+           +---------------+           +---------------+           +---------------+
                                            ʌ
                                            |
                                            |
                                            |
                                            v
                                    +---------------+
                                    |               |
                                    | Button & LED  |
                                    |               |
                                    +---------------+


General information about the software used in this project, as well as its proper installation and configuration can be found in the sections below. The hardware connections for button and LED are:

- Button: GPIO24 (Pin 18 on header J1) and 3V3 (Pin 17 on J1), debouncing is [done in software](https://github.com/fivdi/onoff#debouncing-buttons), internal pull-down resistor is activated by default (see [datasheet, pp. 102/103](http://www.farnell.com/datasheets/1521578.pdf))
- LED: Connected via 68 Ohms to GPIO27 (Pin 13 on J1) and GND (Pin 14 on J1), [calculate appropiate resistor value as needed](https://www.kitronik.co.uk/blog/led-resistor-value-calculator/)

Are general pinout diagram for a Raspberry Pi 3 B/B+ can be found [here](https://www.jameco.com/Jameco/workshop/circuitnotes/raspberry_pi_circuit_note_fig2.jpg).


## Comparable projects
A very basic implementation of a NodeJS-based TILT client called can be found [here](https://github.com/mariacarlinahernandez/tilt-hydrometer). The software used on an "orignal" [TILT Pi](https://tilthydrometer.com/products/tilt-pi-raspberry-pi-disk-image-download) is based on [Node-RED](https://nodered.org/) and its [flow is available online](https://flows.nodered.org/flow/0cc3b1d4f7e159800c01c650c30752ae). In addition there are several implementations based on Python like [pytilt](https://github.com/atlefren/pytilt).


## User login and credentials
Package installation and system configuration requires user login on the Raspberry Pi. This can be done locally or remotely via SSH. The default user credentials `pi` / `raspberry` can be used for this, but it is highly recommended to change these credentials. In addition any user credentials stated below are just sample values an should be changed.


## Install Raspbian Lite on SD card or USB drive
Download the latest release of Raspbian Lite from the [Raspbian homepage](https://www.raspberrypi.org/downloads/raspbian/). After the download is completed, flash it onto the SD card or the USB drive using [balenaEtcher](https://www.balena.io/etcher/).

In addition to boot from SD, some of the later Raspberry Pi models support [USB boot](https://www.raspberrypi.org/documentation/hardware/raspberrypi/bootmodes/msd.md) to boot form USB drives such as USB flash drives, HDDs or SSDs. This can be handy due to improved data transfer rates and improved reliability - espcially when working with data-driven applications and interfaces such as databases.


## Basic configuration (before and after first boot)
If you want to access the Raspberry Pi in headless mode (without connecting keyboard, mouse and monitor to the Pi), you need to enable `ssh`. To do so, create an empty file with name `ssh` on the `BOOT` partition of the SD card or USB drive. In addition you can create Wifi credentials (for non-enterprise grade networks) as explained in the [headless docs](https://www.raspberrypi.org/documentation/configuration/wireless/headless.md).

DHCP-based ethernet is enabled by default. However, setting-up a static IP address requires some further work for which you need to mount the main partititon of your SD card or USB drive. For this, a Mac or a Linux computer (or Virtual Machine) is needed. Futher information can be found [here](https://howtoraspberrypi.com/how-to-raspberry-pi-headless-setup/).

Enterprise-grade Wifi networks (such as [`eduroam` at TU Braunschweig](https://doku.rz.tu-bs.de/doku.php?id=netz:wlan:wlan_einrichten_linux)) can be configured after having access to the Raspberry Pi.


## InfluxDB
According to the [project website](https://www.influxdata.com/time-series-platform/influxdb/), InfluxDB is

> a high-performance data store written specifically for time series data

and can be used as a stand-alone database or in conjuction different stacks. To keep things simple, none of these stacks will be used in this project. However, data will be written to InfluxDB by using a [NodeJS-based client](#tilt-client-with-node-bleacon-and-node-influx).

For a small introduction read [Getting started with InfluxDB](https://docs.influxdata.com/influxdb/v1.7/introduction/getting-started/) and [InfluxDB key concepts](https://docs.influxdata.com/influxdb/v1.7/concepts/key_concepts/).


### Install and configure InfluxDB
1. Update repositories and install Java JDK:

        sudo apt-get update  sudo apt-get install oracle-java8-jdk

1. Add repository key for InfluxDB's repository:

        curl -sL https://repos.influxdata.com/influxdb.key | sudo apt-key add -

1. Add reposiotry to list of available repositories:

        echo "deb https://repos.influxdata.com/debian stretch stable" | sudo tee /etc/apt/sources.list.d/influxdb.list

1. Update repository data and installl influxdb from repository

        sudo apt update
        sudo apt install influxdb

1. Enable influxdb service to run after start-up and start service:

        sudo systemctl enable influxdb
        sudo systemctl start influxdb

1. Check if influxdb service has been started and is running:

        sudo systemctl status influxdb

    Exit by pressing `q` when done.

1. Open influxdb CLI:

        influx

1. Create new admin user (having all privileges) with username and password:

        CREATE USER pi WITH PASSWORD 'raspberry' WITH ALL PRIVILEGES

1. Create database for beer data (optional, since database will be created by the NodeJS client):

        CREATE DATABASE beer

1. Exit influx CLI:

        exit

1. Open influxdb's config file for futher adaptions:

        sudo nano /etc/influxdb/influxdb.conf

1. Check section `[http]` for following entries to enable [InfluxDB's HTTP interface](https://docs.influxdata.com/influxdb/v1.7/tools/api/) at port 8086. Uncomment lines (remove `#` symbol):

        enabled = true
        bind-address = „:8086“
        auth-enabled = true

1. Exit editor `nano` by pressing `Ctrl+X` and save changes with `y` when prompted. Press `Enter` to quit.

1. Restart influxdb service to reload edited config file:

        sudo systemctl restart influxdb


## Grafana
A look into [Grafana's documentation](https://grafana.com/grafana), tells us:

> [Grafana is the] analytics platform for all your metrics. Grafana allows you to query, visualize, alert on and understand your metrics no matter where they are stored. Create, explore, and share dashboards with your team and foster a data driven culture.

With Grafana it is easy to set-up a very versatile and flexible data monitoring and visualization platform supporting different databases and graphing tools. Since InfluxDB is supported as a data source by default, we will use it in this project.

### Install Grafana
1. Determine ARM architecture of Raspberry Pi:

        uname -m

    This should either give something like `armv7` or `arm64` and is needed to download the correct version of Grafana in the next step.

1. Determine latest relase from [Grafana's download page for ARM architecture](https://grafana.com/grafana/download?platform=arm), download file and install:

        wget https://dl.grafana.com/oss/release/grafana_5.4.3_armhf.deb
        sudo dpkg -i grafana_5.4.3_armhf.deb

    There might be additional dependencies needed. To fulfill these, follow on-screen instruction to install and fix missing dependencies. When done, retry to install `.deb` file by re-running the second command given above.

1. Enable grafana-server service to run after start-up and start service:

        sudo systemctl enable grafana-server
        sudo systemctl start grafana-server

1. Check if grafana-server service has been started and is running:

        sudo systemctl status grafana-server

    Exit by pressing `q` when done.


### Configure Grafana and import dashboard
1. A running Grafana instance listens on port 3000 per default. Open http://134.169.130.127:3000 in your browser and login with default credentials `admin` / `admin` (adopt to apropriate IP address and port if needed).

1. On initial login, Grafana asks for a password for the administrator account (is set to `admin`/`raspberry` currently).

1. Configure data source and add new dashboards as needed. See Grafana's [docs](http://docs.grafana.org/) and [Getting Started](http://docs.grafana.org/guides/getting_started/) for further information.

1. [Import the `JSON Model`](http://docs.grafana.org/reference/export_import/) of the dashboard from within the dashboard search. The exported JSON model can be found in [`grafanaDashboard.json`](grafanaDashboard.json)

1. Double-check all dashboard panels (esp. the data queries) and the dashboard annotation query (`Dashboard Settings` (Gear Icon) &rightarrow; `Annotations` &rightarrow; table of queries)


## NodeJS-based client for TILT
The TILT hydrometer uses the [iBeacon](https://en.wikipedia.org/wiki/IBeacon) data format which is documented [here](https://kvurd.com/blog/tilt-hydrometer-ibeacon-data-format/) and used to retrieve data from the device. A measurement is done [every five seconds](https://tilthydrometer.com/pages/faqs) and the updated readings are sent via Bluetooth thereafter.

For communications with the Tilt Hydrometer, a NodeJS-based client (written in JavaScript) is used. An implementation of the [iBeacon data format](https://en.wikipedia.org/wiki/IBeacon#Technical_details) for NodeJS can be found in the [`bleacon` module](https://github.com/sandeepmistry/node-bleacon) which is used to communicate with the hydrometer.

In order to make all the measuremtens available for later analysis and visualization, every reading is stored in the InfluxDB database. With [InfluxDB's HTTP interface](https://docs.influxdata.com/influxdb/v1.7/tools/api/) enabled, the NodeJS [module `influx`](https://node-influx.github.io/) can be used to access the database and its entries.

The GPIOs available on header J1 are used to interact with the user push button and LED, the [GPIOs](https://www.raspberrypi.org/documentation/usage/gpio/) (available on header J1) are used. These are accessed via the NodeJS module `onfoff` which additionally provides button interrupts and [software-debounce](https://www.npmjs.com/package/onoff#debouncing-buttons).


### Install required packages, prerequisites and dependencies

1. Update package repositories and install latest packages:

        sudo apt-get update && sudo apt-get upgrade

1. Install additional packages:

        sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev bluez-hcidump

1. Install [Node Version Manager (nvm)](https://github.com/creationix/nvm) (needs `curl` which should be installed by default):

        curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash

    The dowonload link is version specific. Check [nvm's GitHub repository](https://github.com/creationix/nvm#installation) if in doubt.

1. Install [NodeJS Version 8](https://github.com/nodejs/Release#release-schedule) via `nvm` (NodeJS version 8 is needed for `node-bleacon` compatability):

        nvm install 8


### Install files and enable `systemd` service
You can either install all the [required dependencies](license-information-and-module-dependencies) on your own or install all dependencies automatically by calling

        npm install

after you downloaded or cloned all the files from the project's repository into the user `pi`'s home directory (if the user name and user group is different, you need to edit [`tilt.service`](tilt.service)).

In order to execute [`tilt.js`](tilt.js) automatically after the system is booted, a [`systemd`](https://en.wikipedia.org/wiki/Systemd) service file is provided. If you want to use the service, follow these steps:

1. Copy the `.service` file to the appropriate location:

        sudo cp ~/tilt/tilt.service /etc/systemd/system

1. Enable the service to systemd:

        sudo systemctl enable tilt

1. Check the service status to check if it was loaded properly:

        sudo systemctl status tilt

1. Start the service manually (if you do not want to reboot the system):

        sudo systemctl start tilt


### Log files
The `systemd` service logs into the global `syslog`, which can be accessed via `journalctl -u tilt-client`. Some very basic diagnostics (about the `systemd` service) can be obtained from `systemctl` by using `systemctl status tilt`.


### Test and debug Bluetooth connection to Tilt
For testing and debugging the Bluetooth connection to the Tilt Hydrometer, `hcitool lescan` and `hcidump -R` can be used. In addition, to check the BLE-module is working, Nordic Semiconductor's app [`nRF Connect for Mobile`](https://play.google.com/store/apps/details?id=no.nordicsemi.android.mcp) is handy. The data protocol can be found [here](https://kvurd.com/blog/tilt-hydrometer-ibeacon-data-format/).


## Issues
Feel free to submit any issues and feature requests using the Issue Tracker.


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. In general, we are using a "fork-and-pull" workflow:

1. Fork the repo on GitHub.
1. Clone the project to your own machine.
1. Commit changes to your own branch.
1. Push your work back up to your fork.
1. Submit a Pull request so that we can review your changes.


## License Information and module dependencies
This project is published under the [MIT Licencse](https://choosealicense.com/licenses/mit/). A copy of the license text can be found in [`LICENSE.md`](LICENSE.md).

Direct dependencies, this project depends on, are:

| Module        | license                                              | Repo                                                   | npm                                           |
|---------------|------------------------------------------------------|--------------------------------------------------------|-----------------------------------------------|
| bleacon       | [MIT](https://choosealicense.com/licenses/mit/)      | [Link](https://github.com/sandeepmistry/node-bleacon)  | [Link](https://www.npmjs.com/package/bleacon) |
| influx        | [MIT](https://choosealicense.com/licenses/mit/)      | [Link](https://github.com/node-influx/node-influx)     | [Link](https://www.npmjs.com/package/influx)  |
| onoff         | [MIT](https://choosealicense.com/licenses/mit/)      | [Link](https://github.com/fivdi/onoff)                 | [Link](https://www.npmjs.com/package/onoff)   |



## Further information
- [Der Raspberry Pi als Stromdatensammler](https://electriceye.info/wordpress/?p=457)
- [Installation von Grafana, InfluxDB & Telegraf auf einem Raspberry Pi](https://canox.net/2018/01/installation-von-grafana-influxdb-telegraf-auf-einem-raspberry-pi/)
- [InfluxDB unter Ubuntu 16.04/18.04 installieren und einrichten](https://gridscale.io/community/tutorials/influxdb-ubuntu-installieren-einrichten/)
- [Getting Started with the Node-Influx Client Library](https://www.influxdata.com/blog/getting-started-with-node-influx/)
- [Monitor your Infrastructure with TIG Stack](https://hackernoon.com/monitor-your-infrastructure-with-tig-stack-b63971a15ccf)
- [Node-Red, InfluxDB, and Grafana Tutorial on a Raspberry Pi](https://youtu.be/JdV4x925au0)
