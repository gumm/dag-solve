const u = require('./utils.js');

/**
 * @type {Node}
 */
class Node {
  /**
   * @param {!number|undefined} id
   * @param {!string|undefined} name
   * @param {Object|undefined} obj
   */
  constructor(id, name, obj = undefined) {
    /**
     * @type {!number}
     * @private
     */
    this._id = id;

    /**
     * @type {!string}
     * @private
     */
    this._name = name;

    /**
     * @type {!Array<!number>}
     * @private
     */
    this._args = [];

    /**
     * @type {!string|!number|undefined}
     * @private
     */
    this._math = undefined;

    /**
     * @type {Array<Array<*>>}
     * @private
     */
    this._enum = [];

    /**
     * @type {!Array<!string|!number>}
     * @private
     */
    this._comparator = [];

    /**
     * @type {!Array<!string|!number>}
     * @private
     */
    this._between = [];

    /**
     * @type {!number|undefined}
     * @private
     */
    this._round = undefined;

    /**
     * @type {!Array<string|number>|undefined|null}
     * @private
     */
    this._path = undefined;

    /**
     * @type {!number|undefined}
     * @private
     */
    this._evCode = undefined;

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
    this._func = u.alwaysUndef;

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
      this.setEvCode(obj.V);
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
    this._round = undefined;
    this._math = undefined;
    this._evCode = undefined;
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
   * @returns {!number}
   */
  get id() {
    return this._id;
  }

  /**
   * @returns {!string}
   */
  get name() {
    return this._name;
  }

  /**
   * @param {!string} n
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
   * @returns {!Array<!number>}
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
   * @param {number} a
   * @returns {Node}
   */
  setEvCode(n) {

    if (u.isDef(n)) {
      this._clearAll();
      this._evCode = n;
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
   * @param {!string|!number|undefined} s
   * @returns {Node}
   */
  setMath(s) {

    if (u.isDef(s)) {
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

    if (u.isNumber(int)) {
      this._clearAll();
      this._round = u.pRound(0)(int);
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
   * @param {!string} cmp Comparison operator. Must be one of:
   *    ==, <=, >=, <, >
   * @param {number|string} v2 Value with which to test the predicate
   * @param {!string} outputFormat Result value. What is passed along
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
    pass = (u.isNumber(v1) || u.isRefString(v1)) && pass;
    pass = (u.isNumber(v2) || u.isRefString(v2)) && pass;
    pass = (["!=", "!==", "==", "===",
      "<=", ">=", "<", ">"].includes(cmp)) && pass;
    pass = (["vu", "10", "tf", "ab"].includes(outputFormat)) && pass;

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
   * @param {!string} outputFormat Result value. What is passed along
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
    isClean = (u.isNumber(v) || u.isRefString(v)) && isClean;
    isClean = (u.isNumber(s1) || u.isRefString(s1)) && isClean;
    isClean = (u.isNumber(s2) || u.isRefString(s2)) && isClean;
    isClean = (["vu", "10", "tf", "ab"].includes(outputFormat)) && isClean;

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
    this._enum = u.enumSet(this._enum, k, v);
    return this;
  }

  /**
   * @param {*} k
   * @returns {!Node}
   */
  delEnum(k) {
    this._enum = u.enumUnSet(this._enum, k);
    this._nodus = 'Changed';
    return this;
  }

  /**
   * @returns {Array<Array<*>>}
   */
  get enum() {
    return this._enum;
  }

  // ----------------------------------------------------------------[ Solve ]--
  clean() {
    if (this.math) {
      // This node does math.
      [this._nodus, this._func] = u.mathFunc(this.math, this.args);

    } else if (this.enum && this.enum.length) {
      // This node does enums
      [this._nodus, this._func] = u.enumFunc(this.enum, this.args);

    } else if (u.isDef(this.round)) {
      // This node does rounding
      [this._nodus, this._func] = u.roundFunc(this.round, this.args);

    } else if (this.comparator && this.comparator.length) {
      // This node is a comparator
      [this._nodus, this._func] = u.comparatorFunc(this.comparator, this.args);

    } else if (this.between && this.between.length) {
      // This node is a between filter
      [this._nodus, this._func] = u.betweenFunc(this.between, this.args);

    } else if (this.path && this.path.length) {
      // This node can access data via a path into a data structure.
      [this._nodus, this._func] = u.dataPathFunc(this.path, this.args);

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
}

module.exports = Node;
