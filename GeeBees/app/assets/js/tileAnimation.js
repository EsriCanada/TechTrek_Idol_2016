/* adapted from this demo: http://craftymind.com/factory/html5video/CanvasVideo.html */

var TILE_HEIGHT;
var TILE_WIDTH;
var TILE_OFFSET_W;
var TILE_OFFSET_H;
var SHADOW_OFFSET_W;
var SHADOW_OFFSET_H;
var RAD = Math.PI/180;
var defaultTilesPerAxis = 24;
var minTileSize = 24;
var maxTileSize = 48;
var ua = navigator.userAgent;
var useShadows = !(/iPhone|iPod|iPad/.test(navigator.platform) || ua.indexOf("Android") >= 0 || ua.indexOf("BlackBerry") >= 0 || ua.indexOf("(BB") >= 0);
var forceFudge = (ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0 || ua.indexOf('Edge/') >= 0) ? 5 : 0;

var shadowColor = '#000000';
var shadowBlur, shadowOffsetX, shadowOffsetY;

function Tile(){
	this.originX = 0;
	this.originY = 0;
	this.currentX = 0;
	this.currentY = 0;
	this.rotation = 0;
	this.force = 0;
	this.z = 0;
	this.moveX= 0;
	this.moveY= 0;
    this.originalMoveX = 0;
    this.originalMoveY = 0;
	this.moveRotation = 0;
	this.originalMoveRotation = 0;
    this.dist = 0;
    this.animationId = -1;
    
    this.isOffset = function(){
        return (this.rotation != 0 || this.currentX != this.originX || this.currentY != this.originY);
    };
    
    this.isVisible = function(canvas){
        return (
            this.currentY > TILE_HEIGHT * -2 &&
            this.currentX > TILE_WIDTH * -2 &&
            this.currentY < canvas.height + TILE_HEIGHT * 2 &&
            this.currentX < canvas.width + TILE_WIDTH * 2
        );
    };
	
	this.imageX = 0;
	this.imageY = 0;
}

var tiles;
function createTiles(){
    if (!TILE_HEIGHT || !TILE_WIDTH)
    {
        TILE_HEIGHT = Math.min(Math.floor(gbHeat._imageCanvas.height / defaultTilesPerAxis), maxTileSize);
        TILE_WIDTH = Math.min(Math.floor(gbHeat._imageCanvas.width / defaultTilesPerAxis), TILE_HEIGHT);
        TILE_HEIGHT = Math.floor((TILE_WIDTH+TILE_HEIGHT) / 2);
        TILE_HEIGHT = TILE_WIDTH = Math.max(TILE_WIDTH, minTileSize);
        
        TILE_OFFSET_W = TILE_WIDTH / -2;
        TILE_OFFSET_H = TILE_HEIGHT / -2;
        
        SHADOW_OFFSET_W = 4;
        SHADOW_OFFSET_H = 4;
        
        shadowBlur = (TILE_HEIGHT+TILE_WIDTH) / 4;
        shadowOffsetX = TILE_WIDTH / 4;
        shadowOffsetY = TILE_HEIGHT / 4;
    }
    
    tiles = [];
    var offsetX = TILE_WIDTH/2;
	var offsetY = TILE_HEIGHT/2;
	var y=0;
	while(y < (gbHeat._imageCanvas.height + TILE_HEIGHT)){
		var x=0;
		while(x < (gbHeat._imageCanvas.width + TILE_WIDTH)){
			var tile = new Tile();
			tile.imageX = x;
			tile.imageY = y;
			tile.originX = offsetX+x;
			tile.originY = offsetY+y;
			tile.currentX = tile.originX;
			tile.currentY = tile.originY;
			tiles.push(tile);
			x+=TILE_WIDTH;
		}
		y+=TILE_HEIGHT;
	}
}

var explodeOrigin;
function explodeTiles(containerPoint){
    if(!tiles || tiles.length == 0)
    {
        createTiles();
    }
    
    explodeOrigin = containerPoint;
    
    //for(var i=0; i<tiles.length; i++){
		//var tile = tiles[i];
		
        //var xdiff = tile.currentX-explodeOrigin.x;
		//var ydiff = tile.currentY-explodeOrigin.y;
        //tile.dist = 0; //Math.sqrt(xdiff*xdiff + ydiff*ydiff);
		/*
        var randRange = 220+(Math.random()*30);
		var range = randRange-dist;
		var force = 3*(range/randRange);
        
		if(force > tile.force){
			tile.force = force;
			var radians = Math.atan2(ydiff, xdiff);
			tile.moveX = Math.cos(radians);
			tile.moveY = Math.sin(radians);
			tile.moveRotation = 0.5-Math.random();
		}
        */
        
        //var radians = Math.atan2(ydiff, xdiff);
        //tile.moveX = tile.originalMoveX = Math.cos(radians);
        //tile.moveY = tile.originalMoveY = Math.sin(radians);
        //tile.moveRotation = tile.originalMoveRotation = 0.5-Math.random();
        //tile.animationId = gbHeat.animationId;
	//}
	tiles.sort(sortTiles);
}

function sortTiles(a,b)
{
    var aIsOffset = a.isOffset();
    var bIsOffset = b.isOffset();
    if (aIsOffset && bIsOffset)
    {
        return a.dist - b.dist;
    }
    else if (aIsOffset)
    {
        return 1;
    }
    else if (bIsOffset)
    {
        return -1;
    }
}

var summaryHeatGrid;
function summarizeHeatGrid()
{
    summaryHeatGrid = [];
    var w = gbHeat._heat._rawData.width;
    //var h = gbHeat._heat._rawData.height;
    var numPixels = gbHeat._heat._rawData.data.length / 4
    for (var i = 0; i < numPixels; i++)
    {
        var y = Math.floor(i / w);
        var x = i % w;
        var sx = Math.floor(x / TILE_WIDTH);
        var sy = Math.floor(y / TILE_HEIGHT);
        
        var v = gbHeat._heat._rawData.data[i*4+3];
    
        if (summaryHeatGrid.length == sx)
        {
            summaryHeatGrid.push([]);
        }
        
        if (summaryHeatGrid[sx].length == sy)
        {
            summaryHeatGrid[sx].push(v);
        }
        else
        {
            summaryHeatGrid[sx][sy] = Math.max(summaryHeatGrid[sx][sy], v);
        }
        
    }
    return;
}

var tileDrawTimeOut;
var tileDrawTime;
var lastTileDrawTime;
var tileDrawRate;
var tileDrawLag = 0;
var keepDrawing = false;

function processTileAnimationFrame(startAnimation,threshold){
    if (tileDrawTimeOut) clearTimeout(tileDrawTimeOut);
    
    if (!threshold) threshold = 0;
    
    tileDrawRate = 1000/gbFrameRate;
    tileDrawLag = 0;
    
    if (startAnimation)
    {
        gbHeat._tilesAnimating = true;
        explodeTiles(map.latLngToContainerPoint(gbCenter));
        tileDrawTime = lastTileDrawTime = (new Date()).getTime();
    }
    else
    {
        tileDrawTime = (new Date()).getTime();
        tileDrawLag = (tileDrawTime - lastTileDrawTime - tileDrawRate) / tileDrawRate;
        lastTileDrawTime = tileDrawTime;
    }
    
    if(!tiles || tiles.length == 0)
    {
        createTiles();
    }
    
    gbHeat._paintCtx.fillStyle = "#FFFFFF";
    gbHeat._paintCtx.fillRect(0, 0, gbHeat._imageCanvas.width, gbHeat._imageCanvas.height);
	
    keepDrawing = false;
    
    // So...it seems like IE still needs an extra kick...plus radial seems to need an extra punch...
    var forceMultiplier = 7 + (gbOozeMode == "radial" ? 8 : 0) + forceFudge;
    
    if (gbHeat.heatIsDrawing())
    {
        summarizeHeatGrid();
        
        for(var i=0; i<tiles.length; i++){
            var tile = tiles[i];
            var gridX = Math.floor((tile.currentX + TILE_OFFSET_W)/ TILE_WIDTH);
            var gridY = Math.floor((tile.currentY + TILE_OFFSET_H)/ TILE_HEIGHT);
            
            if (gridX >= 0 && gridY >= 0 && gridX < summaryHeatGrid.length && gridY < summaryHeatGrid[gridX].length)
            {
                var nearestHeat = summaryHeatGrid[gridX][gridY];
                if (nearestHeat >= threshold)
                {
                    var heatForce = Math.log(nearestHeat * 10 / 256) * forceMultiplier;
                    if (heatForce > tile.force)
                    {
                        tile.force = heatForce;
                        if (tile.animationId != gbHeat.animationId)
                        {
                            tile.animationId = gbHeat.animationId;
                            var xdiff = tile.currentX-explodeOrigin.x;
                            var ydiff = tile.currentY-explodeOrigin.y;
                            tile.dist = Math.sqrt(xdiff*xdiff + ydiff*ydiff);
                            var radians = Math.atan2(ydiff, xdiff);
                            tile.moveX = tile.originalMoveX = Math.cos(radians);
                            tile.moveY = tile.originalMoveY = Math.sin(radians);
                            tile.moveRotation = tile.originalMoveRotation = 0.5-Math.random();
                        }
                        else
                        {
                            tile.moveX = tile.originalMoveX;
                            tile.moveY = tile.originalMoveY;
                            tile.moveRotation = tile.originalMoveRotation;
                        }
                    }
                }
            }
        }
	}
    else
    {
        if (gbHeat._isPlayingVideo) gbHeat.drawVideoFrame();
    }
    
    tiles.sort(sortTiles);
    
    drawTiles({forceDecay:0.75});
    
    if (!gbHeat.heatIsDrawing())
    {
        gbHeat.repaint();
    }
    
    if (keepDrawing)
    {
        if (!gbHeat.heatIsDrawing())
        {
            tileDrawTimeOut = setTimeout(function(){processTileAnimationFrame();}, tileDrawRate);
        }
    }
    else
    {
        gbHeat._tilesAnimating = false;
        if (!gbHeat.heatIsDrawing())
        {
            gbHeat.fire('animation-end');
        }
        tiles = false;
    }
}

var tileDrawAfterTimeOut;
function processTileAnimationFrameAfter(startAnimation){
    if (tileDrawAfterTimeOut) clearTimeout(tileDrawAfterTimeOut);
    
    tileDrawRate = 1000/gbFrameRate;
    tileDrawLag = 0;
    
    if (startAnimation)
    {
        gbHeat._tilesAnimating = true;
        explodeTiles(map.latLngToContainerPoint(gbCenter));
    }
    
    if(!tiles || tiles.length == 0)
    {
        createTiles();
    }
    
    gbHeat._drawTiles();
    gbHeat._paintCtx.fillStyle = "#FFFFFF";
    gbHeat._paintCtx.fillRect(0, 0, gbHeat._imageCanvas.width, gbHeat._imageCanvas.height);
	
    keepDrawing = false;
    
    // I found this to be the best value for exploding the tiles *after* the heat is done drawing...
    var forceMultiplier = 1.35;
    
    if (startAnimation)
    {
        summarizeHeatGrid();
    
        for(var i=0; i<tiles.length; i++){
            var tile = tiles[i];
            var gridX = Math.floor((tile.currentX + TILE_OFFSET_W)/ TILE_WIDTH);
            var gridY = Math.floor((tile.currentY + TILE_OFFSET_H)/ TILE_HEIGHT);
            
            if (gridX >= 0 && gridY >= 0 && gridX < summaryHeatGrid.length && gridY < summaryHeatGrid[gridX].length)
            {
                var nearestHeat = summaryHeatGrid[gridX][gridY];
                var heatForce = Math.log(nearestHeat * 10 / 256) * forceMultiplier;
                if (heatForce > tile.force)
                {
                    tile.force = heatForce;
                    if (tile.animationId != gbHeat.animationId)
                    {
                        tile.animationId = gbHeat.animationId;
                        var xdiff = tile.currentX-explodeOrigin.x;
                        var ydiff = tile.currentY-explodeOrigin.y;
                        tile.dist = Math.sqrt(xdiff*xdiff + ydiff*ydiff);
                        var radians = Math.atan2(ydiff, xdiff);
                        tile.moveX = tile.originalMoveX = Math.cos(radians);
                        tile.moveY = tile.originalMoveY = Math.sin(radians);
                        tile.moveRotation = tile.originalMoveRotation = 0.5-Math.random();
                    }
                    else
                    {
                        tile.moveX = tile.originalMoveX;
                        tile.moveY = tile.originalMoveY;
                        tile.moveRotation = tile.originalMoveRotation;
                    }
                }
            }
        }
	}
    
    tiles.sort(sortTiles);
    
    drawTiles({forceDecay:0.85});
    
    if (!gbHeat.heatIsDrawing()) gbHeat.repaint();
    
    if (keepDrawing)
    {
        tileDrawAfterTimeOut = setTimeout(function(){processTileAnimationFrameAfter();}, tileDrawRate);
    }
    else
    {
        gbHeat._tilesAnimating = false;
        if (!gbHeat.heatIsDrawing())
        {
            gbHeat.fire('animation-end');
        }
        tiles = false;
    }
}


function drawTiles(opts)
{
    for(var i=0; i<tiles.length; i++){
		var tile = tiles[i];
        
        var isOffset = tile.isOffset();
        
        if(tile.force > 0.0001){
			//expand
            
            tile.moveX *= tile.force;
			tile.moveY *= tile.force;
			tile.moveRotation *= tile.force;
			tile.currentX += tile.moveX;
			tile.currentY += tile.moveY;
			tile.rotation += tile.moveRotation;
			tile.rotation %= 360;
            tile.force *= opts.forceDecay;
            
            if (tileDrawLag != 0)
            {
                tile.force *= (opts.forceDecay * (1 - (1 - opts.forceDecay) * tileDrawLag));
            }
            
            tile.dist = Math.sqrt(Math.pow(tile.currentX-explodeOrigin.x,2) + Math.pow(tile.currentY-explodeOrigin.y,2));
		
		}else if(isOffset){
			//contract - but only if heat is not drawing (animating), or if the current animation is not the one that triggered this tile's force.
            if (!gbHeat.heatIsDrawing() || tile.animationId!=gbHeat.animationId)
            {
                var diffx = (tile.originX-tile.currentX)*0.1;
                var diffy = (tile.originY-tile.currentY)*0.1;
                var diffRot = (0-tile.rotation)*0.1;
                
                if(Math.abs(diffx) < 0.5){
                    tile.currentX = tile.originX;
                }else{
                    tile.currentX += diffx;
                }
                if(Math.abs(diffy) < 0.5){
                    tile.currentY = tile.originY;
                }else{
                    tile.currentY += diffy;
                }
                if(Math.abs(diffRot) < 0.5){
                    tile.rotation = 0;
                }else{
                    tile.rotation += diffRot;
                }
                tile.dist = Math.sqrt(Math.pow(tile.currentX-explodeOrigin.x,2) + Math.pow(tile.currentY-explodeOrigin.y,2));
            }
		
		}else{
			tile.force = 0;
            tile.dist = 0;
		}
        
        if (tile.force != 0) keepDrawing = true;
        
		gbHeat._paintCtx.save();
        gbHeat._paintCtx.shadowColor = 'black';
        gbHeat._paintCtx.translate(tile.currentX, tile.currentY);
        if (tile.isOffset() || tile.force > 0 || tile.rotation != 0)
        {
            if (tile.isVisible(gbHeat._canvas))
            {
                gbHeat._paintCtx.rotate(tile.rotation*RAD);
                if (useShadows)
                {
                    gbHeat._paintCtx.shadowBlur = shadowBlur;
                    gbHeat._paintCtx.shadowOffsetX = SHADOW_OFFSET_W;
                    gbHeat._paintCtx.shadowOffsetY = SHADOW_OFFSET_H;
                    gbHeat._paintCtx.fillStyle = 'black';
                    gbHeat._paintCtx.fillRect(TILE_OFFSET_W, TILE_OFFSET_H, TILE_WIDTH, TILE_HEIGHT);
                }
				else
				{
					gbHeat._paintCtx.fillStyle = 'black';
                    gbHeat._paintCtx.fillRect(TILE_OFFSET_W+2, TILE_OFFSET_H+2, TILE_WIDTH, TILE_HEIGHT);
				}
            }
        }
        gbHeat._paintCtx.drawImage(gbHeat._imageCanvas, tile.imageX, tile.imageY, TILE_WIDTH, TILE_HEIGHT, TILE_OFFSET_W, TILE_OFFSET_H, TILE_WIDTH, TILE_HEIGHT);
		gbHeat._paintCtx.restore();
	}
    
}