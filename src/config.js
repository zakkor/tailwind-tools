import fs from 'fs';
import resolveConfig from 'tailwindcss/lib/util/resolveConfig.js';
import getAllConfigs from 'tailwindcss/lib/util/getAllConfigs.js';

export function loadConfig(path) {
  const config = require(path);
  return resolveConfig([...getAllConfigs(config), { corePlugins: { caretColor: false, content: false } }]);
}

export function evalConfig(path) {
  // Can't dynamically require because not supported by Rollup, so this is what we have to do unfortunately...
  const config = eval(fs.readFileSync(path, 'utf-8'));
  return resolveConfig([...getAllConfigs(config), { corePlugins: { caretColor: false, content: false } }]);
}
