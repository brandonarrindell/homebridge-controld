# Control D API Tests

⚠️ **DEVELOPMENT USE ONLY** ⚠️

This directory contains tests for the Control D API integration, intended for plugin development purposes only. These tests should not be run by end users of the plugin.

## Setup for Developers

1. Create a `.env` file in the root of the project (not inside the test directory) with your Control D API token:
   ```
   CONTROLD_API_TOKEN=api.your_token_here
   ```
   
   **⚠️ IMPORTANT**: This `.env` file contains sensitive credentials and should:
   - Never be committed to the repository (it's already in .gitignore)
   - Only be used for development and testing
   - Not be included in the published npm package

2. Make sure you have all development dependencies installed:
   ```
   npm install
   ```

## Running Tests (Development Only)

Run all tests:
```
npm test
```

Run a specific test file:
```
npx jest test/controlDApi.test.ts
```

## Test Structure

### Integration Tests (`controlDApi.test.ts`)

These tests connect to the actual Control D API to verify that our code works with the real API. They require a valid API token with `profiles:read` and `profiles:write` permissions.

Tests cover:
- API token validation
- Retrieving profiles
- Toggling profile filtering status
- Device operations (for backward compatibility)

### Error Handling Tests (`controlDApi.error.test.ts`)

These tests mock the Axios HTTP client to simulate various error conditions, testing how our code handles errors from the API. They don't require an actual API token since all API calls are mocked.

Tests cover:
- API token validation errors (403, network errors, etc.)
- Profile retrieval errors
- Profile filtering toggle errors

## ⚠️ Important Warnings

- These tests are for **development use only**
- Integration tests make real API calls to the Control D service
- Tests may toggle filtering settings on your profiles (they attempt to restore settings afterward)
- Never run these tests on production profiles or with production API tokens
- The error tests don't make actual API calls, but still require the test environment setup 