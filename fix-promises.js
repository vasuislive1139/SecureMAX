const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('route.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('NextResponse.json') && !content.includes('lastSyncPromise')) {
        let newContent = content.replace(/return NextResponse\.json/g, `
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json`);
        fs.writeFileSync(fullPath, newContent);
      }
    }
  }
}
processDir('src/app/api');
