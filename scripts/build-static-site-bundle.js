const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const siteDir = path.join(projectRoot, 'assets', 'site');
const outputFile = path.join(projectRoot, 'site-bundle.js');

const read = (name) => fs.readFileSync(path.join(siteDir, name), 'utf8');

let html = read('index.html');
const css = read('styles.css');
const db = read('db.js');
const app = read('app.js');

html = html.replace(
  '<link rel="stylesheet" href="styles.css" />',
  `<style>\n${css}\n</style>`
);
html = html.replace(
  '<script src="db.js?v=20260824-persistence1"></script>',
  `<script>\n${db}\n</script>`
);
html = html.replace(
  '<script src="app.js?v=20260824-persistence1"></script>',
  `<script>\n${app}\n</script>`
);

const output = `// Auto-generated from assets/site. Do not edit by hand.\nexport const STATIC_SITE_HTML = ${JSON.stringify(html)};\n`;
fs.writeFileSync(outputFile, output);
console.log(`Generated ${path.relative(projectRoot, outputFile)} (${Buffer.byteLength(output, 'utf8')} bytes).`);
