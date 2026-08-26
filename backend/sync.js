const fs = require('fs');
const t = fs.readFileSync('e:/ResumeBuilder/Fontend/js/services/template-renderer.js', 'utf8');
let out = t.replace('const TemplateRenderer = (() => {', '');
out = out.replace(/return\s+{\s*templatesList.*?};\s*}\)\(\);/s, 'module.exports = { generateResumeHtml, escapeHtml, renderBullets, parseList };');
fs.writeFileSync('e:/ResumeBuilder/backend/resume-pdf-template.js', out);
