const fs = require('fs');
const path = require('path');

function replaceHtmlLinks(dir, isUser) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'uploads' && file !== 'css' && file !== 'assets') {
            replaceHtmlLinks(fullPath, isUser);
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace index.html with / or ./
            if (isUser) {
                content = content.replace(/href=["']index\.html["']/g, 'href="/"');
                content = content.replace(/href=["']\.\/index\.html["']/g, 'href="/"');
            } else {
                content = content.replace(/href=["']index\.html["']/g, 'href="./"');
                content = content.replace(/href=["']\.\/index\.html["']/g, 'href="./"');
            }
            
            // Replace other .html links in href
            content = content.replace(/href=["']([a-zA-Z0-9_-]+)\.html["']/g, 'href="$1"');
            content = content.replace(/href=["']\.\/([a-zA-Z0-9_-]+)\.html["']/g, 'href="$1"');
            
            // Replace in JS window.location
            content = content.replace(/window\.location\.href\s*=\s*["']([a-zA-Z0-9_-]+)\.html["']/g, 'window.location.href = "$1"');
            content = content.replace(/window\.location\.href\s*=\s*["']\.\/([a-zA-Z0-9_-]+)\.html["']/g, 'window.location.href = "$1"');
            content = content.replace(/window\.location\.href\s*=\s*["']\/admin\/([a-zA-Z0-9_-]+)\.html["']/g, 'window.location.href = "/admin/$1"');
            content = content.replace(/window\.location\.href\s*=\s*["']\/([a-zA-Z0-9_-]+)\.html["']/g, 'window.location.href = "/$1"');

            // Replace in JS strings ending in .html
            content = content.replace(/(["'])([a-zA-Z0-9_-]+)\.html\1/g, (match, p1, p2) => {
                if (p2 === 'index') {
                    return isUser ? '"/"' : '"./"';
                }
                return '"' + p2 + '"';
            });

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

console.log("Updating user dir...");
replaceHtmlLinks(path.resolve('../../user'), true);
console.log("Updating admin dir...");
replaceHtmlLinks(path.resolve('../../admin'), false);
console.log("Done.");
