import { suite } from 'uvu';
import * as assert from 'uvu/assert';

import { loadConfig } from '../src/config.js';
import { orderByClassname } from '../src/plugins.js';
import { sortClasses } from '../src/sort.js';

const s = suite('sort');
s('sorts', () => {
  const cfg = loadConfig('../tailwind.config.js');
  const byClassname = orderByClassname(cfg);
  const sort = (classnames) => sortClasses(classnames, byClassname);

  assert.equal(sort('mt-4 relative'), 'relative mt-4');
  assert.equal(sort('xl:mt-8 mt-4 relative'), 'relative mt-4 xl:mt-8');
  assert.equal(sort('space-x-8 xl:mt-8 mt-4 relative'), 'relative space-x-8 mt-4 xl:mt-8');
  assert.equal(
    sort('hidden lg:block text-base leading-none text-neutrals-l00 ml-6 mr-4'),
    'hidden lg:block text-base text-neutrals-l00 leading-none mr-4 ml-6'
  );
  assert.equal(sort('sm:flex-row flex flex-col'), 'flex flex-col sm:flex-row');
  assert.equal(sort('h-[41px] flex-col w-32'), 'w-32 h-[41px] flex-col');
});
s.run();
