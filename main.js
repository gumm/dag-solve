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
      return p[c];
    } catch (err) {
      return undefined
    }
  }, e);
  return r === undefined ? f : r;
};


//--------------------------------------------------------[ Math and Numbers ]--
/**
 * @param {number} precision
 * @returns {function(number): number}
 */
const pRound = precision => {
  const factor = Math.pow(10, precision);
  return number => Math.round(number * factor) / factor;
};

const argRefSymbol = 'X';

/**
 * @param {*} m
 * @returns {boolean}
 */
const isRefString = m => isString(m) && !Number.isNaN(getRefIndex(m));

/**
 * @param {string} m Something like $1
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
 * @returns {number}
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
 * @param {string} c Comparator
 * @returns {!function(number): boolean}
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
  return m[c] || alwaysFalse;
};

/**
 * @param {string} rv Return value type. Can be:
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
  return m[rv] || alwaysUndef;
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
 * @param {!Array<!Node>} a
 * @returns {Array<boolean|!Function>}
 */
const mathFunc = (m, a) => {
  let err = 'Unable to clean math';
  let f = alwaysUndef;
  if (isString(m)) {
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
 * @param {!Array<number>} a
 * @returns {Array<boolean|!Function>}
 */
const enumFunc = (e, a) => {

  const r = e.map(([k, v]) => {
    if (isString(v) && isRefString(v)) {
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
 * @param {number} r The number of digits you want to round to.
 * @param {!Array<number>} a
 * @returns {Array<boolean|!Function>}
 */
const roundFunc = (r, a) => {
  const round = pRound(r);
  return [null, sMap => round(sMap.get(a[0]))]
};

const compFuncHelper = (v, a) => {
  let f;
  if (isString(v)) {
    const i = getRefIndex(v);
    f = sMap => sMap.get(a[i]);
  } else {
    f = () => v;
    }
  return f;
};

/**
 * @param {!Array<(number|string)>} c The comparison description.
 * @param {!Array<number>} a
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
 * @param {!Array<number>} a
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
 * @param {!Array<number>} a
 * @returns {Array<boolean|!Function>}
 */
const dataPathFunc = (p, a) => {
  let f;
  if (sameArr(p, [null])) {
    // By convention when the path is null, just return the data...
    f = sMap => sMap.get('data');
  } else {
    f = sMap => pathOr(undefined, p)(sMap.get('data'));
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
 * @param {number} code
 * @param {string} access Valid access keys are:
 *    'data', 'description' or 'code'
 * @param {!Array<number>} a
 * @returns {Array<null|boolean|!Function>}
 */
const eventCodeFunc = ([code, access], a) => {
  const p = ['_ev', code.toString(), access];
  const f = sMap => pathOr(undefined, p)(sMap.get('data'));
  return [null, f];
};

class Node {
  /**
   * @param {number} id
   * @param {string|undefined} name
   * @param {Object|undefined} obj
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
     * @type {Array<Array<*>>}
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
     * @type {!Array<string|number>|undefined|null}
     * @private
     */
    this._path = undefined;

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
     * @type {string|undefined}
     * @private
     */
    this._nodus = 'Not init';

    /**
     * @type {function(...*): (undefined|*)}
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
      obj.E.forEach(e => this.addEnum(...e));
      this.setRound(obj.R);
      this.setPath(...obj.P);
      this.setComparator(...obj.C);
      this.setBetween(...obj.B);
      this.setEvCode(...obj.V);
    }
  }

  //------------------------------------------------------------------[ Save ]--
  /**
   * @returns {{
   *    I: number,
   *    N: string,
   *    A: Array<number>,
   *    D: (*|undefined),
   *    M: (string|number|undefined),
   *    E: (Array<Array<*>>|undefined),
   *    R: (number|undefined),
   *    F: (Array<string|number|undefined>|undefined)
   *      }}
   */
  dump() {
    return {
      I: this.id,
      N: this.name,
      A: this._args,
      D: this._fallback,
      M: this._math,
      E: this._enum,
      R: this._round,
      P: this._path,
      C: this._comparator,
      B: this._between,
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
   * @returns {string}
   */
  get name() {
    return this._name;
  }

  /**
   * @param {string} n
   */
  set name(n) {
    this._name = n;
  }

  // -----------------------------------------------------------------[ Args ]--
  /**
   * Add a argument to the node.
   * @param {!Node} n
   */
  addArg(n) {
    this._args.push(n._id);
    this._nodus = 'Args added';
    return this;
  }

  /**
   * Remove an argument from the node.
   * @param {!Node} n
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
   * @returns {Node}
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
   * @param a
   * @returns {Node}
   */
  setPath(...a) {
    if ([...a].length) {
      this._clearAll();
      this._path = [...a];
      }

    return this;
  }

  /**
   * @returns {Array<string|number>}
   */
  get path() {
    return this._path;
  }

  // -----------------------------------------------------------------[ Math ]--
  /**
   * @param {string|number|undefined} s
   * @returns {Node}
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
   * @param {number} int
   * @returns {Node}
   */
  setRound(int) {
    if (isNumber(int)) {
      this._clearAll();
      this._round = pRound(0)(int);
      }

    return this;
  };

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
   * @returns {Node}
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
   * @returns {Node}
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
   * @returns {!Node}
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
   * @returns {!Node}
   */
  delEnum(k) {
    this._enum = enumUnSet(this._enum, k);
    this._nodus = 'Changed';
    return this;
  }

  /**
   * @returns {Array<Array<*>>}
   */
  get enum
  () {
    return this._enum;
  }

  // ----------------------------------------------------------------[ Solve ]--
  clean() {
    if (this.math) {
      // This node does math.
      [this._nodus, this._func] = mathFunc(this.math, this.args);

    } else if (this.enum && this.enum.length) {
      // This node does enums
      [this._nodus, this._func] = enumFunc(this.enum, this.args);

    } else if (isDef(this.round)) {
      // This node does rounding
      [this._nodus, this._func] = roundFunc(this.round, this.args);

    } else if (this.comparator && this.comparator.length) {
      // This node is a comparator
      [this._nodus, this._func] = comparatorFunc(this.comparator, this.args);

    } else if (this.between && this.between.length) {
      // This node is a between filter
      [this._nodus, this._func] = betweenFunc(this.between, this.args);

    } else if (this.path && this.path.length) {
      // This node can access data via a path into a data structure.
      [this._nodus, this._func] = dataPathFunc(this.path, this.args);

    } else if (this.evCode && this.evCode.length === 2) {
      // This node can access event codes.
      [this._nodus, this._func] = eventCodeFunc(this.evCode, this.args);

    } else if (this._fallback) {
      // This does nothing but return a fallback value
      [this._nodus, this._func] = [null, () => this._fallback];
      }

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
}

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
 * @returns {{
 *  C: !Map<!Node, number>,
    Q: !Array<!Node>
 * }}
 */
const leafNodes = G => {
  // Build a map of the form:
  // { A: 0, B: 1, C: 3, E: 0, F: 1, D: 2 }
  // where each key in the DAG is notated with the number of times it
  // appears as a value. In terms of a DAG, this describes how many edges
  // point to this node.
  /**
   * @type {!Map<!Node, number>} A map of nodes to the number of times
   *  that node has an in-edge. Leaf-nodes will have a value of 0
   */
  const C = [...G.keys()].reduce((p, c) => (p.set(c, 0)) || p, new Map());
  [...G.values()].forEach(
      arr => arr.forEach(e => C.set(e, C.has(e) ? C.get(e) + 1 : 0)));

  /**
   * @type {!Array<!Node>} A List of nodes without any in degrees
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
 * @returns {!Array<!Node>}
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
 * @returns {function(string):!Node}
 */
const nodeMaker = gen => n => new Node(gen.next().value, n);


class Dag {
  constructor() {
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
    this._ref = null;

    /**
     * Optional description for the DAG.
     * Not used in calculations, but is dumped and read.
     * @type {string}
     * @private
     */
    this._description = '';

    /**
     * Optional description of the units.
     * Not used in calculations, but is dumped and read.
     * @type {string}
     * @private
     */
    this._units = '';

    /**
     * The container of our DAG
     * @type {!Map<!Node, !Set<!Node>>}
     */
    this.G = new Map();

    /**
     * @type {function(string): !Node}
     * @private
     */
    this._nodeMaker = nodeMaker(idGen());

    /**
     * @type {!Node}
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
    this._ref = isDef(s) ? s : null;
  }


  //-----------------------------------------------------------------[ Setup ]--
  /**
   * The single root node.
   * @returns {!Node}
   */
  get root() {
    return this._rootNode;
  }


  /**
   * The nodes in the order that they were added.
   * @returns {!Array<!Node>}
   */
  get nodes() {
    return [...this.G.keys()];
  }


  /**
   * The graph description in the form of Node -> Set<Node>
   * @returns {!Map}
   */
  get graph() {
    return this.G;
  }


  /**
   * A topological sorted array of node.
   * NOTE: This includes orphans, and orphans *may* be sorted after the root
   * node.
   * @returns {!Array<!Node>}
   */
  get topo() {
    return topoSort(this.G);
  }


  /**
   * Leafs are nodes without any in-degrees. The partake in the solution.
   * NOTE: The root node *is* considered a leaf if nothing connects to it.
   * @returns {!Array<!Node>}
   */
  get leafs() {
    return leafNodes(this.G).Q;
  }


  /**
   * Orphans are nodes that wont partake in the solution. That is nodes that
   * don't have an out degree.
   * NOTE: The root node is *not* treated as an orphan.
   * @returns {!Array<!Node>}
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
   * @returns {!Node}
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
   * If the given node has a higer ID than any of the existing nodes in the
   * DAG, new nodes created by the DAG will count from this new highest ID.
   * @param {!Node} n
   * @returns {(!Node|boolean)}
   */
  addNode(n) {
    if (this.G.has(n)) {
      return n;
      }
    if (this.ids.includes(n.id)) {
      return false;
    }
    this.G.set(n, new Set());
    this._nodeMaker = nodeMaker(idGen(maxInArr(this.ids)));
    return n;
  }


  /**
   * Delete a node. That is completely remove it from the DAG.
   * The node is disconnected from all its connections, and deleted.
   * The root node can not be deleted.
   * @param {!Node} n
   * @returns {boolean}
   */
  delNode(n) {
    let deleted = false;
    if (n && n !== this._rootNode) {
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
   * @param {!Node} a
   * @param {!Node} b
   * @returns {Dag}
   */
  connect(a, b) {
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
   * @param {!Node} a
   * @param {!Node} b
   * @returns {Dag}
   */
  disconnect(a, b) {
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
   * @param {!Node} n
   * @returns {!Array<!Node>}
   */
  indegrees(n) {
    const hasN = isIn(n);
    return [...this.G.entries()].reduce(hasN, []);
  }


  /**
   * Return an array of all the nodes that the given node connects to.
   * @param {!Node} n
   * @returns {!Array<!Node>}
   */
  outdegrees(n) {
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
   * @param {Object=} opt_d
   * @returns {*}
   */
  solve(opt_d) {
    return this.getSolver()(opt_d);
  }


  /**
   * Solve the dag, but return an array of the value of each node in
   * topo order. The same order a topo, topoIds and topoNames
   * @param opt_d
   * @returns {*}
   */
  debug(opt_d) {
    return this.getSolver(true)(opt_d);
  }


  /**
   * @param {boolean=} debug
   * @returns {function(*=): *}
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
      return debug ? r : r.get(rootId);
    };
  }


  /**
   * Dump the DAG to a JSON string.
   * @returns {string}
   */
  dump() {
    return JSON.stringify({
      M: [this.description, this.units, this.ref],
      G: [...this.getIdG()].map(([k, s]) => [k, [...s]]),
      N: this.topo.map(e => e.dump())
    });
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {string} json A valid DAG Json String.
   * @param {boolean=} allowRollback By default we allow a rollback, but
   *    the rollback process itself does not.
   * @returns {Dag}
   */
  read(json, allowRollback = true) {
    // Read the string
    const j = safeJsonParse(json);

    // Store a valid rollback image of the current config.
    const rollback = this.dump();

    if (j) {
      try {
        // Destroy the current config
        this.G = new Map();
        this._rootNode = undefined;

        // Create a list of true nodes
        const n = j.N.map(e => new Node(undefined, undefined, e));
        const matchId = id => e => e.id === id;
        const findNode = id => n.find(matchId(id));

        // Create a map that directly mirrors the original, but with IDs only.
        const g = new Map(/** @type Array */ (j.G));
        this._rootNode = undefined;
        for (const k of g.keys()) {
          this.addNode(findNode(k));
        }
        this._rootNode = this.nodes[0];
        for (const [k, arr] of g.entries()) {
          const node = findNode(k);
          arr.forEach(id => {
            const toNode = findNode(id);
            this.connect(node, toNode);
          });
        }

        // Make sure that the order of each of the nodes args is the same as the
        // original.
        this.nodes.forEach(n => {
          n._args = j.N.find(e => e.I === n.id).A;
        });

        // Attend to the human data
        this.description = j.M ? (j.M[0] || '') : '';
        this.units = j.M ? (j.M[1] || '') : '';
        this.ref = j.M ? j.M[2] : null;


        return this;
      } catch (e) {
        if (allowRollback) {
          this.read(rollback, false);
        }
      }
    }
  }
}

module.exports = Dag;
