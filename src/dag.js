import {isDef, maxInArr, isString, isNumber} from '../node_modules/badu/badu.js';

import {idGen, safeJsonParse,} from './utils.js';
import Vertex from './vertex.js';


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

/**
 * @param {!Iterator<number>} gen
 * @returns {function(string):!Vertex}
 */
const nodeMaker = gen => n => new Vertex(gen.next().value, n);


export default class Dag {

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
    this._nodeMaker = nodeMaker(idGen());

    /**
     * @type {!Vertex}
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
        orphans.push(n)
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
    this._nodeMaker = nodeMaker(idGen(maxInArr(this.ids)));
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
  debugFormatter(map) {
    return map.set('topoNames', this.topoNames)
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
          d.addNode(findNode(k))
        }
        d._rootNode = d.nodes[0];

        for (const [k, arr] of g.entries()) {
          const node = findNode(k);
          arr.forEach(id => {
            const toNode = findNode(id);
            d.connect(node, toNode);
          })
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
