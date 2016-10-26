define(['dojo/_base/declare', 'jimu/BaseWidget',
  "dojo/_base/lang", "dojo/on", "dojo/dom",
  "dojox/charting/Chart2D",
  "dojox/charting/themes/PurpleRain",
  "dojox/charting/axis2d/Default",
  "dojox/charting/widget/Legend",
  "dojox/charting/action2d/Tooltip",
  "dojox/charting/action2d/Magnify",
  "dojox/charting/plot2d/Markers",
  "dojo/store/Observable", "dojo/store/Memory",
  "dojox/charting/StoreSeries",
  "./util",
  "dojo/ready"],
  function(declare, BaseWidget, lang, on, dom,
           Chart, theme, Default, Legend,
           Tooltip, Magnify, Markers,
           ObservableStore, MemoryStore, StoreSeries, util) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      chartDataStore: null,
      _initialized: false,
      chart: null,
      chartNode: null,
      legendNode: null,
      visible: false,
      divId: null,
      legendDivId: null,
      subTitle: null,
      currentSeries: null,
      temperature: null,
      barometer: null,
      dewPoint: null,
      windChill: null,
      heatIndex: null,
      windSpeed: null,
      pressure: null,
      humidity: null,
      epoch: null,
      weatherService: null,
      station_id_field: null,
      station_id: null,
      days: null,
      initialized: false,
      width: 300,
      height: 250,

      startup: function() {
        this.chart = new Chart(this.divId);
        this.chart.setTheme(theme);
        this.chart.addPlot("default", {
          type: "Markers",
          tension: 2
        });
        this.chart.addAxis("x", {
          //title: "Time",
          //titleOrientation: "away",
          majorLabels: true,
          rotation: -90,
          majorTickStep: 3,
          minorTicks: false,
          minorLabels: false,
          includeZero: false,
          labelFunc: lang.hitch(this, this.displayTime)
        });

        this.chart.addAxis("y", {
          vertical: true,
          fixLower: "major",
          fixUpper: "major",
          minorTickStep: 1
        });

        var tip = new Tooltip(this.chart, "default");
        var magnify = new Magnify(this.chart, "default");
      },

      resizeChart: function (w, h) {
        this.width = w;
        this.height = h;
        if(this.visible) {
          this.chart.resize(w, h);
          this.chart.render();
        }
      },
      
      convertValue: function(value, convertType) {
        if(convertType == "celcius") {
          return (value-32.0) * (5.0/9.0);
        } else if (convertType == "milliBar") {
          return value * 33.86;
        } else if(convertType == "m_per_sec") {
          return value * 0.44704;
        } else {
          return value;
        }
      },

      changeSeries: function() {
        var node = dom.byId("weather_charts");
        //this.resizeChart(node.offsetWidth-10, node.offsetHeight-10);
      },

      isInitialized: function() {
        return this.initialized;
      },

      reset: function() {
        if(this.chartDataStore) {
          this.chartDataStore.close();
          delete this.chartDataStore;
          this.chartDataStore = null;
        }
        this.initialized = false;
      },

      _setDivIdAttr: function(/*String*/ divId) {
        this._set("divId", divId);
        this._set("legendDivId", divId + "_legend");
        this._set("chartNode", dom.byId(divId));
        util.log("divId", [this.chartNode, this.legendNode]);
      },

      _setVisibleAttr: function(/*Boolean*/ visible){
        this._set("visible", visible);
        var legendDiv = dom.byId(this.legendDivId);
        legendDiv.style.display = visible && this.series > 1 ? "block": "none";
        this.chartNode.style.display = visible ? "block" : "none";
        if(visible && this.chart) this.changeSeries(this.currentSeries);
        this.resizeChart(this.width, this.height);
      },

      destroy: function() {
        this.reset();
        this.chart.destroy();
        this.inherited(arguments);
      }
    });
  });
