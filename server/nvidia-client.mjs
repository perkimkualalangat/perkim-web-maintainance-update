/**
 * NVIDIA API client - handles all communication with NVIDIA API
 * Single responsibility: stream completions from NVIDIA
 */

import { config } from './config.mjs';

const NVIDIA_ENDPOINT = '/chat/completions';

export async function streamNvidiaChat({
  messages,
  settings,
  signal,
  onChunk,
  onThinking,
}) {
  const { apiKey, model, baseUrl, timeoutMs, hasValidKey } = config.nvidia;

  if (!hasValidKey || !apiKey) {
    throw new NvidiaError(
      'NVIDIA API key not configured. Please add your API key to .env.local',
      503,
      'AI_NOT_CONFIGURED',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('NVIDIA request timed out')),
    timeoutMs,
  );

  const forwardAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  let emitted = false;
  let thinkingSent = false;

  try {
    const response = await fetch(`${baseUrl}${NVIDIA_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        top_p: settings.topP,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody = {};
      try { errorBody = await response.json(); } catch { /* not JSON */ }
      const detail = errorBody?.detail
        || errorBody?.error?.message
        || errorBody?.message
        || `HTTP ${response.status}`;
      throw new NvidiaError(`NVIDIA API error: ${detail}`, response.status, 'NVIDIA_API_ERROR');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new NvidiaError('Streaming not supported', 500, 'STREAM_UNSUPPORTED');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = parsed?.choices?.[0]?.delta || {};

        if (delta.reasoning_content && !thinkingSent) {
          thinkingSent = true;
          onThinking?.();
        }

        if (typeof delta.content === 'string' && delta.content) {
          emitted = true;
          onChunk(delta.content);
        }
      }
    }

    if (!emitted) {
      throw new NvidiaError(
        'The model completed without returning visible content. Please retry.',
        502,
        'EMPTY_RESPONSE',
      );
    }

    return { emitted: true, model };
  } catch (error) {
    if (error instanceof NvidiaError) throw error;

    if (error.name === 'AbortError' || error.name === 'CancellationError') {
      throw new NvidiaError('Request cancelled', 499, 'REQUEST_CANCELLED');
    }
    if (String(error.message || '').includes('timed out')) {
      throw new NvidiaError('NVIDIA request timed out', 504, 'NVIDIA_TIMEOUT');
    }
    throw new NvidiaError(`Unable to reach NVIDIA: ${error.message}`, 502, 'NVIDIA_UNREACHABLE');
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', forwardAbort);
  }
}

export class NvidiaError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'NvidiaError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function checkNvidiaConnection() {
  const { apiKey, model, baseUrl } = config.nvidia;

  if (!apiKey) return { connected: false, model };

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    return { connected: response.ok, model };
  } catch {
    return { connected: false, model };
  }
}
