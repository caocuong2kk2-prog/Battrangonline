const fs = require('fs');
const path = require('path');
const menuItem = `      <li><a href="glazelines.html" class="sidebar-nav__link">
        <svg class="sidebar-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span class="sidebar-nav__text">Dòng men</span></a></li>`;
const files = ['analytics.html', 'categories.html', 'customers.html', 'journey.html', 'orders.html', 'settings.html'];
files.forEach(f => {
  const p = path.join('H:/WORK/Battrangonline/admin', f);
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('href="glazelines.html"')) {
    content = content.replace(/(<a href="categories\.html"[\s\S]*?<\/li>)/, '$1\n' + menuItem);
    fs.writeFileSync(p, content, 'utf8');
    console.log('Updated ' + f);
  }
});
