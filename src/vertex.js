import {alwaysUndef, isDef, isNumber, pRound, toLowerCase, } from '../node_modules/badu/badu';
import {fallBackFunc, betweenFunc, comparatorFunc, dataPathFunc, enumFunc, enumSet, enumUnSet, eventCodeFunc, isRefString, mathFunc, roundFunc} from './utils.js';


/**
 * @typedef {{
  A: (!Array<number>),
  B: !Array<(number|string)>,
  C: !Array<(number|string)>,
  D: (*|undefined),
  E: !Array<!Array<*>>,
  I: number,
  M: (number|string|undefined),
  N: (string|undefined),
  P: !Array<string|number|null>,
  R: (number|undefined),
  V: !Array<string|number>
}}
 */
let dumpType;


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


export default class Vertex {
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
          this.addEnum(...e)
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
      this.clean()
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
