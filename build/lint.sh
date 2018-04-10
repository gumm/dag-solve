#!/bin/bash

WORKSPACE=$1
cd ${WORKSPACE}
echo "-----------------------------------------------------"
echo ""
echo "Now formatting with Clang..."
shopt -s globstar extglob
clang-format -i -style=Google main.js

echo "Finished"
