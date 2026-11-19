import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/tajawal/arabic-400.css';
import '@fontsource/tajawal/arabic-500.css';
import '@fontsource/tajawal/arabic-700.css';
import '@fontsource/tajawal/arabic-800.css';
import '@fontsource/tajawal/latin-400.css';
import '@fontsource/tajawal/latin-500.css';
import '@fontsource/tajawal/latin-700.css';
import '@fontsource/tajawal/latin-800.css';
import '@fontsource/baloo-bhaijaan-2/arabic-400.css';
import '@fontsource/baloo-bhaijaan-2/arabic-500.css';
import '@fontsource/baloo-bhaijaan-2/arabic-600.css';
import '@fontsource/baloo-bhaijaan-2/arabic-700.css';
import '@fontsource/baloo-bhaijaan-2/arabic-800.css';
import '@fontsource/baloo-bhaijaan-2/latin-400.css';
import '@fontsource/baloo-bhaijaan-2/latin-500.css';
import '@fontsource/baloo-bhaijaan-2/latin-600.css';
import '@fontsource/baloo-bhaijaan-2/latin-700.css';
import '@fontsource/baloo-bhaijaan-2/latin-800.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initLocalVaultKey } from './utils/security';
import './index.css';

function RootShell() {
  const [sessionEpoch, setSessionEpoch] = useState(0);
  return (
    <AppErrorBoundary onReset={() => setSessionEpoch((e) => e + 1)}>
      <App key={sessionEpoch} />
    </AppErrorBoundary>
  );
}

void initLocalVaultKey().finally(() => {
  createRoot(document.getElementById('root')!).render(<RootShell />);
});
