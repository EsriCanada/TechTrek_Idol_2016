'use strict';

if (typeof module !== 'undefined') module.exports = simpleheat;

function simpleheat(canvas) {
    if (!(this instanceof simpleheat)) return new simpleheat(canvas);

    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;

    this._max = 1;
    this._data = [];
}

simpleheat.prototype = {

    defaultRadius: 25,

    defaultGradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },

    data: function (data) {
        this._data = data;
        return this;
    },

    max: function (max) {
        this._max = max;
        return this;
    },

    add: function (point) {
        this._data.push(point);
        return this;
    },

    clear: function () {
        this._data = [];
        return this;
    },

    radius: function (r, blur) {
        blur = blur === undefined ? 15 : blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        var circle = this._circle = this._createCanvas(),
            ctx = circle.getContext('2d'),
            r2 = this._r = r + blur;

        circle.width = circle.height = r2 * 2;

        ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
        ctx.shadowBlur = blur;
        ctx.shadowColor = 'black';

        ctx.beginPath();
        ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        return this;
    },

    resize: function () {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient: function (grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var canvas = this._createCanvas(),
            ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        for (var i in grad) {
            gradient.addColorStop(+i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },
    
    draw: function (minOpacity, keepContext, set, setCount, maxDuration) {
        if (this._disableRedraw) return;
        if (!this._circle) this.radius(this.defaultRadius);
        if (!this._grad) this.gradient(this.defaultGradient);
        if (set && set == this._previousSet) return;
        
        var ctx = this._ctx;
        
        if (!keepContext) ctx.clearRect(0, 0, this._width, this._height);
        
        // Default to all data if no setCount is provided...
        if (!setCount)
        {
            setCount = this._data.length;
        }
        
        var offset = 0;
        
        if (set)
        {
            // If maxDuration is not provided, then 'set' is interpreted as a sequential equal-sized set of points to incrementally draw on the heatmap...
            if (!maxDuration)
            {
                offset = set * setCount;
            }
            
            // Otherwise, 'set' is interpreted a proportion of 'maxDuration' - and the range of points will be determined based on the pevious set.
            else
            {
                if (this._previousSet  && this._previousSet < set)
                {
                    offset = Math.floor(this._data.length * this._previousSet / maxDuration )
                }
                // If maxDuration is being used, then the setCount argument will be overridden...
                setCount = Math.floor(this._data.length * set / maxDuration ) - offset;
            }
        }
        
        // If we have no points to draw for this set, exit...
        if (!setCount) return;
        
        // draw a grayscale heatmap by putting a blurred circle at each data point
        for (var i = 0, p; i < setCount && (i+offset) < this._data.length; i++) {
            p = this._data[i + offset];
            ctx.globalAlpha = Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity);
            ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
        }
        
        try
        {
            this._rawData = ctx.getImageData(0, 0, this._width, this._height);

            // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
            var colored = new ImageData(this._rawData.data, this._width, this._height);
            this._colorize(colored.data, this._grad);
            ctx.putImageData(colored, 0, 0);
        }
        catch (err)
        {
            console.log("Error:", err);
        }
        
        this._previousSet = set;
        
        return this;
    },
    
    _colorize: function (pixels, gradient) {
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4; // get gradient color from opacity value

            if (j) {
                pixels[i] = gradient[j];
                pixels[i + 1] = gradient[j + 1];
                pixels[i + 2] = gradient[j + 2];
            }
        }
    },

    _createCanvas:function() {
        if (typeof document !== 'undefined') {
            return document.createElement('canvas');
        } else {
            // create a new canvas instance in node.js
            // the canvas class needs to have a default constructor without any parameter
            return new this._canvas.constructor();
        }
    }
};
