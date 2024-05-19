import { API } from 'homebridge';
import SmarteefiPlatform from './platform';
// import { SmarteefiPlatform } from './platform';

const PLATFORM_NAME = 'Smarteefi';
/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, SmarteefiPlatform);
};
