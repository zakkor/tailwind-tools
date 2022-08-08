const defaults = {
  'border-style': 'solid',
  'font-size': 'text-base',
  'font-style': 'not-italic',
  'font-weight': 'font-normal',
  'box-sizing': 'box-border',
  'line-height': 'leading-normal',
  '--tw-bg-opacity': '1',
  '--tw-border-opacity': '1',
  '--tw-text-opacity': '1',
};
// List of properties for which we'll try to snap to nearest.
const snapToNearest = ['--tw-border-opacity', '--tw-bg-opacity'];

export function propertiesToClass(
  props,
  byProperties,
  options = { omitDefaults: true, opacityShorthand: true, snapToNearest: true }
) {
  const lookup = (...properties) => {
    // TODO: Snap this to nearest too?
    return byProperties[concatProperties(...properties)];
  };

  let properties = Object.fromEntries(
    props.split(';').map((s) => {
      const [name, value] = s
        .trim()
        .split(':')
        .map((s) => s.trim());
      return [name, value];
    })
  );

  let classnames = [];
  let toLookup = { ...properties };
  for (let [name, value] of Object.entries(properties)) {
    // Rename semi-equivalent property names.
    name = rename(name);

    // Convert between units for certain properties.
    value = convert(name, value);

    // Directly decompose complex CSS rules into multiple properties, after all conversions have run.
    if (decompose(name, value, properties, classnames, byProperties, options)) {
      continue;
    }

    // Otherwise, mark converted property for lookup
    toLookup[name] = value;
  }

  // Iterate over all possible combinations (power set) of properties.
  // First we try to lookup all three
  let skipUnderLength;
  for (const subprops of subsets(Object.entries(toLookup))) {
    if (subprops.length === 0 || (skipUnderLength && subprops.length < skipUnderLength)) {
      break;
    }

    const [[name]] = subprops;
    const found = lookup(subprops);
    if (found && (!options.omitDefaults || (Array.isArray(defaults[name]) ? !defaults[name].includes(found) : defaults[name] !== found))) {
      classnames.push(found);
      skipUnderLength = subprops.length;
      continue;
    }

    // JIT
    for (const [name, value] of subprops) {
      const jit = ['width', 'height'].includes(name);
      if (!jit) {
        continue;
      }
      const zero = lookup([[name, '0px']]);
      if (!zero) {
        continue;
      }
      const prefix = zero.slice(0, -1);
      classnames.push(`${prefix}[${value}]`);
    }
  }

  if (classnames.length === 0) {
    return undefined;
  }
  return classnames.join(' ');
}

function rename(name) {
  if (name === 'background') {
    return 'background-color';
  }
  return name;
}

const rgbaRe = /rgba\([0-9]+, [0-9]+, [0-9]+, [0-9.]+\)/;

function convert(name, value) {
  // Don't convert `0px` as it breaks spacing classes.
  // Border values are in px, so don't convert.
  if (name !== 'border' && value !== '0px') {
    const conv = convertPxToRem(value);
    if (conv !== null) {
      return conv;
    }
  }

  // Only convert percentage for `line-height`, converting other properties (such as `flex: 1 1 0%`) will break them.
  if (name === 'line-height') {
    const conv = convertPercentToDec(value);
    if (conv !== null) {
      return conv;
    }
  }

  let conv = convertHexToRgb(value);
  if (conv !== null) {
    return conv;
  }

  return value;
}

// Converts pixels to rem, like `16px` to `1rem`, or `24px` to `1.5rem`.
const baseFontSize = 16;
const pxRe = /([0-9]+)px/;
function convertPxToRem(rule) {
  const match = rule.match(pxRe);
  if (!match) {
    return null;
  }
  const px = parseInt(match[1]);
  const rem = px / baseFontSize;
  return rule.replace(pxRe, `${rem}rem`);
}

// Converts percentage to number, like `100%` to `1`, or `150%` to `1.5`.
const percRe = /([0-9]+)%/;
function convertPercentToDec(rule) {
  const match = rule.match(percRe);
  if (!match) {
    return null;
  }
  const perc = parseInt(match[1]);
  const dec = perc / 100;
  return rule.replace(percRe, dec);
}

// Converts "#FFFFFF" to "rgba(255, 255, 255, 1)".
const hexRe = /#([0-9a-fA-F]+)/;
function convertHexToRgb(rule) {
  const match = rule.match(hexRe);
  if (!match) {
    return null;
  }
  const rgb = hexToRgb(match[1]);
  return rule.replace(hexRe, `rgba(${rgb}, 1)`);
}
function hexToRgb(hex) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return r + ', ' + g + ', ' + b;
}

/**
 * @returns {boolean} If anything was decomposed or not.
 */
function decompose(name, value, properties, classnames, byProperties, options) {
  const lookup = (...properties) => {
    const f = byProperties[concatProperties(...properties)];
    if (f) {
      return f;
    }

    for (const prop of properties) {
      for (const [name, value] of prop) {
        if (!snapToNearest.includes(name)) {
          continue;
        }
        // TODO: Only works for decimal numbers
        let v = parseFloat(value);

        const distance = 3;
        for (let i = v - distance / 100; i < v + distance / 100; i += 0.01) {
          const sf =
            byProperties[concatProperties(...properties.filter(([[n]]) => n !== name), [[name, i.toFixed(2)]])];
          if (sf) {
            return sf;
          }
        }
      }
    }
    return;
  };
  // Finds classname and inserts it directly, without needing to compose it out of multiple properties.
  const pushClassname = (...properties) => {
    const found = lookup(properties);
    if (found) {
      classnames.push(found);
    }
  };

  if (name === 'color') {
    if (!value.match(rgbaRe)) {
      return false;
    }

    const opacity = alphaOnly(value);

    if (options.opacityShorthand) {
      // Look up color class manually, but don't add it yet. Afterwards we check to see if we can find the opacity value and if so we push the joined classes, like `${color}/${opacity}`
      // Text color
      let colorClassname = lookup([
        ['--tw-text-opacity', '1'],
        ['color', `rgba(${rgbOnly(value)}, var(--tw-text-opacity))`],
      ]);
      // Text opacity
      const found = lookup([['--tw-text-opacity', opacity]]);
      if (found && (!options.omitDefaults || opacity !== defaults['--tw-text-opacity'])) {
        const opacityValue = found.slice(found.lastIndexOf('-') + 1, found.length);
        colorClassname += '/' + opacityValue;
      }
      classnames.push(colorClassname);
    } else {
      // Text color
      pushClassname(['--tw-text-opacity', '1'], ['color', `rgba(${rgbOnly(value)}, var(--tw-text-opacity))`]);
      // Text opacity
      if (!options.omitDefaults || opacity !== defaults['--tw-text-opacity']) {
        pushClassname(['--tw-text-opacity', opacity]);
      }
    }

    return true;
  }
  if (name === 'background-color') {
    if (!value.match(rgbaRe)) {
      return false;
    }

    const opacity = alphaOnly(value);

    if (options.opacityShorthand) {
      // Look up color class manually, but don't add it yet. Afterwards we check to see if we can find the opacity value and if so we push the joined classes, like `${color}/${opacity}`
      // Background color
      let colorClassname = lookup([
        ['--tw-bg-opacity', '1'],
        ['background-color', `rgba(${rgbOnly(value)}, var(--tw-bg-opacity))`],
      ]);
      // Background opacity
      const found = lookup([['--tw-bg-opacity', opacity]]);
      if (found && (!options.omitDefaults || opacity !== defaults['--tw-bg-opacity'])) {
        const opacityValue = found.slice(found.lastIndexOf('-') + 1, found.length);
        colorClassname += '/' + opacityValue;
      }
      classnames.push(colorClassname);
    } else {
      // Background color
      pushClassname(['--tw-bg-opacity', '1'], ['background-color', `rgba(${rgbOnly(value)}, var(--tw-bg-opacity))`]);
      // Background opacity
      if (!options.omitDefaults || opacity !== defaults['--tw-bg-opacity']) {
        pushClassname(['--tw-bg-opacity', opacity]);
      }
    }
    return true;
  }
  if (name === 'border') {
    // `1px solid rgba(121, 134, 148, 0.65)`
    const borderRe = /([0-9]+px) ([a-z]+) (rgba\([0-9]+, [0-9]+, [0-9]+, [0-9.]+\))/;
    const m = value.match(borderRe);
    if (!m) {
      return false;
    }

    const [_, borderWidth, borderStyle, borderColor] = m;
    delete properties['border'];
    // Border width
    pushClassname(['border-width', borderWidth]);

    const opacity = alphaOnly(borderColor);

    // Border style
    if (!options.omitDefaults || borderStyle !== defaults['border-style']) {
      pushClassname(['border-style', borderStyle]);
    }

    if (options.opacityShorthand) {
      // Look up color class manually, but don't add it yet. Afterwards we check to see if we can find the opacity value and if so we push the joined classes, like `${color}/${opacity}`
      // Border color
      let colorClassname = lookup([
        ['--tw-border-opacity', '1'],
        ['border-color', `rgba(${rgbOnly(borderColor)}, var(--tw-border-opacity))`],
      ]);
      // Border opacity
      const found = lookup([['--tw-border-opacity', opacity]]);
      if (found && (!options.omitDefaults || opacity !== defaults['--tw-border-opacity'])) {
        const opacityValue = found.slice(found.lastIndexOf('-') + 1, found.length);
        colorClassname += '/' + opacityValue;
      }
      classnames.push(colorClassname);
    } else {
      // Border color
      pushClassname(
        ['--tw-border-opacity', '1'],
        ['border-color', `rgba(${rgbOnly(borderColor)}, var(--tw-border-opacity))`]
      );
      // Border opacity
      if (!options.omitDefaults || opacity !== defaults['--tw-border-opacity']) {
        pushClassname(['--tw-border-opacity', opacity]);
      }
    }
    return true;
  }
  return false;
}

function rgbOnly(rgba) {
  const m = rgba.match(/rgba\(([0-9]+, [0-9]+, [0-9]+), [0-9.]+\)/);
  return m ? m[1] : rgba;
}

function alphaOnly(rgba) {
  const m = rgba.match(/rgba\([0-9]+, [0-9]+, [0-9]+, ([0-9.]+)\)/);
  return m ? m[1] : rgba;
}

export function concatProperties(properties) {
  let sorted = [];
  for (let [name, value] of properties) {
    // Normalize decimal numbers. `.80` -> `0.8`, `0.80` -> `0.8`, etc.
    const num = Number(value);
    if (!isNaN(num) && !Number.isInteger(num)) {
      value = num.toString();
    }
    // Transform everything to lowercase (especially useful for hex colors).
    const cat = `${name}:${value}`.toLowerCase();
    const i = sortedIndex(sorted, cat);
    sorted.splice(i, 0, cat);
  }
  return sorted.join(';');
}

export function* subsets(array, offset = 0) {
  while (offset < array.length) {
    let first = array[offset++];
    for (let subset of subsets(array, offset)) {
      subset.push(first);
      yield subset;
    }
  }
  yield [];
}

// Lodash `sortedIndex` implementation:
const MAX_ARRAY_LENGTH = 4294967295;
const MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1;
function sortedIndex(array, value, retHighest) {
  let low = 0;
  let high = array == null ? low : array.length;

  if (typeof value === 'number' && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
    while (low < high) {
      const mid = (low + high) >>> 1;
      const computed = array[mid];
      if (computed !== null && !isSymbol(computed) && (retHighest ? computed <= value : computed < value)) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return high;
  }
  return baseSortedIndexBy(array, value, (value) => value, retHighest);
}
function baseSortedIndexBy(array, value, iteratee, retHighest) {
  let low = 0;
  let high = array == null ? 0 : array.length;
  if (high == 0) {
    return 0;
  }

  value = iteratee(value);

  const valIsNaN = value !== value;
  const valIsNull = value === null;
  const valIsSymbol = isSymbol(value);
  const valIsUndefined = value === undefined;

  while (low < high) {
    let setLow;
    const mid = Math.floor((low + high) / 2);
    const computed = iteratee(array[mid]);
    const othIsDefined = computed !== undefined;
    const othIsNull = computed === null;
    const othIsReflexive = computed === computed;
    const othIsSymbol = isSymbol(computed);

    if (valIsNaN) {
      setLow = retHighest || othIsReflexive;
    } else if (valIsUndefined) {
      setLow = othIsReflexive && (retHighest || othIsDefined);
    } else if (valIsNull) {
      setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
    } else if (valIsSymbol) {
      setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
    } else if (othIsNull || othIsSymbol) {
      setLow = false;
    } else {
      setLow = retHighest ? computed <= value : computed < value;
    }
    if (setLow) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return Math.min(high, MAX_ARRAY_INDEX);
}
function isSymbol(value) {
  const type = typeof value;
  return type == 'symbol' || (type === 'object' && value != null && getTag(value) == '[object Symbol]');
}
const toString = Object.prototype.toString;
function getTag(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return toString.call(value);
}
