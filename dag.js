const R = require('ramda');
const u = require('./utils.js');

/**
 * @param {!Iterator<number>} gen
 * @returns {function(!string):!Node}
 */
const nodeMaker = gen => n => new Node(gen.next().value, n);

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

    if (u.isDef(s)) {
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

    if (u.isDef(int)) {
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
    if ([rv, p1, v1, p2, v2].filter(e => u.isDef(e)).length) {
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
    if (k === undefined) {
      return this
    }
    this._enum = u.enumSet(this._enum, k, v);

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
      const m = new Map(this._enum);
      this._func = X => m.get(X[0]);
      this._errState = null;

      // This node does rounding
    } else if (u.isDef(this._round)) {
      const r = u.pRound(this._round);
      this._func = X => r(X[0]);
      this._errState = null;

      // This node filtering
    } else if (this._filter && this._filter.length) {
      [this._errState, this._func] = u.parseFilter(this._filter);

      // This node can access data on a path.
    } else if (this._path && this._path.length) {
      if (u.sameArr(this._path, [null])) {
        this._func = (X, data) => data;
      } else {
        this._func = (X, data) => R.pathOr(undefined, this._path)(data);
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
      return result === undefined
          ? [null, this.fallback]
          : [null, result];
    } else {
      this.clean()
      }
    if (!this._errState) {
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
    this._nodeMaker = nodeMaker(u.idGen());

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
    return u.topoSort(this.G);
  }

  /**
   * Leafs are nodes without any in-degrees. The partake in the solution.
   * NOTE: The root node *is* considered a leaf if nothing connects to it.
   * @returns {!Array<!Node>}
   */
  get leafs() {
    const [, Q] = u.leafNodes(this.G);
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
   * A list of the node names
   * @return {!Array<!string>}
   */
  get topoNames() {
    return this.topo.map(e => e.name);
  }

  /**
   * A list of the node IDs
   * @return {!Array<!number>}
   */
  get ids() {
    return this.nodes.map(e => e.id);
  }

  /**
   * A list of the node IDs
   * @return {!Array<!number>}
   */
  get topoIds() {
    return this.topo.map(e => e.id);
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
    if (this.G.has(n)) {
      return n;
      }
    if (this.ids.includes(n.id)) {
      return false;
    }
    this.G.set(n, new Set());
    this._nodeMaker = nodeMaker(u.idGen(u.max(this.ids)));
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
    const hasN = u.isIn(n);
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
  getIdG(){return [...this.G].reduce(
      (p, [k, s]) => p.set(k.id, new Set([...s].map(u.grabId))), new Map())}

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

  getSolver(debug = false) {
    const m = u.removeOrphans(this.getIdG());
    const validTopoNodes = this.topo.filter(e => m.has(e.id));
    const validTopoIds = validTopoNodes.map(u.grabId);
    const cleanNodes = validTopoNodes.map(n => n.clean());
    const errs = [];

    return (opt_d) => {
      const r = cleanNodes.reduce((p, n) => {
        const [err, s] = n.solve(p, validTopoIds, opt_d);
          errs.push(err);
          p.push(s);
          return p;
        }, []);
      return debug ? r : u.tail(r);
    };
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
    const j = u.safeJsonParse(json);

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

module.exports = {
  DAG,
  Node
};
