import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from 'react-error-boundary';

const rootEl = document.querySelector('#root');
if (!rootEl) {
    throw new Error("Can't find rootEl!");
}
const root = createRoot(rootEl);
root.render(
    <StrictMode>
        <ErrorBoundary fallbackRender={Fallback}>
            <App />
        </ErrorBoundary>
    </StrictMode>,
);

function Fallback() {
    return (
        <div style={{ color: 'darkred' }}>
            It seems I have no power here. Consult the Console in Devtools
            (F12), and file a GitHub issue.
        </div>
    );
}

const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register(
                new URL('./service-worker.ts', import.meta.url),
            );
            await registration.update();
            if (registration.installing) {
                console.log('Service worker installing');
            } else if (registration.waiting) {
                console.log('Service worker installed');
            } else if (registration.active) {
                console.log('Service worker active');
            }
        } catch (error) {
            console.error(`Registration failed with ${error}`);
        }
    }
};

registerServiceWorker();
