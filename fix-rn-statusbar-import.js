const fs = require('fs');
const path = require('path');

const screenFiles = [
  'app/(tabs)/home/index.tsx',
  'app/(tabs)/home/finance.tsx',
  'app/(tabs)/home/people.tsx',
  'app/(tabs)/home/resources.tsx',
  'app/(tabs)/home/brief-detail.tsx',
  'app/(tabs)/tasks/index.tsx',
  'app/(tabs)/projects/index.tsx',
  'app/(tabs)/actions/index.tsx',
  'app/project-details/[id].tsx',
  'app/project-settings.tsx',
  'app/project-settings/general.tsx',
  'app/project-settings/stages.tsx',
  'app/project-settings/time-system.tsx',
  'app/project-settings/cost-system.tsx',
  'app/project-settings/work-structure.tsx',
  'app/project-settings/control.tsx',
  'app/project-settings/price-library.tsx',
  'app/project-settings/reports.tsx',
  'app/profile-details/identity.tsx',
  'app/profile-details/account.tsx',
  'app/profile-details/employment.tsx',
  'app/profile-details/access.tsx',
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

screenFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;

  let code = fs.readFileSync(filePath, 'utf8');

  // Replace StatusBar.currentHeight with RNStatusBar.currentHeight
  code = code.replace(/StatusBar\.currentHeight/g, "RNStatusBar.currentHeight");

  // Ensure RNStatusBar import exists
  if (code.includes('RNStatusBar') && !code.includes('StatusBar as RNStatusBar')) {
    if (code.includes("from 'react-native';")) {
      code = code.replace("from 'react-native';", ", StatusBar as RNStatusBar } from 'react-native';");
    } else if (code.includes('import {')) {
      code = code.replace('import {', 'import { StatusBar as RNStatusBar, ');
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Fixed RNStatusBar import in:', relPath);
});
