import { get, toPath, kebabCase } from 'lodash';
import * as plugins from 'tailwindcss/lib/plugins';
import transformThemeValue from 'tailwindcss/lib/util/transformThemeValue.js';

import { order } from './sort';
import { concatProperties } from './translate.js';

const ignorePlugins = ['preflight', 'container'];

// Map Tailwind class names to their resulting properties.
export function propertiesByClassname(cfg) {
  let byClassname = {};
  cfg.corePlugins
    .filter((p) => !ignorePlugins.includes(p))
    .forEach((plugin) => {
      loadPlugin(cfg, plugin, (classname, properties) => {
        byClassname[classname] = concatProperties(Object.entries(properties));
      });
    });
  return byClassname;
}

// Load all plugins in the order defined by `order`.
export function orderByClassname(cfg) {
  const breakpoints = Object.keys(cfg.theme.screens);

  let byClassname = {};
  let i = 0;
  order
    .filter((p) => !ignorePlugins.includes(p))
    .forEach((plugin) => {
      loadPlugin(cfg, plugin, (classname, _) => {
        byClassname[classname] = i;
        i++;
        breakpoints.forEach((bp) => {
          byClassname[`${bp}:${classname}`] = i;
          i++;
        });
      });
    });
  return byClassname;
}

// Show plugin -> classname mapping
export function pluginClasses(cfg) {
  const plugins = {};
  order
    .filter((p) => !ignorePlugins.includes(p))
    .forEach((plugin) => {
      const name =typeof plugin === 'object' ? plugin.name : plugin;
      plugins[name] = [];
      loadPlugin(cfg, plugin, (classname, _) => {
        plugins[name].push(classname);
      });
    });
  return plugins;
}

// Load all corePlugins into a map where the key is an alphabetically sorted concatenation of the plugin's properties.
export function classnameByProperties(cfg) {
  // Ignore zero negative margin classes, translate to the regular margin classes instead.
  const ignoreClassnames = ['-m-0', '-mx-0', '-my-0', '-mt-0', '-mb-0', '-ml-0', '-mr-0', '-inset-0'];

  let byProperties = {};
  cfg.corePlugins
    .filter((p) => !ignorePlugins.includes(p))
    .forEach((plugin) => {
      loadPlugin(cfg, plugin, (classname, properties) => {
        if (ignoreClassnames.includes(classname)) {
          return;
        }
        const catted = concatProperties(Object.entries(properties));
        byProperties[catted] = classname;
      });
    });
  return byProperties;
}

export function loadPlugin(cfg, plugin, load) {
  let name = plugin;
  let overrides = [];
  if (typeof plugin === 'object') {
    name = plugin.name;
    overrides = plugin.overrides;
  }
  if (!(name in plugins)) {
    throw new Error(`plugin '${name}' doesn't exist`);
  }
  plugins[name]()({
    // Since Tailwind 2.2, dynamic rules are loaded using `matchUtilities`, and static rules are loaded using `addUtilities`.
    matchUtilities: (rules, { values }) => {
      // TODO: animate
      if (rules.animate) {
        return;
      }

      let calculatedRules = {};
      for (const [prefix, matcher] of Object.entries(rules)) {
        for (const [suffix, amount] of Object.entries(values)) {
          const neg = suffix.startsWith('-');
          let classname = `.${neg ? '-' : ''}${prefix}`;
          if (!neg && suffix !== 'DEFAULT') {
            classname += '-';
          }
          if (suffix !== 'DEFAULT') {
            classname += suffix;
          }
          classname = classname.replace('/', '\\/');
          const properties = matcher(amount);
          calculatedRules[classname] = properties;
        }
      }
      loadPluginRules(calculatedRules, overrides, load);
    },
    addUtilities: (rules) => {
      let source = rules;
      if (Array.isArray(rules)) {
        if (rules.length > 1) {
          source = rules.reduce((acc, v) => {
            for (const [key, val] of Object.entries(v)) {
              acc[key] = val;
            }
            return acc;
          }, {});
        } else if (rules.length === 1) {
          source = rules[0];
        }
      }
      loadPluginRules(source, overrides, load);
    },
    theme: themeForConfig(cfg),
    variants: () => {},
    addBase: () => {},
    corePlugins: () => true,
    prefix: (s) => '--tw' + s,
    config: (key) => get(cfg, key),
  });
}

function loadPluginRules(rules, overrides, load) {
  let entries = Object.entries(rules);

  if (overrides.length > 0) {
    for (const ovr of overrides) {
      const ruleIdx = entries.findIndex(([classname]) => classname === '.' + ovr.rule);
      const [kind, destRule] = ovr.place;
      const destIdx = entries.findIndex(([classname]) => classname === '.' + destRule);
      if (kind === 'before') {
        arrayMove(entries, ruleIdx, destIdx);
      }
    }
  }

  entries.forEach(([classname, properties]) => {
    // `space-{}` classnames contain the full CSS selector, which is like `.space-y-150 > :not([hidden]) ~ :not([hidden])`
    // but we only want the first part, so copy everything until the first space.
    let spaceIdx = classname.indexOf(' ');
    if (spaceIdx !== -1) {
      classname = classname.slice(0, spaceIdx);
    }

    // Convert camelCase rules into kebab-case.
    for (const key in properties) {
      // Don't convert variable names like `--tw-bg-opacity`
      if (key.startsWith('--tw-')) {
        continue;
      }

      const kebab = kebabCase(key);
      if (!(kebab in properties)) {
        properties[kebab] = properties[key];
        delete properties[key];
      }
    }

    load(classname.slice(1), properties);
  });
}

function themeForConfig(cfg) {
  return function (path, defaultValue) {
    const [pathRoot, ...subPaths] = toPath(path);
    const value = getConfigValue(cfg, ['theme', pathRoot, ...subPaths], defaultValue);

    const transformedValue = transformThemeValue(pathRoot)(value);
    return transformedValue;
  };
}

function getConfigValue(cfg, path, defaultValue) {
  return path ? get(cfg, path, defaultValue) : cfg;
}

function arrayMove(arr, oldIndex, newIndex) {
  if (newIndex >= arr.length) {
    let k = newIndex - arr.length + 1;
    while (k--) {
      arr.push(undefined);
    }
  }
  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
}
