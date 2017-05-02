define(['dojo/_base/declare',
  "dojo/_base/lang", "dojo/on",
  "esri/tasks/StatisticDefinition",
  "dojo/store/Observable", "dojo/store/Memory",
  "dojox/charting/StoreSeries", "dojox/charting/widget/Legend",
  "dojo/ready", "./util", "./WeatherChart"],
  function(declare, lang, on, StatisticDefinition, ObservableStore, MemoryStore, StoreSeries, Legend, ready, util, WeatherChart) {
    return declare([WeatherChart], {
      constructor: function(divId, args) {
        this.set("divId", divId);
        lang.mixin(this, args);
        this.series = 3;
      },

      startup: function() {
        this.inherited(arguments);
      },

      _addStatGroup: function(field, type, stat_array) {
        stat_array.push(util.createStatsDef("max", field, "high_" + type));
        stat_array.push(util.createStatsDef("avg", field, "avg_" + type));
        stat_array.push(util.createStatsDef("min", field, "low_" + type));
      },

      loadData: function(station_id, type) {
        this.currentSeries = type;
        this.station_id = station_id;

        var today = new Date();
        var daysPassed = (today.getTime()/1000) - (86400 * this.days);
        var where = this.station_id_field + "=" + this.station_id + " and " + this.epoch + ">=" + daysPassed;
        var stats = [];
        this._addStatGroup(this.temperature, "temperature", stats);
        this._addStatGroup(this.barometer, "barometer", stats);
        this._addStatGroup(this.dewPoint, "dewPoint", stats);
        this._addStatGroup(this.windChill, "windChill", stats);
        this._addStatGroup(this.heatIndex, "heatIndex", stats);
        this._addStatGroup(this.windSpeed, "windSpeed", stats);

        return util.sendQueryStats(this.weatherService, where, stats, [this.epoch], this, this.setChartData);
      },

      initializeSeries: function(type) {
        var fieldName = "high_" + type;
        this.chart.addSeries("High", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));

        var fieldName = "avg_" + type;
        this.chart.addSeries("Average", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));

        var fieldName = "low_" + type;
        this.chart.addSeries("Low", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));
      },

      changeSeries: function(type) {
        util.log("changeSeries", arguments)

        var fieldName = "high_" + type;
        this.chart.addSeries("High", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));

        var fieldName = "avg_" + type
        this.chart.addSeries("Average", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));

        var fieldName = "low_" + type;
        this.chart.addSeries("Low", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));

        this.currentSeries = type;
        this.chart.render();
        this.inherited(arguments);
      },

      setChartData: function(result) {
        var rows = result.features;
        var fields = this.displayFieldArray();

        var data = [];

        var item = {};
        var field, atts, value, rowTime;
        var currentRow = 0;
        for(var i=0; i<rows.length; i++) {
          item = {}
          atts = rows[i].attributes;
          rowTime = new Date(atts[this.epoch] * 1000);
          currentRow++;
          item["id"] = (currentRow);
          item["time"] = rowTime;

          for(var x=0; x<fields.length; x++) {
            field = fields[x];
            value = atts[field.name];
            if(value != null){
              item[field["name"]] = this.convertValue(value, field.convert);
            } else {
              item[field["name"]] == -999999;
            }
          }
          data.push(item);
        }

        this.chartDataStore = new ObservableStore(new MemoryStore({
          data: {
            identifier: "id",
            items: data
          }
        }));

        if(this.chart.series.length == 3) {
          this.changeSeries(this.currentSeries);
        } else {
          this.initializeSeries(this.currentSeries);
        }

        this.initialized = true;

        this.chart.resize(this.width, this.height);
        this.chart.render();

        if(this.legend == null){
          this.legend = new Legend({chartRef: this.chart}, this.legendDivId);
        }
      },

      fieldArray: function() {
        var fields = [];
        fields.push(this.station_id);
        fields.push(this.epoch);
        fields.push(this.barometer);
        fields.push(this.pressure);
        fields.push(this.temperature);
        fields.push(this.humidity);
        fields.push(this.windSpeed);
        fields.push(this.dewPoint);
        fields.push(this.windChill);
        fields.push(this.heatIndex);
        return fields;
      },

      displayFieldArray: function(){
        var fields = [];
        fields.push({name: "high_windSpeed", convert: "m_per_sec"});
        fields.push({name: "low_windSpeed", convert: "m_per_sec"});
        fields.push({name: "avg_windSpeed", convert: "m_per_sec"});
        fields.push({name: "high_heatIndex", convert: "celcius"});
        fields.push({name: "avg_heatIndex", convert: "celcius"});
        fields.push({name: "low_heatIndex", convert: "celcius"});
        fields.push({name: "high_windChill", convert: "celcius"});
        fields.push({name: "low_windChill", convert: "celcius"});
        fields.push({name: "avg_windChill", convert: "celcius"});
        fields.push({name: "high_dewPoint", convert: "celcius"});
        fields.push({name: "low_dewPoint", convert: "celcius"});
        fields.push({name: "avg_dewPoint", convert: "celcius"});
        fields.push({name: "high_temperature", convert: "celcius"});
        fields.push({name: "low_temperature", convert: "celcius"});
        fields.push({name: "avg_temperature", convert: "celcius"});
        fields.push({name: "high_barometer", convert: "milliBar"});
        fields.push({name: "low_barometer", convert: "milliBar"});
        fields.push({name: "avg_barometer", convert: "milliBar"});
        return fields;
      },

      displayTime: function(n) {
        var row = this.chartDataStore.get(n);
        if(row == null) return;

        var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

        var dd = row.time.getDate();
        var mm = months[row.time.getMonth()]; //January is 0!
        var yyyy = row.time.getFullYear();

        if(dd<10) dd='0'+dd;
        if(mm<10) mm='0'+mm;

        return dd + "-" + mm + "-" + yyyy;
      }
    });
  });

