# Linked Data Fragments Server - Summary Datasources
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fdatasource-summary.svg)](https://www.npmjs.com/package/@ldf/datasource-summary)

This module contains a Summary datasource for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
It allows summary files to be loaded, indexed and used as a datasource.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the following config entries:
* `SummaryDatasource`: A Summary datasource that requires a `dir` field. _Should be used as `@type` value._

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:register",
      "@type": "SummaryDatasource",
      "datasourceTitle": "Summary register for source selection",
      "description": "My dataset with a Summaries back-end",
      "dir": "/received-summaries"
    }
  ]
}
```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-summary.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-summary/^3.0.0/components/context.jsonld",
  ],
  // Same as above...
}
```

## License
The Summary datasource module  is written by Miel Vander Sande.

The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [meemoo](http://meemoo.be/) and IDLab - Ghent University,
and released under the [MIT license](http://opensource.org/licenses/MIT).
