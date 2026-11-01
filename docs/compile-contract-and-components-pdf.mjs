import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const chromePath = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

function renderDocument({
  title,
  subtitle,
  badgeText,
  metaGrid,
  mdFilename,
  htmlFilename,
  pdfFilename,
  signRoles
}) {
  const mdPath = path.join(projectRoot, 'docs', mdFilename);
  const htmlPath = path.join(projectRoot, 'docs', htmlFilename);
  const pdfPath = path.join(projectRoot, 'docs', pdfFilename);

  console.log(`\n======================================================`);
  console.log(`Memproses: ${title}`);
  console.log(`Membaca markdown: ${mdPath}`);
  const markdownRaw = fs.readFileSync(mdPath, 'utf8');
  const escapedMarkdown = JSON.stringify(markdownRaw);

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} - SIMPATIK POSYANDU</title>
  
  <!-- CDN Dependencies -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 18mm 16mm 20mm 16mm;
      @top-right {
        content: "SIMPATIK POSYANDU — ${title}";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
      @bottom-left {
        content: "Posyandu Tulip RW 18 · KKN Tematik 2026";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
      @bottom-right {
        content: "Halaman " counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        font-weight: 600;
        color: #475569;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9.5pt;
      line-height: 1.55;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 245mm;
      padding: 18mm 12mm 12mm 12mm;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      position: relative;
      background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 28%);
    }

    .cover-badge {
      display: inline-block;
      align-self: flex-start;
      background: #047857;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 9999px;
      box-shadow: 0 2px 4px rgba(4, 120, 87, 0.2);
    }

    .cover-title {
      font-size: 24pt;
      font-weight: 800;
      line-height: 1.15;
      color: #064e3b;
      margin: 20px 0 10px 0;
      letter-spacing: -0.02em;
    }

    .cover-subtitle {
      font-size: 12.5pt;
      font-weight: 600;
      color: #047857;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }

    .cover-desc {
      font-size: 9.5pt;
      color: #475569;
      max-width: 92%;
      margin-bottom: 20px;
      line-height: 1.55;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin: 16px 0;
    }

    .meta-item {
      font-size: 8.5pt;
    }

    .meta-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
    }

    .meta-value {
      font-weight: 600;
      color: #0f172a;
    }

    .sign-box-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px dashed #cbd5e1;
    }

    .sign-box {
      text-align: center;
      font-size: 7.8pt;
      padding: 8px 6px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .sign-role {
      font-weight: 700;
      color: #334155;
      min-height: 26px;
    }

    .sign-space {
      height: 44px;
    }

    .sign-name {
      font-weight: 600;
      color: #0f172a;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      margin-top: 4px;
    }

    /* Headings */
    h1 {
      font-size: 17pt;
      font-weight: 800;
      color: #064e3b;
      margin-top: 0;
      margin-bottom: 14px;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 28px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #059669;
      page-break-before: always;
      break-before: page;
      letter-spacing: -0.01em;
    }

    .first-chapter h2 {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
    }

    p {
      margin-top: 0;
      margin-bottom: 8px;
      text-align: justify;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 10px;
      padding-left: 20px;
    }

    li {
      margin-bottom: 3px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border-radius: 6px;
      overflow: hidden;
    }

    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Code & Monospace */
    code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 7.8pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 7.6pt;
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 10px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      line-height: 1.4;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }

    /* Blockquotes / Callouts */
    blockquote {
      margin: 12px 0;
      padding: 8px 12px;
      background: #f8fafc;
      border-left: 4px solid #059669;
      border-radius: 0 6px 6px 0;
      color: #334155;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Mermaid Diagrams */
    .mermaid-container {
      margin: 14px 0;
      padding: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid svg {
      max-width: 100%;
      height: auto;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }

    a {
      color: #047857;
      text-decoration: none;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div>
      <span class="cover-badge">${badgeText}</span>
      <h1 class="cover-title">${title}</h1>
      <div class="cover-subtitle">${subtitle}</div>
      <p class="cover-desc">
        Dokumen spesifikasi teknis resmi arsitektur perangkat lunak SIMPATIK Posyandu. Disusun secara terperinci untuk referensi serah terima tim pengembang, panduan konfigurasi rute, pemetaan alur permintaan (request pipeline), serta pemeliharaan sistem jangka panjang.
      </p>

      <div class="cover-meta-grid">
        ${metaGrid.map(m => `
          <div class="meta-item">
            <div class="meta-label">${m.label}</div>
            <div class="meta-value">${m.value}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div>
      <div class="sign-box-grid">
        ${signRoles.map(s => `
          <div class="sign-box">
            <div class="sign-role">${s.role}</div>
            <div class="sign-space"></div>
            <div class="sign-name">${s.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Main Content Container rendered by Marked -->
  <div id="content"></div>

  <script id="markdown-raw" type="text/plain">${escapedMarkdown}</script>

  <script>
    document.addEventListener('DOMContentLoaded', async () => {
      const raw = JSON.parse(document.getElementById('markdown-raw').textContent);

      // Custom Alert Blockquotes Parser
      marked.use({
        renderer: {
          blockquote(quote) {
            if (quote.includes('[!WARNING]')) {
              return '<blockquote style="background:#fffbeb;border-left-color:#d97706;color:#92400e;"><strong>PERINGATAN:</strong> ' + quote.replace('[!WARNING]', '') + '</blockquote>';
            }
            if (quote.includes('[!TIP]')) {
              return '<blockquote style="background:#f0fdf4;border-left-color:#16a34a;color:#166534;"><strong>TIPS:</strong> ' + quote.replace('[!TIP]', '') + '</blockquote>';
            }
            if (quote.includes('[!NOTE]') || quote.includes('[!IMPORTANT]')) {
              return '<blockquote><strong>CATATAN PENTING:</strong> ' + quote.replace(/\[!(NOTE|IMPORTANT)\]/, '') + '</blockquote>';
            }
            return '<blockquote>' + quote + '</blockquote>';
          }
        }
      });

      // Parse markdown to HTML
      let html = marked.parse(raw);
      const contentDiv = document.getElementById('content');
      contentDiv.innerHTML = html;

      // Wrap first chapter or TOC
      const allH2 = contentDiv.querySelectorAll('h2');
      if (allH2.length > 0) {
        allH2[0].style.pageBreakBefore = 'avoid';
        allH2[0].style.breakBefore = 'avoid';
      }

      // Convert Mermaid code blocks into <div class="mermaid">
      const codeBlocks = contentDiv.querySelectorAll('pre code.language-mermaid');
      codeBlocks.forEach(block => {
        const pre = block.parentElement;
        const container = document.createElement('div');
        container.className = 'mermaid-container';
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = block.textContent;
        container.appendChild(mermaidDiv);
        pre.replaceWith(container);
      });

      if (window.mermaid) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          flowchart: { useMaxWidth: true, htmlLabels: true },
          sequence: { useMaxWidth: true, showSequenceNumbers: true },
          er: { useMaxWidth: true }
        });
        await mermaid.run();
      }

      console.log('Rendering complete!');
      document.body.classList.add('ready-to-print');
    });
  </script>
</body>
</html>
`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`HTML tersimpan: ${htmlPath}`);

  console.log(`Menjalankan Chrome Headless untuk membuat PDF...`);
  const fileUrl = 'file:///' + htmlPath.replace(/\\\\/g, '/');
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=8000',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    fileUrl
  ];

  try {
    execFileSync(chromePath, chromeArgs, { stdio: 'inherit' });
    const stats = fs.statSync(pdfPath);
    console.log(`SUKSES: PDF terkompilasi! Ukuran: ${(stats.size / 1024).toFixed(1)} KB -> ${pdfPath}`);
  } catch (err) {
    console.error(`Gagal menyusun PDF ${pdfFilename}:`, err);
    throw err;
  }
}

// 1. Dokumen Kontrak REST API
renderDocument({
  title: 'SPESIFIKASI KONTRAK REST API',
  subtitle: 'SIMPATIK POSYANDU — Sistem Informasi Posyandu Terintegrasi dan Antropometri Digital',
  badgeText: 'Dokumen Resmi Kontrak REST API & Request Routing',
  mdFilename: 'SIMPATIK_Posyandu_REST_API_Contract.md',
  htmlFilename: 'SIMPATIK_Posyandu_REST_API_Contract.html',
  pdfFilename: 'SIMPATIK_Posyandu_REST_API_Contract.pdf',
  metaGrid: [
    { label: 'Program & Wilayah', value: 'KKN Tematik 2026 — Posyandu Tulip RW 18' },
    { label: 'Cakupan Endpoint', value: '48 REST Endpoints (11 Domain Sistem)' },
    { label: 'Skema Autentikasi', value: 'Dual-Auth (Cookie Sesi & Bearer Token)' },
    { label: 'Standar Respons', value: 'JSON RFC 8259 + CDC Audit Trail' }
  ],
  signRoles: [
    { role: 'Bidan / Pembina Teknis<br>Puskesmas Pembina', name: 'Bidan Pembina Wilayah' },
    { role: 'Ketua Posyandu<br>Posyandu Tulip RW 18', name: 'Sri Mindarti' },
    { role: 'Koordinator Pengembang<br>Tim IT KKN Tematik 2026', name: 'Tim Rekayasa Sistem' }
  ]
});

// 2. Dokumen Komponen Web Frontend
renderDocument({
  title: 'SPESIFIKASI KOMPONEN WEB & FRONTEND',
  subtitle: 'SIMPATIK POSYANDU — Sistem Informasi Posyandu Terintegrasi dan Antropometri Digital',
  badgeText: 'Dokumen Resmi Arsitektur Komponen Web & Frontend',
  mdFilename: 'SIMPATIK_Posyandu_Web_Components.md',
  htmlFilename: 'SIMPATIK_Posyandu_Web_Components.html',
  pdfFilename: 'SIMPATIK_Posyandu_Web_Components.pdf',
  metaGrid: [
    { label: 'Program & Wilayah', value: 'KKN Tematik 2026 — Posyandu Tulip RW 18' },
    { label: 'Framework & Stack', value: 'React 19 + TypeScript 5.9 + Tailwind v4' },
    { label: 'Pola Arsitektur', value: 'Modular Orchestrator + Sub-Components (SRP)' },
    { label: 'State Management', value: 'Zero External Bloat (Pure Hooks & Context)' }
  ],
  signRoles: [
    { role: 'Bidan / Pembina Teknis<br>Puskesmas Pembina', name: 'Bidan Pembina Wilayah' },
    { role: 'Ketua Posyandu<br>Posyandu Tulip RW 18', name: 'Sri Mindarti' },
    { role: 'Koordinator Pengembang<br>Tim IT KKN Tematik 2026', name: 'Tim Rekayasa Sistem' }
  ]
});

console.log('\n======================================================');
console.log('SELURUH DOKUMEN PDF BERHASIL DISUSUN DENGAN LENGKAP!');
