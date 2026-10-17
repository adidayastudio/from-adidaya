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
  
  if (code.includes('headerBackground: () => null')) {
    // Add View import if missing
    if (!code.includes('import { View')) {
      code = code.replace(/import \{([^}]+)\}\ from 'react-native';/, "import { $1, View } from 'react-native';");
    }
    
    code = code.replace(/headerBackground:\s*\(\)\s*=>\s*null,?/g, "headerBackground: () => <View style={{ flex: 1, backgroundColor: 'transparent' }} pointerEvents=\"none\" />,");
    fs.writeFileSync(f, code);
    console.log('Fixed touches on', f);
  }
});
