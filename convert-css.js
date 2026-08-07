const fs = require('fs');

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

const files = ['src/styles/Admin.module.css', 'src/styles/Redirect.module.css'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\.([a-z][a-z0-9-]*)/g, (match, className) => {
      return '.' + toCamelCase(className);
    });
    fs.writeFileSync(file, content);
    console.log(`Converted ${file}`);
  }
});
