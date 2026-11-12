import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import { Theme } from '@astryxdesign/core/theme';
import { ToastViewport } from '@astryxdesign/core/Toast';
import { themes, defaultThemeSlug } from './astryx-themes.js';
import { AppSettingsProvider, useAppSettings } from './context/AppSettings.jsx';
import { DataProvider } from './context/DataContext.jsx';
import App from './App.jsx';
import './styles.css';

const BM_OVERRIDES = {
  '@astryx.field.required': 'Diperlukan',
  '@astryx.field.optional': 'Pilihan',
  '@astryx.selector.placeholder': 'Pilih…',
  '@astryx.multiSelector.selectPlaceholder': 'Pilih…',
  '@astryx.selector.searchPlaceholder': 'Cari…',
  '@astryx.multiSelector.searchPlaceholder': 'Cari…',
  '@astryx.selector.searchOptions': 'Cari pilihan',
  '@astryx.multiSelector.searchOptions': 'Cari pilihan',
  '@astryx.selector.emptySearchResults': 'Tiada hasil',
  '@astryx.multiSelector.emptySearchResults': 'Tiada hasil',
  '@astryx.dialog.close': 'Tutup',
  '@astryx.fileInput.placeholder': 'Pilih fail',
  '@astryx.fileInput.placeholderMultiple': 'Pilih fail',
  '@astryx.inputClearButton.tooltip': 'Kosongkan',
  '@astryx.selector.clearLabel': 'Kosongkan {label}',
  '@astryx.multiSelector.clearAll': 'Kosongkan semua {label}',
  '@astryx.dateInput.clear': 'Kosongkan {label}',
  '@astryx.numberInput.clearLabel': 'Kosongkan {label}',
};

function Root() {
  const { mode, lang } = useAppSettings();
  return (
    <Theme theme={themes[defaultThemeSlug]} mode={mode}>
      <InternationalizationProvider
        locale={lang}
        overrides={lang === 'ms' ? { ms: BM_OVERRIDES } : undefined}>
        <DataProvider>
          <HashRouter>
            <App />
          </HashRouter>
          <ToastViewport />
        </DataProvider>
      </InternationalizationProvider>
    </Theme>
  );
}

createRoot(document.getElementById('root')).render(
  <AppSettingsProvider>
    <Root />
  </AppSettingsProvider>,
);