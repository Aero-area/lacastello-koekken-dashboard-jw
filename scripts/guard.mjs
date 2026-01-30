#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FORBIDDEN_PATTERNS = [
  /react-native/,
  /expo/,
  /lucide-react-native/
];

function scanDirectory(dir, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
  const errors = [];
  
  function scanFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        FORBIDDEN_PATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            errors.push(`${filePath}:${index + 1}: ${line.trim()}`);
          }
        });
      });
    } catch (err) {
      // Skip files that can't be read
    }
  }
  
  function walkDir(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          walkDir(fullPath);
        }
      } else if (stat.isFile() && /\.(js|jsx|ts|tsx|json)$/.test(item)) {
        scanFile(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return errors;
}

const errors = scanDirectory(process.cwd());

if (errors.length > 0) {
  console.error('❌ Build guard failed: Found forbidden mobile imports:');
  errors.forEach(error => console.error(`  ${error}`));
  process.exit(1);
}

console.log('✅ Build guard passed: No mobile imports detected');