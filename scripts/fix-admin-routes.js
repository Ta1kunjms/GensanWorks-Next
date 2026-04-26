const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else if (file === 'route.ts' || file === 'route.js') {
      fileList.push(name);
    }
  });
  return fileList;
}

const adminApiDir = path.join(process.cwd(), 'app', 'api', 'admin');
const routes = getFiles(adminApiDir);

console.log(`Found ${routes.length} admin routes. Applying dynamic fix...`);

routes.forEach(route => {
  let content = fs.readFileSync(route, 'utf8');
  if (!content.includes('export const dynamic')) {
    // Insert after first line or at top
    const lines = content.split('\n');
    lines.unshift('export const dynamic = "force-dynamic";');
    fs.writeFileSync(route, lines.join('\n'));
    console.log(`✅ Fixed: ${route}`);
  } else {
    console.log(`⏭️ Already dynamic: ${route}`);
  }
});
