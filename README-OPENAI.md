# OpenAI Integration Guide

This guide explains how to set up and use the OpenAI API integration in the Productivity Pulse application.

## Setup Instructions

### 1. Get an OpenAI API Key

To use the OpenAI integration, you need an API key:

1. Go to [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2. Sign up or log in to your OpenAI account
3. Create a new API key
4. Copy the API key (you won't be able to see it again after closing the page)

### 2. Configure the Application

#### Option 1: Environment File (Recommended for Development)

Create a `.env.local` file in the root directory of the project with the following content:

```
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_USE_OPENAI=true
REACT_APP_OPENAI_MODEL=gpt-4o
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

#### Option 2: Runtime Configuration

The application also supports setting the OpenAI API key at runtime:

```javascript
import { initializeOpenAI } from './services/openaiService';

// Set the API key
initializeOpenAI('your_openai_api_key_here');
```

### 3. Using the OpenAI Integration

The application will automatically use the OpenAI integration when available. If the OpenAI API key is not configured, the application will fall back to local responses for certain queries.

## API Usage and Limitations

- The free tier of OpenAI API has rate limits. If you exceed these limits, the API calls will fail.
- The application uses the `gpt-4o` model by default, but you can change this by setting the `REACT_APP_OPENAI_MODEL` environment variable.
- OpenAI API usage incurs costs based on the number of tokens used. Monitor your usage at [https://platform.openai.com/account/usage](https://platform.openai.com/account/usage).

## Security Considerations

- The current implementation uses `dangerouslyAllowBrowser: true` which allows the API key to be used directly in the browser. This is not recommended for production applications.
- For production, consider implementing a backend proxy to make OpenAI API calls, so that your API key is not exposed to the client.

## Troubleshooting

If you encounter issues with the OpenAI integration:

1. Check that your API key is correct and has sufficient permissions
2. Verify that you have not exceeded your API rate limits
3. Check the browser console for error messages
4. Ensure you have sufficient credits in your OpenAI account

## Further Information

For more details on the OpenAI API, refer to the [official documentation](https://platform.openai.com/docs/api-reference). 