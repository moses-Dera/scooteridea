const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('/home/moze/codes/scooteridea/frontend');

let changedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    .replace(/<h[1-6]\b/g, '<div')
    .replace(/<\/h[1-6]>/g, '</div>');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changedCount++;
  }
});
console.log('Successfully replaced heading tags with divs in ' + changedCount + ' files.');
