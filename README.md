<h1 align="center">Homebridge Control D</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/homebridge-controld"><img src="https://img.shields.io/npm/v/homebridge-controld.svg" alt="npm"></a>
  <a href="https://www.npmjs.com/package/homebridge-controld"><img src="https://img.shields.io/npm/dt/homebridge-controld.svg" alt="npm"></a>
</p>

A Homebridge plugin to control [Control D](https://controld.com) DNS profile filtering through HomeKit.

## What is Control D?

Control D is a next-generation DNS service that gives you advanced filtering capabilities, analytics, and custom routing. It offers features like ad-blocking, malware protection, and content filtering across your devices.

## Features

- ✅ Exposes Control D profiles as HomeKit switches
- ✅ Enable or disable DNS filtering for profiles using the Home app or Siri
- ✅ Automatically detects profile status changes
- ✅ Easily integrate with HomeKit scenes and automations
- ✅ Secure API connection with Control D

## Prerequisites

- [Homebridge](https://homebridge.io/) v1.8.0 or newer
- A [Control D](https://controld.com) account
- Control D API token

## Installation

### Option 1: Install through Homebridge UI

1. Open the Homebridge UI
2. Go to the "Plugins" tab
3. Search for "homebridge-controld"
4. Click "Install"

### Option 2: Install through terminal

```bash
npm install -g homebridge-controld
```

## Configuration

You can configure the plugin through the Homebridge UI or by editing your `config.json` file directly.

### Through Homebridge UI

1. Navigate to the "Plugins" tab
2. Find "Homebridge Control D" and click "Settings"
3. Enter your Control D API token and other settings
4. Save and restart Homebridge

### Manual Configuration

Add the following to your Homebridge `config.json` file:

```json
{
  "platforms": [
    {
      "platform": "ControlDPlatform",
      "name": "Control D",
      "apiToken": "YOUR_CONTROL_D_API_TOKEN",
      "refreshInterval": 60,
      "debug": false
    }
  ]
}
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | | Must be "ControlDPlatform" |
| `name` | Yes | "Control D" | Name for your Control D platform |
| `apiToken` | Yes | | Your Control D API token |
| `refreshInterval` | No | 60 | Interval in seconds to refresh profile status |
| `debug` | No | false | Enable additional debug logging |

## API Token Configuration

## Getting Your Control D API Token

To use this plugin, you need a valid API token from Control D with the appropriate permissions:

1. Log in to your Control D dashboard at [https://controld.com/dashboard](https://controld.com/dashboard)
2. Go to "Settings" in the left sidebar
3. Click on "API" in the settings menu
4. Click "Create API Token"
5. Give your token a name (e.g., "Homebridge")
6. **Required Permissions**: Make sure to select these permissions:
   - `profiles:read` - Required to list available DNS profiles
   - `profiles:write` - Required to modify DNS profiles

   **Important**: You must select BOTH permissions above

7. Click "Generate Token"
8. Copy the token immediately (you won't be able to see it again)

## API Endpoints Used

This plugin interacts with the following Control D API endpoints:

- `GET /profiles` - Retrieves list of available DNS profiles
- `PUT /profiles/{profileId}` - Updates a profile's filtering settings

## Common Authentication Errors

If you see error messages like these in your Homebridge logs:

```
[Control D] Failed to get profiles: AxiosError: Request failed with status code 403
```

This indicates an authentication problem. The most common issue is missing permissions:

### Error Code 40301 - Missing Endpoint Permission

If you see a message like:
```
This token does not have access to this endpoint
```

This means your token is valid but doesn't have the required permissions. You need to:

1. Go to Control D dashboard → Settings → API
2. Revoke your existing token (it cannot be modified)
3. Create a new token with the required permissions listed above
4. Update your Homebridge config with the new token
5. Restart Homebridge

### Other Common Issues

1. **Invalid token**: Make sure you've copied the full token correctly
2. **Account issues**: Verify your Control D account is active
3. **Token revoked**: If you've revoked the token, you'll need to create a new one

## Troubleshooting API Access

1. Test your token using curl:
   ```bash
   curl -X GET "https://api.controld.com/profiles" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```
   
2. Check the response:
   - If you get data back, your token is working
   - If you get a 403 error with code 40301, your token is missing permissions
   - If you get another error, check the error message for details

3. Create a new token with the correct permissions if needed

## Usage

After setting up the plugin and restarting Homebridge, your Control D profiles will appear as switches in the Home app.

### Basic Usage

- **Turn ON a profile switch**: Enables DNS filtering for that profile
- **Turn OFF a profile switch**: Disables DNS filtering for that profile
- **Refresh status**: The plugin automatically refreshes profile status every minute (configurable)

### HomeKit Automation Examples

- **Schedule filter changes**: Create automations to enable/disable filtering based on time of day
- **Activate filters when leaving home**: Use location-based triggers to enable stricter filtering
- **Scene integration**: Include filtering changes in your HomeKit scenes

## Troubleshooting

### Common Issues

#### Plugin not showing in HomeKit

- Ensure Homebridge is running properly
- Check that your API token is correct
- Verify your Control D account has at least one profile

#### Can't toggle profile filtering

- Verify your API token has the necessary permissions
- Check if your Control D account has at least one profile

#### Updates not reflecting in the Home app

- Try increasing the refresh interval in the configuration
- Restart Homebridge

### Viewing Logs

For detailed troubleshooting, enable debug mode by setting `"debug": true` in your configuration. You can view the logs through the Homebridge UI or in the Homebridge log file.

## Development

This section is for developers who want to contribute to or modify the plugin.

### Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/brandonarrindell/homebridge-controld.git
   cd homebridge-controld
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the project root with your Control D API token:
   ```
   CONTROLD_API_TOKEN=api.your_token_here
   ```
   **Note**: The `.env` file is only used for development and testing. It should never be committed to the repository.

4. Build the plugin:
   ```
   npm run build
   ```

### Running Tests

Tests are provided for development purposes to ensure the API client works correctly. These tests require a valid Control D API token with proper permissions.

```
npm test
```

**Important**: The integration tests make real API calls that may temporarily change your profile settings. While the tests attempt to restore settings to their original state, they should only be run in a development environment, not on production profiles.

See the `test/README.md` file for more details about the test structure.

### Development Workflow

1. Make your changes
2. Run tests: `npm test`
3. Build the plugin: `npm run build`
4. Link for local testing: `npm link`
5. Test in Homebridge: Configure Homebridge to use your development version

## Support and Contribution

- Report issues on GitHub
- Pull requests are welcome!

## License

Apache-2.0
