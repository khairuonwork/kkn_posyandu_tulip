import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const mdPath = path.join(projectRoot, 'docs', 'arsitektur-sistem-handover.md');
const htmlPath = path.join(projectRoot, 'docs', 'SIMPATIK_Posyandu_System_Architecture_Handover.html');
const pdfPath = path.join(projectRoot, 'docs', 'SIMPATIK_Posyandu_System_Architecture_Handover.pdf');

console.log('Membaca dokumen handover markdown:', mdPath);
const markdownRaw = fs.readFileSync(mdPath, 'utf8');

// Escape raw markdown for embedding inside <script>
const escapedMarkdown = JSON.stringify(markdownRaw);

const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SIMPATIK POSYANDU - Dokumen Serah Terima Arsitektur Sistem</title>
  
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
        content: "SIMPATIK POSYANDU — Handover Arsitektur Sistem";
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
      font-size: 10pt;
      line-height: 1.6;
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
      padding: 20mm 10mm 10mm 10mm;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      position: relative;
      background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 25%);
    }

    .cover-badge {
      display: inline-block;
      align-self: flex-start;
      background: #047857;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 9999px;
      box-shadow: 0 2px 4px rgba(4, 120, 87, 0.2);
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      line-height: 1.15;
      color: #064e3b;
      margin: 24px 0 12px 0;
      letter-spacing: -0.02em;
    }

    .cover-subtitle {
      font-size: 13pt;
      font-weight: 600;
      color: #047857;
      margin: 0 0 18px 0;
      line-height: 1.4;
    }

    .cover-desc {
      font-size: 10pt;
      color: #475569;
      max-width: 90%;
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }

    .meta-item {
      font-size: 9pt;
    }

    .meta-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 3px;
    }

    .meta-value {
      font-weight: 600;
      color: #0f172a;
    }

    .sign-box-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }

    .sign-box {
      text-align: center;
      font-size: 8pt;
      padding: 10px 6px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .sign-role {
      font-weight: 700;
      color: #334155;
      min-height: 28px;
    }

    .sign-space {
      height: 48px;
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
      font-size: 18pt;
      font-weight: 800;
      color: #064e3b;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 13.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 32px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #059669;
      page-break-before: always;
      break-before: page;
      letter-spacing: -0.01em;
    }

    .toc h2, .first-chapter h2 {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    h4 {
      font-size: 10pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 22px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin: 14px 0;
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
      padding: 8px 10px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Code & Monospace */
    code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 8.2pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 8pt;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      line-height: 1.45;
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
      margin: 14px 0;
      padding: 10px 14px;
      background: #f8fafc;
      border-left: 4px solid #059669;
      border-radius: 0 6px 6px 0;
      color: #334155;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    blockquote.alert-warning {
      background: #fffbeb;
      border-left-color: #d97706;
      color: #92400e;
    }

    blockquote.alert-danger, blockquote.alert-caution {
      background: #fef2f2;
      border-left-color: #dc2626;
      color: #991b1b;
    }

    blockquote.alert-tip {
      background: #f0fdf4;
      border-left-color: #16a34a;
      color: #166534;
    }

    /* Mermaid Diagrams */
    .mermaid-container {
      margin: 16px 0;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid svg {
      max-width: 100%;
      height: auto;
    }

    /* Math Formula Container */
    .math-formula {
      margin: 12px 0;
      padding: 10px;
      background: #f8fafc;
      border-radius: 6px;
      text-align: center;
      font-size: 10.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }

    /* Table of contents links */
    a {
      color: #047857;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div>
      <span class="cover-badge">Dokumen Resmi Serah Terima Sistem</span>
      <h1 class="cover-title">SIMPATIK POSYANDU</h1>
      <div class="cover-subtitle">Sistem Informasi Posyandu Terintegrasi dan Antropometri Digital</div>
      <p class="cover-desc">
        Dokumentasi komprehensif arsitektur perangkat lunak, spesifikasi modular web modern, katalog endpoint REST API, skema basis data PostgreSQL, isolasi mode sandbox dual-schema, diagram sekuens, serta runbook operasional pemeliharaan sistem.
      </p>

      <div class="cover-meta-grid">
        <div class="meta-item">
          <div class="meta-label">Program & Wilayah Binaan</div>
          <div class="meta-value">KKN Tematik 2026 — Posyandu Tulip RW 18</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Versi Arsitektur</div>
          <div class="meta-value">v2.1-Modular (State-of-the-Art Architecture)</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Tanggal Efektif Handover</div>
          <div class="meta-value">1 November 2026</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Status Verifikasi</div>
          <div class="meta-value">100% Passed (75 Client Tests + 296 Server Tests)</div>
        </div>
      </div>
    </div>

    <div>
      <div class="sign-box-grid">
        <div class="sign-box">
          <div class="sign-role">Bidan / Pembina Teknis<br>Puskesmas Pembina</div>
          <div class="sign-space"></div>
          <div class="sign-name">Bidan Pembina Wilayah</div>
        </div>
        <div class="sign-box">
          <div class="sign-role">Ketua Posyandu<br>Posyandu Tulip RW 18</div>
          <div class="sign-space"></div>
          <div class="sign-name">Sri Mindarti</div>
        </div>
        <div class="sign-box">
          <div class="sign-role">Koordinator Pengembang<br>Tim IT KKN Tematik 2026</div>
          <div class="sign-space"></div>
          <div class="sign-name">Tim Rekayasa Sistem</div>
        </div>
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
              return '<blockquote class="alert-warning">' + quote.replace('[!WARNING]', '<strong>PERINGATAN:</strong>') + '</blockquote>';
            }
            if (quote.includes('[!CAUTION]') || quote.includes('[!DANGER]')) {
              return '<blockquote class="alert-danger">' + quote.replace(/\[!(CAUTION|DANGER)\]/, '<strong>PERHATIAN KRITIS:</strong>') + '</blockquote>';
            }
            if (quote.includes('[!TIP]')) {
              return '<blockquote class="alert-tip">' + quote.replace('[!TIP]', '<strong>TIPS:</strong>') + '</blockquote>';
            }
            if (quote.includes('[!NOTE]') || quote.includes('[!IMPORTANT]')) {
              return '<blockquote>' + quote.replace(/\[!(NOTE|IMPORTANT)\]/, '<strong>CATATAN PENTING:</strong>') + '</blockquote>';
            }
            return '<blockquote>' + quote + '</blockquote>';
          }
        }
      });

      // Parse markdown to HTML
      let html = marked.parse(raw);
      
      // Inject into DOM
      const contentDiv = document.getElementById('content');
      contentDiv.innerHTML = html;

      // Wrap first chapter or TOC if needed
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

      // Render Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true, showSequenceNumbers: true },
        er: { useMaxWidth: true }
      });
      await mermaid.run();

      // Render KaTeX math
      const mathRegex = /\\$\\$([\\s\\S]*?)\\$\\$/g;
      contentDiv.innerHTML = contentDiv.innerHTML.replace(mathRegex, (match, expr) => {
        try {
          return '<div class="math-formula">' + katex.renderToString(expr.trim(), { displayMode: true }) + '</div>';
        } catch (e) {
          return match;
        }
      });

      // Inline math
      const inlineMathRegex = /\\$([^$]+)\\$/g;
      contentDiv.innerHTML = contentDiv.innerHTML.replace(inlineMathRegex, (match, expr) => {
        try {
          return katex.renderToString(expr.trim(), { displayMode: false });
        } catch (e) {
          return match;
        }
      });

      console.log('Rendering complete!');
      document.body.classList.add('ready-to-print');
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlTemplate, 'utf8');
console.log('HTML Handover berhasil dibuat di:', htmlPath);

// Execute Chrome Headless to compile PDF
const chromePath = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
const fileUrl = 'file:///' + htmlPath.replace(/\\\\/g, '/');

console.log('Menjalankan Chrome Headless untuk menyusun PDF...');
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
  console.log(`SUKSES: PDF Handover terkompilasi! Ukuran: ${(stats.size / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error('Gagal menyusun PDF:', err);
  process.exit(1);
}
