const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.resolve(ROOT_DIR, 'scratch/full_codebase.txt');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'graphify-out',
  '.agents',
  '.vscode',
  '.claude',
  'src_DEPRECATED',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.json',
  '.sql',
  '.css',
  '.html',
  '.js'
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json',
  'skills-lock.json'
]);

let fileCount = 0;
let totalSize = 0;

function shouldProcess(filePath, stats) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  
  if (EXCLUDED_FILES.has(baseName)) return false;
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  
  // Skip files larger than 500KB (like package-lock if not caught, or huge database exports)
  if (stats.size > 500000) return false;
  
  return true;
}

function traverseAndWrite(dir, writeStream) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(ROOT_DIR, fullPath);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      if (EXCLUDED_DIRS.has(file)) continue;
      traverseAndWrite(fullPath, writeStream);
    } else if (stats.isFile()) {
      if (shouldProcess(fullPath, stats)) {
        writeStream.write(`\n==================================================\n`);
        writeStream.write(`FILE: ${relPath}\n`);
        writeStream.write(`==================================================\n\n`);
        
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          writeStream.write(content);
          writeStream.write(`\n`);
          fileCount++;
          totalSize += stats.size;
        } catch (err) {
          writeStream.write(`[Error reading file: ${err.message}]\n`);
        }
      }
    }
  }
}

console.log('Compiling codebase...');
const writeStream = fs.createWriteStream(OUTPUT_FILE, 'utf8');
traverseAndWrite(ROOT_DIR, writeStream);
writeStream.end();

writeStream.on('finish', () => {
  console.log(`Successfully compiled ${fileCount} files.`);
  console.log(`Total package size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`File created at: ${OUTPUT_FILE}`);
});
