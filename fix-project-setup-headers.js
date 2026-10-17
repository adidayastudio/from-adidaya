const fs = require('fs');
const path = require('path');

const setupFiles = [
  'app/project-setup/[id]/index.tsx',
  'app/project-setup/[id]/general.tsx',
  'app/project-setup/[id]/stages.tsx',
  'app/project-setup/[id]/time-system.tsx',
  'app/project-setup/[id]/cost-system.tsx',
  'app/project-setup/[id]/price-library.tsx',
  'app/project-setup/[id]/control.tsx',
  'app/project-setup/[id]/work-structure.tsx',
  'app/project-setup/[id]/reports.tsx',
];

setupFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;

  let code = fs.readFileSync(filePath, 'utf8');

  // Ensure headerTransparent: true
  code = code.replace(/headerTransparent:\s*Platform\.OS\s*===\s*'ios'/g, 'headerTransparent: true');

  // Replace headerBackground block completely
  code = code.replace(/headerBackground:\s*\(\)\s*=>\s*<HeaderBlurBackground[^>]*\/>[\s\S]*?headerTintColor:/g, 'headerBackground: () => <HeaderBlurBackground isDark={isDark} />,\n                    headerTintColor:');

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Fixed setup file:', relPath);
});
