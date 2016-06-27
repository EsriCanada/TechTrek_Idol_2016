'use strict';

var gumCostPerGum = 0.75;

L.Control.Dashboard = L.Control.extend({
  
  options: {
    position: 'bottomleft',
    autoZIndex: true
  },

  initialize: function (options) {
    
  },

  onAdd: function (map) {
    this._initLayout();
    
    return this._container;
  },

  onRemove: function (map) {
  
  },

  _initLayout: function () {
    this.__container = $('<div class="leaflet-control-dashboard"><table class="intro"><tr><td>Click on a neighbourhood to begin...</td></tr></table></div>');
    this._badge = $('<div class="summary-badge"><div class="summary-badge-title">Estimated<br />Cleanup<br />Cost:</div><div class="summary-badge-value">$<span>0</span></div><div class="summary-badge-label"></div></div>');
    this._reported = $('<div class="reported-chart"><div class="description"><img class="report-icon" src="assets/img/srclayericon.png" />Reported: <span class="observations-value">0</span><br /><img class="report-icon" src="assets/img/predictedicon.png" />Predicted: <span class="predicted-value">0</span></div><canvas></canvas><div class="improve-this"><div>Improve this:&nbsp;&nbsp;</div><a href="https://geo.itunes.apple.com/ca/app/gumshoe-map/id931582747?mt=8" target="_blank" style="margin:4px 0 -4px 0;cursor:auto;pointer-events:auto;display:inline-block;overflow:hidden;background:url(https://linkmaker.itunes.apple.com/images/badges/en-us/badge_appstore-sm.svg) no-repeat;width:60px;height:15px;"></a></div></div>');
    this._container = this.__container[0];
    this.__container.click($.proxy(function(e){
        if (this._chartHidden) return;
        if (this.__container.hasClass('leaflet-control-dashboard-active') && this.__chart)
        {
            this.__chart.destroy();
            this.__chart = false;
        }
        if (!this.__container.hasClass('leaflet-control-dashboard-active'))
        {
            this._badge.remove();
            this._reported.remove();
        }
        this.__container.toggleClass('leaflet-control-dashboard-active')
            .one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', $.proxy(function(){
                this.setData(this.__currentData, this._chartHidden, true);
            },this));
        e.stopPropagation();
    },this));
    
    this.__container.dblclick(function(e){
        e.stopPropagation();
    });
    
  },
  
  setData: function(data, hideChart, noCount)
  {
    if (!data) return;
    this.__currentData = data;
    this._chartHidden = hideChart;
    var totalSidewalk = 0
    var totalGumActual = 0;
    var totalGumPredicted = 0;
    var totalPredictedSites = 0;
    var cleanupCost = 0;
    var barchartData = {labels:[],datasets:[{data:[],backgroundColor:[]}]};
    var costData = {};
    data.forEach(function(neighbourhood){
        totalSidewalk += neighbourhood.sidewalkArea;
        totalGumActual += neighbourhood.gumActual;
        totalGumPredicted += neighbourhood.gumPredicted;
        totalPredictedSites += neighbourhood.latlngs.length;
        cleanupCost += neighbourhood.gumPredicted * 0.75;
        costData[neighbourhood.name] = neighbourhood.gumPredicted * 0.75;
        barchartData.labels.push(neighbourhood.name);
        barchartData.datasets[0].data.push(neighbourhood.sidewalkArea / neighbourhood.gumPredicted);
    });
    
    barchartData.datasets[0].backgroundColor = "#EF6121"; //generateColours(barchartData.datasets[0].data);
    
    var content = '<div class="summary"><div class="chart-title">Gum Density by Neighbourhood (gum/m²)</div><canvas class="summary-chart"></canvas>';
    content += '<div class="summary-details"><div class="detail-wrapper">';
    content += '<div class="short-label">SA</div><div class="long-label">Sidewalk area</div><div class="summary-value">: <span class="sidewalk-value">0</span> m<sup>2</sup> |&nbsp;</div>';
    content += '<div class="short-label">GO</div><div class="long-label">Gum observations</div><div class="summary-value">: <span class="observations-value">0</span> |&nbsp;</div>';
    content += '<div class="short-label">PS</div><div class="long-label">Prediction sites</div><div class="summary-value">: <span class="sites-value">0</span></div><br />'
    content += '<div class="short-label">PG</div><div class="long-label">Predicted gum</div><div class="summary-value">: <span class="predicted-value">0</span> |&nbsp;</div>'
    content += '<div class="short-label cost">EC</div><div class="long-label cost">Estimated cleanup cost</div><div class="summary-value cost">: $<span class="cost-value">0</span></div>'
    content += '</div></div></div>';
    this.__container.html(content);
    
    if (!this.__container.hasClass('leaflet-control-dashboard-active'))
    {
        this.__container.after(this._badge);
        this.__container.after(this._reported);
    }
    
    if (this.__chart) this.__chart.destroy();
    if (this._reportChart) this._reportChart.destroy();
    
    this.__chart = false;
    this._reportChart = false;
    
    var durationMultiplier = 1;
    if (noCount) durationMultiplier = 0.1;
    
    if (!hideChart && $('.summary-chart').height() > 0)
    {
        Chart.defaults.bar.gridLines = "#FFF";
        Chart.defaults.global.defaultFontColor = "#FFF";
        $('.summary .chart-title').show();
        $('.detail-wrapper').css({marginTop:($('.summary-details').height()*-0.5).toString()+"px"});
        $('.summary-chart')[0].width = $('.summary-chart').width();
        $('.summary-chart')[0].height = this.__container.height() - $('.summary-details').height() - $('.summary .chart-title').height() - 10;
        Chart.defaults.global.animation.duration = 300;
        this.__chart = new Chart($('.summary-chart')[0],{
            type:'horizontalBar',
            data:barchartData,
            options: {
                scales: { 
                    yAxes: [{ gridLines: { color: "#FFF" } }],
                    xAxes: [{ gridLines: { color: "#FFF" } }]
                },
                animation:{duration: 300*durationMultiplier},
                responsive:false,
                maintainAspectRatio: false,
                tooltips:{
                    callbacks:{
                        title:function(item,data){
                            var cost = costData[item[0].yLabel];
                            var summary = "Gum/m²: " + (Math.round(item[0].xLabel*100)/100).toString();
                            summary += " | Est. Cost: $" + formatInteger(Math.round(cost));
                            return summary
                        }
                    }
                }
            }
        });
        
        $('.summary-chart').click($.proxy(function(e){ 
            if (this.__chart && this.__chart.getElementsAtEvent(e).length > 0) e.stopPropagation();
        },this));
        
        $('.reported-chart .description').removeClass('hidden');
        $('.summary-badge-title').removeClass('hidden');
    }
    else
    {
        $('.summary .chart-title').hide();
        $('.summary').addClass('nochart');
        $('.summary-chart')[0].height = 0;
        $('.summary-chart').height(0)
        $('.reported-chart .description').addClass('hidden');
        $('.summary-badge-title').addClass('hidden');
    }
    
    $('.sidewalk-value',this.__container).countup({endVal:totalSidewalk,duration:1*durationMultiplier});
    $('.observations-value',this.__container).countup({endVal:totalGumActual,duration:1*durationMultiplier});
    $('.sites-value',this.__container).countup({endVal:totalPredictedSites,duration:1*durationMultiplier});
    $('.predicted-value',this.__container).countup({endVal:totalGumPredicted,duration:1*durationMultiplier});
    $('.cost-value',this.__container).countup({endVal:cleanupCost,duration:2*durationMultiplier});
    
    $('.observations-value',this._reported).countup({endVal:totalGumActual,duration:1*durationMultiplier});
    $('.predicted-value',this._reported).countup({endVal:totalGumPredicted,duration:1*durationMultiplier});
    
    if (cleanupCost >= 1000000)
    {
        $('.summary-badge-label', this._badge).html('million');
        var badgeCost = Math.round(cleanupCost / 100000) / 10;
        var decimals = (badgeCost < 10 ? 1 : 0);
        $('.summary-badge-value span', this._badge).countup({endVal:badgeCost,duration:3*durationMultiplier,decimals:decimals});
    }
    else
    {
        $('.summary-badge-label', this._badge).html('thousand');
        var badgeCost = Math.round(cleanupCost / 1000);
        $('.summary-badge-value span', this._badge).countup({endVal:badgeCost,duration:3*durationMultiplier});
    }
    
    
    if ($('.reported-chart canvas:visible').length > 0)
    {
        var reportedChartData = {labels:["Reported","Predicted"],datasets:[{data:[Math.log(totalGumActual>=2?totalGumActual:2), Math.log(Math.pow(totalGumPredicted,4))],backgroundColor:[
            "#EF6121","#000000"
        ],borderWidth:3,borderColor:"#EF6121" /* "#DC7445" */}]}
        
        this._reportChart = new Chart($('.reported-chart canvas')[0],{
            type:'doughnut',
            data:reportedChartData,
            options:{
                rotation: -1 * Math.PI,
                circumference: Math.PI
            }
        });
    }
  }
});

function formatInteger(number)
{
    if (number == 0) return "0";
    
    var numTextArray = []
    while (number > 1000)
    {
        var lastDigits = Math.round(number % 1000).toString();
        while (lastDigits.length < 3)
        {
            lastDigits  = "0" + lastDigits;
        }
        numTextArray.unshift(lastDigits);
        number = Math.floor(number / 1000);
    }
    if (number > 0) numTextArray.unshift(number.toString());
    return numTextArray.join(",");
}

function generateColours(data)
{
    var maxValue = 0;
    var minValue = -1;
    data.forEach(function(value){
        maxValue = Math.max(maxValue, value);
        if (minValue==-1) minValue = value;
        else minValue = Math.min(minValue,value);
    });
    
    var colours = [];
    data.forEach(function(value){
        var proporationalValue = (value-minValue) / (maxValue-minValue);
        var colour = 'rgba(';
        colour += Math.round(255*proporationalValue) + ',0,';
        colour += Math.round(255*(1-proporationalValue)) + ',1)';
        colours.push(colour);
    });
    return colours;
}


L.control.dashboard = function (options) {
  return new L.Control.Dashboard(options);
};