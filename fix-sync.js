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
      
      if (content.includes('.readyPromise')) {
        content = content.replace(/if \(require\('@\/lib\/auth\/deviceStore'\)\.deviceStore\?\.readyPromise\) {\s*await require\('@\/lib\/auth\/deviceStore'\)\.deviceStore\.readyPromise;\s*}/g, `
  if (require('@/lib/auth/deviceStore').deviceStore) {
    await require('@/lib/auth/deviceStore').deviceStore.loadFromCloud();
  }`);
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('src/app/api');
processDir('src/app/actions');
