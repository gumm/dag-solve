const be = require('be-sert');
const assert = require('assert');
const DAG = require('../dag.js');


describe('Root node is automatically created', () => {
  const g = new DAG();
  const root = g.root;
  it('its can be accessed with the property getter "root"',
     () => assert.ok(g.root));
  it('its name is "ROOT"', () => assert.strictEqual(root.name, 'ROOT'));
  it('its ID is 0', () => assert.strictEqual(root.id, 0));
  it('its has no indegrees',
     () => assert.strictEqual(g.indegrees(g.root).length, 0));
  it('its has no outdegrees',
     () => assert.strictEqual(g.outdegrees(g.root).length, 0));
  it('the root node does not count as an orphan',
     () => be.equalsArrays(g.orphans, []));
  it('root node counts as a leaf', () => be.equalsArrays(g.leafs, [root]));
  it('the DAG is represented as a Map',
     () => assert.strictEqual(g.graph instanceof Map, true));
});

describe('Use the DAG to create nodes', () => {
  const g = new DAG();
  const root = g.root;
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');
  const D = g.makeNode('D');
  const E = g.makeNode('E');
  const F = g.makeNode('F');
  let A1, A2, A3;  // Placeholders for nodes we will create later.
  it('Nodes are created with the "create" method',
     () => be.equalsArrays(g.nodes, [root, A, B, C, D, E, F]));
  it('Nodes have names',
     () => be.equalsArrays(g.names, ['ROOT', 'A', 'B', 'C', 'D', 'E', 'F']));
  it('Nodes have unique IDs',
     () => be.equalsArrays(g.ids, [0, 1, 2, 3, 4, 5, 6]));
  it('Nodes are created as orphans',
     () => be.equalsArrays(g.orphans, [A, B, C, D, E, F]));
  it('Nodes are leaf nodes on creation',
     () => be.equalsArrays(g.leafs, [root, A, B, C, D, E, F]));
  it('Creating nodes are *not* idempotent. Multiple nodes can have ' +
         'the same name',
     () => {
       A1 = g.makeNode('A');
       A2 = g.makeNode('A');
       A3 = g.makeNode('A');
     });
  it('Nodes with the same name are not the same nodes', () => {
    be.aFalse(A === A1);
    be.aFalse(A === A2);
    be.aFalse(A === A3);
    be.aFalse(A1 === A2);
    be.aFalse(A1 === A3);
    be.aFalse(A2 === A3);
  });

});

describe('Use the DAG to connect nodes', () => {
  /**
   * @type {DAG}
   */
  const g = new DAG();
  const root = g.root;
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');
  const D = g.makeNode('D');
  const E = g.makeNode('E');
  const F = g.makeNode('F');
  it('When B is connected to A, A has B in its indegrees', () => {
    g.connect(B, A);
    be.equalsArrays(g.indegrees(A), [B]);
  });
  it('When B is connected to A, A has B.id in its arguments', () => {
    g.connect(B, A);
    be.equalsArrays(A.args, [B.id])
  });
  it('When B is connected to A, B has A in its outdegrees', () => {
    g.connect(B, A);
    be.equalsArrays(g.outdegrees(B), [A])
  });
  it('Connecting nodes are idempotent. Creating the same connection ' +
         'multiple times has no further effect.',
     () => {
       g.connect(B, A);
       g.connect(B, A);
       g.connect(B, A);
       g.connect(B, A);
       be.equalsArrays(g.outdegrees(B), [A]);
       be.equalsArrays(g.indegrees(A), [B]);
       be.equalsArrays(A.args, [B.id]);
       be.equalsArrays(B.args, []);
     });
  it('Connection that form a cycle are illegal, ' +
         'and will not be honoured.',
     () => {
       g.connect(B, A);
       g.connect(A, B);
       be.equalsArrays(g.outdegrees(B), [A]);
       be.equalsArrays(g.indegrees(A), [B]);
       be.equalsArrays(g.outdegrees(B), [A]);
       be.equalsArrays(g.indegrees(A), [B]);
       be.equalsArrays(A.args, [B.id]);
       be.equalsArrays(B.args, []);
     });
  it('A node can have multiple in degrees', () => {
    g.connect(C, A);
    g.connect(D, A);
    be.equalsArrays(g.outdegrees(B), [A]);
    be.equalsArrays(g.outdegrees(C), [A]);
    be.equalsArrays(g.outdegrees(D), [A]);
    be.equalsArrays(g.indegrees(A), [B, C, D]);
  });
  it('Root node can only have one in degree.', () => {
    g.connect(A, root);
    be.equalsArrays(g.outdegrees(A), [root]);
    be.equalsArrays(g.indegrees(root), [A]);
    // This has no effect.
    g.connect(B, root);
    be.equalsArrays(g.outdegrees(A), [root]);
    be.equalsArrays(g.indegrees(root), [A]);
  });
  it('Connections can be chained', () => {
    g.connect(D, E).connect(E, F).connect(F, C).connect(F, B).connect(E, C);
    be.equalsArrays(g.outdegrees(D), [A, E]);
    be.equalsArrays(g.outdegrees(E), [F, C]);
    be.equalsArrays(g.outdegrees(F), [C, B]);
  });
  it('A node can have multiple out degrees', () => {
    be.equalsArrays(g.outdegrees(F), [C, B]);
  });
});

describe('Use the DAG to sort, disconnect an delete nodes nodes', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');
  const D = g.makeNode('D');
  const E = g.makeNode('E');
  const F = g.makeNode('F');
  g.connect(A, g.root)
      .connect(B, A)
      .connect(C, A)
      .connect(D, B)
      .connect(D, C)
      .connect(E, B)
      .connect(F, E)
      .connect(F, C)
      .connect(D, F);

  // Names
  it('List the nodes names in insert order',
     () => {be.equalsArrays(g.names, ['ROOT', 'A', 'B', 'C', 'D', 'E', 'F'])});
  it('List the nodes names in topo order',
     () => {
         be.equalsArrays(g.topoNames, ['D', 'F', 'C', 'E', 'B', 'A', 'ROOT'])});

  // IDs
  it('List the nodes ids in insert order',
     () => {be.equalsArrays(g.ids, [0, 1, 2, 3, 4, 5, 6])});
  it('List the nodes ids in topo order',
     () => {be.equalsArrays(g.topoIds, [4, 6, 3, 5, 2, 1, 0])});

  it('the graph has no orphans', () => {be.equalsArrays(g.orphans, [])});
  it('the graph can be topologically sorted',
     () => {assert.deepStrictEqual(g.topo, [D, F, C, E, B, A, g.root])});
  it('nodes can be disconnected', () => {
    g.disconnect(B, A);
    be.equalsArrays(g.outdegrees(B), []);
    be.equalsArrays(g.indegrees(A), [C]);
  });
  it('the disconnect left B ad an orphan', () => {
    be.equalsArrays(g.orphans, [B]);
  });
  it('Cleaning the graph, deletes all orphans and returns the graph. If' +
         'deleting an orphan produces another one, it in turn is also deleted.',
     () => {
       g.clean();
       be.equalsArrays(g.nodes, [g.root, A, C, D, F]);
     });
  it('cleaning the graph removes the nodes entirely', () => {
    be.equalsArrays(g.nodes, [g.root, A, C, D, F]);
    assert.deepStrictEqual(g.topo, [D, F, C, A, g.root]);
  });
  it('A node can be added back to the graph', () => {
    g.addNode(B);
    g.addNode(E);
    be.equalsArrays(g.nodes, [g.root, A, C, D, F, B, E]);
  });
  it('Adding a node back is idempotent', () => {
    g.addNode(B);
    g.addNode(B);
    g.addNode(B);
    g.addNode(B);
    g.addNode(B);
    be.equalsArrays(g.nodes, [g.root, A, C, D, F, B, E]);
  });
  it('Once added back, they can be connected again. Even though the graph ' +
         'looks the same, the topo sort *may* differ - because of the order' +
         'in which nodes were added to the graph.',
     () => {
       g.connect(B, A).connect(E, B).connect(F, E).connect(D, B);
       assert.deepStrictEqual(g.topo, [D, F, E, B, C, A, g.root]);
     })
});

describe('Restrictions on a graph.', () => {
  // Create a graph, and all its nodes, but immediatly remove them from the
  // graph.
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');
  const D = g.makeNode('D');
  const E = g.makeNode('E');
  const F = g.makeNode('F');
  g.clean();

  it('Listing nodes, names or ids honours the order in ' +
         'which nodes are added to the graph',
     () => {
       g.addNode(B);
       g.addNode(F);
       g.addNode(D);
       g.addNode(A);
       g.addNode(C);
       g.addNode(E);
       assert.deepStrictEqual(g.nodes, [g.root, B, F, D, A, C, E]);
       assert.deepStrictEqual(g.names, ['ROOT', 'B', 'F', 'D', 'A', 'C', 'E']);
       assert.deepStrictEqual(g.ids, [0, 2, 6, 4, 1, 3, 5]);
     });
  it('Adding a node with an ID that already ' +
         'exists in the graph is illegal, and does nothing',
     () => {

       // We use the graph to create the node.
       const ERR = g.makeNode('ERR');
       be.equal(ERR.id, 7);
       assert.deepStrictEqual(g.ids, [0, 2, 6, 4, 1, 3, 5, 7]);

       // We then delete the node.
       g.delNode(ERR);
       assert.deepStrictEqual(g.ids, [0, 2, 6, 4, 1, 3, 5]);

       // We then change the node ID to any of the existing node ids.
       ERR._id = 1;  // The same as A
       const result = g.addNode(ERR);

       // The result is false - no success.
       be.aFalse(result);
       // ...and the graph remains unchanged.
       assert.deepStrictEqual(g.ids, [0, 2, 6, 4, 1, 3, 5]);
     });

  it('Root may not have out degrees', () => {
    g.connect(g.root, A);
    be.equalsArrays(g.indegrees(A), []);
    be.equalsArrays(g.outdegrees(A), []);
    be.equalsArrays(g.indegrees(g.root), []);
    be.equalsArrays(g.outdegrees(g.root), []);
  });

  it('Root only accepts one input. Once connected it rejects ' +
         'further connections',
     () => {
       g.connect(A, g.root);
       be.equalsArrays(g.outdegrees(A), [g.root]);
       be.equalsArrays(g.indegrees(g.root), [A]);

       // Now try and connect another
       g.connect(B, g.root);
       // B is not connected
       be.equalsArrays(g.outdegrees(B), []);
       // Root is only connected to A
       be.equalsArrays(g.indegrees(g.root), [A]);
     });

  it('A node must be a member of the graph before it can be connected', () => {

    // We use the graph to create the node, but then remove it from the
    // graph
    const R = g.makeNode('R');
    g.delNode(R);
    assert.deepStrictEqual(g.nodes, [g.root, B, F, D, A, C, E]);

    // Try and connect A -> R
    g.connect(A, R);
    assert.deepStrictEqual(g.nodes, [g.root, B, F, D, A, C, E]);

    //... or R -> A
    g.connect(R, A);
    assert.deepStrictEqual(g.nodes, [g.root, B, F, D, A, C, E]);

    // but once added to te graph, it can be connected.
    g.addNode(R);
    g.connect(R, A);
    assert.deepStrictEqual(g.nodes, [g.root, B, F, D, A, C, E, R]);

  });

});

describe('When DAG computes,', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');

  it('If nothing connects to the root node, the DAG computes to undefined',
     () => {assert.strictEqual(g.solve(), undefined)});

  it('If any of the connected nodes do not have a mathematical ' +
         'formula, the DAG computes to undefined',
     () => {assert.strictEqual(g.connect(A, g.root).solve(), undefined)});

  it('it can solve itself', () => {
    A.setMath('$1 * 2');
    B.setMath('$1 + 5');
    C.setMath(10);
    // The required result is (10 + 5) * 2 = 30
    const sol1 = g.connect(C, B).connect(B, A).connect(A, g.root).solve();
    assert.strictEqual(sol1, 30);

    // Modify the graph by adding a node and connecting it.
    const E = g.makeNode('E').setMath('$1 * 3');
    g.connect(E, B).connect(C, E);
    // Then modify the solver for node B to take advantage of its new
    // connection
    B.setMath('$1 - $2');
    assert.strictEqual(g.solve(), -40);

    // Modify the order in which the nodes are connected to B
    // The B node now has its 2 inputs swapped around.
    g.disconnect(C, B).connect(C, B);
    assert.strictEqual(g.solve(), 40);

    // Reorganizing the graph to have orphaned nodes.
    g.disconnect(B, A).connect(C, A);
    assert.strictEqual(g.solve(), 20);
    // Even though the nodes are still there...
    be.equalsArrays(g.nodes, [g.root, A, B, C, E]);

    // We can clean the graph (deleting the orphaned nodes) and the graph
    // produces the same output.
    g.clean();
    assert.strictEqual(g.solve(), 20);
    be.equalsArrays(g.nodes, [g.root, A, C]);
  })
});

describe('A dag can be given a value/object to compute on', () => {
  const g = new DAG();
  const A = g.makeNode('A').setMath('($1 + 2.5) / $2');
  const C = g.makeNode('C').setMath(3);
  const D = g.makeNode('D').setMath(10);
  const E = g.makeNode('E').setComparator('$1', '>', 10, 'ab');
  g.connect(C, E).connect(E, A).connect(D, A).connect(A, g.root);

  const data = {
    'SOME': [1, 2, {'weird': {'data': [4, 10, 'structure', [0, 3]]}}]
  };

  const D2 = Array(10000).fill(data);
  const D3 = Array(10000).fill(1).map((e, i) => [i]);

  it('When given data, it can read and solve.', () => {
    D.setPath('SOME', 2, 'weird', 'data', 1);
    C.setPath('SOME', 2, 'weird', 'data', 3, 1);
    assert.strictEqual(g.solve(data), 1.25)
  });

  it('The "debug" method returns solutions and collected errors', () => {
    const r = new Map()
                  .set('topoIds', [3, 2, 4, 1, 0])
                  .set('data', data)
                  .set(3, 10)
                  .set(2, 3)
                  .set(4, 10)
                  .set(1, 1.25)
                  .set(0, 1.25);
    assert.deepStrictEqual(g.debug(data), r)
  });

  it('The graph can be applied to an array of data', () => {
    D.setPath('SOME', 2, 'weird', 'data', 1);
    C.setPath('SOME', 2, 'weird', 'data', 3, 1);
    D2.map(e => g.solve(e));  // <- About 300ms
  });

  it('A DAG can retrun a pre-computed solver that is ' +
         'much faster than the above methods.',
     () => {
       const solver = g.getSolver();
       D2.map(solver);  // <- About 13ms About 10x faster
     });

  it('The graph can be applied to an array of array-data', () => {
    // An array of arrays each inner array containing a number from 1 - 99
    D.setPath(0);
    C.setPath(0);
    const solver = g.getSolver();
    D3.map(solver);
  });

});

describe('A DAG can be serialized and de-serialized', () => {
  const g = new DAG();
  const A = g.makeNode('A').setMath('($1 + 2.5) / $2');
  const B = g.makeNode('B').addEnum(3, 2.5).addEnum('A', 'B');
  const C = g.makeNode('C').setMath(3);
  const D = g.makeNode('D').setMath(10);
  const E = g.makeNode('E').setComparator('$1', '<', 10, 'ab');
  g.connect(C, E).connect(E, B).connect(B, A).connect(D, A).connect(A, g.root);
  g.description = 'Description';
  g.units = '°kelvin';
  g.ref = 1234;

  const g2 = new DAG();
  let s;

  it('it can be dumped to a JSON string.', () => {
    // First we make sure the DAG is sensitive to connection order.
    assert.strictEqual(g.solve(), 0.5);
    assert.strictEqual(g.disconnect(B, A).connect(B, A).solve(), 5);

    // Dump the DAG to a string.
    s = g.dump();
    assert.strictEqual(typeof s, 'string');
  });

  it('it can be recreated from the JSON', () => {
    // Create a 2nd DAG, and read the string in.
    g2.read(s);
  });

  it('The 2 DAGs should solve to the same thing.', () => {
    assert.deepStrictEqual(g2.solve(), g.solve());
  });

  it('Have the same dump string.', () => {
    assert.deepStrictEqual(g2.dump(), g.dump());
  });

  it('Have the same IDs in the same order', () => {
    assert.deepStrictEqual(g2.ids, g.ids);
  });

  it('Nodes have the same names in the same order', () => {
    assert.deepStrictEqual(g2.names, g.names);
  });

  it('however, they are not strictly the same objects', () => {
    assert.notDeepStrictEqual(g2, g);
  });

  it('nor are the nodes the same objects', () => {
    assert.notDeepStrictEqual(g2.root, g.root);
    assert.notDeepStrictEqual(g2.nodes, g.nodes);
  });

});
