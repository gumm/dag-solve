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
     * @type {function(...*): (undefined|*)}
     * @private
     */
    this._func = u.alwaysUndef;

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
     * @type {string|undefined}
     * @private
     */
    this._errState = 'Not init';

    /**
     * @type {*}
     * @private
     */
    this._fallback = undefined;

    // We overwrite *some* elements, but we keep the _args and _errState both
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
      C: this._comparator
    };
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

  // -----------------------------------------------------------------[ Args ]--
  /**
   * Add a argument to the node.
   * @param {!Node} n
   */
  addArg(n) {
    this._args.push(n._id);
    this._errState = 'Changed';
    return this;
  }

  /**
   * Remove an argument from the node.
   * @param {!Node} n
   */
  delArg(n) {
    this._args = this._args.filter(e => e !== n._id);
    this._errState = 'Changed';
    return this;
  }

  /**
   * @returns {!Array<!number>}
   */
  get args() {
    return this._args;
  }

  // -----------------------------------------------------------------[ Math ]--
  /**
   * @param a
   * @returns {Node}
   */
  setPath(...a) {
    this._path = [...a];

    if (this._path.length) {
      this._enum = [];
      this._comparator = [];
      this._round = undefined;
      this._math = undefined;
    }

    this._errState = 'Changed';
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
    this._math = s;

    if (u.isDef(s)) {
      this._path = [];
      this._enum = [];
      this._round = undefined;
      this._comparator = [];
    }

    this._errState = 'Changed';
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
      this._round = u.pRound(0)(int);

      this._path = [];
      this._math = undefined;
      this._enum = [];
      this._comparator = [];
      this._errState = 'Changed';
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
   *    "vc" - The input value on pass, else the clamped value. That is, the
   *       predicate value that resulted in a fail.
   *       Example: f(n) = n >= 2 && n <= 5
   *                in "vc" mode:
   *                  f(1.9999) == 2  <- Clamped Here
   *                  f(3) == 3
   *                  f(4) == 4
   *                  f(5) == 5
   *                  f(5.0001) == 5  <- Clamped Here
   * @returns {Node}
   */
  setComparator(v1, cmp, v2, outputFormat) {
    let isClean = true;
    isClean = (u.isNumber(v1) || u.isRefString(v1)) && isClean;
    isClean = (["!=", "!==", "==", "===", "<=", ">=", "<", ">"].includes(cmp)) && isClean;
    isClean = (u.isNumber(v2) || u.isRefString(v2)) && isClean;
    isClean = (["vu", "10", "tf", "ab"].includes(outputFormat)) && isClean;

    if (isClean) {
      this._comparator = [v1, cmp, v2, outputFormat];

      this._enum = [];
      this._path = [];
      this._math = undefined;
      this._round = undefined;

      this._errState = 'Changed';
    }

    return this;
  };

  get comparator() {
    return this._comparator;
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
    this._enum = u.enumSet(this._enum, k, v);

    this._path = [];
    this._math = undefined;
    this._round = undefined;
    this._comparator = [];

    this._errState = 'Changed';
    return this;
  }

  /**
   * @param {*} k
   * @returns {!Node}
   */
  delEnum(k) {
    this._enum = u.enumUnSet(this._enum, k);
    this._errState = 'Changed';
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
    // This node does math.
    if (this._math) {
      [this._errState, this._func] = u.mathFunc(this._math, this.args);

      // This node does enums
    } else if (this._enum && this._enum.length) {

      // Make it so you can read values from other nodes as output in an
      // enum.
      const r = this.enum.map(([k,v]) => (u.isString(v) && u.isRefString(v))
          ? [k, X => X[u.getRefIndex(v)]]
          : [k, () => v]
      );

      const m = new Map(r);
      this._func = X => m.get(X[0]) ? m.get(X[0])(X) : undefined;

      this._errState = null;

      // This node does rounding
    } else if (u.isDef(this._round)) {
      const r = u.pRound(this._round);
      this._func = X => r(X[0]);
      this._errState = null;

      // This node is a comparator
    } else if (this.comparator && this.comparator.length) {

      let [v1, cmp, v2, outputFormat] = this.comparator;
      const r1 = u.isString(v1) ?  X => X[u.getRefIndex(v1)] : () => v1;
      const r2 = u.isString(v2) ? X => X[u.getRefIndex(v2)] : () => v2;
      const t = u.makeComparator(cmp);
      const outF = u.genOutput(outputFormat);

      this._func = X => {
        const [s1, s2]  = [r1(X),  r2(X)];
        return outF(t(s1, s2), s1, s2);
      };
      this._errState = null;

      // This node can access data on a path.
    } else if (this._path && this._path.length) {
      if (u.sameArr(this._path, [null])) {
        // When the path is null, just return the data...
        this._func = (X, data) => data;
      } else {
        this._func = (X, data) => u.pathOr(undefined, this._path)(data);
      }
      this._errState = null;

      // This does nothing but return a fallback value
    } else if (this._fallback) {
      this._func = () => this._fallback;
      this._errState = null;
    }

    return this;
  }

  /**
   * Given two lists, this returns the solution for this node.
   * Both arrays are topologically ordered, and maps to one another.
   * This node's own args array contains the ids of the nodes that connect
   * to this node, and so the solutions of those nodes can be found in the
   * first array (p).
   * Thus, to get to an arg value the logic is:
   *     argId -> indexOf arg id in topoIds -> p[]
   * @param {!Array<*>} p The solution so far. In topo-order.
   * @param {!Array<!number>} topoIds The topo-ordered list of node IDs
   * @param {Object=} opt_d
   * @returns {*}
   */
  solve(p, topoIds, opt_d) {
    const argArr = this.args.map(id => p[topoIds.indexOf(id)]);

    if (!this._errState) {
      const result = this._func(argArr, opt_d);
      // Make sure things like false, null, 0 don't trigger the fallback,
      // But NaN and undefined does.
      return result === undefined ? [null, this.fallback] : [null, result];
    } else {
      this.clean()
    }
    if (!this._errState) {
      return this.solve(p, topoIds);
    }
    return [this._errState, undefined];
  }
}

module.exports = Node;
