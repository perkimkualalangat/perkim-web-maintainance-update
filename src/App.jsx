import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { Selector } from '@astryxdesign/core/Selector';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TopNav } from '@astryxdesign/core/TopNav';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  CircleStackIcon,
  ClockIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  CubeTransparentIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  LightBulbIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UsersIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { useAppSettings } from './context/AppSettings.jsx';
import { useData } from './context/DataContext.jsx';
import { ENTITY_PLURAL_KEY } from './lib/entities.js';
import { Page, PageHeader } from './components/Page.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MatrixPage from './pages/MatrixPage.jsx';
import GapsPage from './pages/GapsPage.jsx';
import PrinciplesPage from './pages/PrinciplesPage.jsx';
import CasesPage from './pages/CasesPage.jsx';
import TopicsPage from './pages/TopicsPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import CatalogEntityPage from './pages/CatalogEntityPage.jsx';
import ImportExportPage from './pages/ImportExportPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AiPage from './pages/AiPage.jsx';
import DevPage from './pages/DevPage.jsx';
import { EntityPage } from './components/EntityPage.jsx';

function NavCount({ count, isSelected }) {
  return (
    <Badge
      variant={isSelected ? 'info' : 'neutral'}
      label={String(count)}
    />
  );
}

function NotFoundPage() {
  const { t } = useAppSettings();
  return (
    <Page>
      <PageHeader
        title={t('msg.notFound')}
        actions={
          <Button
            label={t('nav.dashboard')}
            variant="primary"
            href="#/dashboard"
          />
        }
      />
    </Page>
  );
}

export default function App() {
  const { t, lang, setLang, mode, setMode } = useAppSettings();
  const { data } = useData();
  const location = useLocation();
  const path = location.pathname;

  const is = (route, exact = true) =>
    exact ? path === route : path.startsWith(route);

  const counts = {
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
  };

  const titleMap = {
    '/dashboard': 'nav.dashboard',
    '/ai': 'nav.ai',
    '/systems': 'nav.systems',
    '/components': 'nav.components',
    '/matrix': 'nav.matrix',
    '/weaknesses': 'nav.weaknesses',
    '/fallbacks': 'nav.fallbacks',
    '/costs': 'nav.costs',
    '/actors': 'nav.actors',
    '/evidence': 'nav.evidence',
    '/principles': 'nav.principles',
    '/cases': 'nav.cases',
    '/topics': 'nav.topics',
    '/gaps': 'nav.gaps',
    '/catalog': 'nav.catalog',
    '/import-export': 'nav.importExport',
    '/settings': 'nav.settings',
    '/dev': 'nav.dev',
  };

  let currentTitle = titleMap[path];
  if (!currentTitle && path.startsWith('/catalog/')) {
    const type = path.split('/')[2];
    if (type && ENTITY_PLURAL_KEY[type]) currentTitle = ENTITY_PLURAL_KEY[type];
  }
  if (!currentTitle) currentTitle = 'msg.notFound';

  const navBadge = (type) => (
    <NavCount count={counts[type]} isSelected={is(`/${type}`)} />
  );

  return (
    <AppShell
      height="fill"
      variant="section"
      sideNav={
        <SideNav
          collapsible
          header={
            <SideNavHeading
              heading={t('app.title')}
              headingHref="#/dashboard"
              icon={
                <NavIcon icon={<Icon icon={SparklesIcon} size="sm" />} />
              }
            />
          }
          footer={
            <SideNavSection title={t('nav.group.data')} isHeaderHidden>
              <SideNavItem
                label={t('nav.importExport')}
                icon={ArrowDownTrayIcon}
                href="#/import-export"
                isSelected={is('/import-export')}
              />
              <SideNavItem
                label={t('nav.settings')}
                icon={Cog6ToothIcon}
                href="#/settings"
                isSelected={is('/settings')}
              />
            </SideNavSection>
          }>
          <SideNavSection title={t('nav.group.main')}>
            <SideNavItem
              label={t('nav.dashboard')}
              icon={HomeIcon}
              href="#/dashboard"
              isSelected={is('/dashboard')}
            />
            <SideNavItem
              label={t('nav.ai')}
              icon={CpuChipIcon}
              href="#/ai"
              isSelected={is('/ai')}
            />
            <SideNavItem
              label={t('nav.matrix')}
              icon={TableCellsIcon}
              href="#/matrix"
              isSelected={is('/matrix')}
            />
            <SideNavItem
              label={t('nav.gaps')}
              icon={ExclamationCircleIcon}
              href="#/gaps"
              isSelected={is('/gaps')}
            />
          </SideNavSection>

          <SideNavSection title={t('nav.group.entities')}>
            <SideNavItem
              label={t('nav.systems')}
              icon={CircleStackIcon}
              href="#/systems"
              isSelected={is('/systems')}
              endContent={navBadge('systems')}
            />
            <SideNavItem
              label={t('nav.components')}
              icon={CubeTransparentIcon}
              href="#/components"
              isSelected={is('/components')}
              endContent={navBadge('components')}
            />
            <SideNavItem
              label={t('nav.weaknesses')}
              icon={ExclamationTriangleIcon}
              href="#/weaknesses"
              isSelected={is('/weaknesses')}
              endContent={navBadge('weaknesses')}
            />
            <SideNavItem
              label={t('nav.fallbacks')}
              icon={ShieldCheckIcon}
              href="#/fallbacks"
              isSelected={is('/fallbacks')}
              endContent={navBadge('fallbacks')}
            />
            <SideNavItem
              label={t('nav.costs')}
              icon={BanknotesIcon}
              href="#/costs"
              isSelected={is('/costs')}
              endContent={navBadge('costs')}
            />
            <SideNavItem
              label={t('nav.actors')}
              icon={UsersIcon}
              href="#/actors"
              isSelected={is('/actors')}
              endContent={navBadge('actors')}
            />
            <SideNavItem
              label={t('nav.evidence')}
              icon={DocumentMagnifyingGlassIcon}
              href="#/evidence"
              isSelected={is('/evidence')}
              endContent={navBadge('evidence')}
            />
          </SideNavSection>

          <SideNavSection title={t('nav.group.analysis')}>
            <SideNavItem
              label={t('nav.principles')}
              icon={ScaleIcon}
              href="#/principles"
              isSelected={is('/principles')}
              endContent={navBadge('principles')}
            />
            <SideNavItem
              label={t('nav.cases')}
              icon={ClockIcon}
              href="#/cases"
              isSelected={is('/cases')}
              endContent={navBadge('cases')}
            />
            <SideNavItem
              label={t('nav.topics')}
              icon={LightBulbIcon}
              href="#/topics"
              isSelected={is('/topics')}
              endContent={navBadge('topics')}
            />
            <SideNavItem
              label={t('nav.catalog')}
              icon={Squares2X2Icon}
              href="#/catalog"
              isSelected={is('/catalog', false)}
            />
            <SideNavItem
              label={t('nav.dev')}
              icon={CodeBracketIcon}
              href="#/dev"
              isSelected={is('/dev')}
            />
          </SideNavSection>
        </SideNav>
      }
      topNav={
        <TopNav
          label={t('nav.group.main')}
          heading={
            <Text type="body" weight="semibold">
              {t(currentTitle)}
            </Text>
          }
          endContent={
            <HStack gap={2} vAlign="center">
              <Selector
                label={t('settings.language')}
                isLabelHidden
                options={[
                  { value: 'ms', label: 'BM' },
                  { value: 'en', label: 'EN' },
                ]}
                value={lang}
                onChange={(next) => {
                  if (next && next !== lang) setLang(next);
                }}
                size="sm"
                width={82}
              />
              <Selector
                label={t('settings.theme')}
                isLabelHidden
                options={[
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                  { value: 'system', label: t('settings.themeSystem') },
                ]}
                value={mode}
                onChange={(next) => setMode(next || 'system')}
                size="sm"
                width={126}
              />
            </HStack>
          }
        />
      }>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/systems" element={<EntityPage type="systems" />} />
        <Route path="/components" element={<EntityPage type="components" />} />
        <Route path="/matrix" element={<MatrixPage />} />
        <Route path="/weaknesses" element={<EntityPage type="weaknesses" />} />
        <Route path="/fallbacks" element={<EntityPage type="fallbacks" />} />
        <Route path="/costs" element={<EntityPage type="costs" />} />
        <Route path="/actors" element={<EntityPage type="actors" />} />
        <Route path="/evidence" element={<EntityPage type="evidence" />} />
        <Route path="/principles" element={<PrinciplesPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/gaps" element={<GapsPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:type" element={<CatalogEntityPage />} />
        <Route path="/import-export" element={<ImportExportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/dev" element={<DevPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}