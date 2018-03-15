const assert = require('assert');
const u = require('../utils.js');

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