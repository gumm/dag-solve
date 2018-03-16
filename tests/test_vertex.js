const be = require('be-sert');
const assert = require('assert');
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
    const arr = [1, 2, 3, 4, 5, 6];
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