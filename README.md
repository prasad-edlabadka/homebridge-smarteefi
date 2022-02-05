
<p align="center">

<img src="./docs/logo.png" width="250">

</p>

# Homebridge Smarteefi Platform
[![npm](https://img.shields.io/npm/v/homebridge-smarteefi.svg)](https://www.npmjs.com/package/homebridge-smarteefi)
![GitHub](https://img.shields.io/github/license/prasad-edlabadka/homebridge-smarteefi)
[![npm](https://img.shields.io/npm/dt/homebridge-smarteefi.svg)](https://www.npmjs.com/package/homebridge-smarteefi)
![GitHub issues](https://img.shields.io/github/issues-raw/prasad-edlabadka/homebridge-smarteefi)
![GitHub pull requests](https://img.shields.io/github/issues-pr-raw/prasad-edlabadka/homebridge-smarteefi)

![GitHub contributors](https://img.shields.io/github/contributors-anon/prasad-edlabadka/homebridge-smarteefi)
![GitHub last commit](https://img.shields.io/github/last-commit/prasad-edlabadka/homebridge-smarteefi)


Control your Smarteefi Switchbaord based devices in HomeKit. You can add multiple devices / switchboards to a single configuration.

## Supported Devices
* Switches (Fans are not supported as I don't have device to test)

## Installation Instructions

#### Option 1: Install via Homebridge Config UI X:

Search for "Tuya IR" in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) and install `homebridge-smarteefi`.

#### Option 2: Manually Install:

```
sudo npm install -g homebridge-smarteefi
```

## Configuration
> UI

1. Navigate to the Plugins page in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).
2. Click the **Settings** button for the Smarteefi plugin.
3. Add your email used for registering your devices with Smarteefi
4. Add your password used for registering your devices with Smarteefi
3. Add your device IDs. These are availabe on the back of your device box or on their website. Once you login to http://smarteefi.com/, you can go to "My Devices" to find device IDs.
4. Save
5. Restart Homebridge for the changes to take effect.

> Manual

1. Edit the config.json file to add your devices and parameters. 
2. Restart Homebridge

## Contributing

If you have new accessory logic for a new device, please add a function defined by manufacturer, and describe your changes in the readME file.

## Donating

Please donate to a local pet shelter, or food pantry. It's been a wild time, but we can do our part by helping others. 
