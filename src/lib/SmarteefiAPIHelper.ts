import { Logger } from "homebridge";
import { Config, Device } from "./Config";
import { HTMLElement, parse } from 'node-html-parser';

const CryptoJS = require('crypto-js');
const request = require('request');
const URL = require('url');

export class SmarteefiAPIHelper {
    private constructor(config: Config, log: Logger) {
        this.userid = config.userid;
        this.password = config.password;
        this.apiHost = `https://www.smarteefi.com/site`;
        this.log = log;
        this.config = config;
        this.cookie = [];
        this.csrf = "";
    }

    private accessToken: string = "";
    private refreshToken: string = "";
    private userid: string = "";
    private password: string = "";
    private apiHost: string = "";
    private log: Logger;
    private config: Config;
    private static _instance: SmarteefiAPIHelper;
    private cookie: string[];
    private csrf: string;

    public static Instance(config: Config, log: Logger) {
        var c = this._instance || (this._instance = new this(config, log));
        c.config = config;
        c.log = log;
        return c;
    }

    login(cb) {
        this.log.info(`Logging in to the server ${this.apiHost}...`);
        this._loginApiCall(this.apiHost + "/login", {}, (_body) => {
            cb(_body);
        });
    }

    fetchDevices(devices: string[], cb) {
        var discoveredDevices: Device[] = [];
        var completedDevices = 0;
        for (var index = 0; index < devices.length; index++) {
            const deviceId = devices[index];
            this._apiCall(`${this.apiHost}/namesettings?serial=${deviceId}`, "GET", {}, (_body, err) => {
                if (err) {
                    this.log.error("Failed to get device details: " + deviceId);
                    cb([]);
                } else {
                    //this.log.info(_body)
                    const body = parse(_body);
                    //this.log.info(body.toString());
                    var devicesAvailable = true;
                    var counter = 0;

                    while (devicesAvailable) {
                        var device = body.querySelector(`#deviceconfig-switchnames-${counter}`);
                        if (device != null) {
                            this.log.info(`Discovered switch ${device.attributes['value']}`)
                            let dev = new Device(deviceId, counter, device.attributes['value']);
                            discoveredDevices.push(dev);
                            counter++;
                        } else {
                            this.log.info("No more devices..")
                            devicesAvailable = false;
                            break;
                        }
                    }
                }
                completedDevices++;
                if (completedDevices >= devices.length) {
                    cb(discoveredDevices);
                }
            });
        }
    }

    setSwitchStatus(deviceId: string, switchmap: number, statusmap: number, cb) {
        var commandObj = { "DeviceStatus": { "serial": deviceId, "switchmap": switchmap, "statusmap": statusmap } }

        var url = `${this.apiHost}/setstatus`;

        this.log.debug(JSON.stringify(commandObj));
        this._apiCall(url, "PUT", commandObj, (_body, err) => {
            var body = {
                "result": "failure",
                "switchmap": 0,
                "statusmap": 0
            }
            if (!err) {
                body = JSON.parse(_body);
            }
            cb(body);
        })
    }

    getSwitchStatus(deviceId: string, switchmap: number, cb) {
        this.log.debug(`Getting switch status for ${deviceId}...`);
        var commandObj = { "DeviceStatus": { "serial": deviceId, "switchmap": switchmap } }

        var url = `${this.apiHost}/getstatus`;

        this.log.debug(JSON.stringify(commandObj));
        this._apiCall(url, "PUT", commandObj, (_body, err) => {
            var body = {
                "result": "error",
                "switchmap": 0,
                "statusmap": 0
            }
            if (!err) {
                try {
                    body = JSON.parse(_body);
                } catch (error) { }
            }
            cb(body);
        })
    }

    _loginApiCall(endpoint: string, body: object, cb) {
        var _this = this;
        var options = {
            url: endpoint
        };

        request.get(options, function (error, response, body) {
            if (error) {
                cb();
                return;
            };
            _this.log.debug("API call successful.");
            _this.setCookie(response);
            var b = parse("<p>Error</p>");
            try {
                b = parse(body);
            } catch (error) {
                cb(b);
            }
            _this.csrf = "" + b?.querySelector("input[type=hidden]")?.attributes['value'];
            var _options = {
                url: endpoint,
                'headers': {
                    'host': 'www.smarteefi.com',
                    'content-type': 'application/x-www-form-urlencoded',
                    'origin': 'https://www.smarteefi.com',
                    'cookie': `PHPSESSID=${_this.cookie['PHPSESSID']}; _csrf=${_this.cookie['_csrf']}`,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
                    'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8'
                },
                form: {
                    '_csrf': _this.csrf,
                    'LoginForm[email]': _this.userid,
                    'LoginForm[password]': _this.password,
                    'LoginForm[rememberMe]': '1',
                    'login-button': ''
                }
            }

            request.post(_options, function (error2, response2, body2) {
                let b = parse(body2);
                let e = b?.querySelector(".site-error h1")?.innerHTML;
                let title = "" + b?.querySelector("title")?.innerHTML;
                _this.log.debug(response2.statusCode)
                if (error2 || e || response2.statusCode >= 400 || title == "Login") {
                    _this.log.error("Unable to login. Please verify user id and password and restart homebridge.");
                    cb();
                } else {
                    _this.setCookie(response2);
                    _this.log.debug(b.toString())
                    cb(b.toString() || {"status":"success"});
                }
            })
        })
            .on('error', (err) => {
                _this.log.error("API call failed.");
                _this.log.error(err);
            })
    }
    _apiCall(endpoint: string, method: string, body: object, cb) {
        this.log.debug(`Calling endpoint ${endpoint}`);
        var _this = this;
        //this._calculateSign(true, url.query, url.pathname, method, JSON.stringify(body));
        var options = method == "GET" ? {
            method: method,
            url: endpoint,
            headers: {
                'cookie': `PHPSESSID=${_this.cookie['PHPSESSID']}; _csrf=${_this.cookie['_csrf']}`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
                'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8'
            }
        } : {
            method: method,
            url: endpoint,
            headers: {
                'cookie': `PHPSESSID=${_this.cookie['PHPSESSID']}; _csrf=${_this.cookie['_csrf']}`,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
                'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        };
        request(options, function (error, response, body) {
            // body is the decompressed response body
            _this.log.debug("API call successful.");
            cb(body, error);
        })
            .on('error', (err) => {
                _this.log.error("API call failed.");
                _this.log.error(err);
            })
    }

    setCookie(resp) {
        var x = ("" + resp.headers['set-cookie']).split(",");
        for (var i = 0; i < x.length; i++) {
            let mcookie = x[i].split(";");
            for (var j = 0; j < mcookie.length; j++) {
                let cookie = mcookie[j];
                var parts = cookie.match(/(.*?)=(.*)$/) || "";
                this.cookie[parts[1]?.trim()] = (parts[2] || '').trim();
            }
        }
    }
}
