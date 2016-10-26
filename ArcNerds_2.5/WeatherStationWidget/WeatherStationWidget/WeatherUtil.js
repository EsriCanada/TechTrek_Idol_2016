/**
 * Created by johnosborne on 2016-05-04.
 */

define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/_base/lang',
  "esri/tasks/query",
  "esri/tasks/QueryTask"
], function(declare, _WidgetBase, lang, Query, QueryTask){
  var _instance = null;
  var weatherUtilClass = declare([_WidgetBase], {

    convertToCelcius: function(tempF) {
      return ((tempF-32.0) * (5.0/9.0)).toFixed(1);
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

    //sendQuery
    //submit query request to feature service
    //parameters:
    //url: base url of service
    //where: where clause
    //outFields: array of fields to return
    //context: object defining context for callback
    //callback: callback function
    sendQueryTable: function(url, where, outFields, orderByFields,
                             context, callback) {
      /*
       need to modify code to use QueryTask to avoid crosss domain issues.
       Access Modified headers added to esri/Request and dojo/xhr cause issues
       when working cross-domain and CORs not enabled on server.
       */
      var query = new Query();
      query.where = where;
      query.outFields = outFields;
      if(orderByFields != null)
        query.orderByFields = orderByFields;

      console.log(url);
      console.log(query);

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
