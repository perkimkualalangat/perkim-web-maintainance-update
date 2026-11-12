/**
 * Input validation - all request validation in one place
 */

import { config } from './config.mjs';
import {
  AI_MODES,
  AI_MODES_SET,
  defaultSettingsForMode,
} from './ai-prompts.mjs';

export const VALID_MODES = AI_MODES_SET;

export function validateChatRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  // Messages array
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    errors.push('messages: must be a non-empty array');
  } else {
    body.messages.forEach((msg, idx) => {
      if (!msg || typeof msg !== 'object') {
        errors.push(`messages[${idx}]: must be an object`);
        return;
      }
      if (typeof msg.role !== 'string' || !['user', 'assistant'].includes(msg.role)) {
        errors.push(`messages[${idx}].role: must be 'user' or 'assistant'`);
      }
      if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
        errors.push(`messages[${idx}].content: must be a non-empty string`);
      }
      if (msg.content && msg.content.length > config.limits.maxMessageChars) {
        errors.push(`messages[${idx}].content: exceeds ${config.limits.maxMessageChars} characters`);
      }
    });

    if (body.messages.length > config.limits.maxHistoryMessages) {
      errors.push(`messages: exceeds maximum of ${config.limits.maxHistoryMessages} messages`);
    }

    if (!body.messages.some((msg) => msg && msg.role === 'user')) {
      errors.push('messages: at least one user message is required');
    }
  }

  // Mode
  if (body.mode !== undefined) {
    if (typeof body.mode !== 'string' || !VALID_MODES.has(body.mode)) {
      errors.push(`mode: must be one of [${AI_MODES.join(', ')}]`);
    }
  }

  // Locale used for the system prompt
  if (body.locale !== undefined) {
    if (typeof body.locale !== 'string' || !['ms', 'en'].includes(body.locale)) {
      errors.push("locale: must be 'ms' or 'en'");
    }
  }

  // Selected research context (untrusted, sent as a separate system message)
  if (body.context !== undefined) {
    if (typeof body.context !== 'string') {
      errors.push('context: must be a string');
    } else if (body.context.length > config.limits.maxContextChars) {
      errors.push(`context: exceeds ${config.limits.maxContextChars} characters`);
    }
  }

  // Settings (optional)
  if (body.settings !== undefined) {
    if (body.settings !== null && typeof body.settings !== 'object') {
      errors.push('settings: must be an object or null');
    } else if (body.settings) {
      const { temperature, topP, maxTokens } = body.settings;
      if (temperature !== undefined) {
        if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
          errors.push('settings.temperature: must be a number between 0 and 2');
        }
      }
      if (topP !== undefined) {
        if (typeof topP !== 'number' || topP < 0 || topP > 1) {
          errors.push('settings.topP: must be a number between 0 and 1');
        }
      }
      if (maxTokens !== undefined) {
        if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 8192) {
          errors.push('settings.maxTokens: must be an integer between 1 and 8192');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitizeRequest(body) : null,
  };
}

function sanitizeRequest(body) {
  const mode = VALID_MODES.has(body.mode) ? body.mode : 'general';
  const defaults = defaultSettingsForMode(mode);

  return {
    mode,
    locale: body.locale === 'en' ? 'en' : 'ms',
    context: typeof body.context === 'string'
      ? body.context.slice(0, config.limits.maxContextChars)
      : '',
    messages: body.messages
      .filter((m) => m && typeof m === 'object' && ['user', 'assistant'].includes(m.role))
      .slice(-config.limits.maxHistoryMessages)
      .map((m) => ({
        role: m.role,
        content: String(m.content || '').slice(0, config.limits.maxMessageChars),
      }))
      .filter((m) => m.content.trim()),
    settings: body.settings ? {
      temperature: clamp(body.settings.temperature, 0, 2, defaults.temperature),
      topP: clamp(body.settings.topP, 0, 1, defaults.topP),
      maxTokens: Math.min(
        Math.max(Math.floor(body.settings.maxTokens) || defaults.maxTokens, 1),
        8192,
      ),
    } : defaults,
  };
}

function clamp(value, min, max, fallback) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

export function validateModelRequest(body) {
  // For future model selection endpoint
  return { valid: true, errors: [] };
}
