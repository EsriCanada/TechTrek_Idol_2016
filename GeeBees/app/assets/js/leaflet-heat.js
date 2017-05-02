'use strict';

var vidRatio, canvasRatio, videoWidth, videoHeight, vidXOffset, vidYOffset, scaleVidXRatio, scaleVidYRatio;

var iPhone = /iPhone|iPod/.test(navigator.platform);

L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({

    // options: {
    //     minOpacity: 0.05,
    //     maxZoom: 18,
    //     radius: 25,
    //     blur: 15,
    //     max: 1.0
    // },

    initialize: function (latlngs, options) {
        this._latlngs = latlngs;
        L.setOptions(this, options);
    },

    setLatLngs: function (latlngs, skipRedraw) {
        this._latlngs = latlngs;
        if (this._drawAnimatedTimeout)
        {
            clearTimeout(this._drawAnimatedTimeout);
            this._tilesAnimating = false;
            gbHeat._disableRedraw = false;
            //gbHeat._redraw();
        }
        if (!skipRedraw)
        {
            return this.redraw();
        }
        else
        {
            return this;
        }
    },

    addLatLng: function (latlng) {
        this._latlngs.push(latlng);
        return this.redraw();
    },

    setOptions: function (options, skipRedraw) {
        L.setOptions(this, options);
        if (this._heat) {
            this._updateOptions();
        }
        if (skipRedraw) return this;
        return this.redraw();
    },

    redraw: function () {
        if (this._map && this._heat && !this._frame && !this._map._animating) {
            this._frame = L.Util.requestAnimFrame(this._redraw, this);
        }
        return this;
    },

    onAdd: function (map) {
        this._map = map;

        if (!this._canvas) {
            this._initCanvas();
        }

        map._panes.overlayPane.appendChild(this._canvas);

        map.on('moveend', this._reset, this);

        if (map.options.zoomAnimation && L.Browser.any3d) {
            map.on('zoomanim', this._animateZoom, this);
        }

        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._canvas);

        map.off('moveend', this._reset, this);

        if (map.options.zoomAnimation) {
            map.off('zoomanim', this._animateZoom, this);
        }
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    _initCanvas: function () {
        var canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer leaflet-layer');
        var paintCanvas = this._paintCanvas = L.DomUtil.create('canvas');
        var imageCanvas = this._imageCanvas = L.DomUtil.create('canvas');
        var thresholdCanvas = this._thresholdCanvas = L.DomUtil.create('canvas');
        var heatCanvas = this._heatCanvas = L.DomUtil.create('canvas');

        var originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
        canvas.style[originProp] = '50% 50%';
        imageCanvas.style[originProp] = '50% 50%';
        heatCanvas.style[originProp] = '50% 50%';

        var size = this._map.getSize();
        paintCanvas.width = thresholdCanvas.width = imageCanvas.width = heatCanvas.width = canvas.width  = size.x + 24;
        paintCanvas.width = thresholdCanvas.height = imageCanvas.height = heatCanvas.height = canvas.height = size.y + 24;
        
        var animated = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));

        this._heat = simpleheat(heatCanvas);
        this._ctx = canvas.getContext("2d");
        this._paintCtx = paintCanvas.getContext("2d");
        this._imageCtx = imageCanvas.getContext("2d");
        this._thresholdCtx = thresholdCanvas.getContext("2d");
        this._updateOptions();
    },

    _updateOptions: function () {
        this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);

        if (this.options.gradient) {
            this._heat.gradient(this.options.gradient);
        }
        if (this.options.max) {
            this._heat.max(this.options.max);
        }
    },

    _reset: function () {
        if (!this._map) return;
        
        var size = this._map.getSize();

        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        
        if (this._heat._width !== size.x + maxTileSize) {
            this._paintCanvas.width = this._thresholdCanvas.width = this._imageCanvas.width = this._heatCanvas.width = this._canvas.width = this._heat._width  = size.x + maxTileSize;
        }
        if (this._heat._height !== size.y + maxTileSize) {
            this._paintCanvas.height = this._thresholdCanvas.height = this._imageCanvas.height = this._heatCanvas.height = this._canvas.height = this._heat._height = size.y + maxTileSize;
        }
        
        if (this._isPlayingVideo)
        {
            canvasRatio = this._canvas.width / this._canvas.height;
            scaleVidXRatio = this._canvas.width / videoWidth;
            scaleVidYRatio = this._canvas.height / videoHeight;
        }
        
        this._redraw();
    },
    
    playVideo: function(videoSource,audioSource,srcWidth,srcHeight,delay)
    {
        var playStarted = $.Deferred();
        
        if (!this._map || !this._imageCtx) return;
        
        this._audioSource = audioSource;
        this._videoSource = videoSource;
        
        videoWidth = srcWidth;
        videoHeight = srcHeight;
        
        vidRatio = videoWidth / videoHeight;
        vidXOffset = 0;
        vidYOffset = 0;
        canvasRatio = this._canvas.width / this._canvas.height;
        scaleVidXRatio = this._canvas.width / videoWidth;
        scaleVidYRatio = this._canvas.height / videoHeight;
        
        var firstOneIsReady = false;
        
        var playOnIPhone = $.proxy(function(){
            if (playStarted.state()=="resolved") return;
            if (firstOneIsReady)
            {
                if (!delay)
                {
                    audioSource.currentTime = 0;
                    audioSource.play();
                    this._isPlayingVideo = true;
                }
                playStarted.resolve();
                
                this.redrawCanvases();
                
            }
            firstOneIsReady = true;
        },this);
        
        var playDefault = $.proxy(function(){
            if (playStarted.state()=="resolved") return;
            if (!delay)
            {
                videoSource.play();
                this._isPlayingVideo = true;
            }
            playStarted.resolve();
            this.redrawCanvases();
        },this);
        
        
        if (iPhone)
        {
            
            $([audioSource,videoSource]).on('canplay canplaythrough',playOnIPhone);
            
            audioSource.load();
            videoSource.load();
        }
        else
        {
            $(videoSource).on('canplay canplaythrough',playDefault);
            videoSource.load();
        }
        return playStarted.promise();
    },
    
    stopVideo: function()
    {
        if (this._videoSource)
        {
            this._videoSource.pause();
            this._videoSource.currentTime = 0;
        }
        if (this.videoInterval) clearInterval(this.videoInterval);
        this.videoInterval = false;
        this._isPlayingVideo = false;
    },
    
    playDelayedVideo: function()
    {
        if (iPhone)
        {
            this._audioSource.currentTime = 0;
            this._audioSource.play();
        }
        else
        {
            this._videoSource.play();
        }
        this._isPlayingVideo = true;
        this.redrawCanvases();
    },
    
    drawVideoFrame: function()
    {
        if (iPhone) this._videoSource.currentTime = this._audioSource.currentTime;
        if (vidRatio > canvasRatio)
        {
            // Scale to fit height...
            var vidXOffset = (this._canvas.width - videoWidth * scaleVidYRatio) / 2;
            this._imageCtx.drawImage(this._videoSource,vidXOffset,0, videoWidth * scaleVidYRatio, this._canvas.height);
        }
        else
        {
            // Scale to fit width...
            var vidYOffset = (this._canvas.height - videoHeight * scaleVidXRatio) / 2;
            this._imageCtx.drawImage(this._videoSource,0,vidYOffset, this._canvas.width, videoHeight * scaleVidXRatio);
        }
    },
    
    _drawTiles: function()
    {
        if (!this._map || !this._imageCtx) return;
        
        if (this._isPlayingVideo)
        {
            this.drawVideoFrame();
            
            if (!this.videoInterval)
            {
                this.videoInterval = setInterval($.proxy(function(){
                    if (!this.busy()) this.redrawCanvases();
                },this), 1000/gbFrameRate);
            }
            return;
        }
        
        var mapTileContainerMatrix;
        var tileContainer = $(".leaflet-tile-container").filter(function(i, c){
            var containerMatrixText =  $(c).css('transform') || $(c).css('-webkit-transform') || $(c).css('-ms-transform');
            var containerMatrix = containerMatrixText.split("(")[1].split(")")[0].split(" ").join("").split(",");
            
            if (containerMatrix[0]*1.0 == 1 && !mapTileContainerMatrix)
            {
                mapTileContainerMatrix = containerMatrix;
                return true;
            }
            
        });
        
        var imgTiles = $("img", tileContainer);
        if (imgTiles.length == 0) return;
        
        var mapPaneMatrixText = $(".leaflet-map-pane").css('transform') || $(".leaflet-map-pane").css('-webkit-transform') || $(".leaflet-map-pane").css('-ms-transform');
        var mapPaneMatrix = mapPaneMatrixText.split("(")[1].split(")")[0].split(" ").join("").split(",");
        var mapXOffset = mapPaneMatrix[4]*1.0 + mapTileContainerMatrix[4]*1.0;
        var mapYOffset = mapPaneMatrix[5]*1.0 + mapTileContainerMatrix[5]*1.0;
        
        var tileHeight = imgTiles.height();
        var tileWidth = imgTiles.width();
        imgTiles.each($.proxy(function(i,img){
            var matrixText = $(img).css("transform") || $(img).css('-webkit-transform') || $(img).css('-ms-transform');
            var matrix = matrixText.split("(")[1].split(")")[0].split(" ").join("").split(",");
            var xOffset = matrix[4]*1.0 + mapXOffset;
            var yOffset = matrix[5]*1.0 + mapYOffset;
            img.width=tileWidth;
            img.height=tileHeight;
            this._imageCtx.drawImage(img, xOffset, yOffset)
        },this));
    },
    
    _redraw: function (skipCanvasDraw) {
        if (!this._map || this._disableRedraw) {
            return;
        }
        
        this._drawTiles();
        
        if (this.options.radii)
        {
            var zoom = this._map.getZoom();
            this.setOptions({radius:this.options.radii[zoom][0], blur:this.options.radii[zoom][1]}, true);
        }
        
        var data = [],
            r = this._heat._r,
            size = this._map.getSize(),
            bounds = new L.Bounds(
                L.point([-r, -r]),
                size.add([r, r])),

            max = this.options.max === undefined ? 1 : this.options.max,
            maxZoom = this.options.maxZoom === undefined ? this._map.getMaxZoom() : this.options.maxZoom,
            v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - this._map.getZoom(), 12))),
            cellSize = r / 2,
            grid = [],
            panePos = this._map._getMapPanePos(),
            offsetX = panePos.x % cellSize,
            offsetY = panePos.y % cellSize,
            i, len, p, cell, x, y, j, len2, k;

        // console.time('process');
        for (i = 0, len = this._latlngs.length; i < len; i++) {
            p = this._map.latLngToContainerPoint(this._latlngs[i]);
            if (bounds.contains(p)) {
                x = Math.floor((p.x - offsetX) / cellSize) + 2;
                y = Math.floor((p.y - offsetY) / cellSize) + 2;

                var alt =
                    this._latlngs[i].alt !== undefined ? this._latlngs[i].alt :
                    this._latlngs[i][2] !== undefined ? +this._latlngs[i][2] : 1;
                k = alt * v;

                grid[y] = grid[y] || [];
                cell = grid[y][x];

                if (!cell) {
                    grid[y][x] = [p.x, p.y, k];

                } else {
                    var denom = (cell[2] + k);
                    if (denom > 0)
                    {
                        cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k); // x
                        cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k); // y
                    }
                    cell[2] += k; // cumulated intensity value
                }
            }
        }

        for (i = 0, len = grid.length; i < len; i++) {
            if (grid[i]) {
                for (j = 0, len2 = grid[i].length; j < len2; j++) {
                    cell = grid[i][j];
                    if (cell) {
                        data.push([
                            Math.round(cell[0]),
                            Math.round(cell[1]),
                            Math.min(cell[2], max)
                        ]);
                    }
                }
            }
        }
        
        // console.timeEnd('process');
        
        if (this.sortMethod)
        {
            data.sort(this.sortMethod);
        }
        
        /* The code above reduces th data to a summary grid, while this code below would put all data into the simpleheat module directly...the above is better for mobile devices.
        var data = []
        for (var i = 0, len = this._latlngs.length; i < len; i++)
        {
            var latLng = this._latlngs[i];
            var p = this._map.latLngToContainerPoint(latLng);
            var alt = latLng.alt ? latLng.alt : latLng[2];
            data.push([p.x, p.y, Math.min(alt, (this.options.max ? this.options.max : 1))]);
        }
        */
        
        // console.time('draw ' + data.length);
        this._heat.data(data)
        // console.timeEnd('draw ' + data.length);
        
        if (!skipCanvasDraw)
        {
            this._heat.draw(this.options.minOpacity);
            this.drawBasemap();
            this._paintCtx.drawImage(this._heatCanvas, 0, 0);
            this._ctx.drawImage(this._paintCanvas,0,0);
        }
        
        this._frame = null;
    },
    
    animationId: -1,
    
    drawAnimated: function(duration, framerate, oozeMode, targetVideoTime)
    {
        this.fire('animation-start');
        this._redraw(true);
        this._disableRedraw = true;
        if (this._drawAnimatedTimeout)
        {
            clearTimeout(this._drawAnimatedTimeout);
            if (this._isPlayingVideo && targetVideoTime && this._videoSource.currentType == 0)
            {
                setTimeout(function(){
                    if (iPhone)
                    {
                        this._audioSource.play();
                        this._audioSource.currentTime = 0;
                    }
                    else
                    {
                        this._videoSource.play();
                    }
                },10);
            }
        }
        
        var curSet = 0;
        var pointsPerSet = -1;
        if (!this._isPlayingVideo || !targetVideoTime)
        {
            var pointsPerSet = Math.round(this._heat._data.length / (duration * framerate));
        }
        
		// 'use strict' at the start of this requires the following functions to be defined outside of the 'if' block that follows...
        
		// Used when incrementally drawing sets of data per frame...
		var drawSet = $.proxy(function(start){
            
            if (start) this.animationId += 1;
            
            if (this._isPlayingVideo && targetVideoTime) curSet = this._videoSource.currentTime;
            
			this._heat.draw(this.options.minOpacity, curSet > 0, curSet, pointsPerSet, (this._isPlayingVideo && targetVideoTime) ? duration : false)
			this._drawTiles();
			var isLastFrame = (this._isPlayingVideo && targetVideoTime) ? curSet>=duration : curSet*pointsPerSet >= this._heat._data.length;
			this.drawBasemap(curSet==0,-1,isLastFrame);
			this._paintCtx.drawImage(this._heatCanvas, 0, 0);
            this._ctx.drawImage(this._paintCanvas,0,0);
            
            
            if (!this._isPlayingVideo || !targetVideoTime) curSet += 1;
            
			if (!isLastFrame)
			{
				this._drawAnimatedTimeout = setTimeout(function(){drawSet();}, 1000/framerate);
			}
			else
			{
				this._disableRedraw = false;
                this.heatAnimationFinished();
			}
		},this);
		
		// Used when drawing all data per frame (e.g., to apply a threshold)...
		var heatPixels, thresholdIncrement, curThreshold, originalOpacity, numPixels;		
		var drawFrame = $.proxy(function(start){
            
            if (start) this.animationId += 1;
			
            for (var i = 0; i < numPixels; i++)
			{
				var a = i * 4 + 3;
				var rawPixel = this._heat._rawData.data[a];
				
				if (rawPixel >= curThreshold)
				{
					heatPixels.data[a] = originalOpacity[i];
				}
			}
			
			this._drawTiles();
			var isLastFrame = curThreshold <= 0;
			this.drawBasemap(start,curThreshold,isLastFrame);
			this._thresholdCtx.putImageData(heatPixels, 0, 0);
			this._paintCtx.drawImage(this._thresholdCanvas, 0, 0);
            this._ctx.drawImage(this._paintCanvas,0,0);
			
			curThreshold -= thresholdIncrement;
			
            
			if (!isLastFrame)
			{
				this._drawAnimatedTimeout = setTimeout(function(){drawFrame(false);}, 1000/framerate);
			}
			else
			{
				this._disableRedraw = false;
                this.heatAnimationFinished();
			}
		},this);

        if (oozeMode=='radial')
        {
            drawSet(true);
        }
        else if (oozeMode=='threshold')
        {
			// For threshold, make sure the heat map is drawn so that we can get its initial data for drawing subsequent frames.
            this._heat.draw(this.options.minOpacity)
            heatPixels = this._heat._ctx.getImageData(0,0,this._canvas.width, this._canvas.height);
            thresholdIncrement = 255 / (duration * framerate);
            curThreshold = 255 - thresholdIncrement;
            originalOpacity = [];
            numPixels = heatPixels.data.length / 4;
            for (var i = 0; i < numPixels; i++)
            {
                var a = i*4+3;
                originalOpacity[i] = heatPixels.data[a];
                heatPixels.data[a] = 0;
            }
            
            drawFrame(true);
        }
    },
    
    heatIsDrawing: function()
    {
        return !!this._disableRedraw;
    },
    
    busy: function()
    {
        return (!!this._disableRedraw || !!this._tilesAnimating);
    },
    
    redrawCanvases: function(startAnimation, threshold, isLastFrame)
    {
        if (!this._paintCtx || this._disableRedraw) return;
        this._drawTiles();
        this.drawBasemap(startAnimation, threshold, isLastFrame);
        this.repaint();
    },
    
    repaint: function()
    {
        this._paintCtx.drawImage(this._heatCanvas, 0, 0);
        this._ctx.drawImage(this._paintCanvas, 0, 0);
    },

    _animateZoom: function (e) {
        var scale = this._map.getZoomScale(e.zoom),
            offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

        if (L.DomUtil.setTransform) {
            L.DomUtil.setTransform(this._canvas, offset, scale);

        } else {
            this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
        }
    },
    
    drawBasemap: function(start, threshold, heatAnimationDone)
    {
        switch (true)
        {
            case (this.basemapDrawMethod=="explode-after" && (!tiles || tiles.length == 0)):
                this._paintCtx.drawImage(this._imageCanvas, 0, 0);
                break;
                
            case (this.basemapDrawMethod=="copy"):
                this._paintCtx.drawImage(this._imageCanvas, 0, 0);
                break;
                
            case (this.basemapDrawMethod=="explode-during" && this.heatIsDrawing()):
                processTileAnimationFrame(start, threshold);
                break;
            
            case (this.basemapDrawMethod=="explode-during" && !this.busy()):
                this._paintCtx.drawImage(this._imageCanvas, 0, 0);
                break;
            
            default:
                return
        }
    },
    
    heatAnimationFinished: function()
    {
        if (this.basemapDrawMethod=="explode-after")
            processTileAnimationFrameAfter(true, 0);
        else if (this.basemapDrawMethod=="explode-during")
            processTileAnimationFrame(false, 0);
        else
            this.fire('animation-end');
    }
});

L.heatLayer = function (latlngs, options) {
    return new L.HeatLayer(latlngs, options);
};
