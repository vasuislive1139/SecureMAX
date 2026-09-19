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
      
      // Fix API Routes
      if (content.includes('export async function POST') && !content.includes('readyPromise')) {
        content = content.replace(/export async function POST\([^)]*\)\s*{/g, `$&
  if (require('@/lib/auth/deviceStore').deviceStore?.readyPromise) {
    await require('@/lib/auth/deviceStore').deviceStore.readyPromise;
  }`);
        modified = true;
      }
      if (content.includes('export async function GET') && !content.includes('readyPromise')) {
        content = content.replace(/export async function GET\([^)]*\)\s*{/g, `$&
  if (require('@/lib/auth/deviceStore').deviceStore?.readyPromise) {
    await require('@/lib/auth/deviceStore').deviceStore.readyPromise;
  }`);
        modified = true;
      }
      
      // Fix Server Actions
      if (content.includes("'use server'") && !content.includes('readyPromise')) {
        content = content.replace(/export async function ([a-zA-Z0-9_]+)\([^)]*\)\s*{/g, `$&
  if (require('@/lib/auth/deviceStore').deviceStore?.readyPromise) {
    await require('@/lib/auth/deviceStore').deviceStore.readyPromise;
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
