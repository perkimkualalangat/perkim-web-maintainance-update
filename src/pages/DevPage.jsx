import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Selector } from '@astryxdesign/core/Selector';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Text, Heading } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Section } from '@astryxdesign/core/Section';
import { Link } from '@astryxdesign/core/Link';
import {
  ArrowPathIcon,
  BugAntIcon,
  ServerIcon,
  CpuChipIcon,
  ComputerDesktopIcon,
  CodeBracketIcon,
  ArrowDownTrayIcon,
  WrenchScrewdriverIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon as RefreshIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAppSettings } from '@/context/AppSettings.jsx';
import { useData } from '@/context/DataContext.jsx';
import { apiFetch, getAiStatus, runSystemChecks, streamAi } from '@/lib/ai.js';
import { Page, PageHeader, SectionHeading } from '@/components/Page.jsx';

export default function DevPage() {
  const { t, lang, setLang, mode, setMode } = useAppSettings();
  const { data, loading: dataLoading, refresh: refreshData } = useData();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [aiStatus, setAiStatus] = useState(null);
  const [aiChecks, setAiChecks] = useState([]);
  const [runningChecks, setRunningChecks] = useState(false);
  const [testChat, setTestChat] = useState({ mode: 'chat', messages: [], streaming: false, response: '' });
  const [apiTest, setApiTest] = useState({ endpoint: '/api/ai/status', method: 'GET', body: '', response: null, loading: false });
  const [buildLog, setBuildLog] = useState('');
  const [testLog, setTestLog] = useState('');
  const [doctorLog, setDoctorLog] = useState('');
  const [runningCmd, setRunningCmd] = useState(null);
  const [envConfig, setEnvConfig] = useState({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [customCmd, setCustomCmd] = useState('');
  const [logTab, setLogTab] = useState('build');

  // Fetch AI status on mount
  useEffect(() => {
    loadAiStatus();
    loadEnvConfig();
  }, []);

  const loadAiStatus = useCallback(async () => {
    try {
      const status = await getAiStatus();
      setAiStatus(status);
    } catch (e) {
      console.error('AI status failed:', e);
    }
  }, []);

  const loadEnvConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dev/env');
      if (res.ok) {
        const cfg = await res.json();
        setEnvConfig(cfg);
      }
    } catch (e) {
      console.error('Env config failed:', e);
    }
  }, []);

  const handleRunChecks = async () => {
    setRunningChecks(true);
    try {
      const checks = await runSystemChecks();
      setAiChecks(checks.results || []);
    } catch (e) {
      console.error('Checks failed:', e);
    } finally {
      setRunningChecks(false);
    }
  };

  const handleTestChat = async () => {
    if (testChat.streaming || !testChat.messages.length) return;
    setTestChat(prev => ({ ...prev, streaming: true, response: '' }));
    try {
      let fullResponse = '';
      for await (const event of streamAi({
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
  };

  const handleApiTest = async () => {
    setApiTest(prev => ({ ...prev, loading: true, response: null }));
    try {
      const options = { method: apiTest.method };
      if (apiTest.body && ['POST', 'PUT', 'PATCH'].includes(apiTest.method)) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = apiTest.body;
      }
      const res = await fetch(apiTest.endpoint, options);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      setApiTest(prev => ({ ...prev, loading: false, response: { status: res.status, ok: res.ok, data } }));
    } catch (e) {
      setApiTest(prev => ({ ...prev, loading: false, response: { error: e.message } }));
    }
  };

  const runCommand = async (cmd, setLogFn) => {
    setRunningCmd(cmd);
    setLogFn(`$ ${cmd}\n`);
    try {
      const res = await apiFetch('/api/dev/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, cwd: process.cwd?.() || '.' }),
      });
      if (res.ok) {
        const result = await res.json();
        setLogFn(prev => prev + result.stdout + (result.stderr ? `\n[stderr]\n${result.stderr}` : '') + `\n[exit: ${result.code}]\n`);
      } else {
        const err = await res.text();
        setLogFn(prev => prev + `\n❌ HTTP ${res.status}: ${err}\n`);
      }
    } catch (e) {
      setLogFn(prev => prev + `\n❌ ${e.message}\n`);
    } finally {
      setRunningCmd(null);
    }
  };

  const maskValue = (v) => showSecrets ? v : '*'.repeat(Math.min(v?.length || 0, 8));

  const dataStats = data ? {
    systems: data.systems?.length || 0,
    components: data.components?.length || 0,
    weaknesses: data.weaknesses?.length || 0,
    fallbacks: data.fallbacks?.length || 0,
    costs: data.costs?.length || 0,
    actors: data.actors?.length || 0,
    evidence: data.evidence?.length || 0,
    principles: data.principles?.length || 0,
    cases: data.cases?.length || 0,
    topics: data.topics?.length || 0,
  } : {};

  const entityTypes = Object.keys(dataStats);

  const renderTabPanel = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <HStack gap="lg" wrap>
              <Card flex="1" minWidth="280px">
                <Card.Header title="Status Aplikasi" subtitle="Server & Build" />
                <Card.Body>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Server</TableCell>
                        <TableCell align="right"><Badge variant="success">Berjalan (5174)</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Vite Dev</TableCell>
                        <TableCell align="right"><Badge variant={dataLoading ? 'warning' : 'neutral'}>
                          {dataLoading ? 'Memuat...' : 'Siap'}
                        </Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Data Entiti</TableCell>
                        <TableCell align="right"><Badge variant="neutral">{Object.values(dataStats).reduce((a,b)=>a+b,0)} rekod</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bahasa</TableCell>
                        <TableCell align="right"><Badge variant="neutral">{lang.toUpperCase()}</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mode UI</TableCell>
                        <TableCell align="right"><Badge variant="neutral">{mode}</Badge></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card.Body>
              </Card>

              <Card flex="1" minWidth="280px">
                <Card.Header title="AI Status" subtitle="Nemotron 3 Ultra" />
                <Card.Body>
                  {aiStatus ? (
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Terkonfigurasi</TableCell>
                          <TableCell align="right"><Badge variant={aiStatus.configured ? 'success' : 'danger'}>
                            {aiStatus.configured ? 'Ya' : 'Tidak'}
                          </Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Model</TableCell>
                          <TableCell align="right"><CodeBlock inline>{aiStatus.model}</CodeBlock></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Max Context</TableCell>
                          <TableCell align="right">{aiStatus.maxContextChars?.toLocaleString()} chars</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Allowed Origins</TableCell>
                          <TableCell align="right">
                            <CodeBlock inline>{(aiStatus.allowedOrigins || []).join(', ')}</CodeBlock>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <Text color="muted">Memuat status AI...</Text>
                  )}
                </Card.Body>
              </Card>

              <Card flex="1" minWidth="280px">
                <Card.Header title="Pintas Cepat" subtitle="Tindakan biasa" />
                <Card.Body>
                  <HStack gap="sm" wrap>
                    <Button variant="outline" startIcon={<RefreshIcon />} onClick={() => refreshData()}>Reload Data</Button>
                    <Button variant="outline" startIcon={<ArrowPathIcon />} onClick={loadAiStatus}>Reload AI</Button>
                    <Button variant="outline" startIcon={<WrenchScrewdriverIcon />} onClick={() => window.open('/settings', '_blank')}>Tetapan</Button>
                    <Button variant="outline" startIcon={<ComputerDesktopIcon />} onClick={() => setActiveTab('terminal')}>Terminal</Button>
                  </HStack>
                </Card.Body>
              </Card>
            </HStack>

            <Divider my="lg" />

            <SectionHeading title="Jurang Data (Gaps)" description="Entiti tanpa hubungan silang" />
            <Card>
              <Card.Body>
                {data ? (
                  <HStack gap="md" wrap>
                    {entityTypes.map(type => (
                      <Badge key={type} variant="neutral" pill>
                        {type}: {dataStats[type]}
                      </Badge>
                    ))}
                  </HStack>
                ) : (
                  <Text color="muted">Memuat data...</Text>
                )}
              </Card.Body>
            </Card>
          </>
        );

      case 'ai':
        return (
          <HStack gap="lg" wrap>
            <Card flex="1" minWidth="400px">
              <Card.Header title="Cek Sistem AI" subtitle="6 cek deterministik" />
              <Card.Body>
                {aiChecks.length === 0 ? (
                  <Button startIcon={<BugAntIcon />} onClick={handleRunChecks} disabled={runningChecks}>
                    {runningChecks ? 'Menjalankan...' : 'Jalankan Cek'}
                  </Button>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell>Cek</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Butiran</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiChecks.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell><CodeBlock inline>{c.label || c.id}</CodeBlock></TableCell>
                          <TableCell>
                            <Badge variant={c.ok ? 'success' : 'danger'}>
                              {c.ok ? 'Lulus' : 'Gagal'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.output && <Text size="sm" color="muted">{c.output}</Text>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            <Card flex="1" minWidth="400px">
              <Card.Header title="Uji Chat AI" subtitle="SSE Streaming" />
              <Card.Body>
                <VStack gap="sm">
                  <Selector
                    label="Mode"
                    value={testChat.mode}
                    onChange={e => setTestChat(prev => ({ ...prev, mode: e.target.value }))}
                    options={[
                      { value: 'umum', label: 'Umum' },
                      { value: 'chat', label: 'Chat' },
                      { value: 'kod', label: 'Kod' },
                      { value: 'pelan', label: 'Pelan' },
                      { value: 'semak', label: 'Semak' },
                    ]}
                  />
                  <TextArea
                    label="Mesej (JSON array)"
                    value={JSON.stringify(testChat.messages, null, 2)}
                    onChange={e => {
                      try {
                        setTestChat(prev => ({ ...prev, messages: JSON.parse(e.target.value) }));
                      } catch { /* ignore invalid JSON */ }
                    }}
                    rows={4}
                    placeholder='[{"role": "user", "content": "Hello"}]'
                  />
                  <ButtonGroup>
                    <Button
                      variant="primary"
                      startIcon={testChat.streaming ? <Spinner size="sm" /> : <ArrowPathIcon />}
                      onClick={handleTestChat}
                      disabled={testChat.streaming || !testChat.messages.length}
                    >
                      {testChat.streaming ? 'Streaming...' : 'Hantar'}
                    </Button>
                    <Button variant="ghost" onClick={() => setTestChat(prev => ({ ...prev, response: '' }))}>
                      Bersihkan
                    </Button>
                  </ButtonGroup>
                  {testChat.response && (
                    <Card variant="outlined" padding="md">
                      <Text size="sm" fontFamily="mono" whiteSpace="pre-wrap">{testChat.response}</Text>
                      <Button variant="ghost" size="sm" mt="sm" onClick={() => navigator.clipboard.writeText(testChat.response)}>
                        <ClipboardDocumentIcon /> Salin
                      </Button>
                    </Card>
                  )}
                </VStack>
              </Card.Body>
            </Card>
          </HStack>
        );

      case 'api':
        return (
          <>
            <Card>
              <Card.Header title="Uji Endpoint API" subtitle="GET/POST ke mana-mana endpoint" />
              <Card.Body>
                <HStack gap="md" wrap>
                  <Selector
                    label="Method"
                    value={apiTest.method}
                    onChange={e => setApiTest(prev => ({ ...prev, method: e.target.value }))}
                    options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m }))}
                    width="140px"
                  />
                  <TextInput
                    label="Endpoint"
                    value={apiTest.endpoint}
                    onChange={e => setApiTest(prev => ({ ...prev, endpoint: e.target.value }))}
                    placeholder="/api/ai/status"
                    flex="1"
                    minWidth="300px"
                  />
                  <Button variant="primary" onClick={handleApiTest} disabled={apiTest.loading} startIcon={apiTest.loading ? <Spinner size="sm" /> : <MagnifyingGlassIcon />}>
                    {apiTest.loading ? 'Menghantar...' : 'Hantar'}
                  </Button>
                </HStack>

                {apiTest.body !== undefined && ['POST', 'PUT', 'PATCH'].includes(apiTest.method) && (
                  <TextArea
                    label="Body (JSON)"
                    value={apiTest.body}
                    onChange={e => setApiTest(prev => ({ ...prev, body: e.target.value }))}
                    rows={6}
                    placeholder='{"mode": "chat", "messages": [{"role": "user", "content": "test"}]}'
                    mt="md"
                    fontFamily="mono"
                  />
                )}

                {apiTest.response && (
                  <>
                    <Divider my="md" />
                    <Card variant="outlined" padding="md" mt="md">
                      <HStack gap="sm" wrap>
                        <Badge variant={apiTest.response.ok ? 'success' : apiTest.response.error ? 'danger' : 'warning'}>
                          {apiTest.response.error ? 'Ralat' : apiTest.response.ok ? 'OK' : `HTTP ${apiTest.response.status}`}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(apiTest.response.data, null, 2))}>
                          <ClipboardDocumentIcon /> Salin Response
                        </Button>
                      </HStack>
                      <CodeBlock language="json" mt="sm">{JSON.stringify(apiTest.response.data, null, 2)}</CodeBlock>
                    </Card>
                  </>
                )}
              </Card.Body>
            </Card>

            <Divider my="lg" />

            <SectionHeading title="Endpoint Tersedia" description="Senarai endpoint API sistem" />
            <Card>
              <Card.Body>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Method</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell>Keterangan</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell><Badge variant="neutral">GET</Badge></TableCell><TableCell><CodeBlock inline>/api/ai/status</CodeBlock></TableCell><TableCell>Status konfigurasi AI</TableCell></TableRow>
                    <TableRow><TableCell><Badge variant="neutral">GET</Badge></TableCell><TableCell><CodeBlock inline>/api/ai/check</CodeBlock></TableCell><TableCell>Jalankan 6 cek sistem</TableCell></TableRow>
                    <TableRow><TableCell><Badge variant="success">POST</Badge></TableCell><TableCell><CodeBlock inline>/api/ai/chat</CodeBlock></TableCell><TableCell>SSE chat streaming</TableCell></TableRow>
                    <TableRow><TableCell><Badge variant="neutral">GET</Badge></TableCell><TableCell><CodeBlock inline>/api/dev/env</CodeBlock></TableCell><TableCell>Konfigurasi env (masked)</TableCell></TableRow>
                    <TableRow><TableCell><Badge variant="success">POST</Badge></TableCell><TableCell><CodeBlock inline>/api/dev/exec</CodeBlock></TableCell><TableCell>Jalankan perintah shell</TableCell></TableRow>
                    <TableRow><TableCell><Badge variant="neutral">GET</Badge></TableCell><TableCell><CodeBlock inline>/health</CodeBlock></TableCell><TableCell>Health check server</TableCell></TableRow>
                  </TableBody>
                </Table>
              </Card.Body>
            </Card>
          </>
        );

      case 'data':
        return (
          <>
            <Card>
              <Card.Header title="Data Entiti" subtitle={dataLoading ? 'Memuat...' : `${Object.values(dataStats).reduce((a,b)=>a+b,0)} rekod`} />
              <Card.Body>
                {dataLoading ? (
                  <Spinner />
                ) : (
                  <HStack gap="md" wrap>
                    {entityTypes.map(type => (
                      <Card key={type} variant="outlined" padding="md" minWidth="200px" flex="1">
                        <Heading level={4} size="sm">{t(`entities.${type}`) || type}</Heading>
                        <Text size="xl" weight="bold" color="primary">{dataStats[type]}</Text>
                        <Button variant="ghost" size="sm" mt="sm" onClick={() => window.open(`#/${type}`, '_blank')}>
                          <EyeIcon /> Lihat
                        </Button>
                      </Card>
                    ))}
                  </HStack>
                )}
              </Card.Body>
            </Card>

            {data && (
              <>
                <Divider my="lg" />
                <SectionHeading title="Contoh Data (5 pertama)" description="Klik untuk lihat penuh" />
                <Card>
                  <Card.Body>
                    {entityTypes.map(type => (
                      <VStack key={type} gap="sm" mb="lg">
                        <Heading level={4} size="sm">{type}</Heading>
                        <CodeBlock language="json">
                          {JSON.stringify((data[type] || []).slice(0, 5), null, 2)}
                        </CodeBlock>
                      </VStack>
                    ))}
                  </Card.Body>
                </Card>
              </>
            )}
          </>
        );

      case 'config':
        return (
          <>
            <Card>
              <Card.Header
                title="Konfigurasi Environment"
                subtitle="Nilai sensitif dimaskkan. Klik mata untuk tunjuk."
                actions={
                  <Button variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)} startIcon={showSecrets ? <EyeSlashIcon /> : <EyeIcon />}>
                    {showSecrets ? 'Sembunyikan' : 'Tunjukkan'}
                  </Button>
                }
              />
              <Card.Body>
                {Object.keys(envConfig).length === 0 ? (
                  <Text color="muted">Tiada konfigurasi atau endpoint tidak tersedia.</Text>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Type</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(envConfig).map(([key, val]) => (
                        <TableRow key={key}>
                          <TableCell><CodeBlock inline>{key}</CodeBlock></TableCell>
                          <TableCell>
                            <CodeBlock inline>{maskValue(String(val))}</CodeBlock>
                          </TableCell>
                          <TableCell>
                            <Badge variant="neutral">
                              {typeof val === 'string' && val.startsWith('nvapi-') ? 'NVIDIA Key' :
                               typeof val === 'string' && val.startsWith('ghp_') ? 'GitHub PAT' :
                               typeof val === 'string' && val.includes('@') ? 'Email' : typeof val}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            <Divider my="lg" />

            <Card>
              <Card.Header title="Package.json Scripts" subtitle="Perintah npm tersedia" />
              <Card.Body>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Script</TableCell>
                      <TableCell>Perintah</TableCell>
                      <TableCell>Keterangan</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell><CodeBlock inline>start</CodeBlock></TableCell><TableCell><CodeBlock inline>node server/server.mjs</CodeBlock></TableCell><TableCell>Production server (build + serve)</TableCell></TableRow>
                    <TableRow><TableCell><CodeBlock inline>dev</CodeBlock></TableCell><TableCell><CodeBlock inline>vite</CodeBlock></TableCell><TableCell>Vite dev server (HMR)</TableCell></TableRow>
                    <TableRow><TableCell><CodeBlock inline>dev:all</CodeBlock></TableCell><TableCell><CodeBlock inline>concurrently "npm run server" "npm run dev"</CodeBlock></TableCell><TableCell>Server + Vite serentak</TableCell></TableRow>
                    <TableRow><TableCell><CodeBlock inline>build</CodeBlock></TableCell><TableCell><CodeBlock inline>vite build</CodeBlock></TableCell><TableCell>Build production ke dist/</TableCell></TableRow>
                    <TableRow><TableCell><CodeBlock inline>test</CodeBlock></TableCell><TableCell><CodeBlock inline>node tests/at2.mjs</CodeBlock></TableCell><TableCell>Jalankan ujian integrasi</TableCell></TableRow>
                    <TableRow><TableCell><CodeBlock inline>doctor</CodeBlock></TableCell><TableCell><CodeBlock inline>astryx doctor --built dist</CodeBlock></TableCell><TableCell>Audit build Astryx</TableCell></TableRow>
                  </TableBody>
                </Table>
              </Card.Body>
            </Card>
          </>
        );

      case 'terminal':
        return (
          <>
            <Card>
              <Card.Header title="Terminal Shell" subtitle="Jalankan perintah di server (cwd: root projek)" />
              <Card.Body>
                <HStack gap="sm" wrap mb="md">
                  <Button variant="primary" startIcon={<ComputerDesktopIcon />} onClick={() => runCommand('npm run build', setBuildLog)} disabled={runningCmd === 'npm run build'}>
                    {runningCmd === 'npm run build' ? <Spinner size="sm" /> : 'npm run build'}
                  </Button>
                  <Button variant="outline" startIcon={<RefreshIcon />} onClick={() => runCommand('npm run test', setTestLog)} disabled={runningCmd === 'npm run test'}>
                    {runningCmd === 'npm run test' ? <Spinner size="sm" /> : 'npm run test'}
                  </Button>
                  <Button variant="outline" startIcon={<BugAntIcon />} onClick={() => runCommand('npm run doctor', setDoctorLog)} disabled={runningCmd === 'npm run doctor'}>
                    {runningCmd === 'npm run doctor' ? <Spinner size="sm" /> : 'npm run doctor'}
                  </Button>
                  <Button variant="outline" startIcon={<CodeBracketIcon />} onClick={() => runCommand('git status', setBuildLog)} disabled={runningCmd}>
                    {runningCmd === 'git status' ? <Spinner size="sm" /> : 'git status'}
                  </Button>
                  <Button variant="ghost" onClick={() => setBuildLog('')}>Bersihkan Log</Button>
                </HStack>

                <TabList value={logTab} onChange={setLogTab}>
                  <TabList.TabList>
                    <Tab value="build">Build</Tab>
                    <Tab value="test">Test</Tab>
                    <Tab value="doctor">Doctor</Tab>
                  </TabList.TabList>

                  {logTab === 'build' && <CodeBlock language="bash" maxHeight="400px" overflow="auto">{buildLog || 'Belum dijalankan'}</CodeBlock>}
                  {logTab === 'test' && <CodeBlock language="bash" maxHeight="400px" overflow="auto">{testLog || 'Belum dijalankan'}</CodeBlock>}
                  {logTab === 'doctor' && <CodeBlock language="bash" maxHeight="400px" overflow="auto">{doctorLog || 'Belum dijalankan'}</CodeBlock>}
                </TabList>
              </Card.Body>
            </Card>

            <Divider my="lg" />

            <Card>
              <Card.Header title="Perintah Kustom" subtitle="Jalankan mana-mana perintah shell" />
              <Card.Body>
                <HStack gap="sm" wrap>
                  <TextInput
                    label="Perintah"
                    placeholder="ls -la, node --version, npm outdated, dll."
                    value={customCmd}
                    onChange={e => setCustomCmd(e.target.value)}
                    flex="1"
                    minWidth="300px"
                  />
                  <Button variant="primary" onClick={() => runCommand(customCmd, setBuildLog)} disabled={!customCmd.trim() || runningCmd}>
                    {runningCmd ? 'Menjalankan...' : 'Jalankan'}
                  </Button>
                </HStack>
                <Text size="sm" color="muted" mt="sm">Output akan muncul di tab Build di atas.</Text>
              </Card.Body>
            </Card>
          </>
        );

      case 'build':
        return (
          <HStack gap="lg" wrap>
            <Card flex="1" minWidth="300px">
              <Card.Header title="Build Production" subtitle="vite build → dist/" />
              <Card.Body>
                <VStack gap="sm">
                  <Button variant="primary" startIcon={<WrenchScrewdriverIcon />} onClick={() => runCommand('npm run build', setBuildLog)} disabled={runningCmd === 'npm run build'}>
                    {runningCmd === 'npm run build' ? <Spinner size="sm" /> : 'Build Sekarang'}
                  </Button>
                  <Button variant="outline" onClick={() => runCommand('npm run preview', setBuildLog)} disabled={runningCmd}>
                    Preview (vite preview)
                  </Button>
                </VStack>
                <Divider my="md" />
                <CodeBlock language="bash" maxHeight="300px" overflow="auto">{buildLog || 'Belum dijalankan'}</CodeBlock>
              </Card.Body>
            </Card>

            <Card flex="1" minWidth="300px">
              <Card.Header title="Ujian Integrasi" subtitle="tests/at2.mjs" />
              <Card.Body>
                <Button variant="primary" startIcon={<BugAntIcon />} onClick={() => runCommand('npm run test', setTestLog)} disabled={runningCmd === 'npm run test'}>
                  {runningCmd === 'npm run test' ? <Spinner size="sm" /> : 'Jalankan Ujian'}
                </Button>
                <Divider my="md" />
                <CodeBlock language="bash" maxHeight="300px" overflow="auto">{testLog || 'Belum dijalankan'}</CodeBlock>
              </Card.Body>
            </Card>

            <Card flex="1" minWidth="300px">
              <Card.Header title="Audit Astryx" subtitle="astryx doctor --built dist" />
              <Card.Body>
                <Button variant="primary" startIcon={<CodeBracketIcon />} onClick={() => runCommand('npm run doctor', setDoctorLog)} disabled={runningCmd === 'npm run doctor'}>
                  {runningCmd === 'npm run doctor' ? <Spinner size="sm" /> : 'Jalankan Doctor'}
                </Button>
                <Divider my="md" />
                <CodeBlock language="bash" maxHeight="300px" overflow="auto">{doctorLog || 'Belum dijalankan'}</CodeBlock>
              </Card.Body>
            </Card>
          </HStack>
        );

      default:
        return <Text color="muted">Tab tidak diketahui</Text>;
    }
  };

  return (
    <Page>
      <PageHeader
        title={t('nav.dev')}
        description="Monitor sistem, uji API, jalankan perintah, dan kelola konfigurasi"
        actions={
          <ButtonGroup>
            <Tooltip label="Refresh data">
              <IconButton onClick={() => refreshData()} variant="ghost" aria-label="Refresh">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip label="Reload AI status">
              <IconButton onClick={loadAiStatus} variant="ghost" aria-label="AI Status">
                <ServerIcon />
              </IconButton>
            </Tooltip>
            <Button variant="outline" onClick={handleRunChecks} disabled={runningChecks} startIcon={runningChecks ? <Spinner size="sm" /> : <BugAntIcon />}>
              {runningChecks ? 'Menjalankan...' : 'Jalankan Semua Cek'}
            </Button>
          </ButtonGroup>
        }
      />

      <VStack gap={5}>
        <TabList value={activeTab} onChange={setActiveTab}>
          <TabList.TabList>
            <Tab value="overview">Ringkasan</Tab>
            <Tab value="ai">AI & Cek</Tab>
            <Tab value="api">Uji API</Tab>
            <Tab value="data">Data Entiti</Tab>
            <Tab value="config">Konfigurasi</Tab>
            <Tab value="terminal">Terminal</Tab>
            <Tab value="build">Build & Test</Tab>
          </TabList.TabList>
        </TabList>

        {renderTabPanel()}
      </VStack>
    </Page>
  );
}