const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Add import if not present
      if (!content.includes('import connectToDatabase')) {
        content = 'import connectToDatabase from "@/lib/mongoose";\n' + content;
        changed = true;
      }

      // Add await connectToDatabase() to POST, GET, PUT, PATCH, DELETE
      const methods = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'];
      for (const method of methods) {
        const regex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*\\{\\s*(?:try\\s*\\{)?`, 'g');
        content = content.replace(regex, (match) => {
          if (!content.substring(content.indexOf(match), content.indexOf(match) + 100).includes('connectToDatabase()')) {
            changed = true;
            return match + '\n    await connectToDatabase();\n';
          }
          return match;
        });
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'app', 'api'));
console.log('Done.');
