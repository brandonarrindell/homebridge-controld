import { config } from 'dotenv';
import type { Logging } from 'homebridge';
import { ControlDApi } from '../src/controlDApi.js';

// Load environment variables from .env file
config();

const apiToken = process.env.CONTROLD_API_TOKEN;
if (!apiToken) {
  throw new Error('CONTROLD_API_TOKEN environment variable is not set. Create a .env file with this variable.');
}

// Mock logger for testing
const mockLogger: Logging = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logging;

describe('ControlDApi', () => {
  let api: ControlDApi;

  beforeEach(() => {
    api = new ControlDApi(apiToken, mockLogger);
    jest.clearAllMocks();
  });

  describe('validateApiToken', () => {
    it('should return true for a valid API token', async () => {
      const result = await api.validateApiToken();
      expect(result).toBe(true);
    });
  });

  describe('getProfiles', () => {
    it('should return a list of profiles', async () => {
      const profiles = await api.getProfiles();
      
      // API should return at least one profile
      expect(profiles.length).toBeGreaterThan(0);
      
      // Check that each profile has the expected properties
      profiles.forEach(profile => {
        expect(profile).toHaveProperty('PK');
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('updated');
        expect(profile).toHaveProperty('filteringEnabled');
      });
    });
  });

  describe('toggleProfileFiltering', () => {
    it('should toggle profile filtering status', async () => {
      // First get the list of profiles
      const profiles = await api.getProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      
      // Take the first profile for testing
      const testProfile = profiles[0];
      
      // Get the current filtering status
      const currentStatus = testProfile.filteringEnabled === true;
      
      // Toggle to the opposite status
      const toggleResult = await api.toggleProfileFiltering(testProfile.PK, !currentStatus);
      expect(toggleResult).toBe(true);
      
      // Toggle it back to the original status
      const revertResult = await api.toggleProfileFiltering(testProfile.PK, currentStatus);
      expect(revertResult).toBe(true);
    });
  });

  // Optional test for device-related methods if you want to keep them for backward compatibility
  describe('getDevices', () => {
    it('should return a list of devices', async () => {
      const devices = await api.getDevices();
      
      // We don't need to assert the number of devices, as some accounts might not have any
      
      // If there are devices, check their structure
      if (devices.length > 0) {
        devices.forEach(device => {
          expect(device).toHaveProperty('PK');
          expect(device).toHaveProperty('name');
          expect(device).toHaveProperty('profile');
          expect(device.profile).toHaveProperty('PK');
          expect(device.profile).toHaveProperty('name');
        });
      }
    });
  });
  
  describe('setDeviceProfile', () => {
    it('should be able to set a device profile', async () => {
      // Skip if no devices are available
      const devices = await api.getDevices();
      if (devices.length === 0) {
        console.log('No devices found, skipping setDeviceProfile test');
        return;
      }
      
      // Get a list of profiles
      const profiles = await api.getProfiles();
      if (profiles.length === 0) {
        console.log('No profiles found, skipping setDeviceProfile test');
        return;
      }
      
      // Get the first device
      const device = devices[0];
      
      // Save the original profile
      const originalProfilePK = device.profile.PK;
      
      // Find a different profile to switch to
      const differentProfile = profiles.find(p => p.PK !== originalProfilePK);
      if (!differentProfile) {
        console.log('Only one profile found, skipping setDeviceProfile test');
        return;
      }
      
      try {
        // Set the device to a different profile
        const setResult = await api.setDeviceProfile(device.PK, differentProfile.PK);
        expect(setResult).toBe(true);
        
        // Set it back to the original profile
        const resetResult = await api.setDeviceProfile(device.PK, originalProfilePK);
        expect(resetResult).toBe(true);
      } catch (error) {
        // Always restore the original profile even if test fails
        await api.setDeviceProfile(device.PK, originalProfilePK);
        throw error;
      }
    });
  });
}); 