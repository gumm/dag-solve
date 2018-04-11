# dag-solve

[![Build Status](https://travis-ci.org/gumm/dag-solve.svg?branch=master)](https://travis-ci.org/gumm/dag-solve)

Directed acyclic graph (DAG) based solver.
The graphs built here always has a single root node, and this root node,
can only ever have one in degree and my not have out degrees. Below the root
node no further restrictions apply save for the prevention of cycles.

Each node created in the graph can be configured to be a:
* math solver
* an enum solver
* a comparator (equality, identity, inequality, 
               non-identity, bigger-than, smaller-than, 
               bigger-or-equal, smaller-or-equal)
* a band-pass filter (check that a number is between two stops)               
* a number rounder
* a data reader

The graph can be serialised to JSON and deserialised back into a DAG object.
The graph has a "solve" method that solves the graph.
The graph can return a stand-alone solver function that can be applied to
large data sets.

## Declare a graph
```javascript
const DAG = require('dag-solve');

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

// Getter and setter methods are available to store human readable
// stuff about the graph

g.description = 'Calculates temp';
g.description; // 'Calculates temp'

g.units = '°C';
g.units; // '°C';

g.ref = 123;
g.ref; // 123

// Note: meta is not dumped or restored via the dump/read cycle.
// It is intended for as an in-memory placeholder if needed.
g.meta = {'Anything': ['goes']};
g.meta; // { Anything: [ 'goes' ] }


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
const DAG = require('dag-solve');

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
g.description = 'Calc Temp';
g.units = '°C';
g.ref = 123;
const A = g.makeNode('A').setMath('$1 * $2 / $3').setFallback(21);
const B = g.makeNode('B').setMath('$1 + $2');
const C = g.makeNode('C').setComparator('$1', '<', 100, 'ab');
const D = g.makeNode('D').setMath(10);
const E = g.makeNode('E').addEnum(10, 0.1).addEnum(3, -5);
g.connect(A, g.root);
g.connect(B, A);   // In A: $1 === B
g.connect(C, B);   // In B: $1 === C
g.connect(D, C);   // In C: $1 === D
g.connect(D, E);   // In E: $1 === D
g.connect(D, A);   // In A: $3 === D
g.connect(E, B);   // In B: $2 === E
g.connect(E, A);   // In A: $2 === E


g.solve();    // 1010
g.debug();    // [ 10, 0.1, 10, 10.1, 1010, 1010  ]
g.topoNames;  // [ 'D', 'E', 'C', 'B', 'A', 'ROOT' ]
              // The result of each step in topo order

D.setMath(3);
g.solve();    // 1.2
g.debug();    // [ 3, -5, 3, -2, 1.2, 1.2  ]

// Add a fallback to the enum
E.setFallback(3.456);
D.setMath(123);
g.debug();    // [ 123, 3.456, 100, 103.456, 3682.027.., 3682.027.. ]

// Add a rounding function between A and root;
const RND = g.makeNode('rounder').setRound(2);

g.disconnect(A, g.root).connect(RND, g.root).connect(A, RND);
g.debug(); // Map with the results of each step mapped to that step's id.
           // Also includes a key 'topIds' and 'topoNames' with the
           // relevant topo-sorted arrays of IDs and names respectively.
g.solve(); // 3682.03
```
# Use the solver
Using the exact graph as above, we can get a solver function that can
be applied to an array of values.
```javascript
// First we make D take a value from an object path.
D.setPath('v'); 

// This means we can solve the graph by passing an object to
// the solve method:
g.solve({v:10}); // 1010 The same as when the D.node had 
                 // a constant value of 10

// Now get a standalone solver function from the graph
const s = g.getSolver();
[{v:1}, {v:2}, {v:3}, {v:4}].map(s); // [ 1.29, 3.16, 1.2, 8.63 ]

// Go wild!
Array(100).fill(1).map((e, i) => ({v:i})).map(s);
// [ 0, 1.29, 3.16, 1.2, 8.63, 12.23,...   ]

```
A note on the solver function: It is divorced from the graph, and changes
to the graph won't be propagated to the solver function. If the graph
changes, (either in structure, or in the set-up of any of its nodes) the
solver function needs to be replaced.

# Serialise and restore a graph via JSON
Once a graph is configured it can be dumped to JSON for storage, and read
back when needed. Using the above graph:
```javascript
const json = g.dump();
```
which produces this JSON...
```json
{
  "M": ["Calc Temp", "°C", 123],
  "G": [
    [0, []],
    [1, [6]],
    [2, [1]],
    [3, [2]],
    [4, [3, 5, 1]],
    [5, [2, 1]],
    [6, [0]]
  ],
  "N": [
    {"A": [], "B": [], "C": [], "E": [], "I": 4, "N": "D", "P": ["v"], "V": []},
    {"A": [4], "B": [], "C": [], "D": 3.456, "E": [[10, 0.1], [3, -5]], "I": 5, "N": "E", "P": [], "V": []},
    {"A": [4], "B": [], "C": ["$1", "<", 100, "ab"], "E": [], "I": 3, "N": "C", "P": [], "V": []},
    {"A": [3, 5], "B": [], "C": [], "E": [], "I": 2, "M": "$1 + $2", "N": "B", "P": [], "V": []},
    {"A": [2, 4, 5], "B": [], "C": [], "D": 21, "E": [], "I": 1, "M": "$1 * $2 / $3", "N": "A", "P": [], "V": []},
    {"A": [1], "B": [], "C": [], "E": [], "I": 6, "N": "rounder", "P": [], "R": 2, "V": []},
    {"A": [6], "B": [], "C": [], "E": [], "I": 0, "M": "$1", "N": "ROOT", "P": [], "V": []}]
}
```
which can be read back into a new graph...
```javascript

g2 = DAG.read(json)   // A static method to create a DAG from an object;
g2.solve({v:10});     // 1010
g2 === g;             // False

```

# Dump a graph to GraphViz DOT format string
```javascript
g2.dumpToDot({v:10});
```
results in a string:
```
digraph {
    label = "Calc Temp - °C";
    "A" -> "rounder";
    "B" -> "A";
    "C" -> "B";
    "D" -> "C";
    "D" -> "E";
    "D" -> "A";
    "E" -> "B";
    "E" -> "A";
    "rounder" -> "ROOT";
}
```
Optionally pass in data, and tell dumpToDot to print
the results of the solved graph.

```javascript
g2.dumpToDot({v:1}, true, true);
```
```
digraph {
    label = "Calc Temp - °C";
    "1:A = 1.2893518518518516" -> "6:rounder = 1.29";
    "2:B = 4.4559999999999995" -> "1:A = 1.2893518518518516";
    "3:C = 1" -> "2:B = 4.4559999999999995";
    "4:D = 1" -> "3:C = 1";
    "4:D = 1" -> "5:E = 3.456";
    "4:D = 1" -> "1:A = 1.2893518518518516";
    "5:E = 3.456" -> "2:B = 4.4559999999999995";
    "5:E = 3.456" -> "1:A = 1.2893518518518516";
    "6:rounder = 1.29" -> "0:ROOT = 1.29"; }
```
These DOT-file strings can be used to visualize the graph.
See for instance tools like: http://www.webgraphviz.com/



