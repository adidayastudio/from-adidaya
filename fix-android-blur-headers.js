const fs = require('fs');
const path = require('path');

const targetFiles = [
  'app/project-settings/general.tsx',
  'app/project-settings/stages.tsx',
  'app/project-settings/time-system.tsx',
  'app/project-settings/cost-system.tsx',
  'app/project-settings/work-structure.tsx',
  'app/project-settings/control.tsx',
  'app/project-settings/price-library.tsx',
  'app/project-settings/reports.tsx',
  'app/profile-details/employment.tsx',
  'app/profile-details/account.tsx',
  'app/profile-details/identity.tsx',
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
  'app/(tabs)/search/index.tsx',
  'app/(tabs)/projects/index.tsx',
  'app/(tabs)/tasks/index.tsx',
  'app/(tabs)/actions/index.tsx',
  'app/(tabs)/home/index.tsx',
  'app/(tabs)/home/people.tsx',
  'app/(tabs)/home/finance.tsx',
  'app/(tabs)/home/resources.tsx',
  'app/(tabs)/home/brief-detail.tsx',
  'app/(tabs)/home/adidaya-ai-history.tsx',
  'app/(tabs)/home/vibe-history.tsx',
  'app/(tabs)/home/activity.tsx',
  'app/(tabs)/home/persona.tsx',
  'app/(tabs)/home/learn.tsx',
  'app/(tabs)/home/clock-module.tsx',
  'app/(tabs)/home/crew-module.tsx',
];

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping missing file:', relPath);
    return;
  }

  let code = fs.readFileSync(filePath, 'utf8');
  let original = code;

  // Add import if not present
  if (!code.includes('HeaderBlurBackground')) {
    code = `import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';\n` + code;
  }

  // Replace headerTransparent: Platform.OS === 'ios'
  code = code.replace(/headerTransparent:\s*Platform\.OS\s*===\s*'ios'/g, 'headerTransparent: true');

  // Replace headerBackground if present, or add headerBackground
  if (code.includes('headerBackground:')) {
    code = code.replace(/headerBackground:\s*\(\)\s*=>\s*[^,\n]+/g, 'headerBackground: () => <HeaderBlurBackground isDark={isDark} />');
  } else {
    // Inject headerBackground inside Stack.Screen options
    code = code.replace(/(headerTransparent:\s*true,?)/g, '$1\n                    headerBackground: () => <HeaderBlurBackground isDark={isDark} />,');
  }

  if (code !== original) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Updated:', relPath);
  } else {
    console.log('No changes needed:', relPath);
  }
});
