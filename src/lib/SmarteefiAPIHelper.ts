import { Logger } from "homebridge";
import { Config, Device } from "./Config";
import request from 'request';


export class SmarteefiAPIHelper {
    private constructor(config: Config, log: Logger) {
        this.userid = config.userid;
        this.password = config.password;
        this.apiHost = `https://www.smarteefi.com/api/v3`;
        this.log = log;
        this.config = config;
        this.token = "";
    }

    private userid = "";
    private password = "";
    private apiHost = "";
    private log: Logger;
    private config: Config;
    private static _instance: SmarteefiAPIHelper;
    private token: string;

    public static Instance(config: Config, log: Logger) {
        const c = this._instance || (this._instance = new this(config, log));
        c.config = config;
        c.log = log;

        return c;
    }

    login(cb) {
        this.log.info(`Logging in to the server ${this.apiHost}...`);
        this._loginApiCall(this.apiHost + "/user/login", {}, (_body) => {
            if(!_body) {
                this.log.warn("Unable to login. Retrying after 60 seconds...");
                setTimeout(() => {
                    this.login(cb);
                }, 60000);
            } else {
                cb(_body);
            }
        });
    }

    fetchDevices(devices: string[], cb) {
        const discoveredDevices: Device[] = [];
        for (let index = 0; index < devices.length; index++) {
            const deviceId = devices[index];
            this._apiCall(`${this.apiHost}/user/devices`, 'POST', {"UserDevice":{"access_token":this.token}}, (body, err) => {
                let jBody = {result: "", switches: [{name: "", map: ""}]};
                try {
                    jBody = JSON.parse(body);
                } catch (error) {}
                if (err) {
                    this.log.error("Failed to get device details: " + deviceId);
                    cb([]);
                } else {
                    this.log.debug(body);
                    for(let i=0;i<jBody.switches.length;i++) {
                        const sw = jBody.switches[i];
                        this.log.info(`Discovered switch ${sw.name}`)
                        const dev = new Device(deviceId, Number.parseInt(sw.map),sw.name);
                        discoveredDevices.push(dev);
                    }
                    cb(discoveredDevices);
                }
            })
        }
    }

    async setSwitchStatus(deviceId: string, switchmap: number, statusmap: number, cb) {
        //const commandObj = { "DeviceStatus": { "serial": deviceId, "switchmap": switchmap, "statusmap": statusmap } }
        const commandObj = {"DeviceStatus":{"access_token":this.token,"serial":deviceId,"switchmap":switchmap,"statusmap":statusmap,"duration":0}}
        const url = `${this.apiHost}/device/setstatus`;
        this.log.debug(JSON.stringify(commandObj));

        await this._apiCall(url, "POST", commandObj, (_body, err) => {
            let body = {
                "result": "failure",
                "switchmap": 0,
                "statusmap": 0
            }
            if (!err) {
                try {
                    body = JSON.parse(_body);
                    // eslint-disable-next-line no-empty
                } catch (error) { }
            }
            cb(body);
        })
    }

    async getSwitchStatus(deviceId: string, switchmap: number, cb) {
        this.log.debug(`Getting switch status for ${deviceId}...`);
        const commandObj = {"DeviceStatus":{"access_token":this.token,"serial":deviceId,"switchmap":switchmap,"statusmap":0,"duration":0}}

        const url = `${this.apiHost}/device/getstatus`;

        this.log.debug(JSON.stringify(commandObj));
        await this._apiCall(url, "POST", commandObj, (_body, err) => {
            let body = {
                "result": "error",
                "switchmap": 0,
                "statusmap": 0
            }
            if (!err) {
                try {
                    body = JSON.parse(_body);
                    // eslint-disable-next-line no-empty
                } catch (error) { }
            }
            cb(body);
        })
    }

    _loginApiCall(endpoint: string, body: object, cb) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        const options = {
            url: endpoint,
            forever: true, 
            
        };
        const requestBody = {"LoginForm":{"email":_this.userid,"password":_this.password,"app":"smarteefi"}}

        this._apiCall(endpoint, 'POST', requestBody, function(body, error) {
            let jBody = {result: "", access_token: ""};
            try {
                jBody = JSON.parse(body);
            } catch (error) {}
            _this.log.debug(body);
            if(error || jBody.result !== 'success') {
                _this.log.debug("API call failed.", error, body);
                cb();
                return;
            }
            _this.token = jBody.access_token;
            cb(_this.token);
        })
    }
    async _apiCall(endpoint: string, method: string, body: object, cb) {
        this.log.debug(`Calling endpoint ${endpoint}`);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        //this._calculateSign(true, url.query, url.pathname, method, JSON.stringify(body));
        const options = method == "GET" ? {
            method: method,
            url: endpoint,
            forever: true,
            headers: {
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
                'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8'
            }
        } : {
            method: method,
            url: endpoint,
            forever: true,
            headers: {
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
}
