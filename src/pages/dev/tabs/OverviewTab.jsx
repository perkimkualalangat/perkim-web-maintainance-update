import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { SectionHeading } from '@/components/Page.jsx';
import { RefreshIcon, ArrowPathIcon, WrenchScrewdriverIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useAppSettings } from '@/context/AppSettings.jsx';
import { useData } from '@/context/DataContext.jsx';

export function OverviewTab({ aiStatus, loadAiStatus, refreshData }) {
  const { t, lang, mode } = useAppSettings();
  const { data, loading: dataLoading } = useData();

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

  return (
    <VStack gap={5}>
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
              <Button variant="outline" startIcon={<RefreshIcon />} onClick={refreshData}>Reload Data</Button>
              <Button variant="outline" startIcon={<ArrowPathIcon />} onClick={loadAiStatus}>Reload AI</Button>
              <Button variant="outline" startIcon={<WrenchScrewdriverIcon />} onClick={() => window.open('/settings', '_blank')}>Tetapan</Button>
              <Button variant="outline" startIcon={<ComputerDesktopIcon />} onClick={() => window.location.hash = '#/dev?tab=terminal'}>Terminal</Button>
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
    </VStack>
  );
}