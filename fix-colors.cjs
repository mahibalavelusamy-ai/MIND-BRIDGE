const fs = require('fs');
const path = require('path');

const directory = './src';

function fixColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Vault Locked header and others that shouldn't be text-bg
  content = content.replace(/text-4xl font-serif mb-4 text-bg/g, 'text-4xl font-serif mb-4 text-text-main');
  content = content.replace(/text-3xl font-serif font-bold text-bg/g, 'text-3xl font-serif font-bold text-text-main');
  content = content.replace(/text-4xl md:text-5xl font-serif mb-16 text-center tracking-tight text-bg shadow-sm/g, 'text-4xl md:text-5xl font-serif mb-16 text-center tracking-tight text-text-main shadow-sm');
  
  // Revert dark:text-bg to dark:text-text-main or just text-text-main
  content = content.replace(/text-slate-900 dark:text-bg/g, 'text-text-main');
  content = content.replace(/dark:text-bg/g, 'dark:text-bg'); 
  
  // Let's manually fix LandingPage
  if (filePath.includes('LandingPage.tsx')) {
    content = content.replace(/text-slate-900 dark:text-bg/g, 'text-text-main');
  }

  if (filePath.includes('App.tsx')) {
    content = content.replace(/child\.age >= 18 \? <span className="font-serif text-bg">/g, 'child.age >= 18 ? <span className="font-serif text-text-main">');
    content = content.replace(/group-hover:text-bg transition-colors/g, 'group-hover:text-text-main transition-colors');
    content = content.replace(/<Plus className="text-slate-300 group-hover:text-bg" size={48} \/>/g, '<Plus className="text-slate-300 group-hover:text-text-main" size={48} />');
  }

  if (filePath.includes('Assessment.tsx')) {
    content = content.replace(/text-slate-900 dark:text-bg bg-surface-2/g, 'text-text-main bg-surface-2');
  }

  // Dashboard Mega prize bug
  if (filePath.includes('Dashboard.tsx')) {
    content = content.replace(/text-orange-600 dark:text-bg/g, 'text-orange-600 dark:text-orange-100');
    content = content.replace(/text-accent dark:text-bg/g, 'text-accent');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixColors(fullPath);
    }
  }
}

processDirectory(directory);
console.log('Colors fixed successfully!');
