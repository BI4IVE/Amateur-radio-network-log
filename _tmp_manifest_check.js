const fs = require('fs');
const s = fs.readFileSync('h:/CCCCC/BR4INLOG/test/version/upgrade-manifest.json', 'utf8');
try {
  const m = JSON.parse(s);
  console.log('OK latest=' + m.latest + ' firstVersion=' + m.versions[0].version + ' count=' + m.versions.length);
} catch (e) {
  console.log('ERR ' + e.message);
}
