/*! @license MIT ©2018-2020 Miel Vander Sande, meemoo*/
/* A SummaryDatasource queries a source selection index created from summaries. */

const Datasource = require('@ldf/core').datasources.Datasource,
  N3 = require("n3"),
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
  _initialize(done) {
    this._tripleStore = new N3.Store();

    // If summaryDir does not exist, create it
    if (!fs.existsSync(this._summariesFolder)) {
      fs.mkdirSync(this._summariesFolder, { recursive: true });
    }

    // Initialize watcher.
    let watcher = chokidar.watch(this._summariesFolder, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
    });

    console.log(`Watching  ${this._summariesFolder}`);
    watcher.on("add", (summaryFile) =>
      this._storeFile(summaryFile, (err) => console.log(err))
    );
    done();
  }

  _storeFile(summaryFile, callback) {
    console.log(`Adding  ${summaryFile} to store`);
    let parser = new N3.Parser();

    let document = this._fetch(
      { url: summaryFile, headers: { accept: ACCEPT } },
      callback
    );
    let tripleStore = this._tripleStore;
    let self = this;
    // N3Parser._resetBlankNodeIds();

    let graph = decodeURIComponent(summaryFile);
    parser.parse(document, function (error, triple) {
      if (error) {
        callback && callback(error);
        return;
      }

      if (triple)
        tripleStore.addTriple(
          triple.subject,
          triple.predicate,
          triple.object,
          graph
        );
      else {
        tripleStore.addTriple(graph, RDF + "type", DS + "Summary", graph);
        // Create AMFs
        console.log(`Storing filters of ${graph}`);
        self._storeFilter(graph);
        callback && callback(null);
      }
    });
  }

  _storeFilter(graph) {
    let filters = (this._filters = {});
    let tripleStore = this._tripleStore;

    let filterQuads = tripleStore.find(null, DS + "objFilter", null, graph);
    console.log(`Found ${filterQuads.length} filters for ${graph}`);
    filterQuads.forEach(function (quad) {
      try {
        let bitsMatches = tripleStore.find(
          quad.object,
          AMF + "bits",
          null,
          graph
        );

        if (bitsMatches.length === 0) return;

        let bitsString = bitsMatches[0].object;
        let bits = parseInt(N3.Util.getLiteralValue(bitsString), 10);

        let hashesMatches = tripleStore.find(
          quad.object,
          AMF + "hashes",
          null,
          graph
        );

        if (hashesMatches.length === 0) return;

        let hashesString = hashesMatches[0].object;
        let hashes = parseInt(N3.Util.getLiteralValue(hashesString), 10);

        // Decode filter
        let filterMatches = tripleStore.find(
          quad.object,
          AMF + "filter",
          null,
          graph
        );

        if (filterMatches.length === 0) return;

        let filterString = filterMatches[0].object;
        let filter = Buffer.from(
          N3.Util.getLiteralValue(filterString),
          "base64"
        );

        // Find predicate
        let predicateMatches = tripleStore.find(
          quad.subject,
          DS + "predicate",
          null,
          quad.graph
        );

        if (predicateMatches.length === 0) return;

        let predicate = predicateMatches[0].object;

        filters[predicate] = filters[predicate] || {}; // create entry for predicate if not exists
        filters[predicate][quad.graph] = new Bloem(bits, hashes, filter); // add filter for the summary
      } catch (er) {
        console.log(er);
        console.log(filterMatches);
      }
    });
  }

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
      triples = this._tripleStore.findByIRI(
        query.subject,
        query.predicate,
        query.object
      );

    if (query.subject && query.predicate === DCT + "isPartOf") {
      triples = this._findSources(query.subject).map(function (source) {
        return {
          subject: query.subject,
          predicate: query.predicate,
          object: source,
        };
      });
    }

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
}

module.exports = SummaryDatasource;
