const fs = require('fs');
const path = require('path');

const files = [
  'app/dashboard/history/page.tsx',
  'app/dashboard/profile/page.tsx',
  'app/dashboard/vendor-history/page.tsx'
];

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/import\s+{\s*Fraunces\s*}\s+from\s*['"]next\/font\/google['"];?\n/g, '');
  content = content.replace(/const\s+fraunces\s*=\s*Fraunces\(\{[^}]+\}\);?\n/g, '');
  content = content.replace(/\$\{fraunces\.className\}\s*/g, '');
  // also clean up any empty classNames that might have been left
  content = content.replace(/className=" "/g, 'className=""');
  
  fs.writeFileSync(p, content, 'utf8');
  console.log('Stripped Fraunces from ' + f);
});
