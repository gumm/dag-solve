import {alwaysFalse, alwaysUndef, isString, pathOr, pRound, sameArr} from '../node_modules/badu/module/badu.mjs';


/**
 * @typedef {!Array<null|boolean|!Function>}
 */
let funcGetterType;

const argRefSymbol = 'X';

/**
 * @param {*} m
 * @returns {boolean}
 */
const isRefString = m => isString(m) && !Number.isNaN(
    getRefIndex(/** @type {string} */(m)));

/**
 * @param {string} m Something like $1
 * @returns {number}
 */
const getRefIndex = m => parseInt(m.split('$').join(''), 10) - 1;


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

// noinspection EqualityComparisonWithCoercionJS
/**
 * @type {Map<string, function(number, number): boolean>}
 */
const comparatorMap  = new Map([
  ['!=', (v1, v2) => v1 != v2],
  ['==', (v1, v2) => v1 == v2],
  ['!==', (v1, v2) => v1 !== v2],
  ['===', (v1, v2) => v1 === v2],
  ['<=', (v1, v2) => v1 <= v2],
  ['>=', (v1, v2) => v1 >= v2],
  ['<', (v1, v2) => v1 < v2],
  ['>', (v1, v2) => v1 > v2]
]);

/**
 * Given a predicate and a target value. return a function that takes a
 * value to test against the predicate.
 * Junk input always results in a failing test.
 * @param {string} c Comparator
 * @returns {!function(number, number): boolean}
 */
const makeComparator = (c) => {
  return comparatorMap.get(c) || alwaysFalse;
};

// noinspection JSUnusedLocalSymbols
/**
 * @type {Map<string, function(boolean, number, number): *>}
 */
const outputMap = new Map([
  ['vu', (b, v1, v2) => b ? v1 : undefined],
  ['10', (b, v1, v2) => b ? 1 : 0],
  ['tf', (b, v1, v2) => b],
  ['ab', (b, v1, v2) => b ? v1 : v2]
]);

/**
 * @param {string} rv Return value type. Can be:
 *    'vu': Pass the input value through if it passes and undefined if it fails.
 *    '10': Pass the number 1 if it passes, else 0
 *    'tf': Pass with true, else fail.s
 *    'ab': First value if it passes else second value
 *    Junk input always results in a failing test.
 * @returns {(function(boolean, number, number): *)}
 */
const genOutput = rv => {
  return outputMap.get(rv) || alwaysUndef;
};

/**
 * Given a string, sanitize it and only allow numbers, arithmetic and bitwise
 * operators
 * @param {string} s
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
 * @param {(string|number)} fn
 * @returns {!Array<string|!Function>}
 */
const funcMaker = fn => {
  try {
    return [
      null, new Function(argRefSymbol, [
      'const len = e => ("" + e).length;',
      'const int = e => parseInt(e, 10);',
      `try {return ${fn};}catch(e){return;}`
      ].join(''))
    ];
  } catch (err) {
    return [`Could not make a function with "${fn}"`, alwaysUndef];
  }
};


//-----------------------------------------------------------[ Solve Methods ]--
/**
 * Convert a mathematical string, into  a function that returns the
 * solution.
 * @param {(string|number)} m The string to convert. It can be of the form
 *    "12 / $4" in which case the token "$1" will be replaced by the token X[3].
 *    This means that when the arithmetic is calculated, we only need to pass in
 *    the variable "X" which should be an array of values, and we will be able
 *    to solve the math.
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const mathFunc = (m, a) => {
  let err = 'Unable to clean math';
  let f = alwaysUndef;
  if (isString(m)) {
    const s = a.reduce(
        (p, c, i) => p.split(`$${i + 1}`).join(`${argRefSymbol}.get(${c})`),
        mathCleaner(/** @type {string} */ (m)));
    if (!s.includes('$')) {
      [err, f] = funcMaker(s);
    }
  } else {
    [err, f] = funcMaker(m);
  }
  return [err, f];
};


/**
 * @param {!Array<!Array<*>>} e The enum array.
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const enumFunc = (e, a) => {

  const r = e.map(([k, v]) => {
    if (isString(v) && isRefString(v)) {
      const i = getRefIndex(/** @type {string} */(v));
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
 * @param {number} r The number of digits you want to round to.
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const roundFunc = (r, a) => {
  const round = pRound(r);
  return [null, sMap => round(sMap.get(a[0]))]
};

/**
 * @param {*} v
 * @param {!Array<*>} a
 * @return {(function(): *)|(function(*): *)}
 */
const compFuncHelper = (v, a) => {
  let f;
  if (isString(v)) {
    const i = getRefIndex(/** @type {string} */(v));
    f = sMap => sMap.get(a[i]);
  } else {
    f = () => v
  }
  return f;
};

/**
 * @param {!Array<(number|string)>} c The comparison description.
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const comparatorFunc = (c, a) => {
  const [v1, cmp, v2, outputFormat] = c;
  const r1 = compFuncHelper(v1, a);
  const r2 = compFuncHelper(v2, a);
  const t = makeComparator(/** @type {string} */(cmp));
  const outF = genOutput(/** @type {string} */(outputFormat));

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
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const betweenFunc = (b, a) => {
  let [v, s1, s2, outputFormat] = b;
  const val = compFuncHelper(v, a);
  const sa = compFuncHelper(s1, a);
  const sb = compFuncHelper(s2, a);
  const outF = genOutput(/** @type {string} */(outputFormat));

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
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const dataPathFunc = (p, a) => {
  let f;
  if (sameArr(p, [null])) {
    // By convention when the path is null, just return the data...
    f = sMap => sMap.get(a.length ? a[0] : 'data');
  } else {
    f = sMap => {
      return pathOr(undefined, p)(sMap.get(a.length ? a[0] : 'data'));
    }
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
 *        code: {number}
 *      }
 *    }
 * }
 * @param {!Array<number, string>} $0 A two element array.
 *  {number} code
 *  {string} access Valid access keys are:
 *    'data', 'description' or 'code'
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const eventCodeFunc = ([code, access], a) => {
  const p = ['_ev', code.toString(), access];
  const f = sMap => pathOr(undefined, p)(sMap.get('data'));
  return [null, f];
};


/**
 * @param {*} d The fallback/default value;
 * @param {!Array<number>} a
 * @returns {funcGetterType}
 */
const fallBackFunc = (d, a) => {
  const f = () => d;
  return [null, f];
};


export {
  enumSet,
  enumUnSet,
  mathFunc,
  enumFunc,
  roundFunc,
  comparatorFunc,
  betweenFunc,
  dataPathFunc,
  eventCodeFunc,
  fallBackFunc,
  idGen,
  safeJsonParse,
  mathCleaner,
  funcMaker,
  getRefIndex,
  isRefString,
  makeComparator,
  genOutput
};