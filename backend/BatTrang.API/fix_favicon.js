const fs = require('fs');
const path = require('path');

function replaceFavicon(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'uploads' && file !== 'css' && file !== 'assets' && file !== 'components') {
            replaceFavicon(fullPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Remove all existing icon links
            content = content.replace(/<link rel="icon"[^>]*>\s*/g, '');
            
            if (content !== originalContent) {
                content = content.replace('</head>', '  <link rel="icon" type="image/x-icon" href="/favicon.ico">\n</head>');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated favicon in:', fullPath);
            } else if (!content.includes('rel="icon"')) {
                content = content.replace('</head>', '  <link rel="icon" type="image/x-icon" href="/favicon.ico">\n</head>');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Added favicon to:', fullPath);
            }
        }
    }
}

console.log("Fixing affiliate dir...");
replaceFavicon(path.resolve('../../affiliate'));
console.log("Done.");
