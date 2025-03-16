import type { Logging } from 'homebridge';
import { ControlDApi } from '../src/controlDApi.js';
import axios from 'axios';

// Mock axios for testing error scenarios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError
const mockIsAxiosError = jest.fn().mockImplementation(
  (error): error is import('axios').AxiosError => error && error.isAxiosError === true,
);
(axios.isAxiosError as unknown) = mockIsAxiosError;

// Mock logger for testing
const mockLogger: Logging = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logging;

describe('ControlDApi Error Handling', () => {
  let api: ControlDApi;

  beforeEach(() => {
    api = new ControlDApi('api.invalid_token', mockLogger);
    jest.clearAllMocks();
  });

  describe('validateApiToken with invalid token', () => {
    it('should handle 403 permission errors correctly', async () => {
      // Mock 403 error with code 40301
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              code: 40301,
              message: 'This token does not have access to this endpoint',
            },
          },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await api.validateApiToken();
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Control D API Permission Error: Your token does not have access to the profiles endpoint.');
    });

    it('should handle generic 403 errors correctly', async () => {
      // Mock generic 403 error
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await api.validateApiToken();
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Control D API Authentication Error: Your API token appears to be invalid or lacks required permissions.');
    });

    it('should handle network errors correctly', async () => {
      // Mock network error
      const error = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await api.validateApiToken();
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Network Error validating token: Network Error');
    });

    it('should handle non-axios errors correctly', async () => {
      // Mock non-axios error
      const error = new Error('Unknown error');
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await api.validateApiToken();
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Control D API Error while validating token:', error);
    });
  });

  describe('getProfiles with errors', () => {
    it('should handle unexpected API response format', async () => {
      // Mock success response with invalid format
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { success: true, body: { notProfiles: [] } },
      });

      const profiles = await api.getProfiles();
      
      expect(profiles).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('Unexpected response format from Control D API - profiles endpoint');
    });

    it('should properly mark profiles as enabled when disable_ttl is null or 0', async () => {
      // Mock current time to be fixed for testing
      const realDateNow = Date.now;
      const mockTimestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
      global.Date.now = jest.fn(() => mockTimestamp);
      
      // Mock response with profiles that have disable_ttl as null and 0
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          body: {
            profiles: [
              { PK: 'profile1', name: 'Profile 1', updated: 1640000000, disable_ttl: null },
              { PK: 'profile2', name: 'Profile 2', updated: 1640000000, disable_ttl: 0 },
            ],
          },
        },
      });

      const profiles = await api.getProfiles();
      
      // Restore original Date.now
      global.Date.now = realDateNow;
      
      expect(profiles.length).toBe(2);
      expect(profiles[0].filteringEnabled).toBe(true);
      expect(profiles[1].filteringEnabled).toBe(true);
    });
    
    it('should properly mark profiles as disabled when disable_ttl is in the future', async () => {
      // Mock current time to be fixed for testing
      const realDateNow = Date.now;
      const mockTimestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
      global.Date.now = jest.fn(() => mockTimestamp);
      
      // Mock response with a profile that has disable_ttl in the future
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          body: {
            profiles: [
              { 
                PK: 'profile1', 
                name: 'Profile 1', 
                updated: 1640000000, 
                disable_ttl: 1640995200 + 3600, // 1 hour in the future
              },
            ],
          },
        },
      });

      const profiles = await api.getProfiles();
      
      // Restore original Date.now
      global.Date.now = realDateNow;
      
      expect(profiles.length).toBe(1);
      expect(profiles[0].filteringEnabled).toBe(false);
    });
    
    it('should properly mark profiles as enabled when disable_ttl is in the past', async () => {
      // Mock current time to be fixed for testing
      const realDateNow = Date.now;
      const mockTimestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
      global.Date.now = jest.fn(() => mockTimestamp);
      
      // Mock response with a profile that has disable_ttl in the past
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          body: {
            profiles: [
              { 
                PK: 'profile1', 
                name: 'Profile 1', 
                updated: 1640000000, 
                disable_ttl: 1640995200 - 3600, // 1 hour in the past
              },
            ],
          },
        },
      });

      const profiles = await api.getProfiles();
      
      // Restore original Date.now
      global.Date.now = realDateNow;
      
      expect(profiles.length).toBe(1);
      expect(profiles[0].filteringEnabled).toBe(true);
    });

    it('should handle 403 permission errors correctly', async () => {
      // Mock 403 error with code 40301
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              code: 40301,
              message: 'This token does not have access to this endpoint',
            },
          },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      const profiles = await api.getProfiles();
      
      expect(profiles).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Control D API Permission Error: Your token does not have access to the profiles endpoint.');
    });
  });

  describe('toggleProfileFiltering with errors', () => {
    it('should handle 403 errors correctly', async () => {
      // Mock 403 error
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      mockedAxios.put.mockRejectedValueOnce(error);

      const result = await api.toggleProfileFiltering('profile123', true);
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Control D API Authentication Error: Failed to toggle profile filtering. ' +
        'Invalid token or insufficient permissions.',
      );
    });

    it('should handle unexpected API response', async () => {
      // Mock success response with unexpected format
      mockedAxios.put.mockResolvedValueOnce({
        status: 200,
        data: { success: false },
      });

      const result = await api.toggleProfileFiltering('profile123', true);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Unexpected status code or response when updating profile filtering: 200');
    });
    
    it('should use correct request data when enabling a profile', async () => {
      // Setup spy to verify request data
      mockedAxios.put.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      });
      
      await api.toggleProfileFiltering('profile123', true);
      
      // Check that the correct request data was sent
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'https://api.controld.com/profiles/profile123',
        { disable_ttl: 0 },
        { headers: expect.any(Object) },
      );
    });
    
    it('should use correct request data when disabling a profile', async () => {
      // Setup spy to verify request data
      mockedAxios.put.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      });
      
      // Mock Date.now() to have consistent timestamp for testing
      const realDateNow = Date.now;
      const mockTimestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
      global.Date.now = jest.fn(() => mockTimestamp);
      
      await api.toggleProfileFiltering('profile123', false);
      
      // Restore the original Date.now
      global.Date.now = realDateNow;
      
      // Check that the correct request data was sent
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'https://api.controld.com/profiles/profile123',
        { disable_ttl: 1640995200 + 86400 }, // Unix timestamp + 24h in seconds
        { headers: expect.any(Object) },
      );
    });
  });
  
  describe('setDeviceProfile with errors', () => {
    it('should handle 403 errors correctly', async () => {
      // Mock 403 error
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      mockedAxios.put.mockRejectedValueOnce(error);

      const result = await api.setDeviceProfile('device123', 'profile123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Control D API Authentication Error: Failed to set device profile (device123 to profile123). ' +
        'Invalid token or insufficient permissions.',
      );
    });

    it('should handle other API errors correctly', async () => {
      // Mock 404 error
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Device not found' },
        },
      };
      mockedAxios.put.mockRejectedValueOnce(error);

      const result = await api.setDeviceProfile('device123', 'profile123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('API Error: Status 404, Message: {"message":"Device not found"}');
    });

    it('should handle network errors correctly', async () => {
      // Mock network error
      const error = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      };
      mockedAxios.put.mockRejectedValueOnce(error);

      const result = await api.setDeviceProfile('device123', 'profile123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Network Error: Network Error');
    });

    it('should handle unexpected API response', async () => {
      // Mock success response with unexpected format
      mockedAxios.put.mockResolvedValueOnce({
        status: 200,
        data: { success: false },
      });

      const result = await api.setDeviceProfile('device123', 'profile123');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Control D API Authentication Error: Failed to set device profile (device123 to profile123). ' +
        'Invalid token or insufficient permissions.',
      );
    });
  });
}); 