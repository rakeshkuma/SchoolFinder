import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The site's two typefaces, served from this site (no render-blocking request to Google Fonts): the same weights the
// Google Fonts link used. Each file covers a script range and is fetched only when a page uses those characters.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import App from './App';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
