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
large data sets.

## Declare a graph
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

g.root;     // The root node. Auto created and can not be 
            // deleted from the graph.

g.graph;      // The graph as a Map of Nodes to a Set of Nodes

g.nodes;      // An array of nodes in order of insertion

g.topo;       // A topo sorted array of nodes

g.ids;        // An array of node ids in order of insertion
              // [ 0, 1, 2, 3, 4 ]

g.topoIds;    // An array of node ids in topo order
              // [ 4, 3, 2, 1, 0 ]

g.names;      // An array of node names in order of insertion
              // [ 'D', 'C', 'B', 'A', 'ROOT' ]
            
g.topoNames;  // An array of node names in order of insertion
              // [ 'ROOT', 'A', 'B', 'C', 'D' ]

g.leafs;      // An array of leaf nodes. Nodes without any 
              // in-degrees

g.orphans;    // An array of nodes without out-degrees. 
              // Excludes the root node

```
## Structure the graph
```javascript
// A simple 4 node graph.
// C ---→ B ---→ A --→ root
const g = new DAG();
const A = g.makeNode('A');
const B = g.makeNode('B');
const C = g.makeNode('C');
g.connect(C, B).connect(B, A).connect(A, g.root);

g.leafs; // [ C ]

g.orphans; // []

// Disconnect nodes
g.disconnect(B, A);   // Read disconnect B from A
g.leafs;              // [ A, C ] The don't have in degrees
g.orphans;            // [ B ] It has no out degree.

// Who is connected to B?
g.indegrees(B);       // [ C ] remains connected even 
                      // if B is orphaned.

// Is B really not connected to anything?
g.outdegrees(B);      // [] Yep. No out degrees.

// So lets delete B from the graph.
let b = g.delNode(B); // b === true. Node B is not part of 
                      // the graph any more

// Oh no! Wait, we need it back.
b = g.addNode(B);     // b === B. The B node is added back
                      // B remains disconnected

// By now, B, and C are orphaned, 
// and B, C, and A are all leaf nodes.
g.orphans;            // [ C, B ] Note the order of insertion
g.leafs;              // [ A, C, B ]

// Lets just clean the graph. Delete all orphans.
g.clean();            // Recursively deletes all the orphan nodes.
g.nodes;              // [ root, A ]
g.orphans;            // []
g.leafs;              // [ A ]
```
## Nodes can do things
```javascript
const DAG = require('dag-solve').DAG;

//   +-------------------------+
//   |                         |
//   |   +---+     +---+     +-v-+    +---+
//   |   |   |     |   |     |   |    |   |
//   |   | C +-----> B +-----> A +----> R |
//   |   |   |     |   |     |   |    |   |
//   |   +-^-+     +-^-+     +-^-+    +---+
//   |     |         |         |
//   |     |         |         |
//   |   +-+-+     +-+-+       |
//   |   |   |     |   |       |
//   +---+ D +-----> E +-------+
//       |   |     |   |
//       +---+     +---+

const g = new DAG();
const A = g.makeNode('A').setMath('$1 * $2 / $3').setFallback(21);
const B = g.makeNode('B').setMath('$1 + $2');
const C = g.makeNode('C').setFilter('vc', '<', 100, '>=', 12);
const D = g.makeNode('D').setMath(10);
const E = g.makeNode('E').addEnum(10, 6).addEnum(3, 200);
g.connect(A, g.root)
g.connect(C, A)   // In A: $1 === C
g.connect(C, B)   // In B: $1 === C
g.connect(D, C)   // In C: $1 === D
g.connect(E, B)   // In B: $2 === E
g.connect(D, E)   // In E: $1 === D
g.connect(E, A)   // In A: $2 === E
g.connect(D, A);  // In A: $3 === D

g.solve();    // 7.2
g.debug();    // [ 10, 6, 12, 7.2, 7.2 ]
              // The result of each step in topo order

D.setMath(3);
g.solve();    // 800
g.debug();    // [ 3, 200, 12, 800, 800 ]

// Add a fallback to the enum
E.setFallback(3.456);
D.setMath(123);
g.debug();    // [ 123, 3.456, 100, 2.80975609..., 2.80975609... ]

// Add a rouonding function between A and root;
const RND = g.makeNode('rounder').setRound(2);

g.disconnect(A, g.root).connect(RND, g.root).connect(A, RND);
g.debug(); // [ 123, 3.456, 100, 2.809756097560976, 2.81, 2.81 ]

```
# Use the solver
Using the exact graph as above, we can get a solver function that can
be applied to an array of values.
```javascript
// First we make D take a value from an object path.
D.setPath('v'); 

// This means we can solve the graph by passing an object to
// the solve method:
g.solve({v:10}); // 7.2 The same as when the D.node had 
                 // a constant value of 10

// Now get a standalone solver function from the graph
const s = g.getSolver();
[{v:1}, {v:2}, {v:3}, {v:4}].map(s); // [ 41.47, 20.74, 800, 10.37 ]

// Go wild!
Array(100).fill(1).map((e, i) => ({v:(123/i)})).map(s);
// [ 0, 2.81, 3.46, ...
```

