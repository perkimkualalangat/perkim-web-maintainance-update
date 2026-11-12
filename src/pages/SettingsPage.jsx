import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useAppSettings } from '@/context/AppSettings.jsx';
import { Page, PageHeader, SectionHeading } from '../components/Page.jsx';

export default function SettingsPage() {
  const { t, lang, setLang, mode, setMode } = useAppSettings();

  return (
    <Page>
      <PageHeader title={t('nav.settings')} description={t('page.settings.desc')} />
      <Card padding={4}>
        <VStack gap={4}>
          <SectionHeading title={t('settings.appearance')} />
          <HStack gap={4} wrap="wrap">
            <Selector
              label={t('settings.language')}
              options={[
                { value: 'ms', label: 'BM' },
                { value: 'en', label: 'EN' },
              ]}
              value={lang}
              onChange={(next) => next && next !== lang && setLang(next)}
              size="sm"
              width={120}
            />
            <Selector
              label={t('settings.theme')}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'system', label: t('settings.themeSystem') },
              ]}
              value={mode}
              onChange={(next) => next && setMode(next)}
              size="sm"
              width={150}
            />
          </HStack>
        </VStack>
        </Card>
    </Page>
  );
}