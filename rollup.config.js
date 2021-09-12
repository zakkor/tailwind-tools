import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.js',
  plugins: [resolve(), json(), commonjs()],
  output: {
    file: 'lib/index.js',
    format: 'cjs',
  },
};
