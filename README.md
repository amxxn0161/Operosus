# Productivity Pulse with AI Assistant

Productivity Pulse is a productivity management application that helps you track your work habits, manage tasks, and stay focused. The latest feature added to the application is an AI Assistant powered by OpenAI's API.

## AI Assistant Feature

The AI Assistant is a chat interface that allows you to:
- Ask questions about productivity techniques
- Get help with using the application
- Receive tips for time management and focus
- Chat with a helpful AI to boost your productivity

### Features

1. **Global Accessibility**: The AI Assistant is available throughout the application via a floating button in the bottom right corner.

2. **Welcome Notification**: A welcome notification appears occasionally on the dashboard to remind you about the assistant.

3. **Chatbot Interface**: A clean, modern chat interface allows you to interact with the AI.

4. **OpenAI Integration**: Powered by OpenAI's GPT-4o model for intelligent, context-aware responses.

5. **Context Awareness**: The AI Assistant is aware of your current location in the app and can provide relevant help specific to what you're doing:
   - On the Dashboard, it can explain your productivity metrics
   - On the Journal page, it can guide you through creating a new entry
   - On the Tasks page, it can help you manage your tasks effectively

## Setup

To use the AI Assistant, you need to set up your OpenAI API key:

1. Create an account on [OpenAI](https://openai.com/) if you don't have one.
2. Generate an API key in your OpenAI dashboard.
3. Create a `.env.local` file based on `.env.example` and add your API key:
   ```
   REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Restart the application.

## Usage

1. **Access the AI Assistant**: Click the robot icon button in the bottom right corner of the screen.
2. **Ask Questions**: Type your question in the text field and press Enter or click the send button.
3. **View Responses**: The AI will respond with helpful information.
4. **Context-Specific Help**: Try asking about features related to your current page. For example:
   - On the Journal page: "How do I create a new journal entry?"
   - On the Dashboard: "What does my productivity score mean?"
   - On the Tasks page: "How do I add a high-priority task?"
5. **Dismiss Welcome Notification**: When the welcome notification appears, you can click "Yes" to open the AI Assistant or "No" to dismiss.

## Implementation Details

The AI Assistant is implemented using:
- React for the UI components
- Material-UI for styling
- React Context API for state management
- OpenAI API for the chat functionality
- Screen context tracking to provide page-aware assistance

## Privacy Notice

Your conversations with the AI Assistant are processed by OpenAI. Make sure not to share sensitive personal information in your chats.

## Extending the Assistant

To extend the AI Assistant's capabilities, you can:
1. Modify the system prompt in `AIAssistantContext.tsx`
2. Add more UI features to the `AIAssistant.tsx` component
3. Create specialized AI tools for specific productivity features
4. Add more detailed context about user activities in relevant components
