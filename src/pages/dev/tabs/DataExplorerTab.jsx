import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EyeIcon } from '@heroicons/react/24/outline';
import { useAppSettings } from '@/context/AppSettings.jsx';

export function DataExplorerTab({ data, dataLoading }) {
  const { t } = useAppSettings();

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
          <Card>
            <Card.Header title="Contoh Data (5 pertama)" subtitle="Klik untuk lihat penuh" />
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
}