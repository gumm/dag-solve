const argRefSymbol = 'X';

/**
 * A strict same elements in same order comparison.
 * Example:
 *    console.log('Same Arrays:', sameArr([1, 2], [1, 2]));
 *    console.log('Same Arrays:', sameArr([2, 1], [1, 2]));
 * @param {!Array.<*>} a
 * @param {!Array.<*>} b
 */
const sameArr = (a, b) => a.length === b.length && a.every((c, i) => b[i] === c);

/**
 * @param {?} t
 * @returns {boolean}
 */
const isDef = t => t !== undefined;

/**
 * @returns {undefined}
 */
const alwaysUndef = () => undefined;

/**
 * @returns {boolean}
 */
const alwaysFalse = () => false;

/**
 * Given a predicate and a target value. return a function that takes a
 * value to test against the predicate.
 * Junk input always results in a failing test.
 * @param {!string} p Predicate
 * @param {!number} pVal A value
 * @returns {!function(!number): boolean}
 */
const makeTest = (p, pVal) => {
  const m = {
    '==': v => v === pVal,
    '<=': v => v <= pVal,
    '>=': v => v >= pVal,
    '<': v => v < pVal,
    '>': v => v > pVal
  };
  return m[p] || alwaysFalse;
};

/**
 * @param {!string} rv Return value type. Can be:
 *    'vu': Pass the input value through if it passes and undefined if it fails.
 *    '10': Pass the number 1 if it passes, else 0
 *    'tf': Pass with true, else fail.
 *    Junk input always results in a failing test.
 * @param {function(*):boolean} test
 * @param {=number} c A clamp value.
 * @returns {*|(function(*): boolean)}
 */
const makeResult = (rv, test, c) => {
  const m = {
    'vu': v => test(v) ? v : undefined,
    '10': v => test(v) ? 1 : 0,
    'tf': v => test(v),
    'vc': v => test(v) ? v : c
  };
  return m[rv] || alwaysUndef;
};

const parseFilter = arr => {
  const [rv, p1, v1, p2, v2] = arr;
  const P1 = makeTest(p1, v1);
  const R1 = makeResult(rv, P1, v1);
  let f = v => R1(v);

  if (p2 && isDef(v2)) {
    const P2 = makeTest(p2, v2);
    const R2 = makeResult(rv, P2, v2);
    f = v => R1(v) && R2(v);
    if (rv === 'vc') {
      f = v => R1(v) === v1 ? v1 : R2(v) === v2 ? v2 : v;
    }
    }
  return [null, X => f(X[0])];
};


/**
 * Given a string, sanitize it and only allow numbers and arithmetic
 * operators
 * @param {!string} s
 * @returns {string}
 */
const mathCleaner = s => {
  const arithmeticOperators = ['+', '-', '*', '/', '%', '(', ')'];
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];
  const ref = ['$', ' '];
  const combined = [...arithmeticOperators, ...numbers, ...ref];
  return [...s].filter(e => combined.includes(e)).join('');
};

/**
 * @param {(!string|!number)} fn
 * @returns {*[]}
 */
const funcMaker = fn => {
  try {
    return [
      null,
      new Function(argRefSymbol, `try { return ${fn}; } catch(e) { return; }`)
    ];
  } catch (err) {
    return [`Could not make a function with "${fn}"`, alwaysUndef];
  }
};

/**
 * Convert a mathematical string, into  a function that returns the
 * solution.
 * @param {(!string|!number)} m The string to convert. It can be of the form
 *    "12 / $4" in which case the token "$1" will be replaced by the token X[3].
 *    This means that when the arithmetic is calculated, we only need to pass in
 *    the variable "X" which should be an array of values, and we will be able
 *    to solve the math.
 * @param {!Array<!Node>} a
 * @returns {[boolean, !Function]}
 */
const mathFunc = (m, a) => {
  let err = 'Unable to clean math';
  let f = alwaysUndef;
  if (typeof m === 'string') {
    const s = a.reduce(
        (p, c, i) => p.split(`$${i + 1}`).join(`${argRefSymbol}[${i}]`),
        mathCleaner(m));
    if (!s.includes('$')) {
      [err, f] = funcMaker(s);
    }
  } else {
    [err, f] = funcMaker(m);
  }
  return [err, f];
};


/**
 * Given a map of a dag in the form below, return an array of leaf nodes, that
 * is, nodes with 0 in degrees / nodes where no edges point to it.
 * @param {!Map} G example:
 *    const G = new Map([
 *      [ 'A', new Set(['B', 'C']) ],
 *      [ 'B', new Set(['C', 'D']) ],
 *      [ 'C', new Set(['D']) ],
 *      [ 'E', new Set(['F']) ],
 *      [ 'F', new Set(['C']) ],
 *      [ 'D', new Set([]) ]
 *    ]);
 * @returns {Array}
 */
const leafNodes = G => {
  // Build a map of the form:
  // { A: 0, B: 1, C: 3, E: 0, F: 1, D: 2 }
  // where each key in the DAG is notated with the number of times it
  // appears as a value. In terms of a DAG, this describes how many edges
  // point to this node.
  const C = [...G.keys()].reduce((p, c) => (p.set(c, 0)) || p, new Map());
  [...G.values()].forEach(
      arr => arr.forEach(e => C.set(e, C.has(e) ? C.get(e) + 1 : 0)));
  const Q = [...G.keys()].filter(e => C.get(e) === 0);
  return [C, Q];
};

/**
 * Given the DAG as below, return an array where the nodes of the DAG
 * are topologically sorted.
 * example:
 *    [ 'E', 'F', 'A', 'B', 'C', 'D' ]
 * @param {!Map} G example:
 *    const G = new Map([
 *      [ 'A', new Set(['B', 'C']) ],
 *      [ 'B', new Set(['C', 'D']) ],
 *      [ 'C', new Set(['D']) ],
 *      [ 'E', new Set(['F']) ],
 *      [ 'F', new Set(['C']) ],
 *      [ 'D', new Set([]) ]
 *    ]);
 * @returns {Array}
 */
const topoSort = G => {

  const [C, Q] = leafNodes(G);

  // The result array.
  const S = [];
  while (Q.length) {
    const u = Q.pop();
    S.push(u);
    G.get(u).forEach(v => {
      C.set(v, C.get(v) - 1);
      if (C.get(v) === 0) {
        Q.push(v);
      }
    });
    }
  return S;
};

/**
 * Given a map recursively delete all orphan nodes.
 * @param {!Map} G example:
 *    const G = new Map([
 *      [ 'A', new Set(['B', 'C']) ],
 *      [ 'B', new Set(['C', 'D']) ],
 *      [ 'C', new Set(['D']) ],
 *      [ 'E', new Set(['F']) ],
 *      [ 'F', new Set(['C']) ],
 *      [ 'D', new Set([]) ]
 *    ]);
 * @returns {!Map}
 */
const removeOrphans = G => {
  for (const [k, s] of G.entries()) {
    if (s.size === 0 && k !== 0) {
      G.delete(k);
      for (const v of G.values()) {
        v.delete(k)
      }
    }
    }
  if ([...G.entries()].reduce(
          (p, c) => p || (c[1].size === 0 && c[0] !== 0), false)) {
    removeOrphans(G);
    }
  return G;
};

/**
 * A generator function to produce consecutive ids, starting from
 * n + 1 of n. If n is not given, use 0.
 * @param {=number} opt_n
 * @return {!Iterator<number>}
 */
function* idGen(opt_n) {
  let i = opt_n ? opt_n + 1 : 0;
  while (true) yield i++;
}

/**
 * @param {!Node} n
 * @returns {function(!Array<!Node>, !Array<!Node>): !Array<!Node>}
 */
const isIn = n => (p, [k, s]) => s.has(n) ? (p.push(k) && p) : p;

/**
 * Find the biggest number in a list of numbers
 * @param {!Array<!number>} arr
 * @returns {!number}
 */
const max = arr => Math.max(...arr);

/**
 * Given a Json string, parse it without blowing up.
 * @param json
 * @returns {*}
 */
const safeJsonParse = json => {
  // This function cannot be optimised, it's best to
  // keep it small!
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    }
  return parsed;
};

/**
 * Given an array of two-element arrays, and a key and value,
 * return the array with a new two element array item, containing the
 * key and value, added. This method does not allow the same elements to
 * be added more than once.
 * @param {!Array<!Array<*>>} arr
 * @param {*} k
 * @param {*} v
 * @returns {!Array<!Array<*>>}
 */
const enumSet = (arr, k, v) => [...new Map(arr).set(k, v).entries()];

/**
 * Given an array of two-element arrays, and a key,
 * remove all items where the first element of the inner array matches the key.
 * @param {!Array<!Array<*>>} arr
 * @param {*} k
 */
const enumUnSet = (arr, k) => arr.filter(e => e[0] !== k);

/**
 * @param {!Node} n
 * @returns {!number}
 */
const grabId = n => n._id;

/**
 * Return the last element of an array, or undefined if the array is empty.
 * @param {!Array<*>} arr
 * @returns {*}
 */
const tail = arr => arr[arr.length ? arr.length - 1 : undefined];


/**
 * @param {!number} precision
 * @returns {function(!number): number}
 */
const pRound = precision => {
  const factor = Math.pow(10, precision);
  return number => Math.round(number * factor) / factor;
};

module.exports = {
  alwaysUndef,
  isDef,
  enumSet,
  enumUnSet,
  mathFunc,
  pRound,
  parseFilter,
  idGen,
  topoSort,
  leafNodes,
  max,
  isIn,
  grabId,
  removeOrphans,
  tail,
  safeJsonParse,
  mathCleaner,
  funcMaker,
  sameArr
};