import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useAppSettings } from '../context/AppSettings.jsx';
import { useData } from '../context/DataContext.jsx';
import { Page, PageHeader } from '../components/Page.jsx';

export default function MatrixPage() {
  const { t } = useAppSettings();
  const { data } = useData();

  const components = data.components || [];
  const layers = data.layers || [];

  return (
    <Page>
      <PageHeader title={t('nav.matrix')} description={t('page.matrix.desc')} />
      <Card padding={4}>
        <Text type="supporting" color="secondary">
          Matrix component coming soon - showing {components.length} components across {layers.length} layers
        </Text>
      </Card>
    </Page>
  );
}