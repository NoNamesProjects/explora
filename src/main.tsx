import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import './i18n';
import './styles/globals.css';
import App from './App';
import { ContentProvider } from './context/ContentContext';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    {/* reducedMotion="user" makes every motion.* component in the tree honor
        the OS prefers-reduced-motion setting automatically — transform/layout
        animations resolve instantly instead of animating. An audit found 15 of
        28 whileInView usages hand-rolled their own check and missed it
        (including JourneyCard); this is a single global backstop instead of
        auditing each call site. */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ContentProvider>
          <App />
        </ContentProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
