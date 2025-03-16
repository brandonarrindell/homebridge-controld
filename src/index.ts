import type { API } from 'homebridge';

import { PLATFORM_NAME } from './settings.js';
import { ControlDPlatform } from './platform.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, ControlDPlatform);
};
