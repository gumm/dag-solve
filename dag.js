const R = require('ramda');

const argRefSymbol = 'X';

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
    return [null, new Function(
        argRefSymbol, `try { return ${fn}; } catch(e) { return; }`)];
  } catch(err) {
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
        mathCleaner(m)
    );
    if (!s.includes('$')) {
      [err, f] = funcMaker(s);
    }
  }
  else {
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
  const C = [...G.keys()].reduce((p,c) => (p.set(c,0)) || p, new Map());
  [...G.values()].forEach(
      arr => arr.forEach(e => C.set(e, C.has(e) ? C.get(e) + 1 : 0))
  );
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
      for (const v of G.values()) { v.delete(k) }
    }
  }
  if([...G.entries()].reduce(
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
  while (true)
    yield i++;
}

const isIn = n => (p, [k, s]) => s.has(n) ? (p.push(k) && p) : p;

/**
 * @param {!Iterator<number>} gen
 * @returns {function(!string):!Node}
 */
const nodeMaker = gen => n => new Node(gen.next().value, n);

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
  } catch (e) {}
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

/**
 * @type {Node}
 */
class Node {

  /**
   * @param {!number} id
   * @param {!string} name
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
     * @type {!Array<!string|!number|undefined>}
     * @private
     */
    this._filter = [];

    /**
     * @type {function(*): (undefined|*)}
     * @private
     */
    this._func = alwaysUndef;

    /**
     * @type {!number|undefined}
     * @private
     */
    this._round = undefined;

    /**
     * @type {!Array<string|number>|undefined}
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
      this.setFilter(...obj.F);
      this.setPath(...obj.P);
    }
  }

  //------------------------------------------------------------------[ Save ]--
  /**
   * @returns {{
   *    I: number,
   *    N: string,
   *    A: Array<number>,
   *    D: *|undefined,
   *    M: string|number|undefined,
   *    E: Array<Array<*>>|undefined,
   *    R: number|undefined,
   *    F: Array<string|number|undefined>|undefined
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
      F: this._filter,
      P: this._path
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
      this._filter = [];
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

    if (isDef(s)) {
      this._path = [];
      this._enum = [];
      this._round = undefined;
      this._filter = [];
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
  setRound(int) {
    this._round = int;

    if (isDef(int)) {
      this._path = [];
      this._math = undefined;
      this._enum = [];
      this._filter = [];
    }

    this._errState = 'Changed';
    return this;
  };

  // ---------------------------------------------------------------[ Filter ]--
  /**
   * @param {!string} rv Result value. What is passed along if the filter
   *    either passes or fails. The only allowed values are:
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
   * @param {!string} p1 Predicate. Must be one of:
   *    ==, <=, >=, <, >
   * @param {!number|undefined} v1 Value with which to test the predicate
   * @param {!string=} p2 Predicate. A second predicate so we can do
   *    range filtering. Must be one of:
   *    ==, <=, >=, <, >
   * @param {!number=} v2 Value with which to test the 2nd predicate
   * @returns {Node}
   */
  setFilter(rv, p1, v1, p2, v2) {

    if ([rv, p1, v1, p2, v2].filter(e => isDef(e)).length) {
      const f = [rv, p1, v1, p2, v2];

      this._path = [];
      this._filter = [...f];
      this._math = undefined;
      this._enum = [];
    }

    this._errState = 'Changed';
    return this;
  };

  // -----------------------------------------------------------------[ Enum ]--
  /**
   * @param {*} k
   * @param {*} v
   * @returns {!Node}
   */
  addEnum(k, v) {
    if (k === undefined) { return this }
    this._enum = enumSet(this._enum, k, v);

    this._path = [];
    this._math = undefined;
    this._round = undefined;
    this._filter = [];

    this._errState = 'Changed';
    return this;
  }

  /**
   * @param {*} k
   * @returns {!Node}
   */
  delEnum(k) {
    this._enum = enumUnSet(this._enum, k);
    this._errState = 'Changed';
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
    // This node does math.
    if (this._math) {
      [this._errState, this._func] = mathFunc(this._math, this.args);

    // This node does enums
    } else if (this._enum && this._enum.length) {
      const m = new Map(this._enum);
      this._func = X => m.get(X[0]);
      this._errState = null;

    // This node does rounding
    } else if (isDef(this._round)) {
      const r = pRound(this._round);
      this._func = X => r(X[0]);
      this._errState = null;

    // This node filtering
    } else if (this._filter && this._filter.length) {
      [this._errState, this._func] = parseFilter(this._filter);

    // This node can access data on a path.
    } else if (this._path && this._path.length) {
      const f = R.pathOr(undefined, this._path);
      this._func = (X, data) => f(data);
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

    if(!this._errState) {
      const result = this._func(argArr, opt_d);
      // Make sure things like false, null, 0 don't trigger the fallback.
      return  result === undefined ? [null, this.fallback] : [null, result];
    } else {
      this.clean()
    }
    if(!this._errState) {
      return this.solve(p, topoIds);
    }
    return [this._errState, undefined];
  }

}


/**
 * @type {DAG}
 */
class DAG {

  constructor() {
    /**
     * The container of our DAG
     * @type {Map<Node, Set<Node>>}
     */
    this.G = new Map();

    /**
     * @type {function(!string): !Node}
     * @private
     */
    this._nodeMaker = nodeMaker(idGen());

    /**
     * @type {!Node}
     * @private
     */
    this._rootNode = this.makeNode('ROOT');
    this._rootNode.setMath('$1')
  }

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
    const [, Q] = leafNodes(this.G);
    return Q;
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
        orphans.push(n)
      }
    }
    return orphans;
  }

  /**
   * A list of the node names
   * @return {!Array<!string>}
   */
  get names() {
    return this.nodes.map(e => e.name);
  }

  /**
   * A list of the node IDs
   * @return {!Array<!number>}
   */
  get ids() {
    return this.nodes.map(e => e.id);
  }

  /**
   * @param {!String} name
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
   * @returns {(!Node|!boolean)}
   */
  addNode(n) {
    if (this.G.has(n)) { return n; }
    if (this.ids.includes(n.id)) { return false; }
    this.G.set(n, new Set());
    this._nodeMaker = nodeMaker(idGen(max(this.ids)));
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
   * @returns {DAG}
   */
  connect(a, b) {
    if (a === this.root) { return this; }
    if (b === this.root && this.indegrees(b).length > 0) { return this; }
    if (!this.G.has(a) || !this.G.has(b)) { return this; }
    if (this.G.get(a).has(b)) { return this; }

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
   * @returns {DAG}
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
   * @returns {DAG}
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
  getIdG() {
    return [...this.G].reduce(
        (p, [k, s]) => p.set(k.id, new Set([...s].map(grabId))),
        new Map()
    )
  }

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
    return this.getSolver()(opt_d)
  }

  getSolver() {
    const m = removeOrphans(this.getIdG());
    const validTopoNodes = this.topo.filter(e => m.has(e.id));
    const validTopoIds = validTopoNodes.map(grabId);
    const cleanNodes = validTopoNodes.map(n => n.clean());
    const errs = [];

    return (opt_d) => tail(cleanNodes.reduce((p, n) => {
      const [err, s] = n.solve(p, validTopoIds, opt_d);
      errs.push(err);
      p.push(s);
      return p;
    }, []));
  }



  /**
   * Dump the DAG to a JSON string.
   * @returns {!string}
   */
  dump() {
    return JSON.stringify({
      G: [...this.getIdG()].map(([k, s]) => [k, [...s]]),
      N: this.topo.map(e => e.dump())
    });
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {!string} json A valid DAG Json String.
   * @returns {boolean}
   */
  read(json) {
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
        const g = new Map(j.G);
        this._rootNode = undefined;
        for (const k of g.keys()) {
          this.addNode(findNode(k))
        }
        this._rootNode = this.nodes[0];
        for (const [k, arr] of g.entries()) {
          const node = findNode(k);
          arr.forEach(id => {
            const toNode = findNode(id);
            this.connect(node, toNode);
          })
        }

        // Make sure that the order of each of the nodes args is the same as the
        // original.
        this.nodes.forEach(n => {
          n._args = j.N.find(e => e.I === n.id).A;
        });
        return true;
      }
      catch (e) {
        this.read(rollback);
      }
    }
  }
}


/**

 d = require('./bad/math/dag.js');
 const g = new d.DAG();
 const A = g.makeNode('A');
 g.connect(A, g.root);
 A.setPath('v');
 g.solve({v:10});

 data = [1,2,3,4,5,6,7,8,9].map(e => ({v:e}))
 data.map(e => g.solve(e))

 solver = g.getSolver()
 data.map(solver)



 const B = g.makeNode('B');
 const C = g.makeNode('C');
 const D = g.makeNode('D');
 const E = g.makeNode('D');
 g.connect(C, E).connect(E, B).connect(B, A).connect(D, A).connect(A, g.root);
 D.setMath(10);
 C.setMath(3);
 B.addEnum(3, 2.5).addEnum('A', 'B');
 A.setMath('($1 + 2.5) / $2');
 E.setFilter('vu', '>', 2, '<=', 5);

 const g2 = new d.DAG();
 let s;


*/


module.exports = {
  DAG
};


