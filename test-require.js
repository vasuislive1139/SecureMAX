const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let modified = false;
      
      if (content.includes("require('@/lib/auth/deviceStore')")) {
        // Change it to use a static import if possible, or relative require
        // Actually, just change it to deviceStore if deviceStore is imported
        if (content.includes("import { deviceStore")) {
          content = content.replace(/if \(require\('@\/lib\/auth\/deviceStore'\)\.deviceStore\) {\s*await require\('@\/lib\/auth\/deviceStore'\)\.deviceStore\.loadFromCloud\(\);\s*}/g, `
  if (typeof deviceStore !== 'undefined') {
    await deviceStore.loadFromCloud();
  }`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('src/app/api');
processDir('src/app/actions');
