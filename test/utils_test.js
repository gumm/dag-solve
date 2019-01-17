const assert = require('assert');
import * as B from '../node_modules/badu/badu.js';
import * as u from '../src/utils.js';

describe('The mathCleaner function', () => {

  it('allows simple math strings', () => {
    assert.strictEqual(u.mathCleaner('1 + 1'), '1 + 1');
  });
  it('allows complex math strings', () => {
    const m = '((1.23 ** -1.06) / (12 % 5)) / (2 * 6.1)';
    assert.strictEqual(u.mathCleaner(m), m);
  });
  it('allows references to variables via the "$"-notation', () => {
    const m = '(($1 ** -$2) / ($3 % $4)) / ($5 * $6)';
    assert.strictEqual(u.mathCleaner(m), m);
  });
  it('strips anything that is not math', () => {
    const m = 'No Math + here = there';
    const r = '  +   ';
    assert.strictEqual(u.mathCleaner(m), r);
  });
});

describe('The funcMaker function', () => {
  it('when given a value, returns a function that returns that value', () => {
    const [err, f] = u.funcMaker(10);
    assert.strictEqual(err, null);
    assert.strictEqual(f(), 10);
  });

  it('when given a valid math string, returns a function ' +
         'that resolves the math',
     () => {
       const [err, f] = u.funcMaker('10 * 2 + 5');
       assert.strictEqual(err, null);
       assert.strictEqual(f(), 25);
     });

  it('when given a invalid input, returns a function ' +
         'that returns undefined',
     () => {
       const [err, f] = u.funcMaker('blah');
       assert.strictEqual(err, null);
       assert.strictEqual(f(), undefined);
     });

  it('even if the input is legal it may not be valid.', () => {
    const [err, f] = u.funcMaker('++ - *');
    assert.strictEqual(err, 'Could not make a function with "++ - *"');
    assert.strictEqual(f(), undefined);
  });
});

describe('Type utilities', () => {

  it('Test for a reference string ($1 etc)', () => {
    assert.strictEqual(u.isRefString(1), false);
    assert.strictEqual(u.isRefString(NaN), false);
    assert.strictEqual(u.isRefString('string'), false);
    assert.strictEqual(u.isRefString({}), false);
    assert.strictEqual(u.isRefString([]), false);
    assert.strictEqual(u.isRefString('$1'), true);
    assert.strictEqual(u.isRefString('$456778875'), true);
  });

  it('Given a reference string, get its index', () => {
    // Reference strings are off-by-one to the solution array index they
    // reference.
    assert.strictEqual(u.getRefIndex('$1'), 0);
    assert.strictEqual(u.getRefIndex('$5'), 4);
  });

  it('Make equality comparator', () => {
    const c = u.makeComparator('==');
    assert.strictEqual(c(1, 2), false);
    assert.strictEqual(c(2, 2), true);
    assert.strictEqual(c('2', 2), true);
    assert.strictEqual(c('2', '2'), true);
  });

  it('Make inequality comparator', () => {
    const c = u.makeComparator('!=');
    assert.strictEqual(c(1, 2), true);
    assert.strictEqual(c(2, 2), false);
    assert.strictEqual(c('2', 2), false);
    assert.strictEqual(c('2', '2'), false);
  });

  it('Make identity comparator', () => {
    const c = u.makeComparator('===');
    assert.strictEqual(c(1, 2), false);
    assert.strictEqual(c(2, 2), true);
    assert.strictEqual(c('2', 2), false);
    assert.strictEqual(c('2', '2'), true);
  });

  it('Make non-identity comparator', () => {
    const c = u.makeComparator('!==');
    assert.strictEqual(c(1, 2), true);
    assert.strictEqual(c(2, 2), false);
    assert.strictEqual(c('2', 2), true);
    assert.strictEqual(c('2', '2'), false);
  });

  it('Make less than or eq comparator', () => {
    const c = u.makeComparator('<=');
    assert.strictEqual(c(1, 2), true);
    assert.strictEqual(c(2, 2), true);
    assert.strictEqual(c(2, 1), false);
  });

  it('Make less than comparator', () => {
    const c = u.makeComparator('<');
    assert.strictEqual(c(1, 2), true);
    assert.strictEqual(c(2, 2), false);
    assert.strictEqual(c(2, 1), false);
  });

  it('Make greater than or eq comparator', () => {
    const c = u.makeComparator('>=');
    assert.strictEqual(c(1, 2), false);
    assert.strictEqual(c(2, 2), true);
    assert.strictEqual(c(2, 1), true);
  });

  it('Make greater than comparator', () => {
    const c = u.makeComparator('>');
    assert.strictEqual(c(1, 2), false);
    assert.strictEqual(c(2, 2), false);
    assert.strictEqual(c(2, 1), true);
  });

  it('Given junk it always returns false', () => {
    const c = u.makeComparator('<>');
    assert.strictEqual(c(1, 2), false);
    assert.strictEqual(c(2, 2), false);
    assert.strictEqual(c(2, 1), false);
  });

  it('Make a always failing comparator when given junk', () => {
    const c = u.makeComparator('<>');
    assert.strictEqual(c(1, 2), false);
    assert.strictEqual(c(2, 2), false);
    assert.strictEqual(c(2, 1), false);
  });

  it('Make a output function that gives either value or undefined', () => {
    const o = u.genOutput('vu');
    const pass = true;
    const fail = false;
    assert.strictEqual(o(pass, 3, 4), 3);
    assert.strictEqual(o(fail, 3, 4), undefined);
  });

  it('Make a output function that gives either 1 or 0', () => {
    const o = u.genOutput('10');
    const pass = true;
    const fail = false;
    assert.strictEqual(o(pass, 3, 4), 1);
    assert.strictEqual(o(fail, 3, 4), 0);
  });

  it('Make a output function that gives either true or false', () => {
    const o = u.genOutput('tf');
    const pass = true;
    const fail = false;
    assert.strictEqual(o(pass, 3, 4), true);
    assert.strictEqual(o(fail, 3, 4), false);
  });

  it('Make a output function that gives either value a or value b', () => {
    const o = u.genOutput('ab');
    const pass = true;
    const fail = false;
    assert.strictEqual(o(pass, 3, 4), 3);
    assert.strictEqual(o(fail, 3, 4), 4);
  });

  it('Access data from a path', () => {
    const data = {
      'SOME': [1, 2, {'weird': {'data': [4, 10, 'structure', [0, 3]]}}]
    };
    let o;
    o = B.pathOr('failed', ['SOME', 2, 'weird', 'data', 3, 1]);
    assert.strictEqual(o(data), 3);

    o = B.pathOr('failed', ['SOME', 0, 'weird', 'data', 3, 1]);
    assert.strictEqual(o(data), 'failed');
  });

});
