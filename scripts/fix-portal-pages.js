const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else if (file === 'page.tsx' || file === 'page.js') {
      fileList.push(name);
    }
  });
  return fileList;
}

const portalDirs = [
  path.join(process.cwd(), 'app', 'admin'),
  path.join(process.cwd(), 'app', 'employer'),
  path.join(process.cwd(), 'app', 'jobseeker')
];

portalDirs.forEach(portalDir => {
  const pages = getFiles(portalDir);
  console.log(`Checking ${portalDir} (${pages.length} pages)...`);

  pages.forEach(page => {
    let content = fs.readFileSync(page, 'utf8');
    if (!content.includes('export const dynamic')) {
      // Add to the top
      const lines = content.split('\n');
      lines.unshift('export const dynamic = "force-dynamic";');
      fs.writeFileSync(page, lines.join('\n'));
      console.log(`✅ Fixed: ${page}`);
    }
  });
});
