const u = require('./utils/utils.js');
const Node = require('./utils/vertex.js');

/**
 * @param {!Iterator<number>} gen
 * @returns {function(!string):!Node}
 */
const nodeMaker = gen => n => new Node(gen.next().value, n);


/**
 * @type {DAG}
 */
class DAG {
  constructor() {

    /**
     * Dag can be given meta data for the duration of its life.
     * The meta is not persisted across dump and reads
     * @type {*}
     * @private
     */
    this._meta = null;

    /**
     * Optional description for the DAG.
     * Not used in calculations, but is dumped and read.
     * @type {!string}
     * @private
     */
    this._description = '';

    /**
     * Optional description of the units.
     * Not used in calculations, but is dumped and read.
     * @type {!string}
     * @private
     */
    this._units = '';

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
   * @returns {*}
   */
  get description() {
    return this._description;
  }


  /**
   * Set the DAG description.
   * @param {string} s
   */
  set description(s) {
    this._description = s;
  }


  /**
   * Get the DAG units
   * @returns {*}
   */
  get units() {
    return this._units;
  }


  /**
   * Set the DAG units.
   * @param {string} s
   */
  set units(s) {
    this._units = s;
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
   * @param {!string} name
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


  /**
   * @param {boolean=} debug
   * @returns {function(*=): *}
   */
  getSolver(debug = false) {
    const m = u.removeOrphans(this.getIdG());
    const validTopoNodes = this.topo.filter(e => m.has(e.id));
    const validTopoIds = validTopoNodes.map(u.grabId);
    const cleanNodes = validTopoNodes.map(n => n.clean());
    const rootId = this._rootNode.id;

    const sMap = new Map();
    sMap.set('topoIds', validTopoIds);

    return data => {
      sMap.set('data', data);
      const r = cleanNodes.reduce(
          (p, n) => n.solve(p), sMap);
      return debug ? r : r.get(rootId);
    };
  }


  /**
   * Dump the DAG to a JSON string.
   * @returns {!string}
   */
  dump() {
    return JSON.stringify({
      M: [this._description, this._units],
      G: [...this.getIdG()].map(([k, s]) => [k, [...s]]),
      N: this.topo.map(e => e.dump())
    });
  }


  // noinspection JSUnusedGlobalSymbols
  /**
   * @param {!string} json A valid DAG Json String.
   * @param {boolean=} allowRollback By default we allow a rollback, but
   *    the rollback process itself does not.
   * @returns {DAG}
   */
  read(json, allowRollback=true) {
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

        // Attend to the human data
        this.description = j.M ? (j.M[0] || '') : '';
        this.units = j.M ? (j.M[1] || '') : '';

        return this;
      } catch (e) {
        if (allowRollback) { this.read(rollback, false); }
      }
    }
  }
}

module.exports = DAG;