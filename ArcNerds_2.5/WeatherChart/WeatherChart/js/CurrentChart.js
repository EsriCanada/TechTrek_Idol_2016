define(['dojo/_base/declare',
  "dojo/_base/lang", "dojo/on",
  "dojo/ready",
  "dojo/store/Observable", "dojo/store/Memory",
  "dojox/charting/StoreSeries", "./util",
  "./WeatherChart"],
  function(declare, lang, on, ready, ObservableStore, MemoryStore, StoreSeries, util, WeatherChart) {
    return declare([WeatherChart], {

      constructor: function(divId, args) {
        this.set("divId", divId);
        lang.mixin(this, args);
        this.series = 1;
      },

      startup: function() {
        this.inherited(arguments);
      },
      
      loadData: function(station_id, type) {
        this.currentSeries = type;
        this.station_id = station_id;

        var today = new Date();
        var last24 = (today.getTime()/1000) - 86400;
        var where = this.epoch + " >= " + Math.round(last24) + " and " +
          this.station_id_field + "=" + this.station_id;

        return util.sendQueryTable(this.weatherService, where, this.fieldArray(), [this.epoch], this, this._setChartData);
      },

      _setChartData: function(result) {
        var rows = result.features;
        var fields = this.displayFieldArray();
        var time_offset = 1200000;

        var data = [];

        var item = {};
        var field, atts, value, rowTime;
        var lastTime = new Date(1970, 1, 1);
        var currentRow = 0;
        for(var i=0; i<rows.length; i++) {
          item = {}

          atts = rows[i].attributes;
          rowTime = new Date(atts[this.epoch] * 1000);

          if(((rowTime - lastTime) >= time_offset) && ((i+1) < rows.length)) {
            lastTime = rowTime;
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
        }

        this.chartDataStore = new ObservableStore(new MemoryStore({
          data: {
            identifier: "id",
            items: data
          }
        }));

        var fieldName = this[this.currentSeries];
        if(this.chart.getSeries("Current")){
          this.chart.updateSeries("Current", new StoreSeries(this.chartDataStore, { query: function(row){
            return row[fieldName] > -999999;
          }}, fieldName));
        } else {
          this.chart.addSeries( "Current", new StoreSeries(this.chartDataStore, { query: function(row){
            return row[fieldName] > -999999;
          }}, fieldName));
        }

        this.chart.render();
        this.initialized = true;

        util.log("chart", [this.chart]);
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
        fields.push({name: this.barometer, convert: "milliBar"});
        fields.push({name: this.pressure, convert: "milliBar"});
        fields.push({name: this.temperature, convert: "celcius"});
        fields.push({name: this.humidity, convert: "milliBar"});
        fields.push({name: this.windSpeed, convert: "m_per_sec"});
        fields.push({name: this.heatIndex, convert: "celcius"});
        fields.push({name: this.dewPoint, convert: "celcius"});
        fields.push({name: this.windChill, convert: "celcius"});
        return fields;
      },


      changeSeries: function(type) {
        var fieldName = this[type];
        util.log("changeSeries", [arguments, this.chartDataStore, fieldName]);

        this.chart.updateSeries("Current", new StoreSeries(this.chartDataStore, { query: function(row){
          return row[fieldName] > -999999;
        }}, fieldName));

        this.currentSeries = type;
        this.chart.render();
        this.inherited(arguments);
      },

      displayTime: function(n) {
        var row = this.chartDataStore.get(n);
        if(row == null) return;

        var hours = row.time.getHours();
        var mins = row.time.getMinutes();

        if(mins < 10)
          mins = "0" + mins;

        if(hours < 10)
          hours = "0" + hours;

        return hours + ":" + mins;
      }
    });
  });

