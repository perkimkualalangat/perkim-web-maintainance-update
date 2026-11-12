import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from '@astryxdesign/core/Chat';
import { Grid } from '@astryxdesign/core/Grid';
import { Markdown } from '@astryxdesign/core/Markdown';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useAppSettings } from '../context/AppSettings.jsx';
import { useData } from '../context/DataContext.jsx';
import {
  buildResearchContext,
  getAiStatus,
  runSystemChecks,
  streamAi,
} from '../lib/ai.js';
import { Page, PageHeader, SectionHeading } from '../components/Page.jsx';

const MODES = ['general', 'chat', 'code', 'plan', 'check'];
const MESSAGES_KEY = 'ncl:ai:messages';
const MODE_KEY = 'ncl:ai:mode';
const MAX_STORED_MESSAGES = 40;
const MAX_HISTORY_MESSAGES = 16;

const QUICK_PROMPTS = {
  general: [
    'ai.prompt.general.creative',
    'ai.prompt.general.explain',
    'ai.prompt.general.code',
    'ai.prompt.general.analyze',
  ],
  chat: [
    'ai.prompt.compare',
    'ai.prompt.gaps',
    'ai.prompt.plan',
    'ai.prompt.audit',
  ],
  code: [
    'ai.prompt.code.refactor',
    'ai.prompt.code.debug',
    'ai.prompt.code.test',
    'ai.prompt.code.architect',
  ],
  plan: [
    'ai.prompt.plan.project',
    'ai.prompt.plan.feature',
    'ai.prompt.plan.migration',
    'ai.prompt.plan.risk',
  ],
  check: [
    'ai.prompt.check.security',
    'ai.prompt.check.performance',
    'ai.prompt.check.architecture',
    'ai.prompt.check.dependencies',
  ],
};

function messageId() {
  return globalThis.crypto?.randomUUID?.() || `ai-${Date.now()}-${Math.random()}`;
}

function readStoredMessages() {
  try {
    const raw = globalThis.sessionStorage?.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

function readStoredMode() {
  try {
    const value = globalThis.sessionStorage?.getItem(MODE_KEY);
    return MODES.includes(value) ? value : 'chat';
  } catch {
    return 'chat';
  }
}

function formatTime(value, lang) {
  return new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCheckReport(report, t) {
  const overall = report.ok ? 'PASS' : 'FAIL';
  const rows = report.results.map((item) => (
    `| ${item.label} | ${item.ok ? 'PASS' : 'FAIL'} | ${item.durationMs} ms |`
  ));
  const failures = report.results
    .filter((item) => !item.ok)
    .map((item) => `\n#### ${item.label}\n\n\`\`\`text\n${item.output}\n\`\`\``)
    .join('\n');
  return [
    `## ${t('ai.checkReport')}: ${overall}`,
    '',
    `| ${t('ai.checkName')} | ${t('ai.checkStatus')} | ${t('ai.checkDuration')} |`,
    '|---|---:|---:|',
    ...rows,
    failures,
  ].filter(Boolean).join('\n');
}

export default function AiPage() {
  const { t, lang } = useAppSettings();
  const { data } = useData();
  const [mode, setModeState] = useState(readStoredMode);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(readStoredMessages);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [streamError, setStreamError] = useState('');
  const [isStreaming, setStreaming] = useState(false);
  const [isThinking, setThinking] = useState(false);
  const abortRef = useRef(null);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    try {
      globalThis.sessionStorage?.setItem(MODE_KEY, next);
    } catch {
      /* storage not available */
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getAiStatus(controller.signal)
      .then((next) => {
        setStatus(next);
        setStatusError('');
      })
      .catch((error) => setStatusError(error.message));
    return () => controller.abort();
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the conversation for the current browser tab.
  useEffect(() => {
    if (isStreaming) return;
    try {
      globalThis.sessionStorage?.setItem(
        MESSAGES_KEY,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
      );
    } catch {
      /* storage full or unavailable */
    }
  }, [isStreaming, messages]);

  const totalRecords = useMemo(
    () => Object.values(data).reduce(
      (sum, records) => sum + (Array.isArray(records) ? records.length : 0),
      0,
    ),
    [data],
  );

  const appendMessage = useCallback((message) => {
    setMessages((current) => [...current, message]);
  }, []);

  const submitPrompt = useCallback(async (value) => {
    const question = String(value || '').trim();
    if (!question || isStreaming || abortRef.current || !status?.configured) return;

    const userMessage = {
      id: messageId(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
      mode,
    };
    const assistantId = messageId();
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      mode,
      model: status.model,
    };
    const history = [...messages, userMessage]
      .filter((item) => item.content)
      .slice(-MAX_HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    setDraft('');
    setStreamError('');
    setThinking(false);
    setStreaming(true);
    setMessages((current) => [...current, userMessage, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;
    let assembled = '';
    try {
      await streamAi(
        {
          mode,
          locale: lang,
          messages: history,
          context: buildResearchContext(data, question),
          signal: controller.signal,
        },
        {
          onDelta: (text) => {
            assembled += text;
            setThinking(false);
            setMessages((current) => current.map((item) => (
              item.id === assistantId ? { ...item, content: assembled } : item
            )));
          },
          onMeta: (meta) => {
            setMessages((current) => current.map((item) => (
              item.id === assistantId ? { ...item, model: meta.model } : item
            )));
          },
          onThinking: setThinking,
        },
      );
    } catch (error) {
      const wasCancelled = error.name === 'AbortError';
      const message = wasCancelled ? t('ai.stopped') : error.message;
      setStreamError(wasCancelled ? '' : message);
      if (!assembled) {
        setMessages((current) => current.map((item) => (
          item.id === assistantId
            ? { ...item, content: `**${wasCancelled ? t('ai.stopped') : t('ai.error')}:** ${message}` }
            : item
        )));
      }
    } finally {
      abortRef.current = null;
      setThinking(false);
      setStreaming(false);
    }
  }, [data, isStreaming, lang, messages, mode, status, t]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runChecks = useCallback(async () => {
    if (isStreaming) return;
    setMode('check');
    setStreamError('');
    setThinking(true);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const report = await runSystemChecks(controller.signal);
      appendMessage({
        id: messageId(),
        role: 'assistant',
        content: formatCheckReport(report, t),
        createdAt: report.checkedAt,
        mode: 'check',
        model: t('ai.localChecks'),
      });
    } catch (error) {
      if (error.name !== 'AbortError') setStreamError(error.message);
    } finally {
      abortRef.current = null;
      setThinking(false);
      setStreaming(false);
    }
  }, [appendMessage, isStreaming, setMode, t]);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreamError('');
    try {
      globalThis.sessionStorage?.removeItem(MESSAGES_KEY);
    } catch {
      /* storage not available */
    }
  }, []);

  const unavailable = statusError || (status && !status.configured);
  const statusBadge = !status
    ? <Badge variant="neutral" label={t('ai.checkingConnection')} />
    : status.configured
      ? <Badge variant="success" label={t('ai.ready')} />
      : <Badge variant="error" label={t('ai.notConfigured')} />;

  const composerNode = (
    <VStack gap={2}>
      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSubmit={submitPrompt}
        onStop={stopGeneration}
        isStopShown={isStreaming}
        isDisabled={!status?.configured}
        placeholder={t(`ai.placeholder.${mode}`)}
        status={streamError ? { type: 'error', message: streamError } : undefined}
      />
      <Text type="supporting" color="secondary">
        {t('ai.privacyNote')}
      </Text>
    </VStack>
  );

  return (
    <Page fill>
      <PageHeader
        title={t('nav.ai')}
        description={t('page.ai.desc')}
        badge={messages.length ? (
          <Badge variant="neutral" label={String(messages.length)} />
        ) : null}
        actions={
          <>
            <Button
              label={t('ai.runChecks')}
              variant="secondary"
              onClick={runChecks}
              isDisabled={isStreaming}
            />
            <Button
              label={t('ai.clear')}
              variant="ghost"
              onClick={clearConversation}
              isDisabled={messages.length === 0}
            />
          </>
        }
      />

      {unavailable ? (
        <Banner
          status="error"
          title={t('ai.unavailable')}
          description={statusError || t('ai.missingKey')}
        />
      ) : null}

      <Card padding={4}>
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
            <SegmentedControl
              label={t('ai.mode')}
              value={mode}
              onChange={setMode}
              size="sm">
              {MODES.map((item) => (
                <SegmentedControlItem
                  key={item}
                  value={item}
                  label={t(`ai.mode.${item}`)}
                />
              ))}
            </SegmentedControl>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                {statusBadge}
                <Text type="supporting" color="secondary">
                  {status?.model || t('ai.checkingConnection')}
                </Text>
              </HStack>
              <Text type="supporting" color="secondary">
                {totalRecords} {t('label.records')} · {t('ai.serverSide')}
              </Text>
            </VStack>
          </HStack>
          <Text type="supporting" color="secondary">
            {t(`ai.mode.${mode}.desc`)}
          </Text>
        </VStack>
      </Card>

      {messages.length === 0 ? (
        <VStack gap={4}>
          <SectionHeading
            title={t('ai.startTitle')}
            description={t('ai.startDescription')}
          />
          <Grid columns={{ minWidth: 240, repeat: 'fit' }} gap={3} width="100%">
            {(QUICK_PROMPTS[mode] || QUICK_PROMPTS.chat).map((key) => (
              <Button
                key={key}
                label={t(key)}
                variant="secondary"
                onClick={() => submitPrompt(t(key))}
                isDisabled={!status?.configured || isStreaming}
              />
            ))}
          </Grid>
          {composerNode}
        </VStack>
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
          <ChatLayout density="balanced" composer={composerNode}>
            <ChatMessageList align="top" isStreaming={isStreaming} density="balanced">
              {messages.map((message) => (
                <ChatMessage key={message.id} sender={message.role}>
                  <ChatMessageBubble
                    name={message.role === 'user' ? t('ai.you') : t('ai.assistant')}
                    metadata={
                      <Text type="supporting" color="secondary">
                        {formatTime(message.createdAt, lang)} · {t(`ai.mode.${message.mode}`)}
                        {message.model ? ` · ${message.model}` : ''}
                      </Text>
                    }>
                    {message.content ? (
                      <Markdown
                        density="compact"
                        headingLevelStart={3}
                        isStreaming={isStreaming && message.id === messages.at(-1)?.id}>
                        {message.content}
                      </Markdown>
                    ) : (
                      <Text type="supporting" color="secondary">
                        {isThinking ? t('ai.thinking') : t('ai.waiting')}
                      </Text>
                    )}
                  </ChatMessageBubble>
                </ChatMessage>
              ))}
            </ChatMessageList>
          </ChatLayout>
        </div>
      )}
    </Page>
  );
}
