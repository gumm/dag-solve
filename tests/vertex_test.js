const be = require('be-sert');
const assert = require('assert');
const Node = require('../utils/vertex.js');
const DAG = require('../dag.js');

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
  const B = g.makeNode('B').setMath(1);
  g.connect(B, A).connect(A, g.root);

  it('An enum is a collection of 2-element arrays', () => {
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

  it('The output value of an enum can be a connected node', () => {
    const g = new DAG();
    const IN = g.makeNode('INPUT').setPath(null);
    const G3 = g.makeNode('GIVE_3').setMath(3);
    const G4 = g.makeNode('GIVE_4').setMath(4);
    const G5 = g.makeNode('GIVE_5').setMath(5);
    const A = g.makeNode('ENUM')
        .addEnum(1, 'Value was 1')
        .addEnum(2, '$2')
        .addEnum(3, '$3')
        .addEnum(4, '$4');
    g.connect(A, g.root)
        .connect(IN, A)
        .connect(G3, A)
        .connect(G4, A)
        .connect(G5, A);

    assert.deepStrictEqual(A.enum, [
        [ 1, 'Value was 1' ],
        [ 2, '$2' ],
        [ 3, '$3' ],
        [ 4, '$4' ]
    ]);
    assert.strictEqual(g.solve(1), 'Value was 1');
    assert.strictEqual(g.solve(2), 3);
    assert.strictEqual(g.solve(3), 4);
    assert.strictEqual(g.solve(4), 5);
    assert.strictEqual(g.solve(5), undefined);
  });
});

describe('Nodes can make comparisons', () => {
  const g = new DAG();
  const IN1 = g.makeNode('IN1').setPath(0);
  const IN2 = g.makeNode('IN2').setPath(1);
  const COMP = g.makeNode('COMP');
  g.connect(COMP, g.root)
      .connect(IN1, COMP)
      .connect(IN2, COMP);

  it('It can test Equality (==)', () => {
    COMP.setComparator('$1', '==', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), false);
    assert.strictEqual(g.solve([1, 2]), false);
    assert.strictEqual(g.solve([2, 2]), true);
    assert.strictEqual(g.solve([2.0, 2]), true);
    assert.strictEqual(g.solve(['2', 2]), true);
  });

  it('It can test Inequality (!=)', () => {
    COMP.setComparator('$1', '!=', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), true);
    assert.strictEqual(g.solve([1, 2]), true);
    assert.strictEqual(g.solve([2, 2]), false);
    assert.strictEqual(g.solve([2.0, 2]), false);
  });

  it('It can test Identity / strict equality (===)', () => {
    COMP.setComparator('$1', '===', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), false);
    assert.strictEqual(g.solve([1, 2]), false);
    assert.strictEqual(g.solve([2, 2]), true);
    assert.strictEqual(g.solve([2.0, 2]), true);
    assert.strictEqual(g.solve(['2', 2]), false);
  });

  it('It can test Non-identity / strict inequality (!==)', () => {
    COMP.setComparator('$1', '!==', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), true);
    assert.strictEqual(g.solve([1, 2]), true);
    assert.strictEqual(g.solve([2, 2]), false);
    assert.strictEqual(g.solve([2.0, 2]), false);
    assert.strictEqual(g.solve(['2', 2]), true);
  });

  it('It can use the Greater than operator (>)', () => {
    COMP.setComparator('$1', '>', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), true);
    assert.strictEqual(g.solve([1, 2]), false);
  });

  it('It can use the Greater than or equal operator (>=)', () => {
    COMP.setComparator('$1', '>=', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), true);
    assert.strictEqual(g.solve([2, 2]), true);
    assert.strictEqual(g.solve([1, 2]), false);
  });

  it('It can use the Less than operator (<)', () => {
    COMP.setComparator('$1', '<', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), false);
    assert.strictEqual(g.solve([1, 2]), true);
  });

  it('It can use the Less than or equal operator (<=)', () => {
    COMP.setComparator('$1', '<=', '$2', 'tf');
    assert.strictEqual(g.solve([2, 1]), false);
    assert.strictEqual(g.solve([2, 2]), true);
    assert.strictEqual(g.solve([1, 2]), true);
  });

  it('It can compare input node values with a constant', () => {
    COMP.setComparator('$1', '===', 5, 'tf');
    assert.strictEqual(g.solve([5, 11]), true);
    COMP.setComparator('$1', '===', 5, 'tf');
    assert.strictEqual(g.solve([3, 11]), false);

    COMP.setComparator(5, '===', '$1', 'tf');
    assert.strictEqual(g.solve([5, 11]), true);
    COMP.setComparator(5, '===', '$1', 'tf');
    assert.strictEqual(g.solve([3, 11]), false);

    COMP.setComparator('$2', '===', 100, 'tf');
    assert.strictEqual(g.solve([2, 100]), true);
    COMP.setComparator('$2', '===', 100, 'tf');
    assert.strictEqual(g.solve([2, 90]), false);

    COMP.setComparator(5, '===', 5, 'tf');
    assert.strictEqual(g.solve([100, 200]), true);
  });

  it('It can output true or false', () => {
    COMP.setComparator('$1', '>', '$2', 'tf');
    assert.strictEqual(g.solve([1, 2]), false);
    assert.strictEqual(g.solve([2, 1]), true);
  });

  it('It can output 0 or 1', () => {
    COMP.setComparator('$1', '>', '$2', '10');
    assert.strictEqual(g.solve([1, 2]), 0);
    assert.strictEqual(g.solve([2, 1]), 1);
  });

  it('It can output the first value or undefined', () => {
    COMP.setComparator('$1', '>', '$2', 'vu');
    assert.strictEqual(g.solve([1, 2]), undefined);
    assert.strictEqual(g.solve([2, 1]), 2);
  });

  it('It can output the first value or the second value', () => {
    COMP.setComparator('$1', '>', '$2', 'ab');
    assert.strictEqual(g.solve([1, 22]), 22);
    assert.strictEqual(g.solve([33, 22]), 33);
  });

});

describe('Nodes can filter between values', () => {
  const g = new DAG();
  const IN1 = g.makeNode('IN1').setPath(0);
  const IN2 = g.makeNode('IN2').setPath(1);
  const IN3 = g.makeNode('IN2').setPath(2);
  const FILTER = g.makeNode('FILTER');
  g.connect(FILTER, g.root)
      .connect(IN1, FILTER)
      .connect(IN2, FILTER)
      .connect(IN3, FILTER);

  it('It can test against constant values', () => {
    FILTER.setBetween('$1', 1, 3, 'tf');
    assert.strictEqual(g.solve([3.01]), false);
    assert.strictEqual(g.solve([0.99]), false);
    assert.strictEqual(g.solve([1]), true);
    assert.strictEqual(g.solve([2]), true);
    assert.strictEqual(g.solve([3]), true);
  });

  it('It can test against constant values (inverse)', () => {
    FILTER.setBetween('$1', 3, 1, 'tf');
    assert.strictEqual(g.solve([3.01]), false);
    assert.strictEqual(g.solve([0.99]), false);
    assert.strictEqual(g.solve([1]), true);
    assert.strictEqual(g.solve([2]), true);
    assert.strictEqual(g.solve([3]), true);
  });

  it('It can clamp to the filter', () => {
    FILTER.setBetween('$1', 3, 1, 'ab');
    assert.strictEqual(g.solve([3.01]), 3);
    assert.strictEqual(g.solve([0.99]), 1);
    assert.strictEqual(g.solve([1]), 1);
    assert.strictEqual(g.solve([2]), 2);
    assert.strictEqual(g.solve([3]), 3);
  });

  it('It can clamp to the filter (inverse)', () => {
    FILTER.setBetween('$1', 1, 3, 'ab');
    assert.strictEqual(g.solve([3.01]), 3);
    assert.strictEqual(g.solve([0.99]), 1);
    assert.strictEqual(g.solve([1]), 1);
    assert.strictEqual(g.solve([2]), 2);
    assert.strictEqual(g.solve([3]), 3);
  });

  it('It can output 0 or 1', () => {
    FILTER.setBetween('$1', 2, 4, '10');
    assert.strictEqual(g.solve([4.01]), 0);
    assert.strictEqual(g.solve([1.99]), 0);
    assert.strictEqual(g.solve([2]), 1);
    assert.strictEqual(g.solve([3]), 1);
    assert.strictEqual(g.solve([4]), 1);
  });

  it('It can output the input or undefined', () => {
    FILTER.setBetween('$1', 2, 4, 'vu');
    assert.strictEqual(g.solve([4.01]), undefined);
    assert.strictEqual(g.solve([1.99]), undefined);
    assert.strictEqual(g.solve([2]), 2);
    assert.strictEqual(g.solve([3]), 3);
    assert.strictEqual(g.solve([4]), 4);
  });

  it('It can read parameters from other nodes', () => {
    FILTER.setBetween('$1', '$2', '$3', 'ab');
    assert.strictEqual(g.solve([3.01, 1, 3]), 3);
    assert.strictEqual(g.solve([0.99, 1, 3]), 1);
    assert.strictEqual(g.solve([1, 1, 3]), 1);
    assert.strictEqual(g.solve([2, 1, 3]), 2);
    assert.strictEqual(g.solve([3, 1, 3]), 3);
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
    const arr = [1, 2, 3, 4, 5, 6];
    be.equalsArrays(arr.map(s), arr);
  })

});


describe('Nodes can access event codes', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  g.connect(A, g.root);
  A.setEvCode(123);

  const data = {
    '_ev': {
      '1': {code: 1, data: 'string', desc: null},
      '12': {code: 12, data: null, desc: null},
      '123': {code: 123, data: true, desc: 'A true'},
      '1234': {code: 1234, data: 12, desc: 'A number'}
    },
    'SOME': [1, 2, {'weird': {'data': [4, 10, 'structure', [0, 3]]}}]
  };

  it('Event codes are only looked for under the "_ev" key', () => {
    assert.strictEqual(g.solve(data), true);
  });

  it('Event codes may not have values', () => {
    A.setEvCode(12);
    assert.strictEqual(g.solve(data), null);
  });

  it('Event codes could be strings', () => {
    A.setEvCode(1);
    assert.strictEqual(g.solve(data), 'string');
  });

  it('Add an optional "desc" to access the event description', () => {
    A.setEvCode(1234, 'desc');
    assert.strictEqual(g.solve(data), 'A number');
  });

  it('Add an optional "code" to access the event code numeric value', () => {
    A.setEvCode(1234, 'code');
    assert.strictEqual(g.solve(data), 1234);
  });

});

describe('Nodes can have a default or fallback value', () => {
  const g = new DAG();
  const A = g.makeNode('A');
  const B = g.makeNode('B');
  g.connect(B, A).connect(A, g.root);
  B.setMath(10);

  it('Without a fallback value, the node fails with undefined', () => {
    A.setComparator('$1', '<', 5, 'vu');
    assert.strictEqual(g.solve(), undefined)
  });

  it('With a fallback value, the node fails to the fallback', () => {
    A.setComparator('$1', '<', 5,  'vu');
    A.setFallback(100);
    assert.strictEqual(g.solve(), 100)
  });

  it('The fallback value can be a string', () => {
    A.setComparator('$1', '<', 5,  'vu');
    A.setFallback('string');
    assert.strictEqual(g.solve(), 'string')
  });

  it('The fallback value can be a boolean', () => {
    A.setComparator('$1', '<', 5,  'vu');
    A.setFallback(false);
    assert.strictEqual(g.solve(), false)
  });

  it('The fallback value can be a number', () => {
    A.setComparator('$1', '<', 5,  'vu');
    A.setFallback(3);
    assert.strictEqual(g.solve(), 3)
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
    A.setComparator('$1', '<', 5, 'vu');
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

describe('Nodes can be dumped.', () => {
  const g = new DAG();
  const A = g.makeNode('A').setMath('1 + 1').setFallback(5);
  const dumpedNode = {
    B: [],
    I: 1,
    N: 'A',
    A: [],
    D: 5,
    M: '1 + 1',
    E: [],
    R: undefined,
    P: [],
    C: [],
    V: []
  };
  it('A dumped node is an object, not a string.', () => {
    assert.deepStrictEqual(A.dump(), dumpedNode);
  });
  it('A dumped node object can be used when creating a new node', () => {
    const B = new Node(10, 'blah', A.dump());
    assert.strictEqual(B.id, A.id);
    assert.strictEqual(B.name, A.name);
    assert.strictEqual(B.fallback, A.fallback);
    assert.deepStrictEqual(B.args, A.args);
    assert.deepStrictEqual(B.path, A.path);
    assert.deepStrictEqual(B.math, A.math);
    assert.deepStrictEqual(B.round, A.round);
    assert.deepStrictEqual(B.comparator, A.comparator);
    assert.deepStrictEqual(B.enum, A.enum);
  });


});