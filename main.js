'use strict';

// noinspection JSUnusedLocalSymbols


// noinspection JSUnusedLocalSymbols
/**
 * @param {...*} args
 * @return {undefined}
 */
const alwaysUndef = (...args) => undefined;


// noinspection JSUnusedLocalSymbols
/**
 * @param {...*} args
 * @returns {boolean}
 */
const alwaysFalse = (...args) => false;


//---------------------------------------------------------------[ Questions ]--
/**
 * @param {*} x
 * @return {string}
 */
const whatType = x => typeof x;


/**
 * @type {Map<*, boolean>}
 */
const boolMap = new Map()
    .set('true', true)
    .set('false', false);


//--------------------------------------------------------------[ Assertions ]--
/**
 * @param {?} t
 * @returns {boolean}
 */
const isDef = t => t !== undefined;


/**
 * @param {*} n
 * @return {boolean}
 */
const isString = n => whatType(n) === 'string';

/**
 * @param {*} n
 * @return {boolean}
 */
const isNumber = n => whatType(n) === 'number' &&
    !Number.isNaN(/** @type number */(n));


/**
 * A strict same elements in same order comparison.
 * @param {Array<*>} a
 * @param {Array<*>} b
 * @returns {boolean}
 */
const sameArr = (a, b) => a.length === b.length && a.every((c, i) => b[i] === c);


/**
 * Find the biggest number in a list of numbers
 * @param {!Array<number>} arr
 * @returns {number}
 */
const maxInArr = arr => Math.max(...arr);


//--------------------------------------------------------------[ Conversion ]--
/**
 * @param {string} x
 * @return {string}
 */
const toLowerCase = x => x.toLowerCase();

/**
 * Given a fallback value and an array, return a function that takes an
 * object or an array and returns the value at the path, or the fallback
 * value.
 * @param {*} f A fallback value
 * @param {Array<string|number>} arr
 * @returns {function((Object|Array)):(*)}
 */
const pathOr = (f, arr) => e => {
  const r = arr.reduce((p, c) => {
    try {
      return p[maybeNumber(c)];
    } catch (err) {
      return undefined
    }
  }, e);
  return r === undefined ? f : r;
};

/**
 * @param {number} precision
 * @returns {function(number): number}
 */
const pRound = precision => {
  const factor = Math.pow(10, precision);
  return number => Math.round(number * factor) / factor;
};

/**
 * Given a string, returns a number if you can. Else return what was given.
 * @param {*} s
 * @returns {number|*}
 */
const maybeNumber = s => {
  if (s === null) {
    return s;
  }
  const p = 1 * s;
  return Number.isNaN(p) ? s : p;
};

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
function* idGen$1(opt_n) {
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
    f = () => v;
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
    };
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

/**
 * Functions that can identify a node type.
 * @type {Map<string, function(!Vertex): boolean>}
 */
const nodeTypeMap = new Map()
    .set('Math', n => isDef(n.math))
    .set('Enumerator', n => n.enum && n.enum.length)
    .set('Rounding', n => isDef(n.round))
    .set('Comparator', n => n.comparator && n.comparator.length)
    .set('Range', n => n.between && n.between.length)
    .set('Data Access', n => n.path && n.path.length)
    .set('Event Access', n => n.evCode && n.evCode.length === 2)
    .set('Constant', n => isDef(n.fallback));

/**
 * Node types to the functions they need to solve.
 * @type {Map<(string|undefined), function(!Vertex): !Array<Function|string|undefined>>}
 */
const funcMap = new Map()
    .set('Math', n => mathFunc(n.math, n.args))
    .set('Enumerator', n => enumFunc(n.enum, n.args))
    .set('Rounding', n => roundFunc(/** @type {number} */(n.round), n.args))
    .set('Comparator', n => comparatorFunc(n.comparator, n.args))
    .set('Range', n => betweenFunc(n.between, n.args))
    .set('Data Access', n => dataPathFunc(n.path, n.args))
    .set('Event Access', n => eventCodeFunc(n.evCode, n.args))
    .set('Constant', n => fallBackFunc(n.fallback, n.args))
    .set(undefined, n => fallBackFunc(n.fallback, n.args));


/**
 * Node type to a human readable description of their solution.
 * Mostly used in the DOT formatter.
 * @type {Map<string|undefined, function(!Vertex): string>}
 */
const nodeDescriptionMap = new Map()
    .set('Math', n => n.math)
    .set('Enumerator', n => n.enum.map(([k, v]) => `{${k} 🠚 ${v}}`).join('|'))
    .set('Rounding', n => n.round)
    .set('Comparator', n =>
        n.comparator.join(' ').replace(/([<>])/gi, String.raw`\$1`))
    .set('Range', n => n.between.join(' '))
    .set('Data Access', n => n.path.join(' '))
    .set('Event Access', n => n.evCode.join(' '))
    .set('Constant', n => n.fallback)
    .set(undefined, n => 'Not Configured');


class Vertex {
  /**
   * @param {number} id
   * @param {string|undefined} name
   * @param {!dumpType|undefined} obj
   */
  constructor(id, name, obj = undefined) {

    /**
     * @type {number}
     * @private
     */
    this._id = id;

    /**
     * @type {string|undefined}
     * @private
     */
    this._name = name;

    /**
     * @type {!Array<number>}
     * @private
     */
    this._args = [];

    /**
     * @type {string|number|undefined}
     * @private
     */
    this._math = undefined;

    /**
     * @type {!Array<!Array<*>>}
     * @private
     */
    this._enum = [];

    /**
     * @type {!Array<string|number>}
     * @private
     */
    this._comparator = [];

    /**
     * @type {!Array<string|number>}
     * @private
     */
    this._between = [];

    /**
     * @type {number|undefined}
     * @private
     */
    this._round = undefined;

    /**
     * @type {!Array<string|number|null>}
     * @private
     */
    this._path = [];

    /**
     * @type {!Array<string|number>}
     * @private
     */
    this._evCode = [];

    /**
     * @type {*}
     * @private
     */
    this._fallback = undefined;

    /**
     * A flag indicating that there is a problem, difficulty, or complication
     * and that this node will not be able to perform a solve. When set to null,
     * it means there are no problems, and the node will be able to solve. .
     * @type {string|undefined|null}
     * @private
     */
    this._nodus = 'Not init';

    /**
     * @type {!Function}
     * @private
     */
    this._func = alwaysUndef;

    // We overwrite *some* elements, but we keep the _args and _state both
    // as default, because the Graph will populate those.
    if (obj) {
      this._id = obj.I;
      this.name = obj.N;

      this.setFallback(obj.D);
      this.setMath(obj.M);
      obj.E.forEach(e => {
        if (e) {
          e = /** @type {!Array} */(e);
          this.addEnum(...e);
        }
      });
      this.setRound(obj.R);
      this.setPath(...obj.P);
      this.setComparator(...obj.C);
      this.setBetween(...obj.B);
      this.setEvCode(...obj.V);
    }
  }

  //------------------------------------------------------------------[ Save ]--
  /**
   * @returns {!dumpType}
   */
  dump() {
    return {
      A: this._args,
      B: this._between,
      C: this._comparator,
      D: this._fallback,
      E: this._enum,
      I: this.id,
      M: this._math,
      N: this.name,
      P: this._path,
      R: this._round,
      V: this._evCode
    };
  }

  // --------------------------------------------------------------[ Utility ]--
  _clearAll(incEnum = true) {
    this._path = [];
    this._enum = incEnum ? [] : this._enum;
    this._comparator = [];
    this._between = [];
    this._evCode = [];
    this._round = undefined;
    this._math = undefined;
    this._nodus = 'Changed';
  }

  /**
   * Resets a nodes solutions entirely. Including its fallback value.
   * May be useful for some UI on top of this.
   * Does not change the node ID, its connectedness or its name.
   */
  reset() {
    this._clearAll(true);
    this._fallback = undefined;
    this._nodus = 'Not init';
  }


  // -------------------------------------------------------------[ Identity ]--
  /**
   * @returns {number}
   */
  get id() {
    return this._id;
  }


  /**
   * @return {string}
   */
  get descr() {
    return nodeDescriptionMap.get(this.type)(this);
  }

  /**
   * @returns {string|undefined}
   */
  get name() {
    return this._name;
  }

  /**
   * @param {string|undefined} n
   */
  set name(n) {
    this._name = n;
  }

  /**
   * @return {string|undefined}
   */
  get type() {
    const t = [...nodeTypeMap.entries()].find(([k,v]) => v(this));
    return t ? t[0] : undefined;
  }

  // -----------------------------------------------------------------[ Args ]--
  /**
   * Add a argument to the node.
   * @param {!Vertex} n
   */
  addArg(n) {
    this._args.push(n._id);
    this._nodus = 'Args added';
    return this;
  }

  /**
   * Remove an argument from the node.
   * @param {!Vertex} n
   */
  delArg(n) {
    this._args = this._args.filter(e => e !== n._id);
    this._nodus = 'Args removed';
    return this;
  }

  /**
   * @returns {!Array<number>}
   */
  get args() {
    return this._args;
  }

  /**
   * @param {!Array<number>} arr
   */
  setAllArgs(arr) {
    if (Array.isArray(arr) && arr.every(isNumber)) {
      this._args = arr;
    }
  }

  // -------------------------------------------------------------[ Fallback ]--
  /**
   * @param {*} n
   */
  setFallback(n) {
    this._fallback = n;
    return this;
  }

  /**
   * @returns {*}
   */
  get fallback() {
    return this._fallback;
  }

  // -----------------------------------------------------------------[ Path ]--
  /**
   * @param {number} n
   * @param {string=} opt_access
   * @returns {Vertex}
   */
  setEvCode(n, opt_access) {
    if (isDef(n)) {
      this._clearAll();
      let access = 'data';
      if (opt_access) {
        const ac = toLowerCase(opt_access);
        access = ['data', 'desc', 'code'].includes(ac) ? ac : access;
      }
      this._evCode = [n, access];
    }

    return this;
  }

  /**
   * @returns {Array<string|number>}
   */
  get evCode() {
    return this._evCode;
  }

  // -----------------------------------------------------------------[ Path ]--
  /**
   * @param {...(string|number|null|undefined)} a
   * @returns {Vertex}
   */
  setPath(...a) {
    if ([...a].length && [...a].every(isDef)) {
      this._clearAll();
      this._path = [...a];
      }

    return this;
  }

  /**
   * @returns {Array<string|number|null>}
   */
  get path() {
    return this._path;
  }

  // -----------------------------------------------------------------[ Math ]--
  /**
   * @param {string|number|undefined} s
   * @returns {Vertex}
   */
  setMath(s) {
    if (isDef(s)) {
      this._clearAll();
      this._math = s;
    }

    return this;
  }

  /**
   * @returns {string|number|undefined}
   */
  get math() {
    return this._math;
  }

  // -------------------------------------------------------------[ Rounding ]--
  /**
   * @param {number|undefined} int
   * @returns {!Vertex}
   */
  setRound(int) {
    if (isNumber(int)) {
      this._clearAll();
      this._round = pRound(0)(/** @type {number} */(int));
    }

    return this;
  };

  /**
   * @return {number|undefined}
   */
  get round() {
    return this._round;
  }

  // -----------------------------------------------------------[ Comparison ]--
  /**
   * Comparison operators
   * @param {number|string} v1 Value with which to test the predicate
   * @param {string} cmp Comparison operator. Must be one of:
   *    ==, <=, >=, <, >
   * @param {number|string} v2 Value with which to test the predicate
   * @param {string} outputFormat Result value. What is passed along
   *    if the comparison either passes or fails. The only allowed values are:
   *    "vu" - The input value on pass, else undefined
   *    "10" - The number 1 on pass, else the number 0
   *    "tf" - The boolean true if passed, else false.
   *    "ab" - The input value on pass, else the stop value. That is, the
   *       predicate value that resulted in a fail.
   *       Example: f(n) = n < 5
   *                in "ab" mode:
   *                  f(3) == 3
   *                  f(4) == 4
   *                  f(4.9999) == 4.9999
   *                  f(5) == 5       <- Clamped Here
   *                  f(5.0001) == 5  <- Clamped Here
   *                  f(100) == 5     <- Clamped Here
   * @returns {Vertex}
   */
  setComparator(v1, cmp, v2, outputFormat) {
    let pass = true;
    pass = (isNumber(v1) || isRefString(v1)) && pass;
    pass = (isNumber(v2) || isRefString(v2)) && pass;
    pass = (['!=', '!==', '==', '===', '<=', '>=', '<', '>'].includes(cmp)) &&
        pass;
    pass = (['vu', '10', 'tf', 'ab'].includes(outputFormat)) && pass;

    if (pass) {
      this._clearAll();
      this._comparator = [v1, cmp, v2, outputFormat];
    }

    return this;
  };

  get comparator() {
    return this._comparator;
  }

  // ----------------------------------------------------------[ Band Filter ]--
  /**
   * Band filter. Test that the input value is between the two stops.
   * Stop values are considered inclusive. That is, the comparison is made
   * with either a <= or >= operator when considering the given value's
   * relationship with a stop value.
   * Stop values can be given in any order. Internally the comparison will
   * always be that the given value should be bigger or eq than than the
   * smaller of the stops, and smaller or eq than the bigger of the stops.
   * @param {number|string} v The value to test
   * @param {number|string} s1 Stop value
   * @param {number|string} s2 Stop value
   * @param {string} outputFormat Result value. What is passed along
   *    if the comparison either passes or fails. The only allowed values are:
   *    "vu" - The input value on pass, else undefined
   *    "10" - The number 1 on pass, else the number 0
   *    "tf" - The boolean true if passed, else false.
   *    "ab" - The input value on pass, else the clamped value. That is, the
   *       stop value that resulted in a fail.
   *       Example: f(n) = n >= 2 && n <= 5
   *                in "ab" mode:
   *                  f(1.9999) == 2  <- Clamped Here
   *                  f(3) == 3
   *                  f(4) == 4
   *                  f(5) == 5
   *                  f(5.0001) == 5  <- Clamped Here
   * @returns {Vertex}
   */
  setBetween(v, s1, s2, outputFormat) {
    let isClean = true;
    isClean = (isNumber(v) || isRefString(v)) && isClean;
    isClean = (isNumber(s1) || isRefString(s1)) && isClean;
    isClean = (isNumber(s2) || isRefString(s2)) && isClean;
    isClean = (['vu', '10', 'tf', 'ab'].includes(outputFormat)) && isClean;

    if (isClean) {
      this._clearAll();
      this._between = [v, s1, s2, outputFormat];
    }

    return this;
  };

  get between() {
    return this._between;
  }

  // -----------------------------------------------------------------[ Enum ]--
  /**
   * @param {*} k
   * @param {*} v
   * @returns {!Vertex}
   */
  addEnum(k, v) {
    if (k === undefined) {
      return this
    }
    this._clearAll(false);
    this._enum = enumSet(this._enum, k, v);
    return this;
  }

  /**
   * @param {*} k
   * @returns {!Vertex}
   */
  delEnum(k) {
    this._enum = enumUnSet(this._enum, k);
    this._nodus = 'Changed';
    return this;
  }

  /**
   * @returns {!Array<!Array<*>>}
   */
  get enum() {
    return this._enum;
  }

  // ----------------------------------------------------------------[ Solve ]--
  clean() {
    const [n, f] = funcMap.get(this.type)(this);
    this._nodus = /** @type (null|string|undefined) */(n);
    this._func = /** @type (!Function) */(f);
    return this;
  }

  /**
   * Given a Map, it is guaranteed that all the data required to solve this
   * node is already available in the map. Once the node is solved, it
   * mutates the map by adding its own id as a key, and its own result as
   * the value under that key.
   * @param {!Map} sMap
   * @returns {!Map}
   */
  solve(sMap) {
    if (!this._nodus) {
      const r = this._func(sMap);
      const reply = r === undefined ? this.fallback : r;
      return sMap.set(this._id, reply);
    } else {
      this.clean();
      }
    if (!this._nodus) {
      return this.solve(sMap);
    } else {
      sMap.set(this._id, undefined);
      sMap.set(`err_${this._id}`, !this._nodus);
      return sMap;
    }
  }

  /**
   * @param {!Vertex} n
   * @returns {function(!Array<!Vertex>, !Array<!Vertex>): !Array<!Vertex>}
   */
  static isIn(n) {
    return (p, [k, s]) => s.has(n) ? (p.push(k) && p) : p;
  }
}

//---------------------------------------------------------------[ DOT Utils ]--
/**
 * @param {!Map<*,*>|undefined} solveMap
 * @return {function(!Vertex): string}
 */
const nodeToDot = solveMap => node => {
  const i = node.id;
  const n = node.name;
  const t = n === 'ROOT' ? 'Root' : node.type;
  const d = n === 'ROOT' ? 'Final' : node.descr;
  const a = node.args;
  const args = a.map((e,i) => `<${e}>$${i + 1}`).join('|');
  const f = node.fallback;
  const e = f ? `|Default: ${f}`: '';
  const v = solveMap ? `|${solveMap.get(i)}` : '';
  return `${i} [label="{{${args}}|${t}|${d}|{ID:${i}|${n}}${e}${v}}"];`;
};

/**
 * @param {!Map<*,*>|undefined} solveMap
 * @return {function(!Vertex, !Vertex): string}
 */
const edgeToDot = solveMap => (f, t) => {
  const v = solveMap ? solveMap.get(f.id) : '';
  return `${f.id} -> ${t.id}:${f.id}[label="${v}"]`;
};

/**
 * Print a graph as a DOT-file string.
 * @param {!Dag} dag
 * @param {!Map<*, *>|undefined} solveMap
 * @return {string}
 */
const graphToDot = (dag, solveMap) => {

  // Edges
  const makeEdgeString = edgeToDot(solveMap);
  const edgeStatements = [...dag.G.entries()]
      .reduce((p, [k, v]) => [...p, ...[...v].map(e => [k, e])], [])
      .map(([a, b]) => makeEdgeString(a, b))
      .reduce((p, v) => `${p} ${v};`, '');

  // Nodes
  const makeNodeString = nodeToDot(solveMap);
  const nodeStatements = dag.nodes.map(makeNodeString).join(' ');

  // Graph
  let label = dag.description;
  label = dag.units.trim().length ? `${label} - ${dag.units}` : label;

  return [
    'digraph {',
    'node [shape=record];',
    `label = "${label}";`,
    `${nodeStatements}`,
    `${edgeStatements}`,
    '}'
  ].join(' ')
};


//---------------------------------------------------------------[ DAG Utils ]--
/**
 * @param {*} n
 * @return {boolean}
 */
const isNode = n => n instanceof Vertex;

/**
 * @param {!Vertex} n
 * @returns {number}
 */
const grabId = n => n.id;


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
 * @returns {{
 *  C: !Map<!Vertex, number>,
    Q: !Array<!Vertex>
 * }}
 */
const leafNodes = G => {
  // Build a map of the form:
  // { A: 0, B: 1, C: 3, E: 0, F: 1, D: 2 }
  // where each key in the DAG is notated with the number of times it
  // appears as a value. In terms of a DAG, this describes how many edges
  // point to this node.
  /**
   * @type {!Map<!Vertex, number>} A map of nodes to the number of times
   *  that node has an in-edge. Leaf-nodes will have a value of 0
   */
  const C = [...G.keys()].reduce((p, c) => (p.set(c, 0)) || p, new Map());
  [...G.values()].forEach(
      arr => arr.forEach(e => C.set(e, C.has(e) ? C.get(e) + 1 : 0)));

  /**
   * @type {!Array<!Vertex>} A List of nodes without any in degrees
   */
  const Q = [...G.keys()].filter(e => C.get(e) === 0);
  return {C, Q}
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
 * @returns {!Array<!Vertex>}
 */
const topoSort = G => {

  const {C, Q} = leafNodes(G);

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
        v.delete(k);
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
 * @param {!Iterator<number>} gen
 * @returns {function(string):!Vertex}
 */
const nodeMaker = gen => n => new Vertex(gen.next().value, n);


class Dag {

  /**
   * @param {string=} opt_desc
   * @param {(string|number)=} opt_ref
   */
  constructor(opt_desc, opt_ref) {
    /**
     * Dag can be given meta data for the duration of its life.
     * The meta is not persisted across dump and reads
     * @type {*}
     * @private
     */
    this._meta = null;

    /**
     * Optional reference ID for the DAG.
     * Not used in calculations, but is dumped and read.
     * @type {string|number|null}
     * @private
     */
    this._ref = this.ref = isDef(opt_ref) ?
        /** @type {(string|number)} */(opt_ref) : null;

    /**
     * Optional description for the DAG.
     * Not used in calculations, but is dumped and read.
     * @type {string}
     * @private
     */
    this._description = this.description = isString(opt_desc)
        ? /** @type(string) */(opt_desc) : '';

    /**
     * Optional description of the units.
     * Not used in calculations, but is dumped and read.
     * @type {string}
     * @private
     */
    this._units = '';

    /**
     * The container of our DAG
     * @type {!Map<!Vertex, !Set<!Vertex>>}
     */
    this.G = new Map();

    /**
     * @type {function(string): !Vertex}
     * @private
     */
    this._nodeMaker = nodeMaker(idGen$1());

    /**
     * @type {!Vertex}
     * @private
     */
    this._rootNode = this.makeNode('ROOT');
    this._rootNode.setMath('$1');
  }


  //---------------------------------------------[ Meta and Stuff for Humans ]--
  /**
   * Get the DAG meta
   * @returns {*}
   */
  get meta() {
    return this._meta;
  }


  /**
   * Set the DAG meta. Meta is not persisted across dump and read cycles.
   * @param {*} any
   */
  set meta(any) {
    this._meta = any;
  }


  /**
   * Get the DAG description
   * @returns {string}
   */
  get description() {
    return this._description;
  }


  /**
   * Set the DAG description.
   * @param {string} s
   */
  set description(s) {
    this._description = isString(s) ? s : this._description;
  }


  /**
   * Get the DAG units
   * @returns {string}
   */
  get units() {
    return this._units;
  }


  /**
   * Set the DAG units.
   * @param {string} s
   */
  set units(s) {
    this._units = isString(s) ? s : this._units;
  }


  /**
   * Get the DAG reference.
   * @returns {string|number|null}
   */
  get ref() {
    return this._ref;
  }


  /**
   * Set the DAG reference.
   * @param {string|number|null} s
   */
  set ref(s) {
    this._ref = isDef(s) && (isString(s) || isNumber(s)) ? s : null;
  }


  //-----------------------------------------------------------------[ Setup ]--
  /**
   * The single root node.
   * @returns {!Vertex}
   */
  get root() {
    return this._rootNode;
  }


  /**
   * The nodes in the order that they were added.
   * @returns {!Array<!Vertex>}
   */
  get nodes() {
    return [...this.G.keys()];
  }


  /**
   * @param {number} id
   * @return {!Vertex|undefined}
   */
  getNode(id) {
    return [...this.G.keys()].find(e => e.id === id);
  }


  /**
   * The graph description in the form of Vertex -> Set<Vertex>
   * @returns {!Map}
   */
  get graph() {
    return this.G;
  }


  /**
   * A topological sorted array of node.
   * NOTE: This includes orphans, and orphans *may* be sorted after the root
   * node.
   * @returns {!Array<!Vertex>}
   */
  get topo() {
    return topoSort(this.G);
  }


  /**
   * Leafs are nodes without any in-degrees. The partake in the solution.
   * NOTE: The root node *is* considered a leaf if nothing connects to it.
   * @returns {!Array<!Vertex>}
   */
  get leafs() {
    return leafNodes(this.G).Q;
  }


  /**
   * Orphans are nodes that wont partake in the solution. That is nodes that
   * don't have an out degree.
   * NOTE: The root node is *not* treated as an orphan.
   * @returns {!Array<!Vertex>}
   */
  get orphans() {
    const orphans = [];
    for (const [n, s] of this.G.entries()) {
      if (s.size === 0 && n !== this._rootNode) {
        orphans.push(n);
      }
      }
    return orphans;
  }


  /**
   * A list of the node names
   * @return {!Array<string>}
   */
  get names() {
    return this.nodes.map(e => e.name);
  }


  /**
   * A list of the node names
   * @return {!Array<string>}
   */
  get topoNames() {
    return this.topo.map(e => e.name);
  }


  /**
   * A list of the node IDs
   * @return {!Array<number>}
   */
  get ids() {
    return this.nodes.map(e => e.id);
  }


  /**
   * A list of the node IDs
   * @return {!Array<number>}
   */
  get topoIds() {
    return this.topo.map(e => e.id);
  }


  /**
   * @param {string} name
   * @returns {!Vertex}
   */
  makeNode(name) {
    const n = this._nodeMaker(name);
    this.G.set(n, new Set());
    return n;
  }


  /**
   * Add a node the the graph without connecting it.
   * Adding an already constructed node potentially mutates the DAG's built
   * in node maker to algorithm to produce nodes with non contiguous ids.
   * If the given node has a higher ID than any of the existing nodes in the
   * DAG, new nodes created by the DAG will count from this new highest ID.
   * @param {!Vertex} n
   * @returns {(!Vertex|boolean)}
   */
  addNode(n) {
    if (!isNode(n) || this.ids.includes(n.id)) {
      return false;
    }
    if (this.G.has(n)) {
      return n;
    }
    this.G.set(n, new Set());
    this._nodeMaker = nodeMaker(idGen$1(maxInArr(this.ids)));
    return n;
  }


  /**
   * Delete a node. That is completely remove it from the DAG.
   * The node is disconnected from all its connections, and deleted.
   * The root node can not be deleted.
   * @param {!Vertex} n
   * @returns {boolean}
   */
  delNode(n) {
    let deleted = false;
    if (n && isNode(n) && n !== this._rootNode) {
      deleted = this.G.delete(n);
      if (deleted) {
        for (const [k, s] of this.G.entries()) {
          s.delete(n);
          k.delArg(n);
        }
      }
      }
    return deleted;
  }


  /**
   * Connect node a to node b. That is, make node a an input to node b.
   * There are restrictions on connecting nodes:
   *  1) Root is not allowed to be connected to anything else
   *  2) Root only accepts a single in-degree. Further attempts are ignored.
   *  3) Only members of the DAG can be connected to each other.
   *  4) If the nodes are already connected, further attempts are ignored.
   *  5) It the connection will form a cycle, the nodes won't be connected.
   *
   * @param {!Vertex} a
   * @param {!Vertex} b
   * @returns {!Dag|boolean}
   */
  connect(a, b) {
    if (!(isNode(a) && isNode(b))) { return false; }
    if (a === this.root) {
      return this;
    }
    if (b === this.root && this.indegrees(b).length > 0) {
      return this;
      }
    if (!this.G.has(a) || !this.G.has(b)) {
      return this;
      }
    if (this.G.get(a).has(b)) {
      return this;
    }

    // Fist connect it.
    this.G.get(a).add(b);
    b.addArg(a);

    // Then check for cycles.
    if (this.topo.length < this.nodes.length) {
      this.disconnect(a, b);
      }

    return this;
  }


  /**
   * Disconnect node a from node b.
   * That is remove node a as an input to node b.
   * @param {!Vertex} a
   * @param {!Vertex} b
   * @returns {!Dag|boolean}
   */
  disconnect(a, b) {
    if (!(isNode(a) && isNode(b))) { return false; }
    if (this.G.has(a)) {
      this.G.get(a).delete(b);
      b.delArg(a);
    }
    return this
  }


  /**
   * Recursively delete all the orphaned nodes.
   * This mutates the DAG Map.
   * @returns {Dag}
   */
  clean() {
    this.orphans.forEach(e => this.delNode(e));
    if (this.orphans.length) {
      this.clean();
    }
    this.nodes.forEach(n => n.clean());
    return this;
  }


  /**
   * Return an array of all the nodes that connects to the given node.
   * @param {!Vertex} n
   * @returns {!Array<!Vertex>|boolean}
   */
  indegrees(n) {
    if (!isNode(n)) { return false; }
    const hasN = Vertex.isIn(n);
    return [...this.G.entries()].reduce(hasN, []);
  }


  /**
   * Return an array of all the nodes that the given node connects to.
   * @param {!Vertex} n
   * @returns {!Array<!Vertex>|boolean}
   */
  outdegrees(n) {
    if (!isNode(n)) { return false; }
    return [...this.G.get(n)];
  }


  /**
   * Return a Map object that describes this DAG, but with only the IDs as
   * values.
   * @returns {!Map}
   */
  getIdG(){return [
    ...this.G
  ].reduce((p, [k, s]) => p.set(k.id, new Set([...s].map(grabId))), new Map())}


  /**
   * Compute the value of the DAG. That is, call the solve function in each
   * of the nodes. The result is stored in an array, and this array is passed
   * into the next node's solve function. Nodes are called to be solved in
   * topological order, meaning it is guaranteed that any input a node needs
   * will already have been calculated by a previous node.
   * @param {!Object=} opt_d
   * @returns {*}
   */
  solve(opt_d) {
    return this.getSolver()(opt_d);
  }


  /**
   * Solve the dag, but return an array of the value of each node in
   * topo order. The same order a topo, topoIds and topoNames
   * @param {!Object=} opt_d
   * @returns {*}
   */
  debug(opt_d) {
    return this.getSolver(true)(opt_d);
  }

  /**
   * Format the debug output
   * @param {Map<*, *>} map
   * @return {Map<*, *>}
   */
  debugFormatter(map$$1) {
    return map$$1.set('topoNames', this.topoNames)
  }


  /**
   * @param {boolean=} debug
   * @returns {!function((!Object|undefined)): (!Map<*,*>|*)}
   */
  getSolver(debug = false) {
    const m = removeOrphans(this.getIdG());
    const validTopoNodes = this.topo.filter(e => m.has(e.id));
    const validTopoIds = validTopoNodes.map(grabId);
    const cleanNodes = validTopoNodes.map(n => n.clean());
    const rootId = this._rootNode.id;

    const sMap = new Map();
    sMap.set('topoIds', validTopoIds);

    return data => {
      sMap.set('data', data);
      const r = cleanNodes.reduce((p, n) => n.solve(p), sMap);
      return debug ? this.debugFormatter(r) : r.get(rootId);
    };
  }


  /**
   * Dump the DAG to a JSON string.
   * @returns {string}
   */
  dump() {
    return JSON.stringify({
      M: [this.description, this.units, this.ref],
      G: [...this.getIdG()].map(([k, s]) => [k, [...s]]), // preserves insert order
      N: this.topo.map(e => e.dump())
    });
  }

  /**
   * Dump the graph to a DOT-file
   * Read with: http://www.webgraphviz.com/
   * @param {!Object=} opt_d
   * @return {string}
   */
  dotPlot(opt_d) {
    const solveMap = isDef(opt_d) ? this.debug(opt_d) : undefined;
    return graphToDot(this, /** @type {(!Map<*,*>|undefined)} */(solveMap));
  }

  /**
   * @param {string} json A valid DAG Json String.
   * @return {!Dag|undefined}
   */
  static read(json) {
    // Read the string
    const j = safeJsonParse(json);

    // Store a valid rollback image of the current config.
    // const rollback = this.dump();
    if (j) {
      try {
        // Create a list of true nodes
        const n = j.N.map(e => new Vertex(-1, undefined, e));
        const matchId = id => e => e.id === id;
        const findNode = id => n.find(matchId(id));

        // Create a map that directly mirrors the original, but with IDs only.
        const g = new Map(j.G);
        const d = new Dag();
        d.G = new Map();

        for (const k of g.keys()) {
          d.addNode(findNode(k));
        }
        d._rootNode = d.nodes[0];

        for (const [k, arr] of g.entries()) {
          const node = findNode(k);
          arr.forEach(id => {
            const toNode = findNode(id);
            d.connect(node, toNode);
          });
        }

        // Make sure that the order of each of the nodes args is the same as the
        // original.
        // this.nodes.forEach(n => {
        d.nodes.forEach(n => {
          n.setAllArgs(j.N.find(e => e.I === n.id).A);
        });

        // Attend to the human data
        d.description = j.M ? (j.M[0] || '') : '';
        d.units = j.M ? (j.M[1] || '') : '';
        d.ref = j.M ? j.M[2] : null;

        return d;
      }
      catch (e) {
        console.log(e);
      }
    }
  }
}

module.exports = Dag;
