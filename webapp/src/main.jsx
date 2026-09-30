import '@fontsource-variable/manrope';
import '@maxhub/max-ui/dist/styles.css';
import './styles.css';

import { MaxUI } from '@maxhub/max-ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.jsx';
import { bridge } from './bridge.js';

bridge.ready();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MaxUI platform={bridge.uiPlatform()} resetBody>
      <App />
    </MaxUI>
  </StrictMode>
);
