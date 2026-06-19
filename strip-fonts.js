const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/\bfont-serif\b/g, '')
    .replace(/\bfont-mono\b/g, '')
    .replace(/ +(?=")/g, '') // remove trailing spaces before quotes
    .replace(/ +(?=')/g, '')
    .replace(/ +(?=`)/g, '')
    .replace(/className="\s+/g, 'className="') // cleanup leading spaces
    .replace(/className='\s+/g, "className='")
    .replace(/className={`\s+/g, "className={`");

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir(path.join(__dirname, 'app'), processFile);
walkDir(path.join(__dirname, 'components'), processFile);

console.log('Done stripping font classes.');
