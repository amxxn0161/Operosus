import { 
  isOpenAIAvailable, 
  sendOpenAIQuery, 
  Message as OpenAIMessage 
} from '../services/openaiService';

// Types for AI responses
export interface AIResponse {
  content: string;
  source: 'local' | 'openai';
}

// Function to generate local responses
export type LocalResponseGenerator = (query: string, context: any) => string | null;

/**
 * Process a query with fallback handling
 * First tries local response, then OpenAI if available and local fails
 * 
 * @param query The user's query
 * @param context Context data to help generate responses
 * @param localResponseGenerator Function to generate local responses
 * @param messages Conversation history for OpenAI (if needed)
 * @returns Response content and source
 */
export const processAIQuery = async (
  query: string,
  context: any,
  localResponseGenerator: LocalResponseGenerator,
  messages: OpenAIMessage[] = []
): Promise<AIResponse> => {
  // Check if we should use local fallback
  const useLocalFallback = localStorage.getItem('useLocalAIFallback') !== 'false';
  
  // Try to generate a local response first if fallback is enabled
  if (useLocalFallback) {
    const localResponse = localResponseGenerator(query, context);
    
    if (localResponse) {
      return {
        content: localResponse,
        source: 'local'
      };
    }
  }
  
  // If OpenAI is available, use it
  if (isOpenAIAvailable()) {
    // Prepare conversation history for OpenAI
    const openaiMessages = [...messages];
    
    // Add the user's query
    openaiMessages.push({
      role: 'user',
      content: query
    });
    
    // Add context as a system message if needed
    if (context) {
      openaiMessages.push({
        role: 'system',
        content: `Context: ${JSON.stringify(context)}`
      });
    }
    
    // Call OpenAI
    const responseContent = await sendOpenAIQuery(
      openaiMessages,
      'ft:gpt-4o-mini-2024-07-18:operosus:productivity-test:BIXbr2Lk',
      0.7,
      1000
    );
    
    if (responseContent) {
      return {
        content: responseContent,
        source: 'openai'
      };
    }
  }
  
  // If we get here, both OpenAI and local response failed or are not available
  // Return a fallback message
  return {
    content: `I'm not able to answer that question right now. ${!isOpenAIAvailable() ? 'OpenAI integration is not configured, which limits my capabilities.' : 'Try asking something else.'}`,
    source: 'local'
  };
};

/**
 * Check if AI capabilities are available and what type
 * @returns Information about available AI capabilities
 */
export const getAICapabilities = () => {
  const openaiAvailable = isOpenAIAvailable();
  const useLocalFallback = localStorage.getItem('useLocalAIFallback') !== 'false';
  
  return {
    openaiAvailable,
    useLocalFallback,
    limitedMode: !openaiAvailable
  };
};

/**
 * Get a description of current AI capabilities for user information
 */
export const getAICapabilitiesDescription = (): string => {
  const { openaiAvailable, useLocalFallback } = getAICapabilities();
  
  if (openaiAvailable) {
    return 'Full AI capabilities are available. I can answer a wide range of questions using OpenAI.';
  } else if (useLocalFallback) {
    return 'I\'m operating in limited mode with local responses only. To enable full capabilities, please configure the OpenAI API key.';
  } else {
    return 'AI capabilities are very limited. Please enable local fallback or configure OpenAI API key for better assistance.';
  }
}; 