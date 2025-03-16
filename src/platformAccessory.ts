import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { ControlDPlatform } from './platform.js';
import type { ControlDProfile } from './controlDApi.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ControlDProfileAccessory {
  private service: Service;
  private profile: ControlDProfile;

  constructor(
    private readonly platform: ControlDPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.profile = accessory.context.profile;

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Control D')
      .setCharacteristic(this.platform.Characteristic.Model, 'DNS Profile')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.profile.PK);

    // Set up the switch service to control the profile
    this.service = this.accessory.getService(this.platform.Service.Switch) || 
      this.accessory.addService(this.platform.Service.Switch);

    // Set the service name
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.profile.name);

    // Register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
      
    // Initial status update
    this.updateStatus();
  }

  updateStatus() {
    // Use the filteringEnabled property we added to the profile
    const isActive = this.profile.filteringEnabled === true;
    this.service.updateCharacteristic(this.platform.Characteristic.On, isActive);
  }

  async setOn(value: CharacteristicValue) {
    const isOn = value as boolean;
    this.platform.log.debug(`Setting profile ${this.profile.name} filtering to ${isOn ? 'enabled' : 'disabled'}`);
    
    const success = await this.platform.controlDApi.toggleProfileFiltering(this.profile.PK, isOn);
    
    if (success) {
      // Update our local state
      this.profile.filteringEnabled = isOn;
      if (this.profile.profile && this.profile.profile.da) {
        this.profile.profile.da.status = isOn ? 1 : 0;
      }
      this.platform.log.info(`Successfully ${isOn ? 'enabled' : 'disabled'} filtering for profile: ${this.profile.name}`);
    } else {
      this.platform.log.error(`Failed to ${isOn ? 'enable' : 'disable'} filtering for profile: ${this.profile.name}`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    // Use the filteringEnabled property
    return this.profile.filteringEnabled === true;
  }
}
