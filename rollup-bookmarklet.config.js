import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import analyze from 'rollup-plugin-analyzer';

export default {
  input: 'dist/bookmarklet.js',
  plugins: [commonjs(), terser(), analyze()],
  output: {
    file: 'dist/bookmarklet.bundle.js',
    format: 'iife',
  },
};
