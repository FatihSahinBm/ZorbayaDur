const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.tsx')) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(path.join(__dirname, '..'), []);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace background colors
  content = content.replace(/\bbg-slate-950\b/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/\bbg-slate-900\b/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/\bbg-slate-800\b/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/\bbg-slate-950\/50\b/g, 'bg-white/50 dark:bg-slate-950/50');
  content = content.replace(/\bbg-slate-900\/80\b/g, 'bg-white/80 dark:bg-slate-900/80');
  content = content.replace(/\bbg-slate-950\/80\b/g, 'bg-white/80 dark:bg-slate-950/80');
  
  // Replace text colors
  content = content.replace(/\btext-slate-50\b/g, 'text-slate-900 dark:text-slate-50');
  content = content.replace(/\btext-slate-200\b/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/\btext-slate-300\b/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/\btext-slate-400\b/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/\btext-slate-500\b/g, 'text-slate-400 dark:text-slate-500');
  
  // Custom text-white to support dark mode transition (change text-white inside text sections, but NOT inside icons if they want default white)
  // Let's change common text-white containers to text-slate-900 dark:text-white
  content = content.replace(/\btext-white\b/g, 'text-slate-900 dark:text-white');
  
  // Replace borders
  content = content.replace(/\bborder-slate-800\b/g, 'border-slate-200 dark:border-slate-800');
  content = content.replace(/\bborder-slate-800\/50\b/g, 'border-slate-200/50 dark:border-slate-800/50');
  content = content.replace(/\bborder-white\/10\b/g, 'border-slate-200 dark:border-white/10');
  content = content.replace(/\bborder-white\/5\b/g, 'border-slate-100 dark:border-white/5');
  
  // Replace active styles
  content = content.replace(/\bdata-\[state=active\]:text-white\b/g, 'data-[state=active]:text-white dark:data-[state=active]:text-white');
  content = content.replace(/\bbg-slate-950\/50\b/g, 'bg-slate-100 dark:bg-slate-950/50');

  // Let's also fix custom gradients
  content = content.replace(
    /from-rose-900\/20 via-slate-950 to-slate-950/g,
    'from-rose-100/50 via-slate-50 to-slate-50 dark:from-rose-900/20 dark:via-slate-950 dark:to-slate-950'
  );

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Successfully completed color migrations across TSX files.');
