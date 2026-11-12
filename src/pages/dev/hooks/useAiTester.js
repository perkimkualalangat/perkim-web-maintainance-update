import { useState, useCallback } from 'react';

export function useAiTester() {
  const [testChat, setTestChat] = useState({
    mode: 'chat',
    messages: [],
    streaming: false,
    response: '',
  });

  const handleTestChat = useCallback(async (streamAiFn, lang) => {
    if (testChat.streaming || !testChat.messages.length) return;
    setTestChat(prev => ({ ...prev, streaming: true, response: '' }));
    try {
      let fullResponse = '';
      for await (const event of streamAiFn({
        mode: testChat.mode,
        messages: testChat.messages,
        locale: lang,
        context: '',
        signal: null,
      })) {
        if (event.type === 'delta') {
          fullResponse += event.data;
          setTestChat(prev => ({ ...prev, response: fullResponse }));
        } else if (event.type === 'done') {
          break;
        } else if (event.type === 'error') {
          fullResponse += `\n❌ Error: ${event.data}`;
          setTestChat(prev => ({ ...prev, response: fullResponse }));
          break;
        }
      }
    } catch (e) {
      setTestChat(prev => ({ ...prev, response: prev.response + `\n❌ ${e.message}` }));
    } finally {
      setTestChat(prev => ({ ...prev, streaming: false }));
    }
  }, [testChat]);

  const clearResponse = useCallback(() => {
    setTestChat(prev => ({ ...prev, response: '' }));
  }, []);

  const setMessages = useCallback((messages) => {
    setTestChat(prev => ({ ...prev, messages }));
  }, []);

  const setMode = useCallback((mode) => {
    setTestChat(prev => ({ ...prev, mode }));
  }, []);

  return {
    testChat,
    handleTestChat,
    clearResponse,
    setMessages,
    setMode,
  };
}