const B = require('badu');

const argRefSymbol = 'X';

/**
 * @param {*} m
 * @returns {boolean}
 */
const isRefString = m => B.isString(m) && !Number.isNaN(getRefIndex(m));

/**
 * @param {!string} m Something like $1
 * @returns {number}
 */
const getRefIndex = m => parseInt(m.split('$').join(''), 10) - 1;


/**
 * @param {!Node} n
 * @returns {function(!Array<!Node>, !Array<!Node>): !Array<!Node>}
 */
const isIn = n => (p, [k, s]) => s.has(n) ? (p.push(k) && p) : p;


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
 * A generator function to produce consecutive ids, starting from
 * n + 1 of n. If n is not given, use 0.
 * @param {number=} opt_n
 * @return {!Iterator<number>}
 */
function* idGen(opt_n) {
  let i = opt_n ? opt_n + 1 : 0;
  while (true) yield i++;
}


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
 * Given a predicate and a target value. return a function that takes a
 * value to test against the predicate.
 * Junk input always results in a failing test.
 * @param {!string} c Comparator
 * @returns {!function(!number): boolean}
 */
const makeComparator = (c) => {
  // noinspection EqualityComparisonWithCoercionJS
  const m = {
    '!=': (v1, v2) => v1 != v2,
    '==': (v1, v2) => v1 == v2,
    '!==': (v1, v2) => v1 !== v2,
    '===': (v1, v2) => v1 === v2,
    '<=': (v1, v2) => v1 <= v2,
    '>=': (v1, v2) => v1 >= v2,
    '<': (v1, v2) => v1 < v2,
    '>': (v1, v2) => v1 > v2
  };
  return m[c] || B.alwaysFalse;
};

/**
 * @param {!string} rv Return value type. Can be:
 *    'vu': Pass the input value through if it passes and undefined if it fails.
 *    '10': Pass the number 1 if it passes, else 0
 *    'tf': Pass with true, else fail.s
 *    'ab': First value if it passes else second value
 *    Junk input always results in a failing test.
 * @returns {(function(boolean, number, number): (undefined|boolean|number))}
 */
const genOutput = rv => {
  // noinspection JSUnusedLocalSymbols
  const m = {
    'vu': (b, v1, v2) => b ? v1 : undefined,
    '10': (b, v1, v2) => b ? 1 : 0,
    'tf': (b, v1, v2) => b,
    'ab': (b, v1, v2) => b ? v1 : v2
  };
  return m[rv] || B.alwaysUndef;
};

/**
 * Given a string, sanitize it and only allow numbers, arithmetic and bitwise
 * operators
 * @param {!string} s
 * @returns {string}
 */
const mathCleaner = s => {
  const arithmeticOps = ['+', '-', '*', '/', '%', '(', ')'];
  const bitwiseOps = ['&', '|', '^', '~', '<<', '>>', '>>>'];
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];
  const builtIns = ['int', 'len'];
  const ref = ['$', ' ', '\''];
  const combined =
      [...arithmeticOps, ...numbers, ...ref, ...bitwiseOps, ...builtIns];

  return [...s].filter(e => combined.includes(e)).join('');
};

const len = e => ('' + e).length;
const int = e => parseInt(e, 10);

/**
 * @param {(!string|!number)} fn
 * @returns {Array<string|!Function>}
 */
const funcMaker = fn => {
  try {
    return [
      null, new Function(argRefSymbol, `
      const len = e => ('' + e).length;
      const int = e => parseInt(e, 10);
      try { return ${fn}; } catch(e) { return; }
      `)
    ];
  } catch (err) {
    return [`Could not make a function with "${fn}"`, B.alwaysUndef];
  }
};


//-----------------------------------------------------------[ Solve Methods ]--
/**
 * Convert a mathematical string, into  a function that returns the
 * solution.
 * @param {(!string|!number)} m The string to convert. It can be of the form
 *    "12 / $4" in which case the token "$1" will be replaced by the token X[3].
 *    This means that when the arithmetic is calculated, we only need to pass in
 *    the variable "X" which should be an array of values, and we will be able
 *    to solve the math.
 * @param {!Array<!Node>} a
 * @returns {Array<boolean|!Function>}
 */
const mathFunc = (m, a) => {
  let err = 'Unable to clean math';
  let f = B.alwaysUndef;
  if (B.isString(m)) {
    const s = a.reduce(
        (p, c, i) => p.split(`$${i + 1}`).join(`${argRefSymbol}.get(${c})`),
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
 * @param {Array<Array<*>>} e The enum array.
 * @param {!Array<!number>} a
 * @returns {Array<boolean|!Function>}
 */
const enumFunc = (e, a) => {

  const r = e.map(([k, v]) => {
    if (B.isString(v) && isRefString(v)) {
      const i = getRefIndex(v);
      return [k, sMap => sMap.get(a[i])];
    } else {
      return [k, () => v];
    }
  });

  const m = new Map(r);
  return [
    null,
    sMap => {
      const f = m.get(sMap.get(a[0]));
      return f ? f(sMap) : undefined;
    }
  ];
};

/**
 * @param {!number} r The number of digits you want to round to.
 * @param {!Array<!number>} a
 * @returns {Array<boolean|!Function>}
 */
const roundFunc = (r, a) => {
  const round = B.pRound(r);
  return [null, sMap => round(sMap.get(a[0]))]
};

const compFuncHelper = (v, a) => {
  let f;
  if (B.isString(v)) {
    const i = getRefIndex(v);
    f = sMap => sMap.get(a[i]);
  } else {
    f = () => v
    }
  return f;
};

/**
 * @param {!Array<(number|string)>} c The comparison description.
 * @param {!Array<!number>} a
 * @returns {Array<boolean|!Function>}
 */
const comparatorFunc = (c, a) => {
  let [v1, cmp, v2, outputFormat] = c;

  const r1 = compFuncHelper(v1, a);
  const r2 = compFuncHelper(v2, a);
  const t = makeComparator(cmp);
  const outF = genOutput(outputFormat);

  return [
    null,
    sMap => {
      const [s1, s2] = [r1(sMap), r2(sMap)];
      return outF(t(s1, s2), s1, s2);
    }
  ];
};


/**
 * @param {!Array<(string|number)>} b The comparison description.
 * @param {!Array<!number>} a
 * @returns {Array<boolean|!Function>}
 */
const betweenFunc = (b, a) => {
  let [v, s1, s2, outputFormat] = b;
  const val = compFuncHelper(v, a);
  const sa = compFuncHelper(s1, a);
  const sb = compFuncHelper(s2, a);
  const outF = genOutput(outputFormat);

  return [
    null,
    sMap => {
      const [input, stopA, stopB] = [val(sMap), sa(sMap), sb(sMap)];
      const [min, max] = [Math.min(stopA, stopB), Math.max(stopA, stopB)];
      if (input >= min && input <= max) {
        return outF(true, input, min);
      } else if (input >= min) {
        return outF(false, input, max);
        }
      return outF(false, input, min);
    }
  ];
};

// noinspection JSUnusedLocalSymbols
/**
 * @param {!Array<(string|number)>} p The path into the data structure.
 * @param {!Array<!number>} a
 * @returns {Array<boolean|!Function>}
 */
const dataPathFunc = (p, a) => {
  let f;
  if (B.sameArr(p, [null])) {
    // By convention when the path is null, just return the data...
    f = sMap => sMap.get('data');
  } else {
    f = sMap => B.pathOr(undefined, p)(sMap.get('data'));
    }
  return [null, f];
};

// noinspection JSUnusedLocalSymbols
/**
 * The data structure spec describes the event data structure as:
 *  {_ev:
 *    {'101':
 *      {
 *        data: {null|undefined|string|number|Object|Array},
 *        desc: {string|null|undefined}
 *        code: {!number}
 *      }
 *    }
 * }
 * @param {!number} code
 * @param {!string} access Valid access keys are:
 *    'data', 'description' or 'code'
 * @param {!Array<!number>} a
 * @returns {Array<null|boolean|!Function>}
 */
const eventCodeFunc = ([code, access], a) => {
  const p = ['_ev', code.toString(), access];
  const f = sMap => B.pathOr(undefined, p)(sMap.get('data'));
  return [null, f];
};


//---------------------------------------------------------------[ DAG Utils ]--
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

module.exports = {
  enumSet,
  enumUnSet,
  mathFunc,
  enumFunc,
  roundFunc,
  comparatorFunc,
  betweenFunc,
  dataPathFunc,
  eventCodeFunc,
  idGen,
  topoSort,
  leafNodes,
  isIn,
  grabId,
  removeOrphans,
  safeJsonParse,
  mathCleaner,
  funcMaker,
  isRefString,
  getRefIndex,
  makeComparator,
  genOutput
};