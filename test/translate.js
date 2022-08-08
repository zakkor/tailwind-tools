import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { loadConfig } from '../src/config.js';
import { classnameByProperties } from '../src/plugins.js';
import { propertiesToClass, subsets } from '../src/translate.js';

const cfg = loadConfig('../tailwind.config.js');
const byProperties = classnameByProperties(cfg);
const toClass = (properties, options) => propertiesToClass(properties, byProperties, options);

test('static', () => {
//  assert.equal(toClass('display: inline-block'), 'inline-block');
  assert.equal(toClass('position: static'), 'static');
//  assert.equal(toClass('display: none'), 'hidden');
  assert.equal(toClass('align-self: flex-start'), 'self-start');
  assert.equal(toClass('align-self: flex-end'), 'self-end');
  assert.equal(toClass('align-self: auto'), 'self-auto');
//  assert.equal(toClass('flex: 1 1 0%'), 'flex-1');
//  assert.equal(toClass('order: 1'), 'order-1');
//  assert.equal(toClass('order: -9999'), 'order-first');
//  assert.equal(toClass('order: 9999'), 'order-last');
  assert.equal(toClass('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'grid-cols-2');
  assert.equal(toClass('grid-template-columns: none'), 'grid-cols-none');
});
test('dynamic', () => {
  assert.equal(toClass('z-index: 40'), 'z-40');
  assert.equal(toClass('z-index: 40'), 'z-40');
  assert.equal(toClass('z-index: 39'), undefined);
  assert.equal(toClass('color: #7289DA'), 'text-brands-discord');
  assert.equal(toClass('opacity: 0.35'), 'opacity-35');
  assert.equal(toClass('opacity: .65'), 'opacity-65');
  assert.equal(toClass('--tw-bg-opacity: 0.65'), 'bg-opacity-65');
});
test('spacing', () => {
  assert.equal(toClass('margin-left: 4px'), 'ml-1');
  assert.equal(toClass('margin: 2.5rem'), 'm-10');
  assert.equal(toClass('margin-top: 2.5rem'), 'mt-10');
  assert.equal(toClass('margin-bottom: 1rem; margin-top: 1rem'), 'my-4');
  assert.equal(toClass('margin-top: 2rem'), 'mt-8');
  assert.equal(toClass('margin-top: -2rem'), '-mt-8');
  assert.equal(toClass('margin-top: -2rem'), '-mt-8');
  assert.equal(toClass('margin-bottom: 0px'), 'mb-0');
  assert.equal(toClass('top: 0px; bottom: 0px; left: 0px; right: 0px'), 'inset-0');
  assert.equal(toClass('top: 50%; bottom: 50%; left: 50%; right: 50%'), 'inset-2\\/4');
});
test('from config', () => {
  assert.equal(toClass('z-index: 41'), 'z-sidebar');
  assert.equal(toClass('z-index: 50'), 'z-modal-backdrop');
  assert.equal(toClass('z-index: 50'), 'z-modal-backdrop');
  assert.equal(toClass('z-index: 5'), 'z-guest-navbar');
  assert.equal(toClass('font-size: 10px'), 'text-xxs');
  assert.equal(toClass('font-size: 11px'), undefined);
  assert.equal(toClass('transition-duration: 1.5s'), 'duration-1500');
  assert.equal(
    toClass('background-image: linear-gradient(269.77deg, rgba(48, 82, 107, 0.32) 0%, rgba(40, 63, 84, 0.32) 100%)'),
    'bg-card'
  );
});
test('rem', () => {
  assert.equal(toClass('font-size: 0.875rem'), 'text-sm');
});
test('px', () => {
  assert.equal(toClass('font-size: 14px'), 'text-sm');
  assert.equal(toClass('width: 16px'), 'w-4');
  assert.equal(toClass('width: 72px'), 'w-18');
  assert.equal(toClass('height: 72px'), 'h-18');
});
test('percentage', () => {
  assert.equal(toClass('line-height: 100%'), 'leading-none');
  assert.equal(toClass('line-height: 150%'), 'leading-normal');
});
test('hex', () => {
  assert.equal(toClass('color: #262A33'), 'text-neutrals-d80');
  assert.equal(toClass('background-color: #262A33'), 'bg-neutrals-d80');
});
test('border', () => {
  const opts = { omitDefaults: true, opacityShorthand: false };
  assert.equal(
    toClass('border: 1px solid rgba(121, 134, 148, 0.65)', opts),
    'border border-neutrals-l40 border-opacity-65'
  );
  assert.equal(toClass('border: 1px solid rgba(121, 134, 148, 1)', opts), 'border border-neutrals-l40');
  assert.equal(toClass('border: 1px solid #262A33', opts), 'border border-neutrals-d80');
});
test('background', () => {
  const opts = { omitDefaults: true, opacityShorthand: false };
  assert.equal(toClass('background-color: rgba(121, 134, 148, 1)', opts), 'bg-neutrals-l40');
  assert.equal(toClass('background-color: rgba(121, 134, 148, 0.65)', opts), 'bg-neutrals-l40 bg-opacity-65');
  assert.equal(toClass('background: #262A33', opts), 'bg-neutrals-d80');
  assert.equal(toClass('background: url("")'), undefined);
});
test('multiple', () => {
  assert.equal(toClass('margin-top: 8px; margin-left: 12px'), 'mt-2 ml-3');
});
test('omit defaults', () => {
  const opts = { omitDefaults: false };
  assert.equal(toClass('box-sizing: border-box'), undefined);
  assert.equal(toClass('font-style: normal'), undefined);
  assert.equal(toClass('font-weight: 400'), undefined);
  assert.equal(toClass('display: flex'), undefined);
  assert.equal(toClass('align-items: center'), undefined);
  assert.equal(toClass('flex: none'), undefined);
  assert.equal(toClass('flex: none'), undefined);
  assert.equal(toClass('order: 1'), undefined);
  assert.equal(toClass('flex-grow: 0'), undefined); 
  assert.equal(toClass('text-align: right'), undefined);
  assert.equal(toClass('font-style: normal', opts), 'not-italic');
  assert.equal(
    toClass('border: 1px solid rgba(121, 134, 148, 1)', opts),
    'border border-solid border-neutrals-l40 border-opacity-100'
  );
  assert.equal(
    toClass('border: 1px solid #262A33', opts),
    'border border-solid border-neutrals-d80 border-opacity-100'
  );
});
test('opacity shorthand', () => {
  assert.equal(toClass('border: 1px solid rgba(121, 134, 148, 0.65)'), 'border border-neutrals-l40/65');
  assert.equal(toClass('border: 1px solid rgba(121, 134, 148, 1)'), 'border border-neutrals-l40');
  assert.equal(toClass('border: 1px solid #262A33'), 'border border-neutrals-d80');
  assert.equal(toClass('background-color: rgba(121, 134, 148, 1)'), 'bg-neutrals-l40');
  assert.equal(toClass('background-color: rgba(121, 134, 148, 0.65)'), 'bg-neutrals-l40/65');
  assert.equal(toClass('background: #262A33'), 'bg-neutrals-d80');
  assert.equal(toClass('background: url("")'), undefined);
  assert.equal(toClass('color: rgba(121, 134, 148, 0.65)'), 'text-neutrals-l40/65');
});
test('snap to nearest', () => {
  assert.equal(toClass('border: 1px solid rgba(121, 134, 148, 0.66)'), 'border border-neutrals-l40/65');
  assert.equal(toClass('background: rgba(125, 193, 244, 0.16)'), 'bg-functional-b10/15');
});
test('jit', () => {
  assert.equal(toClass('width: 297px'), 'w-[18.5625rem]');
});
test('subsets', () => {
  const gen = subsets(Object.entries({ 'font-style': 'normal', 'font-weight': '500' }));
  assert.equal(gen.next(), {
    value: [
      ['font-weight', '500'],
      ['font-style', 'normal'],
    ],
    done: false,
  });
  assert.equal(gen.next(), { value: [['font-style', 'normal']], done: false });
  assert.equal(gen.next(), { value: [['font-weight', '500']], done: false });
  assert.equal(gen.next(), { value: [], done: false });
  assert.equal(gen.next(), { value: undefined, done: true });
});
test.run();
