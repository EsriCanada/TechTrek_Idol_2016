/**
 * Created by johnosborne on 2016-05-04.
 */

define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/_base/lang',
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/tasks/StatisticDefinition"
], function(declare, _WidgetBase, lang, Query, QueryTask, StatisticDefinition){
  var _instance = null;
  var weatherUtilClass = declare([_WidgetBase], {

    isDebug: false,

    log: function(groupName, messages) {
      if(!this.isDebug) return;

      console.group(groupName);
      for(var i=0; i<messages.length; i++){
        console.log(messages[i]);
      }
      console.groupEnd();
    },

    convertToCelcius: function(tempF) {
      return ((tempF-32.0) * (5.0/9.0));
    },

    convertToMilliBar: function(inHg) {
      return (inHg * 33.86).toFixed(1);
    },

    convertToMeterPerSec: function(inSpeed) {
      return (inSpeed * 0.44704).toFixed(1);
    },

    formatWindSpeed: function(inSpeed) {
      if(inSpeed) {
        var windDesc = this.convertToMeterPerSec(inSpeed) + " m/s";
        return windDesc;
      } else {
        return ""
      }
    },

    formatDir: function(inDir) {
      if(inDir) {
        var dirDesc = this.degToCompass(inDir);
        return dirDesc;
      } else {
        return "";
      }
    },

    /*
     Based on answer at:
     http://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words
     */
    degToCompass: function(angle) {
      var val = Math.floor((angle / 22.5) + 0.5);
      var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      return arr[(val % 16)];
    },

    createStatsDef: function(statsType, statsField, statsName) {
      var statisticDefinition = new StatisticDefinition();
      statisticDefinition.statisticType = statsType;
      statisticDefinition.onStatisticField = statsField;
      statisticDefinition.outStatisticFieldName = statsName;
      return statisticDefinition;
    },

    sendQueryStats: function(url, where, outStats, groupBy,
                             context, callback) {
      var query = new Query();
      query.where = where;
      query.outStatistics = outStats;
      query.groupByFieldsForStatistics = groupBy;
      query.orderByFields = [groupBy];
      this.log("sendQueryStats", [url, where, outStats, groupBy, query]);

      var queryTask = new QueryTask(url);
      var queryReq =  queryTask.execute(query);
      return queryReq.then(lang.hitch(context, callback), lang.hitch(this,
        function (error) {
          console.group("sendQuery Error");
          console.log(url);
          console.log(where);
          console.log(error);
          console.groupEnd();
        }
      ));
    },

    sendQueryTable: function(url, where, outFields, orderByFields,
                             context, callback) {
      var query = new Query();
      query.where = where;
      query.outFields = outFields;
      if(orderByFields != null)
        query.orderByFields = orderByFields;

      this.log("sendQueryTable", [url, where, outFields, orderByFields, query]);

      var queryTask = new QueryTask(url);
      var queryReq =  queryTask.execute(query);
      return queryReq.then(lang.hitch(context, callback), lang.hitch(this,
        function (error) {
          console.group("sendQuery Error");
          console.log(url);
          console.log(where);
          console.log(outFields);
          console.log(error);
          console.groupEnd();
        }
      ));
    }

  });

  if (!_instance) {
    _instance = new weatherUtilClass();
  }

  return _instance;

});
