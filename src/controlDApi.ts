import axios from 'axios';
import type { Logging } from 'homebridge';

export interface ControlDProfile {
  PK: string;
  name: string;
  updated: number;
  disable_ttl?: number;
  profile?: {
    da?: {
      status: number;
      do: number;
    };
  };
  filteringEnabled?: boolean; // Helper property to track filtering status
}

export interface ControlDDevice {
  PK: string;
  name: string;
  profile: {
    PK: string;
    name: string;
  };
  status: number;
}

export class ControlDApi {
  private readonly baseUrl = 'https://api.controld.com';
  private readonly apiToken: string;
  private readonly log: Logging;

  constructor(apiToken: string, log: Logging) {
    this.apiToken = apiToken;
    this.log = log;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiToken}`,
    };
  }

  async validateApiToken(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/profiles`, {
        headers: this.getHeaders(),
      });
      return response.status === 200 && response.data && response.data.success === true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          const errorData = error.response.data as { error?: { code: number; message: string } };
          
          if (errorData?.error?.code === 40301) {
            this.log.error('Control D API Permission Error: Your token does not have access to the profiles endpoint.');
            this.log.error('Please create a new token with these permissions: profiles:read, profiles:write');
            this.log.error('Visit https://controld.com/dashboard → Settings → API to update your token.');
          } else {
            this.log.error('Control D API Authentication Error: Your API token appears to be invalid or lacks required permissions.');
            this.log.error('Please verify that you have entered the correct token and that it has the necessary permissions.');
            this.log.error('Visit https://controld.com/dashboard to generate a new token if needed.');
          }
        } else if (error.response) {
          this.log.error(`API Error validating token: Status ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
        } else {
          this.log.error(`Network Error validating token: ${error.message}`);
        }
      } else {
        this.log.error('Control D API Error while validating token:', error);
      }
      return false;
    }
  }

  async getProfiles(): Promise<ControlDProfile[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/profiles`, {
        headers: this.getHeaders(),
      });
      
      if (!response.data || !response.data.success || !response.data.body || !Array.isArray(response.data.body.profiles)) {
        this.log.warn('Unexpected response format from Control D API - profiles endpoint');
        return [];
      }
      
      const profiles = response.data.body.profiles || [];
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Add helper property to track filtering status
      return profiles.map((profile: ControlDProfile) => {
        // A profile is considered disabled if it has a disable_ttl value greater than current time
        // A disable_ttl of 0 means filtering is enabled
        const isZero = profile.disable_ttl === 0;
        const isUnset = profile.disable_ttl === undefined || profile.disable_ttl === null;
        const isExpired = profile.disable_ttl !== undefined && profile.disable_ttl <= currentTime;
        const filteringEnabled = isZero || isUnset || isExpired;
        
        return {
          ...profile,
          filteringEnabled,
        };
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          const errorData = error.response.data as { error?: { code: number; message: string } };
          
          if (errorData?.error?.code === 40301) {
            this.log.error('Control D API Permission Error: Your token does not have access to the profiles endpoint.');
            this.log.error('Please create a new token with these permissions: profiles:read, profiles:write');
          } else {
            this.log.error('Control D API Authentication Error: Failed to fetch profiles due to invalid token or insufficient permissions.');
          }
        } else if (error.response) {
          this.log.error(`API Error fetching profiles: Status ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
        } else {
          this.log.error(`Network Error fetching profiles: ${error.message}`);
        }
      } else {
        this.log.error('Failed to get profiles:', error);
      }
      return [];
    }
  }

  async toggleProfileFiltering(profileId: string, enabled: boolean): Promise<boolean> {
    try {
      this.log.debug(`Setting profile ${profileId} filtering to ${enabled ? 'enabled' : 'disabled'}`);
      
      let requestData;
      
      if (enabled) {
        // Enable profile by setting disable_ttl to 0
        requestData = { disable_ttl: 0 };
      } else {
        // Disable profile for 24 hours (86400 seconds)
        const disableTtl = Math.floor(Date.now() / 1000) + 86400;
        requestData = { disable_ttl: disableTtl };
      }
      
      const response = await axios.put(
        `${this.baseUrl}/profiles/${profileId}`,
        requestData,
        { headers: this.getHeaders() },
      );
      
      if (response.status === 200 && response.data && response.data.success) {
        this.log.debug(`Successfully ${enabled ? 'enabled' : 'disabled'} filtering for profile`);
        return true;
      } else {
        this.log.warn(`Unexpected status code or response when updating profile filtering: ${response.status}`);
        return false;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          this.log.error('Control D API Authentication Error: Failed to toggle profile filtering. Invalid token or insufficient permissions.');
        } else if (error.response) {
          this.log.error(`API Error: Status ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
        } else {
          this.log.error(`Network Error: ${error.message}`);
        }
      } else {
        this.log.error('Failed to toggle profile filtering:', error);
      }
      return false;
    }
  }

  // Keeping this method for backwards compatibility, but we're not using it anymore
  async getDevices(): Promise<ControlDDevice[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/devices`, {
        headers: this.getHeaders(),
      });
      
      if (!response.data || !response.data.success || !response.data.body || !Array.isArray(response.data.body.devices)) {
        this.log.warn('Unexpected response format from Control D API - devices endpoint');
        return [];
      }
      
      return response.data.body.devices || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          this.log.error('Control D API Authentication Error: Failed to fetch devices due to invalid token or insufficient permissions.');
        } else if (error.response) {
          this.log.error(`API Error fetching devices: Status ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
        } else {
          this.log.error(`Network Error fetching devices: ${error.message}`);
        }
      } else {
        this.log.error('Failed to get devices:', error);
      }
      return [];
    }
  }

  async setDeviceProfile(deviceId: string, profileId: string): Promise<boolean> {
    try {
      this.log.debug(`Setting device ${deviceId} to use profile ${profileId}`);
      
      const response = await axios.put(
        `${this.baseUrl}/devices/${deviceId}`,
        { profile: { PK: profileId } },
        { headers: this.getHeaders() },
      );
      
      if (response.status === 200 && response.data && response.data.success) {
        this.log.debug('Successfully updated device profile');
        return true;
      } else {
        this.log.error(
          `Control D API Authentication Error: Failed to set device profile (${deviceId} to ${profileId}). ` +
          'Invalid token or insufficient permissions.',
        );
        return false;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          this.log.error(
            `Control D API Authentication Error: Failed to set device profile (${deviceId} to ${profileId}). ` +
            'Invalid token or insufficient permissions.',
          );
        } else if (error.response) {
          this.log.error(`API Error: Status ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`);
        } else {
          this.log.error(`Network Error: ${error.message}`);
        }
      } else {
        this.log.error('Failed to set device profile:', error);
      }
      return false;
    }
  }
}