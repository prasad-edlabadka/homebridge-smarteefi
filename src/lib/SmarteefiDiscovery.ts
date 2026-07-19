import EventEmitter from 'events';
import { API, Logger } from 'homebridge';
import { Config, Device } from './Config';
import { SmarteefiAPIHelper } from './SmarteefiAPIHelper';

export class SmarteefiDiscovery extends EventEmitter {

    private config: Config = new Config();
    private api: API;
    public readonly log: Logger;

    constructor(log, api) {
        super();
        this.log = log;
        this.api = api;
    }

    start(api, props, index, cb) {
        this.log.info(`Trying to login...`);
        this.config = new Config(props.userid, props.password, props.devices);
        const helper = SmarteefiAPIHelper.Instance(this.config, this.log);
        helper.login((b) => {
            if (!b) {
                cb([], -1);
            } else {
                this.log.info("Fetching configured switches...");
                helper.fetchDevices(this.config.devices, (devs: Device[]) => {
                    if (!devs) {
                        this.log.error("Failed to fetch devices from Smarteefi. Check your internet connection or credentials.");
                        cb([], -1);
                        return;
                    }
                    cb(devs, 0);
                });
            }
        })
    }
}