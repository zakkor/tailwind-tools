const fs = require('fs');
const path = require('path');
const util = require('util');

const config = require('../../dist/lib/config.js');
const plugins = require('../../dist/lib/plugins.js');

const cfg = config.loadConfig(path.resolve('./tailwind.config.js'));
const byProperties = plugins.classnameByProperties(cfg);
const byClassname = plugins.propertiesByClassname(cfg);

const bookmarklet = `${fs.readFileSync('./bin/figma-tailwind/runtime.js', 'utf-8')}
let byClassname = ${util.inspect(byClassname)};
let byProperties = ${util.inspect(byProperties)};`;

fs.writeFileSync('./dist/bookmarklet.js', bookmarklet, {
  flag: 'w+',
});
