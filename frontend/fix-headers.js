const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let files = [];
walkDir('app/(tabs)', (filePath) => {
    if (filePath.endsWith('.tsx')) {
        files.push(filePath);
    }
});

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace headerTransparent
    content = content.replace(/headerTransparent:\s*Platform\.OS\s*===\s*'ios',/g, "headerTransparent: true,");
    
    // Replace headerStyle backgroundColor
    content = content.replace(/headerStyle:\s*\{\s*backgroundColor:\s*isDark\s*\?\s*'(?:#000000|#000)'\s*:\s*'#F2F2F7'\s*\}/g, "headerStyle: { backgroundColor: 'transparent' },\n                headerBackground: () => null");

    // Fix Android paddingTop
    content = content.replace(/paddingTop:\s*Platform\.OS\s*===\s*'android'\s*\?\s*16\s*:\s*0/g, "paddingTop: Platform.OS === 'android' ? (typeof insets !== 'undefined' ? insets.top + 70 : 100) : 0");

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
    }
});
