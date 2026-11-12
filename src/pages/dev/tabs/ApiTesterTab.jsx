import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Text, TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { MagnifyingGlassIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export function ApiTesterTab({ apiTest, testApi, setApiTest }) {
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
            <Button variant="primary" onClick={() => testApi(apiTest.endpoint, apiTest.method, apiTest.body)} disabled={apiTest.loading} startIcon={apiTest.loading ? <span className="animate-spin">⟳</span> : <MagnifyingGlassIcon />}>
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

      <Card>
        <Card.Header title="Endpoint Tersedia" subtitle="Senarai endpoint API sistem" />
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
              <TableRow><TableCell><Badge variant="neutral">POST</Badge></TableCell><TableCell><CodeBlock inline>/api/ai/check</CodeBlock></TableCell><TableCell>Jalankan 6 cek sistem</TableCell></TableRow>
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
}