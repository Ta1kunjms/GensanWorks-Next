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
  pages.forEach(page => {
    let content = fs.readFileSync(page, 'utf8');
    
    // Check if both lines exist and are in the wrong order
    if (content.includes('export const dynamic = "force-dynamic";') && content.includes('"use client"')) {
      const lines = content.split('\n');
      const dynamicIndex = lines.findIndex(l => l.includes('export const dynamic = "force-dynamic";'));
      const useClientIndex = lines.findIndex(l => l.includes('"use client"'));
      
      if (dynamicIndex < useClientIndex) {
        // Swap them
        const temp = lines[dynamicIndex];
        lines[dynamicIndex] = lines[useClientIndex];
        lines[useClientIndex] = temp;
        
        fs.writeFileSync(page, lines.join('\n'));
        console.log(`✅ Fixed order: ${page}`);
      }
    }
  });
});
