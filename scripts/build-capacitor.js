const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'src', 'app', 'api');
const hiddenApiDir = path.join(rootDir, 'src', 'app-api-hidden');
const hiddenApiDirInApp = path.join(rootDir, 'src', 'app', 'api.hidden');

function hideApiRoutes() {
  // Clean up any leftover api.hidden in app directory
  if (fs.existsSync(hiddenApiDirInApp)) {
    fs.rmSync(hiddenApiDirInApp, { recursive: true, force: true });
    console.log('[build-capacitor] Cleaned up leftover api.hidden');
  }
  
  // Clean up any leftover app-api-hidden
  if (fs.existsSync(hiddenApiDir)) {
    fs.rmSync(hiddenApiDir, { recursive: true, force: true });
    console.log('[build-capacitor] Cleaned up leftover app-api-hidden');
  }
  
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, hiddenApiDir);
    console.log('[build-capacitor] Moved API routes to', hiddenApiDir);
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(hiddenApiDir)) {
    // Clean up any leftover api.hidden in app directory first
    if (fs.existsSync(hiddenApiDirInApp)) {
      fs.rmSync(hiddenApiDirInApp, { recursive: true, force: true });
    }
    fs.renameSync(hiddenApiDir, apiDir);
    console.log('[build-capacitor] Restored API routes');
  }
  
  // Also clean up any api.hidden that might have been created
  if (fs.existsSync(hiddenApiDirInApp)) {
    fs.rmSync(hiddenApiDirInApp, { recursive: true, force: true });
    console.log('[build-capacitor] Cleaned up api.hidden');
  }
}

function main() {
  console.log('[build-capacitor] Starting Capacitor build...');
  
  // Backup original config
  const originalConfig = path.join(rootDir, 'next.config.mjs');
  const backupConfig = path.join(rootDir, 'next.config.mjs.bak');
  const capacitorConfig = path.join(rootDir, 'next.config.capacitor.mjs');
  
  if (fs.existsSync(originalConfig)) {
    fs.copyFileSync(originalConfig, backupConfig);
  }
  
  // Use capacitor config
  fs.copyFileSync(capacitorConfig, originalConfig);
  console.log('[build-capacitor] Using Capacitor config');
  
  try {
    // Hide API routes
    hideApiRoutes();
    
    // Run build
    console.log('[build-capacitor] Running next build...');
    execSync('npm run build', { 
      cwd: rootDir, 
      stdio: 'inherit',
      env: { ...process.env, CAPACITOR_BUILD: 'true' }
    });
    
    console.log('[build-capacitor] Build successful!');
    
  } catch (error) {
    console.error('[build-capacitor] Build failed:', error.message);
    process.exit(1);
  } finally {
    // Restore API routes
    restoreApiRoutes();
    
    // Restore original config
    if (fs.existsSync(backupConfig)) {
      fs.copyFileSync(backupConfig, originalConfig);
      fs.unlinkSync(backupConfig);
      console.log('[build-capacitor] Restored original config');
    }
  }
}

main();