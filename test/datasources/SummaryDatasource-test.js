/*! @license MIT ©2014-2016 Miel Vander Sande, meemoo */
let SummaryDatasource = require('../../').datasources.SummaryDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory,
    RdfString = require('rdf-string');

let exampleDir = path.join(__dirname, '../data');

describe('SummaryDatasource', () => {
  describe('The SummaryDatasource module', () => {
    it('should be a function', () => {
      SummaryDatasource.should.be.a('function');
    });

    it('should be a SummaryDatasource constructor', (done) => {
      let instance = new SummaryDatasource({ dir: exampleDir });
      instance.initialize();
      instance.should.be.an.instanceof(SummaryDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', (done) => {
      let instance = new SummaryDatasource({ dir: exampleDir });
      instance.initialize();
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A SummaryDatasource instance for an example summary dir', () => {
    let datasource;
    function getDatasource() { return datasource; }
    before((done) => {
      datasource = new SummaryDatasource({ dataFactory, dir: exampleDir });
      datasource.initialize();
      datasource.on('summaryAdded', done);
    });
    after((done) => {
      datasource.close(done);
    });

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      173, 173);

    itShouldExecute(getDatasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, 173);

    itShouldExecute(getDatasource,
      'the empty query with an offset',
      { offset: 10, features: { triplePattern: true, offset: true } },
      163, 173);

    itShouldExecute(getDatasource,
      'a query for existing capabilities',
      { predicate: dataFactory.namedNode('http://semweb.mmlab.be/ns/summaries#capability'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 18);

    itShouldExecute(getDatasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for sources of non-existing subject',
      { subject: dataFactory.namedNode('http://data.bibliotheken.nl'), predicate: dataFactory.namedNode('http://purl.org/dc/terms/isPartOf'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
        'a query for sources of existing subject',
        { subject: dataFactory.namedNode('http://schema.org/Book'), predicate: dataFactory.namedNode('http://purl.org/dc/terms/isPartOf'), limit: 10, features: { triplePattern: true, limit: true } },
        0, 0);
  
  });
  
});

function itShouldExecute(getDatasource, name, query,
  expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount, triples = [];
    before((done) => {
      let result = getDatasource().select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; expectedTriples && triples.push(triple); });
      result.on('end', done);
    });

    it('should return the expected number of triples', () => {
      expect(resultsCount).to.equal(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).to.equal(expectedTotalCount);
    });

    if (expectedTriples) {
      it('should emit the expected triples', () => {
        expect(triples.length).to.equal(expectedTriples.length);
        for (let i = 0; i < expectedTriples.length; i++)
          triples[i].should.deep.equal(RdfString.stringQuadToQuad(expectedTriples[i], dataFactory));
      });
    }
  });
}