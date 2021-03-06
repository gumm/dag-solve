// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [{
  input: 'src/dag.js',
  output: {
    file: 'dist/_temp.js',
    format: 'iife',
    name: 'Dag',
  },
  plugins: [
    resolve(),
    commonjs()
  ],
  treeshake: true
},
  {
    input: 'src/dag.js',
    output: {
      file: 'main.js',
      format: 'cjs',
      name: 'Dag',
    },
    plugins: [
      resolve(),
      commonjs()
    ],
    treeshake: true
  }];