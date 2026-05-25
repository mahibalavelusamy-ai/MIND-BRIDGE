const fs = require('fs');
const path = require('path');

const directory = './src';

function replaceColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace red with alert
  content = content.replace(/\bred-50\b/g, 'alert-50');
  content = content.replace(/\bred-100\b/g, 'alert-100');
  content = content.replace(/\bred-200\b/g, 'alert-200');
  content = content.replace(/\bred-300\b/g, 'alert-300');
  content = content.replace(/\bred-400\b/g, 'alert-400');
  content = content.replace(/\bred-500\b/g, 'alert-500');
  content = content.replace(/\bred-600\b/g, 'alert-600');
  content = content.replace(/\bred-700\b/g, 'alert-700');
  content = content.replace(/\bred-800\b/g, 'alert-800');
  content = content.replace(/\bred-900\b/g, 'alert-900');
  content = content.replace(/\bred-950\b/g, 'alert-950');

  content = content.replace(/\bamber-50\b/g, 'alert-50');
  content = content.replace(/\bamber-100\b/g, 'alert-100');
  content = content.replace(/\bamber-200\b/g, 'alert-100');
  content = content.replace(/\bamber-300\b/g, 'alert-200');
  content = content.replace(/\bamber-400\b/g, 'alert-300');
  content = content.replace(/\bamber-500\b/g, 'alert-400');
  content = content.replace(/\bamber-600\b/g, 'alert-500');
  content = content.replace(/\bamber-700\b/g, 'alert-600');
  content = content.replace(/\bamber-800\b/g, 'alert-700');
  content = content.replace(/\bamber-900\b/g, 'alert-800');

  content = content.replace(/\bgreen-50\b/g, 'alert-50');
  content = content.replace(/\bgreen-100\b/g, 'alert-50');
  content = content.replace(/\bgreen-200\b/g, 'alert-100');
  content = content.replace(/\bgreen-300\b/g, 'alert-100');
  content = content.replace(/\bgreen-400\b/g, 'alert-200');
  content = content.replace(/\bgreen-500\b/g, 'alert-300');
  content = content.replace(/\bgreen-600\b/g, 'alert-400');
  content = content.replace(/\bgreen-700\b/g, 'alert-500');
  
  // Replace white with text-bg where used for text or background
  content = content.replace(/\btext-white\b/g, 'text-bg');
  // Wait, if bg-white is used, it should be bg-surface or bg-bg.
  // The CSS rule --color-bg is the background.
  content = content.replace(/\bbg-white\b/g, 'bg-bg');
  content = content.replace(/\bbg-white\/20\b/g, 'bg-bg\/20');
  content = content.replace(/\border-white\/40\b/g, 'border-bg\/40');
  content = content.replace(/\border-white\b/g, 'border-bg');

  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceColors(fullPath);
    }
  }
}

processDirectory(directory);
console.log('Colors replaced successfully!');
