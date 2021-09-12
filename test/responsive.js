import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { loadConfig } from '../src/config.js';
import { propertiesByClassname } from '../src/plugins.js';
import { responsive } from '../src/responsive.js';

test('responsive', () => {
  const cfg = loadConfig('../tailwind.config.js');
  const byClassname = propertiesByClassname(cfg);
  const resp = (bp, ...classnames) => responsive({ byClassname, breakpoints: [bp] }, ...classnames);

  assert.equal(resp('xl', 'text-sm', 'text-xl'), 'text-sm xl:text-xl');
  assert.equal(resp('md', 'h-10', 'h-16'), 'h-10 md:h-16');
  assert.equal(resp('sm', 'h-16', 'h-10'), 'h-16 sm:h-10');
  assert.equal(resp('md', 'text-sm h-16', 'text-xl h-10'), 'text-sm md:text-xl h-16 md:h-10');
  assert.equal(resp('md', 'text-base', 'text-base'), 'text-base');
});

test.run();
