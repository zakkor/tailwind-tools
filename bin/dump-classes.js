const fs = require('fs');
const path = require('path');

const config = require('../../dist/lib/config.js');
const plugins = require('../../dist/lib/plugins.js');

const cfg = config.loadConfig(path.resolve('./tailwind.config.js'));
const pgs = plugins.pluginClasses(cfg);

const bookmarklet = JSON.stringify(pgs);
fs.writeFileSync('./dist/bookmarklet.js', bookmarklet, {
  flag: 'w+',
});
