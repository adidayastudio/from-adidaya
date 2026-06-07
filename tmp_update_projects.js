const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find /Users/manustravo/MANUSTRAVO/Work/007-ADIDAYA-WEBSITE/from-adidaya/components -type f -name "*.tsx"').toString().split('\n').filter(Boolean);

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  if (content.includes('projectName: "Adidaya Clock ')) {
    content = content.replace(/projectName: "Adidaya Clock /g, 'projectName: "Adidaya Studio (PT Mahardika Adidaya) - Clock ');
    changed = true;
  }
  
  if (content.includes('projectName: "Adidaya Crew ')) {
    content = content.replace(/projectName: "Adidaya Crew /g, 'projectName: "Adidaya Studio (PT Mahardika Adidaya) - Crew ');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  }
});
