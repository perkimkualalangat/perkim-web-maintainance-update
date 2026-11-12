import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { ComputerDesktopIcon, RefreshIcon, BugAntIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { CommandInput } from '../components/CommandInput.jsx';
import { LogPanel } from '../components/LogPanel.jsx';

export function TerminalTab({ 
  buildLog, testLog, doctorLog, 
  runningCmd, activeLogTab, setActiveLogTab,
  runBuild, runTest, runDoctor, runGitStatus, runCustom,
  customCmd, setCustomCmd, clearLog
}) {
  return (
    <>
      <Card>
        <Card.Header title="Terminal Shell" subtitle="Jalankan perintah di server (cwd: root projek)" />
        <Card.Body>
          <HStack gap="sm" wrap mb="md">
            <Button variant="primary" startIcon={<ComputerDesktopIcon />} onClick={runBuild} disabled={runningCmd === 'npm run build'}>
              {runningCmd === 'npm run build' ? <Spinner size="sm" /> : 'npm run build'}
            </Button>
            <Button variant="outline" startIcon={<RefreshIcon />} onClick={runTest} disabled={runningCmd === 'npm run test'}>
              {runningCmd === 'npm run test' ? <Spinner size="sm" /> : 'npm run test'}
            </Button>
            <Button variant="outline" startIcon={<BugAntIcon />} onClick={runDoctor} disabled={runningCmd === 'npm run doctor'}>
              {runningCmd === 'npm run doctor' ? <Spinner size="sm" /> : 'npm run doctor'}
            </Button>
            <Button variant="outline" startIcon={<CodeBracketIcon />} onClick={runGitStatus} disabled={runningCmd}>
              {runningCmd === 'git status' ? <Spinner size="sm" /> : 'git status'}
            </Button>
            <Button variant="ghost" onClick={() => clearLog('build')}>Bersihkan Log</Button>
          </HStack>

          <TabList value={activeLogTab} onChange={setActiveLogTab}>
            <TabList.TabList>
              <Tab value="build">Build</Tab>
              <Tab value="test">Test</Tab>
              <Tab value="doctor">Doctor</Tab>
            </TabList.TabList>

            {activeLogTab === 'build' && <LogPanel content={buildLog} />}
            {activeLogTab === 'test' && <LogPanel content={testLog} />}
            {activeLogTab === 'doctor' && <LogPanel content={doctorLog} />}
          </TabList>
        </Card.Body>
      </Card>

      <Divider my="lg" />

      <Card>
        <Card.Header title="Perintah Kustom" subtitle="Jalankan mana-mana perintah shell (allow-list dibatasi)" />
        <Card.Body>
          <CommandInput
            value={customCmd}
            onChange={setCustomCmd}
            onRun={runCustom}
            disabled={runningCmd}
          />
          <Text size="sm" color="muted" mt="sm">
            Perintah dibenarkan: npm run build/test/doctor/lint, git status, node --version, npm --version
          </Text>
          <Text size="sm" color="muted" mt="sm">
            Output akan muncul di tab Build di atas.
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}