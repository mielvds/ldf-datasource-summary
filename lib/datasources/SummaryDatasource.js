/*! @license MIT ©2018-2020 Miel Vander Sande, meemoo*/
/* A SummaryDatasource queries a source selection index created from summaries. */

const Datasource = require('@ldf/core').datasources.Datasource,
  {Store, Parser, DataFactory} = require("n3"),
  { namedNode, literal, defaultGraph, quad } = DataFactory,
  path = require("path"),
  fs = require("fs"),
  Bloem = require("bloem").Bloem,
  chokidar = require("chokidar");

const ACCEPT = "text/turtle;q=1.0,application/n-triples;q=0.7,text/n3;q=0.6";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  DCT = "http://purl.org/dc/terms/",
  AMF = "http://semweb.mmlab.be/ns/membership#",
  DS = "http://semweb.mmlab.be/ns/summaries#";

// Creates a new SummaryDatasource
class SummaryDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ["triplePattern", "limit", "offset"];
    super(options, supportedFeatureList);

    // Settings for data summaries
    this._summariesFolder =
      options.dir && path.isAbsolute(options.dir)
        ? options.dir
        : path.join(__dirname, options.dir || "../../summaries");
  }

  // Prepares the datasource for querying
  async _initialize() {
    this._tripleStore = new Store();

    // If summaryDir does not exist, create it
    if (!fs.existsSync(this._summariesFolder)) {
      fs.mkdirSync(this._summariesFolder, { recursive: true });
    }

    // Initialize watcher.
    this._watcher = chokidar.watch(this._summariesFolder, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
    });

    console.log(`Watching  ${this._summariesFolder}`);
    this._watcher.on("add", summaryFile =>
      this._storeFile(summaryFile, (err) => { 
        if (err) throw err
        else
          this.emit('summaryAdded');
      })
    );
  }

  _storeFile(summaryFile, callback) {
    console.log(`Adding  ${summaryFile} to store`);
    let parser = new Parser();

    let document = this._fetch(
      { url: summaryFile, headers: { accept: ACCEPT } },
      callback
    );
    let tripleStore = this._tripleStore;
    let self = this;

    let graph = namedNode(decodeURIComponent(summaryFile));
    parser.parse(document, (error, quad) => {
      if (error) {
        callback && callback(error);
        return;
      }

      if (quad)
        tripleStore.addQuad(
          quad.subject,
          quad.predicate,
          quad.object,
          graph
        );
      else {
        tripleStore.addQuad(
            graph,
            namedNode(RDF + "type"),
            namedNode(DS + "Summary"),
            graph);
        // Create AMFs
        console.log(`Storing filters of ${graph.value}`);
        self._storeFilter(graph);
        callback && callback(null);
      }
    });
  }

  async _storeFilter(graph) {
    let filters = (this._filters = {});
    let tripleStore = this._tripleStore;

    tripleStore.forEach((quad) => {
      try {
        let bitsMatches = tripleStore.getQuads(
          quad.object,
          namedNode(AMF + "bits"),
          null,
          graph
        );

        if (bitsMatches.length === 0) return;

        let bitsString = bitsMatches[0].object.value;
        let bits = parseInt(bitsString, 10);

        let hashesMatches = tripleStore.getQuads(
          quad.object,
          namedNode(AMF + "hashes"),
          null,
          graph
        );

        if (hashesMatches.length === 0) return;

        let hashesString = hashesMatches[0].object.value;
        let hashes = parseInt(hashesString, 10);

        // Decode filter
        let filterMatches = tripleStore.getQuads(
          quad.object,
          namedNode(AMF + "filter"),
          null,
          graph
        );

        if (filterMatches.length === 0) return;

        let filterString = filterMatches[0].object.value;
        let filter = Buffer.from(filterString, "base64");

        // Find predicate
        let predicateMatches = tripleStore.getQuads(
          quad.subject,
          namedNode(DS + "predicate"),
          null,
          quad.graph
        );

        if (predicateMatches.length === 0) return;

        let predicate = predicateMatches[0].object.value;

        filters[predicate] = filters[predicate] || {}; // create entry for predicate if not exists
        filters[predicate][quad.graph.value] = new Bloem(bits, hashes, filter); // add filter for the summary
      } catch (er) {
        console.log(er);
        console.log(filterMatches);
      }
    }, 
    null, 
    namedNode(DS + "objFilter"), 
    null, 
    graph);
  }

  // users URI strings
  _findSources(term, predicate) {
    let filters = predicate ? [predicate] : Object.keys(this._filters);
    let sources = [];
    for (let i = 0; i < filters.length; i++) {
      let filter = this._filters[filters[i]];
      for (let source in filter) {
        if (
          filter[source].has(Buffer.from(term)) &&
          sources.indexOf(source) < 0
        )
          sources.push(source);
      }
    }
    return sources;
  }

  // Writes the results of the query to the given triple stream
  _executeQuery(query, destination) {
    let offset = query.offset || 0,
      limit = query.limit || Infinity,
      triples = (query.subject && query.predicate && namedNode(query.predicate).equals(namedNode(DCT + "isPartOf"))) ?
                this._findSources(query.subject)
                    .map(source => {
                      return quad(
                        query.subject,
                        query.predicate,
                        namedNode(source)
                      );
                    }) : this._tripleStore.getQuads(query.subject, query.predicate, query.object, query.graph)

    // Send the metadata
    destination.setProperty("metadata", {
      totalCount: triples.length,
      hasExactCount: true,
    });
    // Send the requested subset of triples
    for (
      let i = offset, l = Math.min(offset + limit, triples.length);
      i < l;
      i++
    )
      destination._push(triples[i]);
    destination.close();
  }

  // Closes the data source
  close(done) {
    // Close the HDT document if it is open
    if (this._watcher) {
      this._watcher.close().then(done);
      delete this._watcher;
    }
    // If initialization was still pending, close immediately after initializing
    else if (!this.initialized)
      this.on('initialized', this.close.bind(this, done));
  }

}

module.exports = SummaryDatasource;
