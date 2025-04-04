import OpenAI from 'openai';

// Environment variables
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Initialize the OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 * This can be called during app startup or when the API key is updated
 */
export const initializeOpenAI = (apiKey: string | undefined = getApiKey()) => {
  if (!apiKey) {
    console.warn('OpenAI API key not provided. OpenAI integration will not work.');
    return false;
  }

  // Basic validation for API key format
  if (!isValidAPIKeyFormat(apiKey)) {
    console.error('OpenAI API key appears to be in an invalid format.');
    return false;
  }

  try {
    console.log('Initializing OpenAI client...');
    openaiClient = new OpenAI({ 
      apiKey, 
      dangerouslyAllowBrowser: true // Note: In production, consider using a backend proxy
    });
    console.log('OpenAI client initialized successfully');
    
    // Test the API key validity by making a simple request
    testAPIKeyValidity().catch(error => {
      console.error('OpenAI API key validation failed:', error);
      // Don't invalidate the client here - it might be a temporary API issue
      // Just log the error for debugging
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    openaiClient = null;
    return false;
  }
};

/**
 * Test if the API key is valid by making a minimal API call
 */
const testAPIKeyValidity = async (): Promise<boolean> => {
  if (!openaiClient) return false;
  
  try {
    // Make a minimal API call to verify key
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    console.log('OpenAI API key verified successfully');
    return true;
  } catch (error) {
    console.error('Error validating OpenAI API key:', error);
    return false;
  }
};

/**
 * Basic validation of API key format
 * OpenAI API keys typically start with "sk-" and are about 51 characters long
 */
const isValidAPIKeyFormat = (apiKey: string): boolean => {
  // Very basic format check
  return apiKey.startsWith('sk-') && apiKey.length > 40;
};

/**
 * Get the API key from environment variables or localStorage
 */
export const getApiKey = (): string | undefined => {
  // Try to get the API key from localStorage first
  const localStorageKey = localStorage.getItem('openaiApiKey');
  
  if (localStorageKey) {
    console.log('Using OpenAI API key from localStorage');
    return localStorageKey;
  }
  
  // Fall back to environment variable
  if (OPENAI_API_KEY) {
    console.log('Using OpenAI API key from environment variables');
    return OPENAI_API_KEY;
  }
  
  console.warn('No OpenAI API key found in localStorage or environment variables');
  return undefined;
};

/**
 * Check if the OpenAI client is initialized and ready
 */
export const isOpenAIAvailable = (): boolean => {
  const available = openaiClient !== null;
  console.log('OpenAI availability check:', available);
  return available;
};

/**
 * Get the current OpenAI client instance
 */
export const getOpenAIClient = (): OpenAI | null => {
  return openaiClient;
};

/**
 * Get the preferred model from localStorage or fallback to default
 */
export const getPreferredModel = (): string => {
  const storedModel = localStorage.getItem('openaiModel');
  if (storedModel) {
    return storedModel;
  }
  
  // Try environment variable
  return process.env.REACT_APP_OPENAI_MODEL || 'gpt-4o';
};

// Message interface to match OpenAI's expected format
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Send a query to OpenAI's API
 * @param messages The conversation history and current query
 * @param model The model to use (defaults to preferred model from settings)
 * @param temperature Controls randomness (0-1, lower is more deterministic)
 * @param maxTokens Maximum tokens in the response
 * @returns The AI response or null if there was an error
 */
export const sendOpenAIQuery = async (
  messages: Message[],
  model: string = getPreferredModel(),
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<string | null> => {
  if (!openaiClient) {
    console.error('OpenAI client not initialized. Call initializeOpenAI first.');
    return null;
  }

  // Log the query content for debugging
  console.log(`Sending query to OpenAI (model: ${model}, temperature: ${temperature})`);
  console.log('Query message:', messages[messages.length - 1]?.content.substring(0, 100) + '...');
  
  try {
    console.log('Making OpenAI API request...');
    const startTime = Date.now();
    
    const completion = await openaiClient.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const duration = Date.now() - startTime;
    console.log(`Successfully received response from OpenAI in ${duration}ms`);
    
    if (!completion.choices || completion.choices.length === 0) {
      console.error('OpenAI returned empty choices array');
      return null;
    }
    
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      console.error('OpenAI response missing content');
      return null;
    }
    
    console.log('OpenAI response preview:', responseContent.substring(0, 100) + '...');
    return responseContent;
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    
    // More detailed error logging based on error type
    if (error.response) {
      console.error(`OpenAI API error: Status ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else if (error.message) {
      if (error.message.includes('API key')) {
        console.error('API key error - likely invalid format or authentication issue');
      } else if (error.message.includes('rate limit')) {
        console.error('Rate limit exceeded - slow down requests or increase limits');
      } else if (error.message.includes('network')) {
        console.error('Network error - check internet connection');
      }
      console.error('Error message:', error.message);
    }
    
    return null;
  }
};

// Initialize OpenAI on module load if API key is available
initializeOpenAI(); 