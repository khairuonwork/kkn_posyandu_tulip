import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DemoApp from './DemoApp';
import './index.css';

const akar = document.getElementById('app');

if (akar === null) {
    throw new Error('Elemen #app tidak ditemukan di index.html');
}

createRoot(akar).render(
    <StrictMode>
        <DemoApp />
    </StrictMode>,
);
