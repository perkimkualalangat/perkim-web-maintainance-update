import { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, PageHeader, VStack } from '@astryxdesign/core';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { ButtonGroup, Button, Tooltip, IconButton, Spinner, Badge } from '@astryxdesign/core';
import { RefreshIcon, ServerIcon, BugAntIcon } from '@heroicons/react/24/outline';
import { useAppSettings } from '@/context/AppSettings.jsx';
import { useData } from '@/context/DataContext.jsx';
import { apiFetch, getAiStatus, runSystemChecks, streamAi } from '@/lib/ai.js';
import { useDevApi } from './hooks/useDevApi.js';
import { useTerminal } from './hooks/useTerminal.js';
import { useAiTester } from './hooks/useAiTester.js';
import { OverviewTab } from './tabs/OverviewTab.jsx';
import { AiChecksTab } from './tabs/AiChecksTab.jsx';
import { ApiTesterTab } from './tabs/ApiTesterTab.jsx';
import { DataExplorerTab } from './tabs/DataExplorerTab.jsx';
import { ConfigTab } from './tabs/ConfigTab.jsx';
import { TerminalTab } from './tabs/TerminalTab.jsx';
import { BuildTestTab } from './tabs/BuildTestTab.jsx';
import { DEV_TABS } from './types.js';

// Feature flag check
const isDevPageEnabled = () => import.meta.env.VITE_ENABLE_DEV_PAGE === 'true';

export default function DevPage() {
  // Feature flag guard
  if (!isDevPageEnabled()) {
    return (
      <Page>
        <PageHeader title="Halaman Dev" description="Fitur ini dinonaktifkan. Set ENABLE_DEV_PAGE=true di .env.local untuk mengaktifkan." />
      </Page>
    );
  }

  const { t, lang } = useAppSettings();
  const { data, loading: dataLoading, refresh: refreshData } = useData();

  // Composed hooks
  const devApi = useDevApi();
  const terminal = useTerminal();
  const aiTester = useAiTester();

  // Sync AI status/checks from devApi to local state for backwards compat
  const [aiStatus, setAiStatus] = useState(devApi.aiStatus);
  const [aiChecks, setAiChecks] = useState(devApi.aiChecks);
  const [runningChecks, setRunningChecks] = useState(devApi.runningChecks);

  // Keep in sync
  useEffect(() => setAiStatus(devApi.aiStatus), [devApi.aiStatus]);
  useEffect(() => setAiChecks(devApi.aiChecks), [devApi.aiChecks]);
  useEffect(() => setRunningChecks(devApi.runningChecks), [devApi.runningChecks]);

  // Load on mount
  useEffect(() => {
    devApi.loadEnvConfig();
    devApi.loadAiStatus();
  }, [devApi.loadEnvConfig, devApi.loadAiStatus]);

  // Handle run checks with sync
  const handleRunChecks = useCallback(async () => {
    await devApi.runChecks();
    setRunningChecks(true);
    // The hook updates runningChecks internally, but we also sync
  }, [devApi.runChecks]);

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Tab panels mapping
  const renderTabPanel = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab 
            aiStatus={aiStatus} 
            loadAiStatus={devApi.loadAiStatus} 
            refreshData={refreshData} 
          />
        );
      case 'ai':
        return (
          <AiChecksTab 
            aiChecks={aiChecks} 
            runningChecks={runningChecks} 
            runChecks={handleRunChecks}
            testChat={aiTester.testChat}
            handleTestChat={() => aiTester.handleTestChat(streamAi, lang)}
            clearResponse={aiTester.clearResponse}
            setMessages={aiTester.setMessages}
            setMode={aiTester.setMode}
          />
        );
      case 'api':
        return (
          <ApiTesterTab 
            apiTest={devApi.apiTest} 
            testApi={devApi.testApi} 
            setApiTest={devApi.setApiTest} 
          />
        );
      case 'data':
        return (
          <DataExplorerTab 
            data={data} 
            dataLoading={dataLoading} 
          />
        );
      case 'config':
        return (
          <ConfigTab 
            envConfig={devApi.envConfig} 
            showSecrets={false} // Could add local state if needed
            setShowSecrets={() => {}} 
          />
        );
      case 'terminal':
        return (
          <TerminalTab 
            buildLog={terminal.buildLog} 
            testLog={terminal.testLog} 
            doctorLog={terminal.doctorLog} 
            runningCmd={terminal.runningCmd} 
            activeLogTab={terminal.activeLogTab} 
            setActiveLogTab={terminal.setActiveLogTab}
            runBuild={terminal.runBuild} 
            runTest={terminal.runTest} 
            runDoctor={terminal.runDoctor} 
            runGitStatus={terminal.runGitStatus} 
            runCustom={terminal.runCustom}
            customCmd={terminal.customCmd} 
            setCustomCmd={terminal.setCustomCmd} 
            clearLog={terminal.clearLog}
          />
        );
      case 'build':
        return (
          <BuildTestTab 
            buildLog={terminal.buildLog} 
            testLog={terminal.testLog} 
            doctorLog={terminal.doctorLog} 
            runningCmd={terminal.runningCmd}
            runBuild={terminal.runBuild} 
            runTest={terminal.runTest} 
            runDoctor={terminal.runDoctor}
          />
        );
      default:
        return <div>Tab tidak diketahui</div>;
    }
  }, [activeTab, aiStatus, aiChecks, runningChecks, data, dataLoading, devApi, terminal, aiTester, lang, refreshData, handleRunChecks]);

  return (
    <Page>
      <PageHeader
        title={t('nav.dev') || 'Pembangunan'}
        description="Monitor sistem, uji API, jalankan perintah, dan kelola konfigurasi"
        actions={
          <ButtonGroup>
            <Tooltip label="Refresh data">
              <IconButton onClick={refreshData} variant="ghost" aria-label="Refresh">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip label="Reload AI status">
              <IconButton onClick={devApi.loadAiStatus} variant="ghost" aria-label="AI Status">
                <ServerIcon />
              </IconButton>
            </Tooltip>
            <Button 
              variant="outline" 
              onClick={handleRunChecks} 
              disabled={runningChecks} 
              startIcon={runningChecks ? <Spinner size="sm" /> : <BugAntIcon />}
            >
              {runningChecks ? 'Menjalankan...' : 'Jalankan Semua Cek'}
            </Button>
          </ButtonGroup>
        }
      />

      <VStack gap={5}>
        <TabList value={activeTab} onChange={setActiveTab}>
          <TabList.TabList>
            {DEV_TABS.map(tab => (
              <Tab key={tab.id} value={tab.id}>{tab.label}</Tab>
            ))}
          </TabList.TabList>
        </TabList>

        {renderTabPanel()}
      </VStack>
    </Page>
  );
}