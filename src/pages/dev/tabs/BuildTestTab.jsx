import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { WrenchScrewdriverIcon, BugAntIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { LogPanel } from '../components/LogPanel.jsx';

export function BuildTestTab({ 
  buildLog, testLog, doctorLog, 
  runningCmd,
  runBuild, runTest, runDoctor
}) {
  return (
    <HStack gap="lg" wrap>
      <Card flex="1" minWidth="300px">
        <Card.Header title="Build Production" subtitle="vite build → dist/" />
        <Card.Body>
          <VStack gap="sm">
            <Button variant="primary" startIcon={<WrenchScrewdriverIcon />} onClick={runBuild} disabled={runningCmd === 'npm run build'}>
              {runningCmd === 'npm run build' ? <Spinner size="sm" /> : 'Build Sekarang'}
            </Button>
            <Button variant="outline" onClick={() => { /* preview */ }} disabled={runningCmd}>
              Preview (vite preview)
            </Button>
          </VStack>
          <Divider my="md" />
          <LogPanel content={buildLog} maxHeight="300px" />
        </Card.Body>
      </Card>

      <Card flex="1" minWidth="300px">
        <Card.Header title="Ujian Integrasi" subtitle="tests/at2.mjs" />
        <Card.Body>
          <Button variant="primary" startIcon={<BugAntIcon />} onClick={runTest} disabled={runningCmd === 'npm run test'}>
            {runningCmd === 'npm run test' ? <Spinner size="sm" /> : 'Jalankan Ujian'}
          </Button>
          <Divider my="md" />
          <LogPanel content={testLog} maxHeight="300px" />
        </Card.Body>
      </Card>

      <Card flex="1" minWidth="300px">
        <Card.Header title="Audit Astryx" subtitle="astryx doctor --built dist" />
        <Card.Body>
          <Button variant="primary" startIcon={<CodeBracketIcon />} onClick={runDoctor} disabled={runningCmd === 'npm run doctor'}>
            {runningCmd === 'npm run doctor' ? <Spinner size="sm" /> : 'Jalankan Doctor'}
          </Button>
          <Divider my="md" />
          <LogPanel content={doctorLog} maxHeight="300px" />
        </Card.Body>
      </Card>
    </HStack>
  );
}