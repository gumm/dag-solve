#!/bin/bash

WORKSPACE=$1

echo "${WORKSPACE}"
cd ${WORKSPACE}

PROD=(
  "--language_in=ES6_Strict"
  "--language_out=ES5_Strict"
  "--compilation_level=SIMPLE"
  "--js_output_file=dist/dag-solve.min.js"
  "--dependency_mode=STRICT"
  "--entry_point=dist/_temp.js"
  "dist/_temp.js"
)

OPTS=(
  "--language_in=ES6_Strict"
  "--language_out=ES5"
  "--compilation_level=ADVANCED"
  "--js_output_file=dist/dag-solve.min.js"
  "--hide_warnings_for=node_modules"
  "--dependency_mode=STRICT"
  "--entry_point=src/dag.mjs"
  # "node_modules/!(test)**/!(test).js"
  "node_modules/badu/module/badu.mjs"
  "src/**.mjs"
)

shopt -s extglob globstar
set -ex
java -jar node_modules/google-closure-compiler/compiler.jar $(echo ${PROD[*]})

rm dist/_temp.js
echo "Done"