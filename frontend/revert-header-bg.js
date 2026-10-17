const fs = require('fs');
const files = [
  'app/(tabs)/home/index.tsx',
  'app/(tabs)/home/clock-module.tsx',
  'app/(tabs)/home/people.tsx',
  'app/(tabs)/home/finance.tsx',
  'app/(tabs)/home/resources.tsx',
  'app/(tabs)/home/crew-module.tsx',
  'app/(tabs)/tasks/index.tsx',
  'app/(tabs)/projects/index.tsx',
  'app/(tabs)/actions/index.tsx',
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');
  let original = code;
  
  // Revert the <View> headerBackground back to () => null
  code = code.replace(
    /headerBackground:\s*\(\)\s*=>\s*<View\s+style=\{\{[^}]*\}\}\s*pointerEvents="none"\s*\/>,?/g,
    'headerBackground: () => null,'
  );
  
  if (code !== original) {
    fs.writeFileSync(f, code);
    console.log('Reverted:', f);
  } else {
    console.log('No change needed:', f);
  }
});
