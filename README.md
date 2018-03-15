# dag-solve

[![Build Status](https://travis-ci.org/gumm/dag-solve.svg?branch=master)](https://travis-ci.org/gumm/dag-solve.svg?branch=master)

Directed acyclic graph (DAG) based solver.
The graphs built here always has a single root node, and this root node,
can only ever have one in degree and my not have out degrees. Below the root
node no further restrictions apply save for the prevention of cycles.

Each node created in the graph can be configured to be a:
* math solver
* an enum solver
* a filter (high-, low- and band-pass)
* a number rounder
* a data reader

The graph can be serialised to JSON and deserialised back into a DAG object.
The graph has a "solve" method that solves the graph.
The graph can return a stand-alone solver function that can be applied to
large datasets.

## Declare a graph.
```javascript
const DAG = require('dag-solve').DAG;

// Declare the graph
const g = new DAG();

// Add named nodes
const A = g.makeNode('A');
const B = g.makeNode('B');
const C = g.makeNode('C');

// Connect the nodes
g.connect(A, g.root)
  .connect(B, A)
  .connect(C, A)
  .connect(C, B);

g.root; // The root node. Auto created and can not be deleted from the graph.

g.graph; // The graph as a Map of Nodes to a Set of Nodes

g.topo; // A topo sorted array of nodes

g.nodes; // An array of nodes in order of insertion

g.ids; // An array of node ids in order of insertion

g.names; // An array of node names in order of insertion

g.leafs; // An array of leaf nodes. Nodes without any in-degrees

g.orphans; // An array of nodes without out degrees. (Excludes the root node)

```
