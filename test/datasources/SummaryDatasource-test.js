/*! @license MIT ©2014-2016 Miel Vander Sande, meemoo */
let SummaryDatasource = require('../../').datasources.SummaryDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory;

let exampleDir = path.join(__dirname, './');

describe('SummaryDatasource', () => {
  describe('The SummaryDatasource module', () => {
    it('should be a function', () => {
      SummaryDatasource.should.be.a('function');
    });

    it('should be a SummaryDatasource constructor', (done) => {
      let instance = new SummaryDatasource({ dir: exampleDir });
      instance.should.be.an.instanceof(SummaryDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', (done) => {
      let instance = new SummaryDatasource({ dir: exampleDir });
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  
});
