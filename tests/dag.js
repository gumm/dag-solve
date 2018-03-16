const be = require('be-sert');
const assert = require('assert');
const DAG = require('../dag.js').DAG;


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
  it('List the nodes names in insert order', () => {
    be.equalsArrays(g.names, ['ROOT','A','B','C','D','E','F'])
  });
  it('List the nodes names in topo order', () => {
    be.equalsArrays(g.topoNames, ['D','F','C','E','B','A','ROOT'])
  });

  // IDs
  it('List the nodes ids in insert order', () => {
    be.equalsArrays(g.ids, [0,1,2,3,4,5,6])
  });
  it('List the nodes ids in topo order', () => {
    be.equalsArrays(g.topoIds, [4,6,3,5,2,1,0])
  });

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

describe('Nodes can do math.', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');
  g.connect(A, g.root);

  it('The mathematical formula is given as a string', () => {
    A.setMath('17 - 3');
    assert.strictEqual(g.solve(), 14)
  });

  it('A node can read the formula', () => {
    A.setMath('17 - 3');
    assert.strictEqual(A.math, '17 - 3')
  });

  it('When given a raw number, it is treated as a constant', () => {
    A.setMath(14);
    assert.strictEqual(g.solve(), 14)
  });

  it('The formula may only contain arithmetic operators, numbers, ' +
         'grouping brackets, spaces and the $-glyph.' +
         'Anything else will be stripped.',
     () => {
       A.setMath('balh-blah(17 - 3)');
       assert.strictEqual(g.solve(), -14);
     });

  it('If the cleaned formula results in nonsensical math, ' +
         'the DAG returns undefined',
     () => {
       A.setMath('blah - blah * blah');
       assert.strictEqual(g.solve(), undefined);
     });

  it('If the cleaned formula results the empty string ' +
         'the DAG returns undefined',
     () => {
       A.setMath('blah');
       assert.strictEqual(g.solve(), undefined);
     });

  it('A formula can reference a connecting node using the "$n" syntax', () => {
    B.setMath(17);
    g.connect(B, A);
    A.setMath('$1 - 3');
    assert.strictEqual(g.solve(), 14)
  });

  it('It references its connecting node in order of addition', () => {
    // $1 refers to the first node connected
    // $2 refers to the second node connected
    C.setMath(3);
    g.connect(C, A);
    A.setMath('$1 - $2');
    assert.strictEqual(g.solve(), 14)
  });

  it('When the order changes, the formula result changed', () => {
    // Disconnect B from A. A now only has C as input. Reconnect B to A.
    // A considers the connection order to be first C then B.
    C.setMath(3);
    g.disconnect(B, A).connect(B, A);
    assert.strictEqual(g.solve(), -14)
  });

  it('If the formula references a node that does not exist, the result ' +
         'is undefined',
     () => {
       g.disconnect(B, A);
       assert.strictEqual(g.solve(), undefined);
     });

  it('A single reference to a connecting node is treated ' +
         'as a constant',
     () => {
       g.disconnect(C, A);
       g.connect(B, A);
       B.setMath(3);
       A.setMath('$1');
       assert.equal(g.solve(), 3);
     });

});

describe('Nodes can do enumeration', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  g.connect(B, A).connect(A, g.root);

  it('An enum is a collection of 2-element arrays', () => {
    B.setMath(1);
    A.addEnum(1, 'Hello String');
    assert.strictEqual(g.solve(), 'Hello String')
  });

  it('Multiple enum elements can be added', () => {
    A.addEnum(1, 'A').addEnum(2, 'B').addEnum(3, 'C');
    assert.strictEqual(g.solve(), 'A')
  });

  it('An enum element is overwritten when its fist member ' +
         'already exists',
     () => {
       A.addEnum(1, 'A').addEnum(1, 'B').addEnum(1, 'C');
       assert.strictEqual(g.solve(), 'C')
     });

  it('An enum can be read out',
     () => {assert.deepStrictEqual(A.enum, [[1, 'C'], [2, 'B'], [3, 'C']])});

  it('An item can be deleted by its first member', () => {
    A.delEnum(1);
    assert.deepStrictEqual(A.enum, [[2, 'B'], [3, 'C']]);
    assert.strictEqual(g.solve(), undefined);
  });

  it('The enum keys *may not* be undefined. ' +
         'Attempting to do so does nothing',
     () => {
       A.addEnum(undefined, 'something');
       assert.deepStrictEqual(A.enum, [[2, 'B'], [3, 'C']]);
       assert.strictEqual(g.solve(), undefined);
     });

});

describe('Nodes can do rounding', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  g.connect(B, A).connect(A, g.root);
  B.setMath(12.34567809);

  it('When set, the node rounds its incomming value', () => {
    A.setRound(2);
    assert.strictEqual(g.solve(), 12.35)
  });
});

describe('Nodes can do pass-filtering', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  g.connect(B, A).connect(A, g.root);
  B.setMath(3);

  // Bigger than (High-Pass)
  it('Test value bigger than n (Pass)', () => {
    B.setMath(3);
    A.setFilter('vu', '>', 2);
    assert.strictEqual(g.solve(), 3)
  });

  it('Test value bigger than n (Fail)', () => {
    B.setMath(3);
    A.setFilter('vu', '>', 4);
    assert.strictEqual(g.solve(), undefined)
  });

  it('Test value bigger or eq than n (Pass)', () => {
    B.setMath(3);
    A.setFilter('vu', '>=', 3);
    assert.strictEqual(g.solve(), 3)
  });

  it('Test value bigger or eq than n (Fail)', () => {
    B.setMath(3);
    A.setFilter('vu', '>=', 4);
    assert.strictEqual(g.solve(), undefined)
  });

  // Smaller than (Low Pass)
  it('Test value smaller than n (Pass)', () => {
    B.setMath(3);
    A.setFilter('vu', '<', 4);
    assert.strictEqual(g.solve(), 3)
  });

  it('Test value smaller than n (Fail)', () => {
    B.setMath(3);
    A.setFilter('vu', '<', 2);
    assert.strictEqual(g.solve(), undefined)
  });

  it('Test value smaller or eq than n (Pass)', () => {
    B.setMath(3);
    A.setFilter('vu', '<=', 3);
    assert.strictEqual(g.solve(), 3)
  });

  it('Test value smaller or eq than n (Fail)', () => {
    B.setMath(3);
    A.setFilter('vu', '<=', 2);
    assert.strictEqual(g.solve(), undefined)
  });

  // Between values (Band Pass)
  it('Test value between n and p (Pass)', () => {
    B.setMath(3);
    A.setFilter('vu', '<', 4, '>', 2);
    assert.strictEqual(g.solve(), 3)
  });

  it('Test value between n and p (Fail)', () => {
    B.setMath(3);
    A.setFilter('vu', '<', 4, '>', 3);
    assert.strictEqual(g.solve(), undefined)
  });

  // Non contradicting nonsense
  it('If both sets are given, and their predicates are the same,' +
         ' we discard the redundant one. [>]',
     () => {
       // Value must be: Bigger than 2 AND bigger than 5
       B.setMath(3);
       A.setFilter('vc', '>', 2, '>', 5);
       assert.strictEqual(g.solve(), 5);
     });

  it('If both sets are given, and their predicates are the same,' +
         ' we discard the redundant one [<]',
     () => {
       // Value must be: Bigger than 2 AND bigger than 5
       B.setMath(3);
       A.setFilter('vc', '<', 2, '<', 5);
       assert.strictEqual(g.solve(), 2);
     });

  it('If both sets are given, and their predicates are the same,' +
         ' we discard the redundant one [<]',
     () => {
       // Value must be: Bigger than 2 AND bigger than 5
       B.setMath(3);
       A.setFilter('vc', '<', 5, '<', 2);
       assert.strictEqual(g.solve(), 2);
     });

  it('If both sets are given, and their predicates are in the same direction,' +
         ' and their values are the same, the most restrictive ' +
         'sense is used',
     () => {
       // Value must be: Bigger than 2 AND bigger than 5
       B.setMath(3);
       A.setFilter('vu', '<=', 3, '<', 3);
       assert.strictEqual(g.solve(), undefined);

       // Regardless of the order
       A.setFilter('vu', '<', 3, '<=', 3);
       assert.strictEqual(g.solve(), undefined);

       // Regardless of the order
       A.setFilter('vu', '<=', 3, '<=', 3);
       assert.strictEqual(g.solve(), 3);

       // Clamped values also work
       A.setFilter('vc', '<', 3, '<=', 3);
       assert.strictEqual(g.solve(), 3);
     });

  // Outside of band  values (Band Fail) are not allowed.
  it('Predicates that do not define a *inclusive* band return undefined',
     () => {
       // For simplicity, our pass filter is an *AND* filter, and while the
       // below could form an exclusion band if the predicates were "OR"ed, we
       // don't allow for that, and interpret the statement as:
       // 3 is bigger than 10 AND 3 is smaller than 4, which is clearly false
       B.setMath(3);
       A.setFilter('vu', '>', 10, '<', 4);
       assert.strictEqual(g.solve(), undefined);


       // Clamping values when the input defines an exclusion band is
       // indeterminate. It could clamp to any of the target values, and the
       // behavior is unpredictable.
       // The correct way of handling this is to make this undefined, but with
       // the amount of edge case testing required, I could simply not be
       // bothered. Fuck the user for even trying this.

       // Here it clamps to the higher value
       A.setFilter('vc', '>', 10, '<', 4);
       assert.strictEqual(g.solve(), 10);

       // Here it clamps to the lower value.
       B.setMath(10);
       A.setFilter('vc', '<', 9, '>', 15);
       assert.strictEqual(g.solve(), 9);

     });

  // Exactly equal
  it('Test value exactly equal (Pass)', () => {
    B.setMath(3);
    A.setFilter('vu', '==', 3);
    assert.strictEqual(g.solve(), 3)
  });

  it('Test value exactly equal (Fail)', () => {
    B.setMath(3);
    A.setFilter('vu', '==', 3.00001);
    assert.strictEqual(g.solve(), undefined)
  });

  // Output formatting.
  it('"vu" mode passes with the value', () => {
    B.setMath(3);
    A.setFilter('vu', '<=', 3);
    assert.strictEqual(g.solve(), 3)
  });

  it('"vu" mode fails with undefined', () => {
    B.setMath(3);
    A.setFilter('vu', '<', 3);
    assert.strictEqual(g.solve(), undefined)
  });

  it('"10" mode passes with the 1', () => {
    B.setMath(3);
    A.setFilter('10', '<=', 3);
    assert.strictEqual(g.solve(), 1)
  });

  it('"10" mode fails with 0', () => {
    B.setMath(3);
    A.setFilter('10', '<', 3);
    assert.strictEqual(g.solve(), 0)
  });

  it('"tf" mode passes with true', () => {
    B.setMath(3);
    A.setFilter('tf', '<=', 3);
    assert.strictEqual(g.solve(), true)
  });

  it('"tf" mode fails with false', () => {
    A.setFilter('tf', '<', 3);
    assert.strictEqual(g.solve(), false)
  });

  it('"vc" mode passes with the value', () => {
    B.setMath(3);
    A.setFilter('vc', '>', 1);
    assert.strictEqual(g.solve(), 3)
  });

  it('"vc" fails with the clamping value', () => {
    B.setMath(3);
    A.setFilter('vc', '>', 100);
    assert.strictEqual(g.solve(), 100)
  });

  // Range clamping (inclusive)
  it('"vc" can clamp to the upper limit. 6 should be clamped to 5', () => {
    B.setMath(6);
    A.setFilter('vc', '<', 5, '>', 2);
    assert.strictEqual(g.solve(), 5);
  });

  it('"vc" can clamp to the lower limit. 1 should be clamped to 2', () => {
    B.setMath(1);
    A.setFilter('vc', '<', 5, '>', 2);
    assert.strictEqual(g.solve(), 2);
  });

  it('"vc" passes the value without clamping. 3 should pass through as 3',
     () => {
       B.setMath(1);
       A.setFilter('vc', '<', 5, '>', 2);
       // Clamped to the limit
       assert.strictEqual(g.solve(), 2);
     });

});

describe('Nodes can access data from an array or object', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  g.connect(A, g.root);
  A.setPath(12.34567809);

  const data = {
    'SOME': [1, 2, {'weird': {'data': [4, 10, 'structure', [0, 3]]}}]
  };

  it('Node can access data from deep in object', () => {
    A.setPath('SOME', 0);
    assert.strictEqual(g.solve(data), 1);

    A.setPath('SOME', 2, 'weird', 'data', 1);
    assert.strictEqual(g.solve(data), 10);
  });

  it('The data path can be read', () => {
    be.equalsArrays(A.path, ['SOME', 2, 'weird', 'data', 1]);
  });

  it('When the path is set to "null" the node returns what it is given', () => {
    A.setPath(null);
    assert.strictEqual(g.solve(1.23), 1.23);

    const s = g.getSolver();
    const arr = [1,2,3,4,5,6];
    be.equalsArrays(arr.map(s), arr);
  })

});

describe('Nodes can have a default or fallback value', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  g.connect(B, A).connect(A, g.root);
  B.setMath(10);

  it('Without a fallback value, the node fails with undefined', () => {
    A.setFilter('vu', '<', 5);
    assert.strictEqual(g.solve(), undefined)
  });

  it('With a fallback value, the node fails to the fallback', () => {
    A.setFilter('vu', '<', 5);
    A.setFallback(100);
    assert.strictEqual(g.solve(), 100)
  });

  it('The fallback value can be a string', () => {
    A.setFilter('vu', '<', 5);
    A.setFallback('string');
    assert.strictEqual(g.solve(), 'string')
  });

  it('The fallback value can be a boolean', () => {
    A.setFilter('vu', '<', 5);
    A.setFallback(false);
    assert.strictEqual(g.solve(), false)
  });

  it('The fallback value can be a number', () => {
    A.setFilter('vu', '<', 5);
    A.setFallback('fallback');
    assert.strictEqual(g.solve(), 'fallback')
  });

  it('A failing math node invokes the fallback', () => {
    A.setMath('make me fail');
    A.setFallback('fallback');
    assert.strictEqual(g.solve(), 'fallback')
  });

  it('A failing enum node invokes the fallback', () => {
    A.addEnum(10, 'pass').addEnum(9, 'fail');
    A.setFallback('fallback');
    assert.strictEqual(g.solve(), 'pass');

    A.delEnum(10);
    assert.strictEqual(g.solve(), 'fallback')
  });

  it('A failing filter node invokes the fallback', () => {
    A.setFilter('vu', '<', 5);
    A.setFallback('fallback');
    assert.strictEqual(g.solve(), 'fallback');
  });

  it('A node with no function, but a fallback, is treated as a constant',
     () => {
       const m = new DAG();
       m.connect(m.makeNode('C').setFallback('fallback'), m.root);
       assert.strictEqual(m.solve(), 'fallback');
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
  const A = g.makeNode('A');
  const C = g.makeNode('C');
  const D = g.makeNode('D');
  const E = g.makeNode('E');
  g.connect(C, E).connect(E, A).connect(D, A).connect(A, g.root);
  D.setMath(10);
  C.setMath(3);
  A.setMath('($1 + 2.5) / $2');
  E.setFilter('vu', '>', -1, '<=', 100);

  const data = {
    'SOME': [1, 2, {'weird': {'data': [4, 10, 'structure', [0, 3]]}}]
  };

  const D2 = Array(5000).fill(data);
  const D3 = Array(5000).fill(1).map((e, i) => [i]);

  it('When given data, it can read and solve.', () => {
    D.setPath('SOME', 2, 'weird', 'data', 1);
    C.setPath('SOME', 2, 'weird', 'data', 3, 1);
    assert.strictEqual(g.solve(data), 0.55)
  });

  it('Use the "debug" method to get the solution at each node', () => {
    // This is the solution at each node in topo order
    assert.deepStrictEqual(g.debug(data), [ 10, 3, 3, 0.55, 0.55 ])
  });

  it('The graph can be applied to an array of data', () => {
    D.setPath('SOME', 2, 'weird', 'data', 1);
    C.setPath('SOME', 2, 'weird', 'data', 3, 1);
    D2.map(e => g.solve(e));  // <- About 270ms
  });

  it('A DAG can retrun a pre-computed solver that is ' +
         'much faster than the above methods.',
     () => {
       const solver = g.getSolver();
       D2.map(solver);  // <- About 25ms About 10x faster
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
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  const C = g.makeNode('C');
  const D = g.makeNode('D');
  const E = g.makeNode('D');
  g.connect(C, E).connect(E, B).connect(B, A).connect(D, A).connect(A, g.root);
  D.setMath(10);
  C.setMath(3);
  B.addEnum(3, 2.5).addEnum('A', 'B');
  A.setMath('($1 + 2.5) / $2');
  E.setFilter('vu', '>', 2, '<=', 5);

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
