define(['dojo/_base/declare', 'jimu/BaseWidget',
  'dijit/_WidgetsInTemplateMixin',
  "dijit/form/Select", "dojo/ready",
  "dojo/dom", "dojo/dom-attr",
  "dojo/_base/array", "dojo/_base/lang", "dojo/on",
  "jimu/LayerInfos/LayerInfos",
  "jimu/LayerInfos/LayerInfo",
  "esri/tasks/StatisticDefinition", "esri/tasks/query",
  "esri/layers/FeatureLayer", "esri/geometry/Extent",
  "./js/util", "./js/CurrentChart", "./js/SummaryChart"],
function(declare, BaseWidget, _WidgetsInTemplateMixin,
         Select, ready,
         dom, domAttr, array, lang, on,
         LayerInfos, LayerInfo,
         StatisticDefinition, Query,
         FeatureLayer, Extent,
         util, CurrentChart, SummaryChart) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget, _WidgetsInTemplateMixin], {
    // Custom widget code goes here 
	
    baseClass: 'jimu-weatherchart-widget',

    startup: function() {
      this.inherited(arguments);
      this._charts = [];
      this._handles = [];

      ready(lang.hitch(this, function(){
        this._handles.push(on(dom.byId("chartType"), "change",
          lang.hitch(this, function(evt){this.onSeriesClick(evt);})));

        this._handles.push(on(dom.byId("timeRange"), "change",
          lang.hitch(this, function(evt){this.onTimeClick(evt);})));

        this.getStationLayer();
        this._handles.push(on(this.map, "click", lang.hitch(this, this.mapClick)));

        this.createChart("chart_1", "Current", this.config.date_epoch, 1, "days_1");
        this.createChart("chart_30", "Summary", this.config.day_epoch, 30, "days_30");
        this.createChart("chart_90", "Summary", this.config.day_epoch, 90, "days_90");

      }));
    },

    resize: function(){
      this.inherited(arguments);

      var dialogHeight = this.domNode.parentNode.offsetHeight;
      var nodeHeight = dialogHeight - 40;
      this.domNode.style.height = nodeHeight + "px";

      var node = dom.byId("weather_charts");
      var h = nodeHeight - node.offsetTop;
      var w = node.offsetWidth - 25;
      h = h > 275 ? h : 275;
      node.style.height = h + "px";

      var keys = Object.keys(this._charts);
      for(var i=0; i<keys.length; i++) {
        this._charts[keys[i]].resizeChart(w, h);
      }
    },

    createChart: function(chartName, type, epoch, days, divId) {

      var args = {
        temperature: this.config.outTemp,
        barometer: this.config.barometer,
        dewPoint: this.config.dewPoint,
        windChill: this.config.windChill,
        heatIndex: this.config.heatIndex,
        windSpeed: this.config.windSpeed,
        pressure: this.config.pressure,
        humidity: this.config.outHumidity,
        epoch: epoch,
        weatherService: this.config.weatherService,
        station_id_field: this.config.station_id, days: days
      };

      var chart;
      if(type == "Current") {
        chart = new CurrentChart(divId, args);
        chart.startup();
      } else {
        chart = new SummaryChart(divId, args);
        chart.startup();
      }

      chart.set("visible", false);
      this._charts[chartName] = chart;
    },

    lastUpdatedTime: function (prevTime) {
      var currentTime = new Date();
      var diff = {};
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

    //custom event handler
    onSeriesClick: function(evt) {
      if(this._station_id == null) return;
      var chart = this._charts[this._activeChart];
      this.setChartSeries(chart);
    },

    setChartSeries: function(chart) {
      if(this._station_id == null) return;
      if (chart == null) return;
      chart.changeSeries(this.getSelectedValue("chartType"));
    },

    getSelectedValue: function(selectId) {
      var select = dom.byId(selectId);
      return select.options[select.selectedIndex].value;
    },

    //custom event handler
    onTimeClick: function(evt) {
      if(this._station_id == null) return;
      var prevChart = this._charts[this._activeChart];
      if (prevChart != null) prevChart.set("visible", false);

      var value = this.getSelectedValue("timeRange");
      this._activeChart = "chart_" + value;
      var chart = this._charts[this._activeChart];
      if(chart.isInitialized()) {
        chart.set("visible", true);
        this.setChartSeries(chart);
      } else {
        this.loadStationData("chart_" + value, this._station_id, this.getSelectedValue("chartType"));
      }
    },

    getStationLayer: function() {
      LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this,
        function(layerInfosObject) {
          var layerInfos = layerInfosObject.getLayerInfoArray();
          var layerName = this.config.stationLayer.toUpperCase();
          for(var i=0; i< layerInfos.length; i++) {
            if(layerInfos[i].title.toUpperCase() == layerName) {
              layerInfos[i].getLayerObject().then(lang.hitch(this, function(layer){
                this._stationLayer = layer;
              }));
            }
          }
        })
      );
    },
    
    mapClick: function(evt) {
      var query = new Query();
      var tolerance = this.map.extent.getWidth()/this.map.width * 5;
      var x = evt.mapPoint.x;
      var y = evt.mapPoint.y;
      query.geometry = new Extent(x-tolerance,y-tolerance,x+tolerance,y+tolerance,evt.mapPoint.spatialReference);
      this._stationLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, lang.hitch(this, this.selectStation));
    },

    selectStation: function(evt){
      if(this._isOpen && evt.length > 0) {
        this.prepareStationInfo(evt[0]);
      } else {
        this.clear();
      }

    },

    //custom methods
    prepareStationInfo: function(g) {
      this._station_id = g.attributes["STATION_ID"];
      var where = this.config.station_id + "=" + this._station_id;
      var stats = util.createStatsDef("max", this.config.date_epoch, "last_updated");

      util.sendQueryStats(this.config.weatherService, where, [stats], [this.config.station_id],
        this, function(result){
          dom.byId("chart_station").innerHTML = result.features[0].attributes[this.config.station_id];
          dom.byId("chart_lastUpdate").innerHTML = this.lastUpdatedTime(result.features[0].attributes["last_updated"]);
          this.loadStationData("chart_1", this._station_id, "temperature");
        });
    },
    
    loadStationData: function(chart_name, station_id, type) {
      var chart = this._charts[chart_name];
      this._activeChart = chart_name;
      chart.loadData(station_id, type).then(lang.hitch(this, function(){
        chart.set("visible", true);
      }));
    },

    clear: function() {
      dom.byId("chart_station").innerHTML = this.nls.station;
      dom.byId("chart_lastUpdate").innerHTML = "";
      dom.byId("chartType").value = "temperature";
      dom.byId("timeRange").value = 1;

      var keys = Object.keys(this._charts);
      for(var i=0; i<keys.length; i++){
        this._charts[keys[i]].reset;
        this._charts[keys[i]].set("visible", false);
      }
    },

    onOpen: function(){
      this.inherited(arguments);
      this._isOpen = true;
      this.resize();
    },

    onClose: function(){
      this.inherited(arguments);
      this._isOpen = false;
    },

    onMinimize: function(){
      this.inherited(arguments);
      this._isOpen = false;
    },

    onMaximize: function(){
      this.inherited(arguments);
      this._isOpen = true;
    },

    onActive: function(){
      this.inherited(arguments);
      this._isOpen = true;},

    onDeActive: function(){
      this.inherited(arguments);
      this._isOpen = false;
    },

    destroy: function() {
      for(var i=0; i<this.handlers.length; i++) {
        this.handlers[i].remove();
      }
      this.inherited(arguments);
    }
  });
});
