const fs = require('fs');
const pkg = require('../package.json');
const envPath = '.env';

let env = '';
if (fs.existsSync(envPath)) {
  env = fs.readFileSync(envPath, 'utf8');
  env = env.replace(/^VITE_APP_VERSION=.*$/m, ''); // Remove old version if exists
}
env += `\nVITE_APP_VERSION=${pkg.version}\n`;
fs.writeFileSync(envPath, env.trim() + '\n');
console.log(`Set VITE_APP_VERSION=${pkg.version} in .env`);
