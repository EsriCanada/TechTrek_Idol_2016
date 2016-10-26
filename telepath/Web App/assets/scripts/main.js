var app; // Set a global app variable

require(
  [

    'esri/Map',
    'esri/Basemap',
    'esri/views/MapView',
    'esri/views/SceneView',
    'esri/Camera',
    'esri/layers/FeatureLayer',
    'esri/layers/SceneLayer',
    'esri/layers/GraphicsLayer',
    'esri/widgets/Popup',
    'esri/PopupTemplate',
    'esri/widgets/Search',
    'esri/widgets/Locate',
    'esri/widgets/BasemapToggle',
    'esri/views/ui/Component',
    'esri/core/watchUtils',
    'esri/core/Scheduler',
    'esri/geometry/Point',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/PointSymbol3D',
    'esri/symbols/ObjectSymbol3DLayer',
    'esri/Graphic',
    'esri/geometry/geometryEngine',
    'esri/tasks/QueryTask',
    'esri/tasks/support/Query',
    'esri/renderers/UniqueValueRenderer',
  

    'dojo/query',
    'dojo/keys',
    'dojo/on',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/request',

    'telepath/moment-modal',

    'bootstrap/Collapse',
    'bootstrap/Dropdown',
    'bootstrap/Tab',
    'bootstrap/Tooltip',
    'bootstrap/Modal',

    'calcite-maps',

    'dojo/domReady!'

  ], function(

    Map,
    Basemap,
    MapView,
    SceneView,
    Camera,
    FeatureLayer,
    SceneLayer,
    GraphicsLayer,
    Popup,
    PopupTemplate,
    Search,
    Locate,
    BasemapToggle,
    Component,
    watchUtils,
    Scheduler,
    Point,
    SimpleMarkerSymbol,
    PointSymbol3D,
    ObjectSymbol3DLayer,
    Graphic,
    geometryEngine,
    QueryTask,
    esriQuery,
    UniqueValueRenderer,
     

    query,
    keys,
    on,
    dom,
    domConstruct,
     request,

    MomentModal

  ) {

    // 'use strict';

    /*********************
     * App configuration *
     *********************/

    app = {

      lonlat: [-80.1049270629856, 44.27303823012672],
      scale: 144447,
      heading: 0,
      tilt: 40,
      map: null,
      mapView: null,
      sceneView: null,
      activeView: null,
      viewPadding: {
          top: 0
      },
      layer: null,
      layerUrl: 'http://services.arcgis.com/hNP0AsFlTAoVqfxx/arcgis/rest/services/path/FeatureServer/0',
      momentsUrl:'http://services.arcgis.com/hNP0AsFlTAoVqfxx/arcgis/rest/services/Moments/FeatureServer/0',
      momentsCount:0,
      moments: null,
      currentMoment: 0,
      currentMID: 0, // stores index
      momentGraphics: null,
      momentSymbolColors:['#00cf00','#ff3c28','#e9d200','#ce24eb','#ff8e00'],
      moments2D: null,
      moments3D: null,
      momentTypes: [
        'start',
        'end',
        'text',
        'photo',
        'video'
      ],
      basemap: 'satellite',
      ground: 'world-elevation',
      pathID: null,
      searchWidgetNav: null,
      searchWidgetPanel: null,
      pathGeometry: [],
      segmentIndex: 0,
      pathDistance: 0,
      pointSymbol2d: null,
      pointSymbolSize2d: 20,
      pointSymbol3d: null,
      pointSymbolSize3d: 60, // meters
      pointSymbolColorHex: '#2F93EC',
      popupOptions: {
        autoPanEnabled: true,
        messageEnabled: false,
        spinnerEnabled: false,
        dockOptions: {
          buttonEnabled: true,
          breakpoint: false,
          position: 'bottom'
        }
      },
      task: null,
      animating: false,
      animatingScale: 10000,
      animatingTilt: 40,
      animatingHeading: 0,
      index: 0,
      IDVars: {
        path: 'PathID',
        user: 'UserID',
        segment: 'segmentID'
      }
    };

    /*************
     * Functions *
     *************/

    function init() {

      app.pathID = getURLParameter(app.IDVars.path);
      request("pathinfo.json", {handleAs: "json"}).then(function(response){
        console.log(response.paths[app.pathID]);
        var pathInfo = response.paths[app.pathID];
        if(pathInfo === undefined){
          pathInfo = {};
          pathInfo.name = "New path";
          pathInfo.subtitle = "";
          pathInfo.description = "";
        }
        document.title = pathInfo.name;
        query(".navbar-main-title")[0].innerHTML = pathInfo.name;
        query(".navbar-sub-title")[0].innerHTML = pathInfo.subtitle;
        query(".path-desc")[0].innerHTML = pathInfo.description;
      });
      
      // Map
      app.map = new Map({
        basemap: app.basemap,
        ground: app.ground
      });
      // FeatureLayer
      app.layer = createLayer(app.layerUrl);
      app.map.add(app.layer);

      // Symbols
      app.pointSymbol2d = createPointSymbol2d();
      app.pointSymbol3d = createPointSymbol3d();
      // Map
      app.mapView = createView('MapView', 'mapViewDiv');
      app.sceneView = createView('SceneView', 'sceneViewDiv');
      app.activeView = app.mapView;
      // Get path
      app.activeView.whenLayerView(app.layer).then(function(layerView) {
        layerView._controller.graphics.on('change', function(ev) {
          if (ev.added.length) {
            ev.added.forEach(createDensifiedLine);
          }
        });
      });

      // Moments
     app.moments2D = new UniqueValueRenderer({
       field: 'Medium',
       defaultSymbol: createMomentSymbol2d(3)
     });
     app.moments3D = new UniqueValueRenderer({
       field: 'Medium',
       defaultSymbol: createMomentSymbol3d(3)
     });
     for (var i = 0; i < app.momentTypes.length; i++) {
       app.moments2D.addUniqueValueInfo(i, createMomentSymbol2d(i));
       app.moments3D.addUniqueValueInfo(i, createMomentSymbol3d(i));
     }
     app.momentGraphics = new GraphicsLayer({
       renderer: app.moments2D
     });
     app.map.add(app.momentGraphics);
     queryMoments(app.momentsUrl);

     // Create widgets
     createWidgets();
     // Register event listeners
     registerListeners();
     // Set timeline height
     timelineHeight();

    }

    function timelineHeight() {

      // window - top/bottom inset - locate/zoom widgets - spacing
      dom.byId('timelineDiv').style.height = window.innerHeight - 45 - 160 - 40 + 'px';
      window.addEventListener('resize', timelineHeight);

    }

    // get all of the moments for the path
    function queryMoments(url) {

      //console.log('query');
      var qTask = new QueryTask({url:url});
      var params = new esriQuery({
        returnGeometry: true,
        outFields:['*'],
        orderByFields:['OBJECTID']
      });
      params.where = 'pathID = ' + app.pathID;
      //console.log(params);
      qTask.execute(params).then(buildTimeline).otherwise(promiseRejected);

    }

    // draw the timeline
    function buildTimeline(moments) {
      

      //console.log('timeline');
      app.moments = moments.features;
      app.momentsCount = app.moments.length;
      //console.log(app.momentsCount);

      if(app.pathID < 1000){
        //console.log("not creemore", app.activeView.map, app.moments[0]);
        app.activeView.goTo(app.moments[0].geometry);
      }
      
      var timeline = dom.byId('timelineDiv');
      var section = 100 / (app.momentsCount - 1);
      //console.log(section);

      /*  var mPopOpts = {
          title: "{Medium}",
          content: [{
            type:"fields",
            fieldInfos:[{
              fieldName: "Description",
              visible: true
            }]
          }]
        };
      var mPop = new PopupTemplate(mPopOpts);*/
      // create points on timeline and graphics on map
      for (var i = 0; i < app.momentsCount; i++) {
        //console.log(app.moments[i]);
        var m = constructMoment(app.moments[i], i, i * section - 2 + '%');
        domConstruct.place(m,timeline);
        var n = new Graphic({
          geometry: app.moments[i].geometry,
          attributes: app.moments[i].attributes
        });
        //console.log(n);
        app.momentGraphics.graphics.add(n);
      }


    }

    // (moment query failed)
    function promiseRejected(err) {

      console.error('Promise rejected: ', err.message);

    }

    // construct moment element
    function constructMoment(moment, i, top) {

      var n = domConstruct.create('img', {
          innerHTML: '',
          className: 'moment loaded',
          style: { top: top},
          momentID: moment.attributes.OBJECTID,
          momentIndex: i,
          id: 'moment_'+i
        });
      if (moment.attributes.Medium === 0) n.classList.add('start');
      if (moment.attributes.Medium === 1) n.classList.add('end');
      if (moment.attributes.Medium > 1) {
        n.addEventListener('mouseover', function() {
          toggleMomentClass(this, 1);
        });
        n.addEventListener('mouseout', function() {
          toggleMomentClass(this, 0);
        });
      }

      //n.addEventListener('click', clickMoment);
      return n;

    }

    // change the symbology for the moments on the timeline
    function toggleMomentClass(el, status) {

      // console.log(el, status);
      switch(status) {
        case 0: // mouseout, before click
          el.classList.remove('over');
          break;
        case 1: // mouseover, before click
          el.classList.add('over');
          break;
        case 2: // click
          el.classList.add('current');
          break;
        case 3: // past
          el.classList.add('past');
          break;
        case 4: // reset
          el.classList.remove('over');
          el.classList.remove('past');
          el.classList.remove('current');
          el.classList.remove('next');
          break;
        case 5: // next
          el.classList.add('next');
          el.classList.add('over');
      }

    }

    function clickMoment(evt) {

      app.currentMID = evt.srcElement.attributes.momentIndex.value;

      var momentEls = document.getElementsByClassName('moment');
      for (var i = 0; i< app.momentsCount; i++) {
        toggleMomentClass(momentEls[i], 4);
        if (i == app.currentMID) {
          toggleMomentClass(evt.srcElement, 2);
          continue;
        }
        if (i < app.currentMID) {
          toggleMomentClass(momentEls[i], 3);
        }


        console.log(app.currentMID, app.moments[app.currentMID].attributes);
      }
    }


   function getURLParameter(name) {

     return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(window.location.search) || [,""])[1].replace(/\+/g, '%20')) || null;

   }

    function createLayer(url) {

      var lyr = new FeatureLayer({
        url: url,
        opacity: 0.75,
        outFields: ['*'],
        definitionExpression: app.IDVars.path + ' = ' + app.pathID //,
        // returnM: true // BREAKS APP!!!
      });

      // TODO - popup
      return lyr;

    }

    function createPointSymbol2d() {

      var sym = new SimpleMarkerSymbol({
        size: app.pointSymbolSize2d,
        color: app.pointSymbolColorHex,
        outline: {
          width: 2,
          color: '#fff'
        }
      });

      return sym;

    }
    function createMomentSymbol2d(type) {

      var sym = new SimpleMarkerSymbol({
        size: app.pointSymbolSize2d,
        color: app.momentSymbolColors[type],
        outline: {
          width: 1,
          color: '#fff'
        }
      });

      return sym;

    }

    function createPointSymbol3d() {

      var sym = new PointSymbol3D({
        symbolLayers: [new ObjectSymbol3DLayer({
          width: app.pointSymbolSize3d,
          height: app.pointSymbolSize3d,
          resource: {
            primitive: 'sphere'
          },
          material: {
            color: app.pointSymbolColorHex
          }
        })]
      });

      return sym;

    }
    function createMomentSymbol3d(type) {

      var sym = new PointSymbol3D({
        symbolLayers: [new ObjectSymbol3DLayer({
          width: app.pointSymbolSize3d,
          height: app.pointSymbolSize3d,
          resource: {
            primitive: 'diamond'
          },
          material: {
            color: app.momentSymbolColors[type]
          }
        })]
      });

      return sym;

    }


    function createView(viewType, div) {

      var view;

      if (viewType === 'MapView') {
        view = new MapView();
      } else {
        view = new SceneView();
      }

      view.set({
        container: div,
        map: app.map,
        center: app.lonlat,
        scale: app.scale,
        padding: app.viewPadding,
        ui: {
          components: ['zoom', 'compass', 'attribution']
        },
        popup: new Popup(app.popupOptions),
        camera: new Camera({
          tilt: app.tilt
        })
      });

      view.on('click', function(event) {
        view.hitTest(event.screenPoint).then(function(response) {
          var result = response.results[0];
            if (result && result.graphic) {
              console.log(result.graphic);
              return result.graphic;
          }
        });
      });

      return view;

    }

    function createDensifiedLine(segment) {

      var geometry = segment.geometry;
      var geomDensify = geometryEngine.geodesicDensify(geometry, 100, 'meters');

      app.pathGeometry.push(geomDensify);

    }

    function createWidgets() {

      // Search
      app.searchWidgetNav = createSearchWidget('searchNavDiv');
      app.searchWidgetPanel = createSearchWidget('searchPanelDiv');
      // Locate
      // createLocateWidget(app.mapView, 'bottom-left');
      // createLocateWidget(app.sceneView, 'bottom-left');
      // BasemapToggle
      createBasemapWidget(app.mapView, 'bottom-right');
      createBasemapWidget(app.sceneView, 'bottom-right');

    }


    // Register event listeners

    function registerListeners() {

      query('.play').on('click', function() {
        if (!app.animating) {
          start();
        } else {
          stop();
        }
      });

      query('#stop').on('click', function() {
        reset();
      });

      query('.wide-btn').on('click', function() {
        document.querySelector('.panel-about').classList.add('panel-hidden');
      });

      query('nav li a[data-toggle="tab"]').on('click', function(e) {
        // Sync views
        if (e.target.text === '2D') {
          app.activeView = app.mapView;
          syncViews(app.sceneView, app.mapView);
          app.momentGraphics.renderer = app.moments2D;
        } else {
          app.activeView = app.sceneView;
          syncViews(app.mapView, app.sceneView);
          app.momentGraphics.renderer = app.moments3D;
        }
        // Set search
        app.searchWidgetNav.viewModel.view = app.activeView;
        app.searchWidgetPanel.viewModel.view = app.activeView;
      });

    }

    function createSearchWidget(parentId) {

      var search = new Search({
        viewModel: {
            view: app.activeView,
            enableHighlight: false
        }
        }, parentId);
      search.startup();

      return search;

    }

    function createLocateWidget(view, position) {

      var locate = new Locate({
        viewModel: {
          view: view
        }
      });
      view.ui.add(locate, position);

    }

    function createBasemapWidget(view, position) {

      var basemapToggle = new BasemapToggle({
        viewModel: {
          view: view,
          secondaryBasemap: 'streets'
        }
      });
      view.ui.add(basemapToggle, position);

    }

    // Start animation and update UI

    function start() {
      //console.log("start", app.currentMID);
      if(app.currentMID == app.momentsCount - 1){
        //console.log("reset");
        app.currentMID = 0;
        for (var i = 0; i< app.momentsCount; i++) {
          toggleMomentClass(document.getElementById("moment_"+i), 4);
        }

      }

      // toggleMomentClass(document.getElementById("moment_"+app.currentMID),2);
      var animationPromise = navigate(getPoint(app.index), app.animatingScale, app.animatingTilt, app.animatingHeading);
      animationPromise.then(function(e) {
        if (e.state === 'stopped' || e.state === 'finished') {
          console.log(e.state, app.currentMID);
          if(app.currentMID != 0){
            toggleMomentClass(document.getElementById("moment_"+app.currentMID),4);
            toggleMomentClass(document.getElementById("moment_"+app.currentMID),3);
          }
          toggleMomentClass(document.getElementById("moment_"+(app.currentMID+1)),5);

          setTimeout(function() {
            animatePath(true);  // hack
            setPlayUI(true);
          }, 50);
        }
      });

    }

    // Stop animation and update UI

    function stop() {

      animatePath(false);
      setPlayUI(false);

    }

    // Move graphic at max screen frame rate

    function animatePath(animate) {

      if (app.task) {
        app.task.remove();
      }
      if (animate) {
        app.task = Scheduler.addFrameTask({
          update: function() {
              // Navigate
              if (app.index !== app.pathGeometry[app.segmentIndex].paths[0].length) {
                var point = getPoint(app.index);
                navigate(point, app.animatingScale, app.animatingTilt, app.animatingHeading);
                updateGraphic(point);
                updateDistanceUI(point);

              } else {
                toggleMomentClass(document.getElementById("moment_"+(app.currentMID+1)),2);

                if (app.segmentIndex === 0 ) restartPath(false);
                // Switch to next segment in path if not finished
                if (app.segmentIndex < app.pathGeometry.length - 1) {
                  //console.log("next");
                  app.segmentIndex++;
                  app.currentMoment = app.moments[app.segmentIndex];
                  app.currentMID = app.currentMoment.id;
                  // Trigger modal
                  MomentModal.createModalContent(app.currentMoment, app.momentTypes);
                } else {
                  //console.log("restart");

                  app.segmentIndex++;
                  app.currentMoment = app.moments[app.segmentIndex];
                  app.currentMoment.id;
                  app.currentMID = app.currentMoment.id;

                  // Trigger modal
                  MomentModal.createModalContent(app.currentMoment, app.momentTypes);
                  app.pathDistance = 0;
                  app.segmentIndex = 0;
                  restartPath(true);
                }
                app.task.remove();
                app.animating = false;
                app.index = 0;
                setPlayUI(false);
              }
              app.index++;
          }
        });
      }
      app.animating = animate;

    }

    function restartPath(state) {

      var content = state ? 'Restart Path <span class="glyphicon glyphicon-refresh"></span>' : 'Continue <span class="glyphicon glyphicon-play"></span>';

      document.querySelector('.play-modal').innerHTML = content;

    }

    function getPoint(index) {

      var pt = app.pathGeometry[app.segmentIndex].paths[0][index];
      var point = new Point({
        x: pt[0],
        y: pt[1],
        spatialReference: app.activeView.spatialReference
      });

      return point;

    }

    function updateGraphic(point) {

      var sym;
      if (app.activeView instanceof MapView) {
        sym = app.pointSymbol2d;
      } else {
        sym = app.pointSymbol3d;
      }
      var graphic = new Graphic ({
        symbol: sym,
        geometry: point
      });
      app.activeView.graphics.removeAll();
      app.activeView.graphics.add(graphic);

    }

    function navigate(point, scale, tilt, heading) {

      var animationPromise = app.activeView.goTo({
        target: point,
        scale: scale,
        tilt: tilt,
        heading: heading
      });

      return animationPromise;

    }

    function updateDistanceUI(point) {

      if (app.index === 0) {
        return;
      }
      var lastPoint = getPoint(app.index - 1);
      app.pathDistance += geometryEngine.distance(lastPoint, point, 'kilometers');
      // query('.distance-value').innerHTML((Math.round(app.pathDistance * 100) / 100).toFixed(2) + ' kilometres');
      query('.distance').innerHTML((Math.round(app.pathDistance * 100) / 100).toFixed(2) + ' kilometres');

    }

    function setPlayUI(play) {

      if (play) {
        query('.play > span').replaceClass('glyphicon-pause','glyphicon-play');
        //console.log("play", app.currentMID);
      } else {
        query('.play > span').replaceClass('glyphicon-play','glyphicon-pause');
        //console.log("pause", app.currentMID);
      }

    }

    function resetDistanceUI() {

      query('.distance-value').innerHTML('0.0');

    }

    function reset() {

      // Stop
      stop();
      // Buttons
      resetDistanceUI();
      // Default location
      var point = new Point({
        latitude: app.lonlat[1],
        longitude: app.lonlat[0]});
      navigate(point, app.scale, app.tilt, app.heading);
      // Clear
      app.mapView.graphics.removeAll();
      app.sceneView.graphics.removeAll();
      // Reset
      app.pathDistance = 0;
      app.animating = false;
      app.index = 0;

    }

    function syncViews(fromView, toView) {

      var wasAnimating = app.animating,
        currentViewpoint = fromView.viewpoint;
      // Stop processing
      if (wasAnimating) {
        stop();
      }

      function sync() {

        var animationPromise = navigate(getPoint(app.index), app.animatingScale, app.animatingTilt, app.animatingHeading);
        //var animationPromise = navigate(getPoint(app.index), currentViewpoint.scale, app.animatingTilt, currentViewpoint.rotation);
        animationPromise.then(function(e) {
          // Update symbol
          if (fromView.graphics.length > 0) {
            updateGraphic(fromView.graphics.getItemAt(0).geometry);
          }
          // Start animating
          watchUtils.whenFalseOnce(toView, 'updating').then(function(updated) {
            if (wasAnimating) {
              start();
            }
          });
        });

      }

      if (toView.isInstanceOf(SceneView) && (!toView.ready || toView.updating)) {
        watchUtils.whenTrueOnce(toView, 'ready').then(function(isReady) {
          sync();
        });
      } else {
        sync();
      }

    }

    /******************
     * Initialize App *
     ******************/

    init();

  }
);
