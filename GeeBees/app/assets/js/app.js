'use strict';

var map, featureList, neighbourhoodList = [], neighbourhoodData = {}, currentData = {max:0,points:[]};

var isMobile = (/iPhone|iPod|iPad/.test(navigator.platform) || ua.indexOf("Android") >= 0 || ua.indexOf("BlackBerry") >= 0 || ua.indexOf("(BB") >= 0);

var gbService = "https://services.arcgis.com/zmLUiqh7X11gGV2d/arcgis/rest/services/GB1/FeatureServer";
var gbSrcLayerURL = "https://utility.arcgis.com/usrsvcs/servers/2306f81e42284b79b6c9ba9d93646795/rest/services/gumAuthenticated/FeatureServer/0";
var gbDataPath = "https://arcgis103.esri.ca/gumbuster/data/";
var gbServiceInfo = false;
var gbNeighbourhoods = false;
var gbSiteClusters = new L.MarkerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 19,
  maxZoom: 18
});
var gbSites = L.markerClusterGroup({ chunkedLoading: true, chunkProgress: false });
var gbSrcLayer = false;
var gbSitesZoom = 16;
var gbHeat = L.heatLayer([],{
    radius:10,
    radii:[[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[2,1],[3,2],[4,3],[5,3],[7,5],[10,7],[15,11],[21,15],[30,21],[42,30],[60,42]],
    maxZoom: 19, // It is not ideal for this to change when the basemap changes...
});
var gbShowPredicted = true;
var gbPanning = false;
var gbPanEnd = Date.now();
var gbAnimationTime = 2;
var gbCenter = false;
var gbCenterResolution = false;
var gbFrameRate = 20;
var gbOozeMode = 'none';

var gbCityTopTenCats = [];
var gbCityTopTenChartData = {labels:[],datasets:[{data:[],backgroundColor:[
    "#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#a6cee3","#ff7f00","#cab2d6","#6a3d9a"
]}]};
var gbCityTopTenChart = false;
var gbCityCount = false;

var gbOrangeHex = '#EF6121';
var gbOrangeRGB = [94,38,13];

var ttcIcon = L.icon({
    iconUrl: "assets/img/ttc.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -16]
});

var businessIcon = L.icon({
    iconUrl: "assets/img/business.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -16]
});

var addressIcon = L.icon({
    iconUrl: "assets/img/address.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -16]
});

var srcIcon = L.icon({
    iconUrl: "assets/img/srclayericon.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -16]
});

var gbAud = document.getElementById("dsotc_trailer_audio");
var gbVid = document.getElementById("dsotc_trailer");

gbHeat.basemapDrawMethod = 'copy';

gbHeat.on('animation-start',function(){
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.keyboard.disable();
    zoomControl.disable();
    //locateControl.stop();
    //locateControl.remove();
});

gbHeat.on('animation-end',function(){
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.keyboard.enable();
    zoomControl.enable();
    //locateControl.addTo(map);
});

function gbInit()
{
    //$(".splash-content").niceScroll();
    spinTheSplat('.intro-image');
    getGBServiceInfo();
    
    $('#ooze-speed').slider({min: 0.1, max: 2.9, step: 0.1, value: 3-gbAnimationTime, tooltip: 'hide'}).on('change',function(e){
        gbAnimationTime = 3-e.value.newValue;
    });
}

function getGBServiceInfo()
{
    $.getJSON(gbService+"?f=json", function(data) {
        gbServiceInfo = data;
        
        var neighbourhoodsURL = gbLayerURL("Neighbourhoods");
        
        if (neighbourhoodsURL)
        {
            var gbNeighbourhoodsParams = {
                url: neighbourhoodsURL,
                style:{opacity:0.75,weight:2,color:'#EF6121', fillOpacity:0.0},
                onEachFeature: function(f, l) {
                    neighbourhoodList.push(l);
                    l.on('click', function(e) { gbNeighbourhoodsClick(l, e); });
                }
            };
            
            gbNeighbourhoods = L.esri.featureLayer(gbNeighbourhoodsParams).addTo(map);
            
            if (map.getZoom()>=gbSitesZoom)
            {
                if (!gbSiteClusters._map) map.addLayer(gbSiteClusters);
                if (gbSrcLayer._map) map.removeLayer(gbSrcLayer);
                map.addLayer(gbSrcLayer);
                gbSiteClusters.addLayer(gbSites);
            }
            
            var gbSrcLayerParams = {
                url: gbSrcLayerURL,
                pointToLayer: function(feature,latlng)
                {
                    var marker = L.marker(latlng, {icon: srcIcon});
                    return marker;
                },
                onEachFeature: function(feature, lyr)
                {
                    var popup = L.popup({offset:L.point(0, -10)});
                    var oid = feature.properties.OBJECTID;
                    var getParams = {url:gbSrcLayer.options.url+"/" + oid +"/attachments", data:{f: "json"}, dataType: "json"};
                    var attachmentUrl = "assets/img/srclayericon.png";
                    lyr.on('click', function (e) {
                        $.ajax(getParams).then(function(data){
                            if (data.attachmentInfos && data.attachmentInfos.length > 0)
                            {
                                attachmentUrl = gbSrcLayer.options.url+"/" + oid +"/attachments/" + data.attachmentInfos[0].id;
                            }
                            
                            var obsDate = new Date(feature.properties.date);
                            var obsMonth = obsDate.getMonth();
                            var obsDay = obsDate.getDate();
                            
                            if (obsMonth < 10) obsMonth = "0" + obsMonth.toString();
                            if (obsDay < 10) obsDay = "0" + obsDay.toString();
                            
                            var content = "<table class=\"gb-popup\"><tr><td class=\"img-cell\"><img src=\""+attachmentUrl+"\" /></td></tr>"
                            
                            content += "<tr><td>Observed gum count: " + feature.properties.gum_count;
                            content += "<br/>Observation Date: " + obsDate.getFullYear() + "-" + obsMonth + "-" + obsDay;
                            if (feature.properties.twitter && feature.properties.twitter != "")
                            {
                                content += "<br />Twitter User: " + feature.properties.twitter;
                            }
                            content += "</td></tr></table>";
                            
                            content = $(content);
                            $('img', content).on('load', function(){
                                
                                if (/iPhone|iPod|iPad/.test(navigator.platform)) return;
                                
                                EXIF.getData(this, function() {
                                    switch(parseInt(EXIF.getTag(this, "Orientation"))) {
                                        case 2:
                                            $(this).addClass('no-rotate'); break;
                                        case 2:
                                            $(this).addClass('flip'); break;
                                        case 3:
                                            $(this).addClass('rotate-180'); break;
                                        case 4:
                                            $(this).addClass('flip-and-rotate-180'); break;
                                        case 5:
                                            $(this).addClass('flip-and-rotate-270'); break;
                                        case 6:
                                            $(this).addClass('rotate-90'); break;
                                        case 7:
                                            $(this).addClass('flip-and-rotate-90'); break;
                                        case 8:
                                            $(this).addClass('rotate-270'); break;
                                    }
                                });
                            });
                            
                            popup.setLatLng(e.latlng);
                            popup.setContent(content[0]);
                            popup.openOn(map);                            
                        });
                    });
                }
            };
            
            gbSrcLayer = L.esri.featureLayer(gbSrcLayerParams);
        }
        
        var cityGumCountDeferred = $.Deferred();
        var cityGumCountURL = gbLayerURL("CityGumCount");
        if (cityGumCountURL)
        {
            var q = L.esri.query({url: cityGumCountURL});
            q.run(function(e,f){
               if (!e)
               {
                   var gbCityCount = f.features[0].properties;
                   $(".city-count-value").countup({endVal:gbCityCount.SUM_GUM_COUNT_ACTUAL, duration:.5});
                   cityGumCountDeferred.resolve();
               }
            });
        }
        else cityGumCountDeferred.resolve();
        
        var worldGumCountDeferred = $.Deferred();
        var worldGumCountURL = gbLayerURL("WorldwideGumCountByDate");
        if (worldGumCountURL)
        {
            var q = L.esri.query({url: worldGumCountURL});
            q.run(function(e,f){
                if (!e)
                {
                    var gbWorldCount = f.features[0].properties;
                    $(".global-count-value").countup({endVal:gbWorldCount.GUM_COUNT, duration:2});
                    worldGumCountDeferred.resolve();
                }
            });
        }
        else worldGumCountDeferred.resolve();
        
        
        var cityGumChartDeferred = $.Deferred();
        var cityGumCountByCategoryURL = gbLayerURL("CityGumCountByCategory");
        if (cityGumCountByCategoryURL)
        {
            var q = L.esri.query({url: cityGumCountByCategoryURL});
            q.limit(11).run(function(e,f){
               if (!e)
               {
                    for (var i=1; i<11; i++) gbCityTopTenCats.push(f.features[i]);
                   
                    gbCityTopTenCats.forEach(function(cat){
                        gbCityTopTenChartData.labels.push(cat.properties.SIC_NAME);
                        gbCityTopTenChartData.datasets[0].data.push(cat.properties.SUM_GUM_COUNT_ACTUAL);
                    });
                    Chart.defaults.global.legend.display = false;
                    Chart.defaults.global.legend.position = 'bottom';
                    Chart.defaults.global.legend.fullWidth = false;
                    Chart.defaults.global.legend.labels.boxWidth = 20;
                    Chart.defaults.global.legend.labels.fontColor = '#FFF';
                    Chart.defaults.global.legend.labels.padding = 3;
                    
                    $('.top-ten-chart')[0].width = $('.chart-container').height();
                    $('.top-ten-chart')[0].height = $('.chart-container').height(); 
                    var gbCityTopTenChart = new Chart($('.top-ten-chart')[0],{
                        type:'pie',
                        data:gbCityTopTenChartData,
                        options: {
                            responsive:false,
                            animation: {onComplete:function(){
                                cityGumChartDeferred.resolve();
                            }}
                        }
                    });
                    $('.top-ten-chart-legend').html(gbCityTopTenChart.generateLegend()).css({display:'inline-block'});
                    window.c = gbCityTopTenChart;
                    
                    var wTimeout = false;
                    $(window).resize(function(){
                        if (wTimeout) clearTimeout(wTimeout);
                        wTimeout = setTimeout(function(){
                            gbCityTopTenChart.destroy();
                            $('.top-ten-chart')[0].width = $('.chart-container').height();
                            $('.top-ten-chart')[0].height = $('.chart-container').height(); 
                            gbCityTopTenChart = new Chart($('.top-ten-chart')[0],{
                                type:'pie',
                                data:gbCityTopTenChartData,
                                options: {
                                    responsive:false,
                                    animation: {
                                        duration:0
                                    }
                                }
                            });
                        },300);
                    });
               }
            });
        }
        else cityGumChartDeferred.resolve();
        
        $.when(cityGumCountDeferred, worldGumCountDeferred, cityGumChartDeferred).then(function(){
            stopTheSplat('.intro-image');
        });
    });
}

function gbLayerID(layerName)
{
    var matches = $(gbServiceInfo.layers).filter(function(i,layer){ return layer.name.toLowerCase()==layerName.toLowerCase(); });
    
    if (matches.length == 0)
    {
        matches = $(gbServiceInfo.tables).filter(function(i,table){ return table.name.toLowerCase()==layerName.toLowerCase(); });
    }
    
    if (matches.length > 0)
    {
        return matches[0].id;
    }
}

function gbLayerURL(layerName)
{
    var layerId = gbLayerID(layerName);
    if (layerId != undefined)
    {
        return gbService + "/" + layerId
    }
}

function gbNeighbourhoodsClick(l, e)
{
    $(".dropdown").removeClass("open");
    $(".navbar-collapse").collapse("hide");
    
    if (mapRenderer && (gbPanning || (Date.now()-gbPanEnd) < 500)) return; // Fix for temporary issue the canvas renderer in leaflet-1.0.0x versions.
    
    if (map.getZoom() >= gbSitesZoom && currentData.neighbourhoods && currentData.neighbourhoods.indexOf(l.feature.properties.AREA_NAME)>=0) return;  // Don't reload data if we are viewing site markers, and the clicked location already has data...
    
    spinTheSplat();
    
    if (gbHeat.busy()) gbHeat.setLatLngs([]);
    
    gbDataReset();
    
    gbCenter = e.latlng;
    
    gbCenterResolution = currentPixelResolution();
    
    var afterZoomDeferred = $.Deferred();
    var mapevent;
    /*
    function afterZoom()
    {
        if (mapevent) map.off(mapevent, afterZoom);
        afterZoomDeferred.resolve();
    }
    
    if (map.getZoom()<12 && document.body.clientWidth > 767)
    {
        mapevent = 'zoomend';
        map.on(mapevent, afterZoom);
        map.setZoomAround(gbCenter, 12);
    }
    else
    {
    */
        afterZoomDeferred.resolve();
    /* } */
    
    var bounds = l.getBounds().pad(0.1);
    
    var nearby = $(neighbourhoodList).filter(function(i,l){
        return l.getBounds().intersects(bounds);
    });
    gbLoadData(nearby).then(function(names){
        if (mapevent)
        {
            afterZoomDeferred.then(function(){setTimeout(function(){gbDataLoaded(names); },300); });
        }
        else
        {
            gbDataLoaded(names);
        }
    });
}

function gbLoadData(neighbourhoods)
{
    var loadDeferred = $.Deferred();
    
    var requestedNames = [];
    var dataRequests = [];
    $.each(neighbourhoods, function(i,neighbourhood) {
        var name = neighbourhood.feature.properties.AREA_NAME;
        var sidewalkArea = neighbourhood.feature.properties.SIDEWALK_AREA;
        
        requestedNames.push(name);
        
        var dataUrl = gbDataPath + name + ".json"
        
        if (!neighbourhoodData[name])
        {
            var dataDeferred = $.Deferred();
            var currentRequests = [].concat(dataRequests);
            dataRequests.push(dataDeferred.promise());
            
            $.getJSON(dataUrl, function (features){
                $.when(currentRequests).then(function(){
                    setTimeout(function(){
                        var data = {
                            latlngs:[],
                            markers:[],
                            sidewalkArea:sidewalkArea,
                            gumActual:0,
                            gumPredicted:0,
                            name:name,
                            geometry:neighbourhood.feature.geometry
                        };
                        features.forEach(function(feature){
                            var latlng = L.latLng([feature[1],feature[0],gbShowPredicted ? feature[5] : feature[4]]);
                            data.latlngs.push(latlng);
                            latlng.__siteData = feature.concat(neighbourhood.feature.properties);
                            
                            data.gumActual += feature[4];
                            data.gumPredicted += feature[5];
                        })
                        neighbourhoodData[name] = data;
                        dataDeferred.resolve();
                    },(isMobile?1000:33));
                });
            });
        }
    });
    
    $.when.apply($,dataRequests).then(function(){
        loadDeferred.resolve(requestedNames);
    });
    
    return loadDeferred.promise()
}

function gbDataLoaded(loadedNames,skipRedraw)
{
    gbDataReset();
    currentData.neighbourhoods = loadedNames;
    currentData.neighbourhoods.forEach(function(name){
        currentData.points = currentData.points.concat(neighbourhoodData[name].latlngs);
    });
    
    currentData.max = 0;
    currentData.points.forEach(function(latlng){
        currentData.max = Math.max(currentData.max, latlng.alt);
    });
    
    if (map.getZoom() >= gbSitesZoom)
    {
        showSites();
    }
    
    var gbCenterP = map.latLngToContainerPoint(gbCenter);
    gbHeat.sortMethod = function(a,b){
        return L.point(a).distanceTo(gbCenterP) - L.point(b).distanceTo(gbCenterP);
    }
    
    gbShowData(skipRedraw);
}

function gbDataReset()
{
    currentData.max = 0;
    currentData.points = [];
    currentData.neighbourhoods = false;
    gbHeat.setLatLngs([]);
}

function gbShowData(skipRedraw)
{
    if (!gbHeat.busy())
    {
        
        if (!gbHeat._map && map.getZoom()<gbSitesZoom) map.addLayer(gbHeat);
        
        gbHeat.setOptions({max: gbShowPredicted ? Math.max(1,currentData.max/10) : 1});
        
        if (gbOozeMode && gbOozeMode != "none" && gbHeat._map)
        {
            gbHeat.setLatLngs(currentData.points,true);
            if (!skipRedraw) gbHeat.drawAnimated(gbAnimationTime, gbFrameRate, gbOozeMode);
            else gbHeat._redraw(true);
            loadDashBoardInfo(true);
        }
        else
        {
            gbHeat.setLatLngs(currentData.points, skipRedraw);
            if (!skipRedraw) gbHeat._redraw();
            loadDashBoardInfo(false);
        }
        
        if (!finaleDelayed) stopTheSplat();
    
    }
}

function currentPixelResolution()
{
    return (L.CRS.EPSG3857.project(map.getBounds()._northEast).x - L.CRS.EPSG3857.project(map.getBounds()._southWest).x) / map.getSize().x
}

$(window).resize(function() {
  sizeLayerControl();
});

$("#about-btn").click(function() {
  showSplash();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

function clearHighlight() {
  highlight.clearLayers();
}

var gbHeatRedrawCanvasesTimeout
function gbHeatRedrawCanvases() {
    if (gbHeatRedrawCanvasesTimeout) clearTimeout(gbHeatRedrawCanvasesTimeout);
    gbHeatRedrawCanvasesTimeout = setTimeout(function(){gbHeat.redrawCanvases();},500);
}

/* Basemap Layers */
var darkGray = L.esri.basemapLayer("DarkGray");
var imagery = L.esri.basemapLayer("Imagery");
var topographic = L.esri.basemapLayer("Topographic");

darkGray.on('tileload',gbHeatRedrawCanvases);
imagery.on('tileload', gbHeatRedrawCanvases);
topographic.on('tileload', gbHeatRedrawCanvases);

var mapRenderer = false; // L.canvas();
map = L.map("map", {
  zoom: 11,
  center: [43.725, -79.35],
  layers: [darkGray],
  zoomControl: false,
  attributionControl: false
});

map.on('move', function(e){
   gbPanning = true;
});

map.on('movestart', function(e){
    gbPanning = true;
});

map.on('moveend', function(e){
    gbPanning = false;
    gbPanEnd = Date.now();
});

map.on('zoomend',function(e){
   if (map.getZoom()>=gbSitesZoom)
   {
       map.removeLayer(gbHeat);
       if (!gbSiteClusters._map) showSites();
   }
   else
   {
       map.removeLayer(gbSiteClusters);
       map.removeLayer(gbSrcLayer);
       map.addLayer(gbHeat);
   }
});

map.on('baselayerchange',function(e){
    if (gbSiteClusters._map) gbSiteClusters.unspiderfy();
    if (map.getZoom()>e.layer.options.maxZoom) map.setZoom(e.layer.options.maxZoom);
    layerControl._collapse();
});

map.on('resize', function(e){
    if (document.body.clientWidth <= 767)
    {
        gbFrameRate = 20;
    }
    else
    {
        gbFrameRate = 30;
    }
});

$(document).ready(function(){
    gbInit();
    //$(".splash-content").niceScroll();
});

$(document).one("ajaxStop", function () {
  
  $("#loading").hide();
  sizeLayerControl();
  
});

var zoomControl = L.control.zoom({
  position: "bottomright"
}).addTo(map);

var baseLayers = {
  "Esri Dark Gray": darkGray,
  "Esri Imagery": imagery,
  "Esri Topographic": topographic
};

var groupedOverlays = {};

var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
  collapsed: true
}).addTo(map);

var dashboard = L.control.dashboard().addTo(map);


// Leaflet patch to make layer control scrollable on touch browsers
var container = $(".leaflet-control-layers")[0];
if (!L.Browser.touch) {
  L.DomEvent
  .disableClickPropagation(container)
  .disableScrollPropagation(container);
} else {
  L.DomEvent.disableClickPropagation(container);
}

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

$('#ooze-toggle').click(function(e){
    var toggleIcon = $('i',this);
    var opts = $('.dropdown-menu .gb-ooze-option');
    var explodeToggles = $(".gb-explode-toggle, .gb-explode-option");
    
    if (toggleIcon.hasClass('fa-check-square-o'))
    {
        toggleIcon.removeClass('fa-check-square-o').addClass('fa-square-o');
        opts.addClass('gb-ooze-option-hidden');
        explodeToggles.addClass('gb-explode-toggle-hidden');
    }
    else
    {
        toggleIcon.addClass('fa-check-square-o').removeClass('fa-square-o');
        opts.removeClass('gb-ooze-option-hidden');
        explodeToggles.removeClass('gb-explode-toggle-hidden');
    }
    e.stopPropagation();
    gbSetOozeMode();
});

$('.gb-ooze-option a').click(function(e){
    
    if (!$(this.parentNode).hasClass('gb-ooze-speed'))
    {
        var allOozeOptIcons = $('.gb-ooze-option i');
        var thisIcon = $('i', this);
        
        allOozeOptIcons.removeClass('fa-dot-circle-o').addClass('fa-circle-o');
        thisIcon.addClass('fa-dot-circle-o').removeClass('fa-circle-o');
    }
    
    e.stopPropagation();
    gbSetOozeMode();
});

function gbSetOozeMode()
{
    var toggleIcon = $('#ooze-toggle i');
    var radialOozeIcon = $('#ooze-radial i');
    
    if (toggleIcon.hasClass('fa-square-o'))
    {
        gbOozeMode = "none";
    }
    else
    {
        if (radialOozeIcon.hasClass('fa-dot-circle-o'))
        {
            gbOozeMode = "radial";
        }
        else
        {
            gbOozeMode = "threshold";
        }
    }
}

$('#explode-toggle').click(function(e){
    var toggleIcon = $('i',this);
    var opts = $('.dropdown-menu .gb-explode-option');
    if (toggleIcon.hasClass('fa-check-square-o'))
    {
        toggleIcon.removeClass('fa-check-square-o').addClass('fa-square-o');
        opts.addClass('gb-explode-option-hidden');
    }
    else
    {
        toggleIcon.addClass('fa-check-square-o').removeClass('fa-square-o');
        opts.removeClass('gb-explode-option-hidden');
    }
    e.stopPropagation();
    gbSetExplodeMode();
});

$('.gb-explode-option a').click(function(e){
    var allExplodeOptIcons = $('.gb-explode-option i');
    var thisIcon = $('i', this);
    
    allExplodeOptIcons.removeClass('fa-dot-circle-o').addClass('fa-circle-o');
    thisIcon.addClass('fa-dot-circle-o').removeClass('fa-circle-o');
    e.stopPropagation();
    gbSetExplodeMode();
});

function gbSetExplodeMode()
{
    var toggleIcon = $('#explode-toggle i');
    var explodeAfterIcon = $('#explode-after i');
    
    if (toggleIcon.hasClass('fa-square-o'))
    {
        gbHeat.basemapDrawMethod = 'copy';
    }
    else
    {
        if (explodeAfterIcon.hasClass('fa-dot-circle-o'))
        {
            gbHeat.basemapDrawMethod = 'explode-after';
        }
        else
        {
            gbHeat.basemapDrawMethod = 'explode-during';
        }
    }
}

function setupFinaleSettings()
{
    $('#explode-toggle i').removeClass('fa-square-o').addClass('fa-check-square-o');
    $('#ooze-toggle i').removeClass('fa-square-o').addClass('fa-check-square-o');
    $('#explode-after i').removeClass('fa-circle-o').addClass('fa-dot-circle-o');
    $('#explode-during i').removeClass('fa-dot-circle-o').addClass('fa-circle-o');
    $('#ooze-radial i').removeClass('fa-circle-o').addClass('fa-dot-circle-o');
    $('#ooze-threshold i').removeClass('fa-dot-circle-o').addClass('fa-circle-o');
    $('.dropdown-menu .gb-ooze-option').removeClass('gb-ooze-option-hidden');
    $(".gb-explode-toggle, .gb-explode-option").removeClass('gb-explode-toggle-hidden');
    $('.dropdown-menu .gb-explode-option').removeClass('gb-explode-option-hidden');
    gbSetOozeMode();
    gbSetExplodeMode();
}

function spinTheSplat(selector)
{
    var spin = $(selector||'.app-logo-splat');
    if (!spin.hasClass('spinner'))
    {
        spin.off('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend');
        spin.addClass('spinner').addClass('spinner-forwards').on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',function(e) {
            if (spin.hasClass('spinner-reverse')) spin.addClass('spinner-forwards').removeClass('spinner-reverse');
            else spin.addClass('spinner-reverse').removeClass('spinner-forwards');
        });
    }
}

function stopTheSplat(selector)
{
    var spin = $(selector||'.app-logo-splat');
    spin.off('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend');
    spin.removeClass('spinner-reverse').removeClass('spinner-forwards').one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',function(e){
        spin.removeClass('spinner');
    });
}

function wobbleTheSplat(selector)
{
    var splat = $(selector||'.app-logo-splat');
    if (splat.hasClass('spinner')) return;
    
    splat.addClass('wobble').one('webkitAnimationEnd oanimationend msAnimationEnd animationend',function(e){
        splat.removeClass('wobble');
    });
}

$('.app-logo-splat').mouseenter(function(){
   wobbleTheSplat(); 
});

var finaleInterval;
var finaleDelayed = false;
$('.app-logo-splat').click(function(){
    if (!gbHeat._isPlayingVideo)
    {
        finaleDelayed = true;
        spinTheSplat();
        
        if (gbHeat.busy()) return;
        
        $(".dropdown").removeClass("open");
        $(".navbar-collapse").collapse("hide");
        
        if (gbSiteClusters._map) map.removeLayer(gbSiteClusters);
        if (gbSrcLayer._map) map.removeLayer(gbSrcLayer);
        if (!gbHeat._map) map.addLayer(gbHeat);
        
        gbHeat.setLatLngs([]);
        gbHeat._reset();
        gbHeat._heat._disableRedraw = true;  // zoom events may cause a redraw before things are ready, so this little property will prevent the simpleheat module from doing anything.
        gbCenter = L.latLng([43.725, -79.35]);
        
        var minLat = gbCenter.lat, minLng = gbCenter.lng, maxLat = gbCenter.lat, maxLng = gbCenter.lng;
        
        gbNeighbourhoods.eachFeature(function(l){
            var b = l.getBounds();
            minLat = Math.min(minLat,b._southWest.lat);
            minLng = Math.min(minLng,b._southWest.lng);
            maxLat = Math.max(maxLat,b._northEast.lat);
            maxLng = Math.max(maxLng,b._northEast.lng);
        });
 
        map.fitBounds([[minLat,minLng],[maxLat,maxLng]]);
        
        setTimeout(function(){
            gbHeat._reset();
            var videoReady = gbHeat.playVideo(gbVid,gbAud,640,360,true);
            var heatReady = $.Deferred();
            
            setupFinaleSettings();
            
            gbLoadData(neighbourhoodList).then(function(names){ 
                gbDataLoaded(names,true);
                heatReady.resolve();
            });
            
            $.when(videoReady,heatReady).then(function(){
                if (finaleInterval) clearInterval(finaleInterval);
                finaleDelayed = false;
                stopTheSplat();
                gbHeat.playDelayedVideo();
                gbHeat._heat._disableRedraw = false;
                gbHeat.drawAnimated(71.5, gbFrameRate, gbOozeMode, true);
            });
        },500);

    }
    else
    {
        finaleDelayed = false;
        stopTheSplat();
        gbHeat._heat._disableRedraw = false;
        gbHeat.stopVideo();
        gbHeat.setLatLngs([]);
        gbHeat._reset();
        gbHeat.fire('animation-end');
    }
});

var splash = $(".app-splash");
$('.intro-image img, .close-splash').click(function(){
    wobbleTheSplat('.intro-image');
    hideSplash();
});

function hideSplash()
{
    splash.addClass('app-splash-animate-hide').one('webkitAnimationEnd oanimationend msAnimationEnd animationend',function(){
        splash.css({display:'none'}).removeClass('app-splash-animate-hide');
    });
}

function showSplash()
{
    splash.css({display:'block'}).addClass('app-splash-animate-reveal').one('webkitAnimationEnd oanimationend msAnimationEnd animationend',function(){
        splash.removeClass('app-splash-animate-reveal');
    });
}

var clusterNeighbourhoods = [];
function showSites()
{
    if (!currentData || !currentData.neighbourhoods || currentData.neighbourhoods.length == neighbourhoodList.length) return;
    
    var needToRefresh = false;
    currentData.neighbourhoods.forEach(function(name){
        if (clusterNeighbourhoods.indexOf(name) == -1) needToRefresh = true;
    });
    if (!needToRefresh)
    {
        if (!gbSiteClusters._map) map.addLayer(gbSiteClusters);
        if (gbSrcLayer._map) map.removeLayer(gbSrcLayer);
        map.addLayer(gbSrcLayer);
        return;
    }
    
    gbSites.clearLayers();
    var markerList = [];
    currentData.neighbourhoods.forEach(function(name){
        neighbourhoodData[name].latlngs.forEach(function(latlng){
            var marker = L.marker(latlng,{icon: latlng.__siteData[3] == 0 ? addressIcon : latlng.__siteData[3] == 1 ? businessIcon : ttcIcon});
            marker.__siteData = latlng.__siteData;
            marker.bindPopup(function(){ return sitePopup(marker); });
            markerList.push(marker);
        });
    });
    if (!gbSiteClusters._map) map.addLayer(gbSiteClusters);
    if (gbSrcLayer._map) map.removeLayer(gbSrcLayer);
    map.addLayer(gbSrcLayer);
    gbSites.addLayers(markerList);
    gbSiteClusters.clearLayers().addLayer(gbSites);
    clusterNeighbourhoods = [].concat(currentData.neighbourhoods);
}

function sitePopup(marker)
{
    var content = "Neighbourhood: " + marker.__siteData[6].AREA_NAME;
    content += "<br />Type: "
    switch (marker.__siteData[3])
    {
        case 1:
            content += "Business";
            break;
            
        case 2:
            content += "TTC Stop";
            break;
        
        default:
            content += "Address";
    }
    
    if (marker.__siteData[2] && marker.__siteData[2] != "")
    {
        content += "<br />SIC: " + marker.__siteData[2]
    }
    
    content += "<br />Predicted Gum count: " + marker.__siteData[5].toString();
    content += "<br />Actual Gum count: " + (marker.__siteData[4] > 0 ? marker.__siteData[4].toString() : "N/A");
    
    return content;
}

function loadDashBoardInfo(animated)
{
    var data = [];
    currentData.neighbourhoods.forEach(function(name){
        data.push(neighbourhoodData[name]);
    });
    dashboard.setData(data, currentData.neighbourhoods.length == neighbourhoodList.length);
}