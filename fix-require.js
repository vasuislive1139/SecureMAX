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
        // Change dynamic require to static deviceStore
        content = content.replace(/require\('@\/lib\/auth\/deviceStore'\)\.deviceStore/g, "deviceStore");
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
