import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { ControlDProfileAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ControlDApi } from './controlDApi.js';

export class ControlDPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  private readonly discoveredProfileIds: string[] = [];
  
  public readonly api: API;
  public readonly log: Logging;
  private readonly config: PlatformConfig;
  public readonly controlDApi: ControlDApi;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isTokenValid = false;

  constructor(
    log: Logging,
    config: PlatformConfig,
    api: API,
  ) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // Initialize Control D API
    this.controlDApi = new ControlDApi(
      (config.apiToken as string) || '',
      log,
    );

    // Validate required config
    if (!config.apiToken) {
      this.log.error('Missing required config: apiToken. Please add your Control D API token to the plugin configuration.');
      return;
    }

    log.debug('Finished initializing platform:', config.name);

    // Register restored accessories when Homebridge is done loading cached accessories
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      
      // Validate API token first
      this.isTokenValid = await this.controlDApi.validateApiToken();
      
      if (this.isTokenValid) {
        this.log.info('Successfully authenticated with Control D API');
        await this.discoverProfiles();
        
        // Set up refresh interval to update profile statuses
        const refreshInterval = (this.config.refreshInterval as number) || 60;
        this.refreshInterval = setInterval(() => {
          this.updateProfileStatuses();
        }, refreshInterval * 1000);
      } else {
        this.log.error('===== AUTHENTICATION ERROR =====');
        this.log.error('Failed to authenticate with Control D API. No profiles will be available.');
        this.log.error('Please check your API token in the Homebridge config and restart Homebridge.');
        this.log.error('================================');
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  private async updateProfileStatuses() {
    if (!this.isTokenValid) {
      this.log.debug('Skipping profile status update due to invalid API token');
      return;
    }

    this.log.debug('Updating profile statuses');
    try {
      const profiles = await this.controlDApi.getProfiles();

      if (profiles.length === 0) {
        this.log.warn('No profiles found during status update. Check your Control D account.');
        return;
      }

      for (const profileId of this.discoveredProfileIds) {
        const uuid = this.api.hap.uuid.generate(profileId);
        const accessory = this.accessories.get(uuid);
        
        if (accessory) {
          const profile = profiles.find(p => p.PK === profileId);
          if (profile) {
            // Update accessory context
            accessory.context.profile = profile;
            
            // Get the accessory handler and update its status
            const accessoryHandler = new ControlDProfileAccessory(this, accessory);
            accessoryHandler.updateStatus();
          }
        }
      }
    } catch (error) {
      this.log.error('Error updating profile statuses:', error);
    }
  }

  async discoverProfiles() {
    if (!this.isTokenValid) {
      this.log.debug('Skipping profile discovery due to invalid API token');
      return;
    }

    try {
      // Get profiles from Control D API
      const profiles = await this.controlDApi.getProfiles();
      
      this.log.info(`Found ${profiles.length} profiles`);
      
      if (profiles.length === 0) {
        this.log.warn('No profiles found in your Control D account. Create some profiles in the Control D dashboard.');
        return;
      }

      // Loop over each profile and register it if not already registered
      for (const profile of profiles) {
        const uuid = this.api.hap.uuid.generate(profile.PK);
        this.discoveredProfileIds.push(profile.PK);
        
        const existingAccessory = this.accessories.get(uuid);

        if (existingAccessory) {
          // The accessory already exists
          this.log.info('Restoring existing profile from cache:', existingAccessory.displayName);
          
          // Update context with latest profile info
          existingAccessory.context.profile = profile;
          this.api.updatePlatformAccessories([existingAccessory]);
          
          // Create the accessory handler
          new ControlDProfileAccessory(this, existingAccessory);
        } else {
          // Create a new accessory
          this.log.info('Adding new profile:', profile.name);
          
          const accessory = new this.api.platformAccessory(profile.name, uuid);
          
          // Store profile in the accessory context
          accessory.context.profile = profile;
          
          // Create the accessory handler
          new ControlDProfileAccessory(this, accessory);
          
          // Register the accessory
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
      
      // Handle accessories that no longer exist in the API
      for (const [uuid, accessory] of this.accessories) {
        if (!this.discoveredProfileIds.includes(accessory.context.profile.PK)) {
          this.log.info('Removing profile no longer in account:', accessory.displayName);
          this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          this.accessories.delete(uuid);
        }
      }
    } catch (error) {
      this.log.error('Error discovering profiles:', error);
    }
  }
}
