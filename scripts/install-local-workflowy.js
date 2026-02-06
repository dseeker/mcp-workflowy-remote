#!/usr/bin/env node
/**
 * Postinstall script to copy local workflowy library
 * This avoids symlink issues on Windows while still using local development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../workflowy');
const targetDir = path.resolve(__dirname, '../node_modules/workflowy');

// Only proceed if the local workflowy directory exists
if (!fs.existsSync(sourceDir)) {
  console.log('Local workflowy library not found at', sourceDir);
  console.log('Skipping local workflowy installation.');
  process.exit(0);
}

console.log('Installing local workflowy library...');
console.log('Source:', sourceDir);
console.log('Target:', targetDir);

// Check if source has been built
if (!fs.existsSync(path.join(sourceDir, 'dist', 'index.js'))) {
  console.error('Error: workflowy library not built. Run "npm run build" in', sourceDir);
  process.exit(1);
}

// Remove existing workflowy in node_modules
if (fs.existsSync(targetDir)) {
  console.log('Removing existing workflowy package...');
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// Create target directory
fs.mkdirSync(targetDir, { recursive: true });

// Copy files
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy dist folder
copyDir(path.join(sourceDir, 'dist'), path.join(targetDir, 'dist'));

// Copy package.json and README
fs.copyFileSync(path.join(sourceDir, 'package.json'), path.join(targetDir, 'package.json'));
if (fs.existsSync(path.join(sourceDir, 'README.md'))) {
  fs.copyFileSync(path.join(sourceDir, 'README.md'), path.join(targetDir, 'README.md'));
}

// Install production dependencies for workflowy
console.log('Installing workflowy dependencies...');
import { execSync } from 'child_process';
execSync('npm install --omit=dev', { 
  cwd: targetDir, 
  stdio: 'inherit' 
});

console.log('[OK] Local workflowy library installed successfully!');
