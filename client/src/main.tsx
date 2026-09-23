import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app.tsx';
import './app.css';

const akar = document.getElementById('app');

if (akar === null) {
    throw new Error('Elemen #app tidak ditemukan di index.html');
}

createRoot(akar).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
