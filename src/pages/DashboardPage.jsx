import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { List, ListItem } from '@astryxdesign/core/List';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useAppSettings } from '../context/AppSettings.jsx';
import { useData } from '../context/DataContext.jsx';
import { ENTITY_PLURAL_KEY } from '../lib/entities.js';
import { percent } from '../lib/format.js';
import { ALL_ENTITY_ORDER, hashHref, routeForType } from '../lib/routes.js';
import { Page, PageHeader, SectionHeading } from '../components/Page.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { collectRefIssues } from '@/assets/js/core/schema.js';
import { useMemo } from 'react';

const EVIDENCE_WEIGHTS = {
  Kuat: 1,
  Sederhana: 0.6,
  Lemah: 0.3,
  Teoritikal: 0.2,
  Normatif: 0.2,
};

function progressVariant(value) {
  if (value >= 75) return 'success';
  if (value >= 45) return 'warning';
  return 'error';
}

export default function DashboardPage() {
  const { t } = useAppSettings();
  const { data, report, lastUpdated } = useData();

  const total = useMemo(
    () =>
      Object.values(data).reduce(
        (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
        0,
      ),
    [data],
  );

  const profile = useMemo(() => {
    const components = data.components || [];
    const withFallback = components.filter(
      (item) => Array.isArray(item.fallbacks) && item.fallbacks.length > 0,
    ).length;
    const actionable = components.filter((item) =>
      ['K1', 'K2'].includes(item.control_level),
    ).length;

    const scored = Object.values(data)
      .flat()
      .filter((item) => item && item.evidence_status);
    const evidenceScore = scored.length
      ? (scored.reduce(
          (sum, item) => sum + (EVIDENCE_WEIGHTS[item.evidence_status] ?? 0),
          0,
        ) /
          scored.length) *
        100
      : 0;

    const exitvoice = data.exitvoice || [];
    const contestability = exitvoice.length
      ? exitvoice.reduce(
          (sum, item) => sum + (Number(item.contestability_score) || 0),
          0,
        ) / exitvoice.length
      : 0;

    const unknown = data.unknownunknowns || [];
    const buffered = unknown.filter(
      (item) => typeof item.buffer === 'string' && item.buffer.trim(),
    ).length;

    return {
      struktur: percent(withFallback, components.length),
      maklumat: Math.round(evidenceScore),
      tindakan: percent(actionable, components.length),
      contestability: Math.round(contestability),
      buffer: percent(buffered, unknown.length),
      withFallback,
      components: components.length,
      unknown: unknown.length,
      buffered,
      scored: scored.length,
    };
  }, [data]);

  const gaps = useMemo(() => {
    const components = data.components || [];
    const refIssues = collectRefIssues(data);
    const withoutFallback = components.filter(
      (item) => !Array.isArray(item.fallbacks) || item.fallbacks.length === 0,
    );
    const weakEvidence = Object.values(data)
      .flat()
      .filter(
        (item) =>
          item &&
          ['Lemah', 'Teoritikal', 'Normatif'].includes(item.evidence_status),
      );
    const openQuestions = (data.topics || []).flatMap(
      (topic) => topic.open_questions || [],
    );
    const layerGaps = (data.layers || []).reduce(
      (sum, layer) => sum + (layer.gaps?.length || 0),
      0,
    );
    return {
      refIssues,
      withoutFallback,
      weakEvidence,
      openQuestions,
      layerGaps,
    };
  }, [data]);

  const quickLinks = [
    ['systems', '/systems'],
    ['components', '/components'],
    ['matrix', '/matrix'],
    ['weaknesses', '/weaknesses'],
    ['gaps', '/gaps'],
    ['catalog', '/catalog'],
  ];

  return (
    <Page>
      <PageHeader
        title={t('app.title')}
        description={t('app.subtitle')}
        badge={<Badge variant="info" label={`${total} ${t('label.records')}`} />}
        actions={
          <>
            <Button
              label={t('nav.importExport')}
              variant="secondary"
              href={hashHref('/import-export')}
            />
            <Button
              label={t('nav.gaps')}
              variant="primary"
              href={hashHref('/gaps')}
            />
          </>
        }
        endContent={
          lastUpdated ? (
            <Text type="supporting" color="secondary">
              {t('dash.lastUpdated', { date: new Date(lastUpdated).toLocaleString() })}
            </Text>
          ) : null
        }
      />

      <Grid columns={{ minWidth: 280, max: 3, repeat: 'fit' }} gap={4}>
        <StatCard
          label={t('dash.totalRecords')}
          value={total}
          hint={`${t('label.backend')}: ${report?.backend || '—'}`}
        />
        <StatCard
          label={t('entities.systems')}
          value={(data.systems || []).length}
          hint="Fiat · Kripto · AI · Hibrid"
        />
        <StatCard
          label={t('entities.components')}
          value={(data.components || []).length}
          hint={t('dash.componentsHint')}
        />
        <StatCard
          label={t('entities.weaknesses')}
          value={(data.weaknesses || []).length}
          hint={t('page.weaknesses.desc')}
        />
        <StatCard
          label={t('entities.actors')}
          value={(data.actors || []).length}
          hint={t('page.actors.desc')}
        />
        <StatCard
          label={t('entities.evidence')}
          value={(data.evidence || []).length}
          hint={t('page.evidence.desc')}
        />
      </Grid>

      <Grid columns={{ minWidth: 360, repeat: 'fit' }} gap={4} align="start">
        <Card padding={4}>
          <VStack gap={3}>
            <SectionHeading
              title={t('dash.stats')}
              description={t('page.catalog.desc')}
            />
            <List hasDividers density="compact">
              {ALL_ENTITY_ORDER.map((type) => (
                <ListItem
                  key={type}
                  label={t(ENTITY_PLURAL_KEY[type])}
                  href={hashHref(routeForType(type))}
                  endContent={
                    <Badge
                      variant="neutral"
                      label={String((data[type] || []).length)}
                    />
                  }
                />
              ))}
            </List>
          </VStack>
        </Card>

        <VStack gap={4}>
          <Card padding={4}>
            <VStack gap={4}>
              <SectionHeading
                title={t('dash.profile')}
                description={t('dash.profileNote')}
              />
              <VStack gap={1}>
                <ProgressBar
                  label={t('profile.struktur')}
                  value={profile.struktur}
                  variant={progressVariant(profile.struktur)}
                  hasValueLabel
                />
                <Text type="supporting" color="secondary">
                  {t('profile.strukturFormula')}
                </Text>
              </VStack>
              <VStack gap={1}>
                <ProgressBar
                  label={t('profile.maklumat')}
                  value={profile.maklumat}
                  variant={progressVariant(profile.maklumat)}
                  hasValueLabel
                />
                <Text type="supporting" color="secondary">
                  {t('profile.maklumatFormula')}
                </Text>
              </VStack>
              <VStack gap={1}>
                <ProgressBar
                  label={t('profile.tindakan')}
                  value={profile.tindakan}
                  variant={progressVariant(profile.tindakan)}
                  hasValueLabel
                />
                <Text type="supporting" color="secondary">
                  {t('profile.tindakanFormula')}
                </Text>
              </VStack>
              <VStack gap={1}>
                <ProgressBar
                  label={t('profile.contestability')}
                  value={profile.contestability}
                  variant={progressVariant(profile.contestability)}
                  hasValueLabel
                />
                <Text type="supporting" color="secondary">
                  {t('profile.contestabilityFormula')}
                </Text>
              </VStack>
              <VStack gap={1}>
                <ProgressBar
                  label={t('profile.buffer')}
                  value={profile.buffer}
                  variant={progressVariant(profile.buffer)}
                  hasValueLabel
                />
                <Text type="supporting" color="secondary">
                  {t('profile.bufferFormula')}
                </Text>
              </VStack>
              <Text type="supporting" color="secondary">
                {t('dash.formulaNote')}
              </Text>
            </VStack>
          </Card>

          <Card padding={4}>
            <VStack gap={3}>
              <SectionHeading title={t('dash.gaps')} />
              <List hasDividers density="compact">
                <ListItem
                  label={t('dash.brokenRefs')}
                  description={
                    gaps.refIssues.length
                      ? undefined
                      : t('dash.noBrokenRefs')
                  }
                  endContent={
                    <Badge
                      variant={gaps.refIssues.length ? 'error' : 'success'}
                      label={String(gaps.refIssues.length)}
                    />
                  }
                  href={hashHref('/gaps')}
                />
                <ListItem
                  label={t('dash.noFallback')}
                  endContent={
                    <Badge
                      variant={gaps.withoutFallback.length ? 'warning' : 'success'}
                      label={String(gaps.withoutFallback.length)}
                    />
                  }
                  href={hashHref('/gaps')}
                />
                <ListItem
                  label={t('gaps.weakEvidence')}
                  endContent={
                    <Badge
                      variant={gaps.weakEvidence.length ? 'warning' : 'success'}
                      label={String(gaps.weakEvidence.length)}
                    />
                  }
                  href={hashHref('/gaps')}
                />
                <ListItem
                  label={t('gaps.openQuestions')}
                  endContent={
                    <Badge variant="neutral" label={String(gaps.openQuestions.length)} />
                  }
                  href={hashHref('/gaps')}
                />
                <ListItem
                  label={t('dash.layerGaps')}
                  endContent={
                    <Badge variant="neutral" label={String(gaps.layerGaps)} />
                  }
                  href={hashHref('/gaps')}
                />
              </List>
            </VStack>
          </Card>
        </VStack>
      </Grid>

      <VStack gap={3}>
        <SectionHeading title={t('dash.quickLinks')} />
        <HStack gap={2} wrap="wrap">
          {quickLinks.map(([key, path]) => (
            <Button
              key={key}
              label={t(key === 'catalog' ? 'nav.catalog' : `nav.${key}`)}
              variant="secondary"
              href={hashHref(path)}
            />
          ))}
        </HStack>
      </VStack>
    </Page>
  );
}