import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Text, TextArea } from '@astryxdesign/core/TextArea';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { Spinner } from '@astryxdesign/core/Spinner';
import { ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { AI_MODES } from '../types.js';

export function AiChecksTab({ aiChecks, runningChecks, runChecks, testChat, handleTestChat, clearResponse, setMessages, setMode }) {
  return (
    <HStack gap="lg" wrap>
      <Card flex="1" minWidth="400px">
        <Card.Header title="Cek Sistem AI" subtitle="6 cek deterministik" />
        <Card.Body>
          {aiChecks.length === 0 ? (
            <Button startIcon={<span>🔍</span>} onClick={runChecks} disabled={runningChecks}>
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
              onChange={e => setMode(e.target.value)}
              options={AI_MODES}
            />
            <TextArea
              label="Mesej (JSON array)"
              value={JSON.stringify(testChat.messages, null, 2)}
              onChange={e => {
                try {
                  setMessages(JSON.parse(e.target.value));
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
              <Button variant="ghost" onClick={clearResponse}>
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
}