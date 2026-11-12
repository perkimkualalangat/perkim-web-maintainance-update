import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { List, ListItem } from '@astryxdesign/core/List';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useAppSettings } from '@/context/AppSettings.jsx';
import { useData } from '@/context/DataContext.jsx';
import { ENTITY_PLURAL_KEY } from '@/lib/entities.js';
import { hashHref, routeForType } from '@/lib/routes.js';
import { Page, PageHeader, SectionHeading } from '@/components/Page.jsx';
import { StatCard } from '@/components/StatCard.jsx';

export function EntityPage({ type }) {
  const { t } = useAppSettings();
  const { data } = useData();
  const items = data[type] || [];
  const pluralLabel = t(ENTITY_PLURAL_KEY[type]);

  return (
    <Page>
      <PageHeader
        title={pluralLabel}
        badge={<Badge variant="neutral" label={String(items.length)} />}
        actions={
          <Button label={t('action.addRecord')} variant="primary" onClick={() => {}} />
        }
      />
      <Grid columns={{ minWidth: 400, repeat: 'fit' }} gap={4}>
        {items.map((item) => (
          <Card key={item[UID_FIELD[type]] || item.id} padding={4}>
            <VStack gap={2} align="start">
              <Text type="label" weight="semibold">{item.name || item.id}</Text>
              <Text type="supporting" color="secondary">{item.id}</Text>
              <Text type="body" style={{ maxWidth: '400px' }}>{item.description || item.definition || '-'}</Text>
              <HStack gap={2}>
                <span>Layer: {item.layer}</span>
                <span>Control: {item.control_level}</span>
              </HStack>
            </VStack>
          </Card>
        ))}
      </Grid>
    </Page>
  );
}

const UID_FIELD = {
  layers: 'layer_id',
  systems: 'system_id',
  components: 'component_id',
  weaknesses: 'weakness_id',
  fallbacks: 'fallback_id',
  costs: 'cost_id',
  actors: 'actor_id',
  evidence: 'evidence_id',
  principles: 'principle_id',
  metrics: 'metric_id',
  cases: 'case_id',
  topics: 'topic_id',
  narratives: 'narrative_id',
  captures: 'capture_id',
  reflexivity: 'reflexivity_id',
  exitvoice: 'exitvoice_id',
  unknownunknowns: 'unknownunknown_id',
};