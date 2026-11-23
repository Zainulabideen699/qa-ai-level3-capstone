const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const rootDir = path.resolve(__dirname, '..');
const mdPath = path.join(rootDir, 'docs', 'ai-artifacts.md');
const htmlPath = path.join(rootDir, 'docs', 'ai-artifacts.html');
const pdfPath = path.join(rootDir, 'docs', 'ai-artifacts.pdf');

const mdContent = fs.readFileSync(mdPath, 'utf-8');

// Lightweight robust Markdown-to-HTML converter
function convertMdToHtml(md) {
  let html = md;

  // Escape HTML characters inside code blocks first
  const codeBlocks = [];
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang, code });
    return placeholder;
  });

  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1 class="doc-title">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="section-title">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="subsection-title">$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="minor-title">$1</h4>');

  // Blockquotes and Alerts
  html = html.replace(/^> \[!NOTE\]\s*\n([\s\S]*?)(?=\n\n|\n[a-zA-Z#])/gm, (m, content) => {
    return `<div class="alert alert-note"><strong>NOTE:</strong> ${content.trim()}</div>`;
  });
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Markdown links: [text](url) -> <a href="url" target="_blank">text</a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Horizontal Rules
  html = html.replace(/^---$/gm, '<hr/>');

  // Tables
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = [];
  let newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = ['<div class="table-container"><table>'];
        // Header
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml.push('<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
      } else if (line.includes('---')) {
        // separator row, skip
      } else {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
      }
    } else {
      if (inTable) {
        inTable = false;
        tableHtml.push('</tbody></table></div>');
        newLines.push(tableHtml.join(''));
        tableHtml = [];
      }
      newLines.push(lines[i]);
    }
  }
  if (inTable) {
    tableHtml.push('</tbody></table></div>');
    newLines.push(tableHtml.join(''));
  }
  html = newLines.join('\n');

  // Bullet Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\n|.)*?)(?=(<h|<p|<hr|<div|__CODE|\n\n|$))/g, '<ul>$1</ul>');

  // Paragraphs
  html = html.split('\n\n').map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<div') || p.startsWith('<ul') || p.startsWith('<hr') || p.startsWith('<blockquote') || p.startsWith('__CODE')) {
      return p;
    }
    return `<p>${p}</p>`;
  }).join('\n\n');

  // Restore code blocks with formatting
  codeBlocks.forEach((b, idx) => {
    const escaped = b.code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const isDiff = b.code.includes('// ❌') || b.code.includes('// ✅');
    const langClass = b.lang ? `language-${b.lang}` : '';
    const blockHtml = `<div class="code-block ${isDiff ? 'diff-block' : ''}"><div class="code-header">${b.lang.toUpperCase() || 'CODE'}</div><pre><code class="${langClass}">${escaped}</code></pre></div>`;
    html = html.replace(`__CODE_BLOCK_${idx}__`, blockHtml);
  });

  return html;
}

const bodyContent = convertMdToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Level-3 Quality Engineering — AI Artifacts & Governance Pack</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 4px;
      background: #e0f2fe;
      color: #0369a1;
      margin-bottom: 12px;
    }
    h1.doc-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 12px;
    }
    h2.section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    h3.subsection-title {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    h4.minor-title {
      font-size: 11pt;
      font-weight: 600;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p, li {
      font-size: 10pt;
      color: #334155;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    ul {
      margin-top: 4px;
      margin-bottom: 12px;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4px;
    }
    code {
      font-family: "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0f766e;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    a {
      color: #0284c7;
      text-decoration: underline;
      font-weight: 500;
    }
    a:hover {
      color: #0369a1;
    }
    .code-block {
      background: #0f172a;
      border-radius: 6px;
      margin: 12px 0;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .code-header {
      background: #1e293b;
      color: #94a3b8;
      font-size: 8pt;
      font-weight: 700;
      padding: 4px 12px;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #334155;
    }
    pre {
      margin: 0;
      padding: 12px;
      overflow-x: auto;
    }
    pre code {
      background: transparent;
      border: none;
      color: #e2e8f0;
      font-size: 8.5pt;
      padding: 0;
      line-height: 1.45;
      display: block;
      white-space: pre-wrap;
    }
    .table-container {
      margin: 14px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      background: #ffffff;
    }
    th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .alert {
      padding: 10px 14px;
      border-radius: 6px;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    .alert-note {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #166534;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="badge">AI Level-3 QA Capstone &bull; Assessment Deliverable #6</div>
  ${bodyContent}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
console.log(`HTML written to: ${htmlPath}`);

// Generate PDF via Playwright Chromium
(async () => {
  console.log('Launching Playwright Chrome for PDF export...');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  
  await page.setContent(fullHtml, { waitUntil: 'load' });
  
  console.log(`Rendering PDF to: ${pdfPath}...`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-family:sans-serif; font-size:7pt; color:#94a3b8; width:100%; text-align:right; padding-right:15mm;">AI Level-3 Quality Engineering &bull; Deliverable 6 (AI Artifacts & Governance)</div>',
    footerTemplate: '<div style="font-family:sans-serif; font-size:7pt; color:#94a3b8; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });

  await browser.close();
  
  const stats = fs.statSync(pdfPath);
  console.log(`PDF successfully generated! File size: ${stats.size} bytes`);
  console.log(`Location: ${pdfPath}`);
})();
