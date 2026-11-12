import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export function ConfigTab({ envConfig, showSecrets, setShowSecrets }) {
  const maskValue = (v) => showSecrets ? v : '*'.repeat(Math.min(v?.length || 0, 8));

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
}