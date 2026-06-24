const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Find the exact span for "Cộng Tác Viên" and append the badge span right after it.
  // The structure is: <span class="sidebar-nav__text">Cộng Tác Viên</span></a>
  const target = '<span class="sidebar-nav__text">Cộng Tác Viên</span></a>';
  const replacement = '<span class="sidebar-nav__text">Cộng Tác Viên</span><span class="sidebar-nav__badge" id="sb-affiliates" style="display:none"></span></a>';
  
  if (content.includes(target) && !content.includes('id="sb-affiliates"')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(f, content, 'utf8');
  }
});
console.log('Added sb-affiliates badge to HTML files.');
