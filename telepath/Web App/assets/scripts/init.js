(function() {

  'use strict';

  var pathRX = new RegExp(/\/[^\/]+$/),
      locationPath = location.pathname.replace(pathRX, '/'),
      vendorPath = locationPath + 'assets/vendor/',
      scriptsPath = locationPath + 'assets/scripts/';

  require({
    async: true,
    parseOnLoad: false,
    packages: [
      // {
      //   name: 'dgrid',
      //   location: vendorPath + 'dgrid',
      // },
      // {
      //   name: 'dijit',
      //   location: vendorPath + 'dijit',
      // },
      // {
      //   name: 'dojo',
      //   location: vendorPath + 'dojo',
      // },
      // {
      //   name: 'dojox',
      //   location: vendorPath + 'dojox',
      // },
      // {
      //   name: 'dstore',
      //   location: vendorPath + 'dstore',
      // },
      // {
      //   name: 'esri',
      //   location: vendorPath + 'esri',
      // },
      {
        name: 'bootstrap',
        location: vendorPath + 'dojo-bootstrap'
      },
      {
        name: 'calcite-maps',
        location: vendorPath + 'calcite-maps/dist/js/dojo',
        main: 'calcitemaps'
      },
      {
        name: 'telepath',
        location: scriptsPath,
        main: 'main'
      }
    ]
  }, ['telepath']);

}) ();
