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
  
  // Fix duplicate View imports
  code = code.replace(/,\s*View\s*\} from 'react-native';/g, "} from 'react-native';");
  
  fs.writeFileSync(f, code);
  console.log('Fixed imports on', f);
});
