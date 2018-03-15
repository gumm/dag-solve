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
const D = g.makeNode('D');

// Connect the nodes
// Read connect A to B
g.connect(A, g.root)
  .connect(B, A)
  .connect(C, A)
  .connect(C, B)
  .connect(D, C);

g.root; // The root node. Auto created and can not be deleted from the graph.

g.graph; // The graph as a Map of Nodes to a Set of Nodes

g.topo; // A topo sorted array of nodes

g.nodes; // An array of nodes in order of insertion

g.ids; // An array of node ids in order of insertion
       // [ 0, 1, 2, 3, 4 ]

g.names; // An array of node names in order of insertion
         // [ 'ROOT', 'A', 'B', 'C', 'D' ]

g.leafs; // An array of leaf nodes. Nodes without any in-degrees

g.orphans; // An array of nodes without out degrees. (Excludes the root node)

```
## Structure the graph
```javascript
const DAG = require('dag-solve').DAG;
/**
* A simple 4 node graph.
* 
*   C ---> B ---> A --> root
* 
*/
const g = new DAG();
const A = g.makeNode('A');
const B = g.makeNode('B');
const C = g.makeNode('C');
g.connect(A, g.root).connect(B, A).connect(C, B);

g.leafs; // [ C ]

g.orphans; // []

// Disconnect nodes
// Read disconnect B from A
g.disconnect(B, A);
g.leafs; // [ A, C ] The don't have in degrees
g.orphans; // [ B ] It has no out degree.

// Who is connected to B?
g.indegrees(B); // [ C ] remains connected even if B is orphaned.

// Is B really not connected to anything?
g.outdegrees(B); // [] Yep. No out degrees.

// So lets delete B from the graph.
let b = g.delNode(B); // b === true. Node B is not part of the graph any more

// Oh no! Wait, we need it back.
b = g.addNode(B); //  b === B. The B node is added back (But remains disconnected)

// By now, B, and C are orphaned, and B, C, and A are all leaf nodes.
g.orphans; // [C, B] Note the order of insertion
g.leafs; //  [ A, C, B ]

// Lets just clean the graph. Delete all orphans.
g.clean(); // Recursively deletes all the orphan nodes.
g.nodes; // [ root, A ]
g.orphans; // []
g.leafs; // [ A ]
```