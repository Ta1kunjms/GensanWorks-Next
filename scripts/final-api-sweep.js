const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
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

const apiDirs = [
  path.join(process.cwd(), 'app', 'api', 'employer'),
  path.join(process.cwd(), 'app', 'api', 'jobseeker'),
  path.join(process.cwd(), 'app', 'api', 'public')
];

apiDirs.forEach(apiDir => {
  const routes = getFiles(apiDir);
  console.log(`Checking ${apiDir} (${routes.length} routes)...`);

  routes.forEach(route => {
    let content = fs.readFileSync(route, 'utf8');
    if (!content.includes('export const dynamic')) {
      const lines = content.split('\n');
      lines.unshift('export const dynamic = "force-dynamic";');
      fs.writeFileSync(route, lines.join('\n'));
      console.log(`✅ Fixed: ${route}`);
    }
  });
});
