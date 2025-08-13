import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootEl = document.querySelector('#root');
if (!rootEl) {
    throw new Error("Can't find rootEl!");
}
const root = createRoot(rootEl);
root.render(
    <StrictMode>
        <App />
    </StrictMode>,
);

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
