define(['dojo/_base/declare',
        'jimu/BaseWidget',
        'dijit/_WidgetsInTemplateMixin',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/on',
        'dojo/dom',
    
        'esri/layers/FeatureLayer',
        'esri/tasks/query',
        'esri/tasks/QueryTask',
        'esri/geometry/Extent',
        
        'jimu/LayerInfos/LayerInfos',
        './WeatherUtil',
        'dojo/i18n!./nls/strings'
  
],
function(declare, BaseWidget, _WidgetsInTemplateMixin, array, lang, on, dom,
         FeatureLayer, Query, QueryTask, Extent, LayerInfos, utils, strings) {
  //To create a widget, you need to derive from BaseWidget.
     return declare([BaseWidget, _WidgetsInTemplateMixin], {

        // Custom widget code goes here

         baseClass: 'weather-station-widget',
        // this property is set by the framework when widget is loaded.
        // name: 'WeatherStationWidget',
        // add additional properties here
             //
         _latestRecord: {},

        //methods to communication with app container:
         postCreate: function() {
              this.inherited(arguments);
              this.setFeatureLayer();
              this._outFields = this._fieldArray();
              this.own(on(this._stationLayer, "selection-complete", lang.hitch(this,this.queryStationInfo)));
              this.own(on(this.map, "click", lang.hitch(this, this.selectStation)));
          },

         startup: function() {
              this.inherited(arguments);
          },

        // onOpen: function(){
        //   console.log('WeatherStationWidget::onOpen');
        // },

        // onClose: function(){
        //   console.log('WeatherStationWidget::onClose');
        // },

        // onMinimize: function(){
        //   console.log('WeatherStationWidget::onMinimize');
        // },

        // onMaximize: function(){
        //   console.log('WeatherStationWidget::onMaximize');
        // },

        // onSignIn: function(credential){
        //   console.log('WeatherStationWidget::onSignIn', credential);
        // },

        // onSignOut: function(){
        //   console.log('WeatherStationWidget::onSignOut');
        // }

        // onPositionChange: function(){
        //   console.log('WeatherStationWidget::onPositionChange');
        // },

        // resize: function(){
        //   console.log('WeatherStationWidget::resize');
        // }

        //methods to communication between widgets:
         setFeatureLayer: function() {
              LayerInfos.getInstance(this.map,this.map.itemInfo).then(lang.hitch(this,function (layerInfosObject){
                  var layerInfos = layerInfosObject.getLayerInfoArray();
                  var layerName = this.config.stationLayer.toUpperCase();
                  for(var i =0; i<layerInfos.length;i++) {
                      if(layerInfos[i].title.toUpperCase() ===layerName) {
                          layerInfos[i].getLayerObject().then(lang.hitch(this, function (layer){
                              this._stationLayer = layer;
                          }));
                      }
                  }
              }));
          },

         _fieldArray: function() {
             var fields = [];
             fields.push(this.config.station_id);
             fields.push(this.config.date_epoch);
             fields.push(this.config.barometer);
             fields.push(this.config.pressure);
             fields.push(this.config.altimeter);
             fields.push(this.config.outTemp);
             fields.push(this.config.outHumidity);
             fields.push(this.config.windSpeed);
             fields.push(this.config.windDir);
             fields.push(this.config.windGust);
             fields.push(this.config.windGustDir);
             fields.push(this.config.rainRate);
             fields.push(this.config.rain);
             fields.push(this.config.dewPoint);
             fields.push(this.config.windChill);
             fields.push(this.config.heatIndex);
             return fields;
         },


         selectStation: function (evt) {
              var selectionQuery = new Query();
              var tolerance = this.map.extent.getWidth()/this.map.width * 5;
              var x = evt.mapPoint.x;
              var y = evt.mapPoint.y;
              selectionQuery.geometry = new Extent(x-tolerance,y-tolerance,x+tolerance,y+tolerance,evt.mapPoint.spatialReference);
              this._stationLayer.selectFeatures(selectionQuery,FeatureLayer.SELECTON_NEW)
          },

         queryStationInfo: function (evt) {
             if (evt.features.length > 0) {
                 console.log(evt);
                 var stationId = evt.features[0].attributes[this.config.station_id.toUpperCase()];
                 console.log(stationId);
                 if (stationId != null) {
                     var where = this.config.station_id + "=" + stationId + " AND " +
                         this.config.date_epoch + ">=" + this.getUnixEpochSinceMidnight();
                     var orderBy = [this.config.date_epoch + " DESC "];
                     utils.sendQueryTable(this.config.weatherDataService,
                         where,
                         this._outFields,
                         orderBy,
                         this,
                         this.processQueryResults);
                 }
             } else {
                this.resetUI();
             }
         },

         processQueryResults: function (response) {
             if(response == null) return;
             if(response.features == null) return;
             if(response.features.length > 0) {
               this._latestRecord = response.features[0].attributes;
               this.sortRows(response.features, this.config.outTemp);

               var low = response.features[0].attributes[this.config.outTemp];
               var rownum = 0;
               while(low == null && rownum < response.features.length) {
                 low = response.features[rownum].attributes[this.config.outTemp];
                 rownum++;
               }
               this._latestRecord.low = low;

               var lastIndex = response.features.length -1;
               this._latestRecord.high = response.features[lastIndex].attributes[this.config.outTemp];
               this._latestRecord.updateTime = this.lastUpdatedTime(this._latestRecord[this.config.date_epoch]);
               this.updateWidgetUI();
             }
         },

         getUnixEpochSinceMidnight: function() {
             var today = new Date();
             var midNight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0,0,0);
             var epoch = midNight.getTime();
             return Math.round(epoch/1000);
         },

         sortRows: function (rows, columnName) {
             rows.sort(function(a, b) {
                 var valueA = a.attributes[columnName] ? a.attributes[columnName] : 0;
                 var valueB = b.attributes[columnName] ? b.attributes[columnName] : 0;

                 if (valueA < valueB) {
                     return -1;
                 } else if (valueA > valueB) {
                     return 1;
                 } else {
                     return 0;
                 }
             });
         },

         lastUpdatedTime: function (prevTime) {
             var currentTime = new Date(),
                 diff = {};
             diff.milliseconds = currentTime % prevTime;
             diff.seconds = diff.milliseconds / 1000;
             diff.minutes = diff.seconds / 60;
             diff.hours = diff.minutes / 60;
             diff.days = diff.hours / 24;
             diff.weeks = diff.days / 7;

             if (diff.minutes < 60) {
                 return "Station last updated " + Math.round(diff.minutes) + " minutes ago."
             } else if (diff.minutes > 60 && diff.hours < 24) {
                 return "Station last updated " + Math.round(diff.hours) + " hours ago."
             } else if (diff.hours > 24 && diff.days < 7) {
                 return "Station last updated " + Math.round(diff.days) + " days ago."
             } else {
                 return "Station last updated over a week ago."
             }

         },

         updateWidgetUI: function () {
             console.log(this._latestRecord);
            if (this._latestRecord != null) {
                dom.byId("station").innerHTML = this._latestRecord[this.config.station_id];
                dom.byId("currTemp").innerHTML = Math.round(utils.convertToCelcius(this._latestRecord[this.config.outTemp]));
                dom.byId("currWind").innerHTML = utils.formatWindSpeed(this._latestRecord[this.config.windSpeed]) + " " +
                    utils.formatDir(this._latestRecord[this.config.windDir]);
                dom.byId("currHumidity").innerHTML = Math.round(this._latestRecord[this.config.outHumidity]) + "%";
                dom.byId("highTemp").innerHTML = utils.convertToCelcius(this._latestRecord.high);
                dom.byId("lowTemp").innerHTML = utils.convertToCelcius(this._latestRecord.low);
                dom.byId("rainRate").innerHTML = this._latestRecord.rainRate;
                dom.byId("time").innerHTML = new Date();
                dom.byId("lastUpdate").innerHTML = this._latestRecord.updateTime;
            }
         },

         resetUI: function () {
             dom.byId("station").innerHTML = strings.station;
             dom.byId("currTemp").innerHTML = strings.temperature;
             dom.byId("currWind").innerHTML = strings.wind;
             dom.byId("currHumidity").innerHTML = strings.humidity;
             dom.byId("highTemp").innerHTML = strings.high;
             dom.byId("lowTemp").innerHTML = strings.low;
             dom.byId("rainRate").innerHTML = strings.rainfall;
         }




  });

});
