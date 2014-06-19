/**
 * VICTORIA -- Fast WebGL and React sheet music rendering
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require('underscore');
var assert = require('assert');

var DOMPropertyOperations = require('react/lib/DOMPropertyOperations');
var ReactBrowserComponentMixin = require('react/lib/ReactBrowserComponentMixin');
var ReactComponent = require('react/lib/ReactComponent');
var ReactMount = require('react/lib/ReactMount');
var ReactMultiChild = require('react/lib/ReactMultiChild');
var ReactDOMComponent = require('react/lib/ReactDOMComponent');
var ReactUpdates = require('react/lib/ReactUpdates');

var ReactComponentMixin = ReactComponent.Mixin;

var mixInto = require('react/lib/mixInto');
var merge = require('react/lib/merge');

var SMuFL = require("../SMuFL.js");

var glyphFS = require("./glyph.fs");
var glyphVS = require("./glyph.vs");
var rectFS = require("./rect.fs");
var rectVS = require("./rect.vs");
var circleVS = require("./circle.vs");
var circleFS = require("./circle.fs");
var pixmapData = require("./bravura48PixmapData.json");

var BLANK_PROPS = {};

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

function createComponent(name) {
    var VictoriaComponent = function() {};
    VictoriaComponent.displayName = name;
    for (var i = 1, l = arguments.length; i < l; i++) {
        mixInto(VictoriaComponent, arguments[i]);
    }

    var ConvenienceConstructor = function(props, children) {
        var instance = new VictoriaComponent();
        // Children can be either an array or more than one argument
        instance.construct.apply(instance, arguments);
        return instance;
    };
    
    // Expose the convience constructor on the prototype so that it can be
    // easily accessed on descriptors. E.g. <Foo />.type === Foo.type
    // This for consistency with other descriptors and future proofing.
    ConvenienceConstructor.type = VictoriaComponent;
    VictoriaComponent.prototype.type = VictoriaComponent;

    return ConvenienceConstructor;
}

var ContainerMixin = merge(ReactMultiChild.Mixin, {
    /**
     * Creates a child component.
     *
     * @param {ReactComponent} child Component to create.
     * @param {object} childNode ART node to insert.
     * @protected
     */
    createChild: function(child, childNode) {
        child._mountImage = childNode;
        var mostRecentlyPlacedChild = this._mostRecentlyPlacedChild;
        if (mostRecentlyPlacedChild == null) {
            // I'm supposed to be first.
            if (this.node.firstChild) {
                childNode.injectBefore(this.node.firstChild);
            } else {
                childNode.inject(this.node);
            }
        } else {
            // I'm supposed to be after the previous one.
            if (mostRecentlyPlacedChild.nextSibling) {
                childNode.injectBefore(mostRecentlyPlacedChild.nextSibling);
            } else {
                childNode.inject(this.node);
            }
        }
        this._mostRecentlyPlacedChild = childNode;
    },

    /**
     * Removes a child component.
     *
     * @param {ReactComponent} child Child to remove.
     * @protected
     */
    removeChild: function(child) {
        child._mountImage.eject();
        child._mountImage = null;
    },

    /**
     * Override to bypass batch updating because it is not necessary.
     *
     * @param {?object} nextChildren.
     * @param {ReactReconcileTransaction} transaction
     * @internal
     * @override {ReactMultiChild.Mixin.updateChildren}
     */
    updateChildren: function(nextChildren, transaction) {
        this._mostRecentlyPlacedChild = null;
        this._updateChildren(nextChildren, transaction);
    },

    // Shorthands

    mountAndInjectChildren: function(children, transaction) {
        var mountedImages = this.mountChildren(
            children,
            transaction);
        // Each mount image corresponds to one of the flattened children
        var i = 0;
        for (var key in this._renderedChildren) {
            if (this._renderedChildren.hasOwnProperty(key)) {
                var child = this._renderedChildren[key];
                child._mountImage = mountedImages[i];
                if (mountedImages[i].inject) {
                    mountedImages[i].inject(this.node);
                } else {
                    //console.warn(mountedImages[i], "is not a Victoria component");
                }
                i++;
            }
        }
    }
});

/**
 * GROUPS
 */

var VGNode = function() {
    this.rects = [];
    this.circles = [];
    this.glyphs = [];
    this.children = [];
};
VGNode.prototype.inject = function(n) {
    if (this.injected) {
        return;
    }
    this._parent = n;
    this.injected = true;
    n.injectChild(this, "children");
}
VGNode.prototype.eject = function() {
    this._parent.ejectChild(this, "children");
    this._parent = null;
}
VGNode.prototype.injectChild = function(child, type) {
    this[type].push(child);
}
VGNode.prototype.ejectChild = function(child, type) {
    var found = false;
    for (var i = 0; i < this[type].length; ++i) {
        if (this[type][i] === child) {
            this[type].splice(i, 1);
            found = true;
            break;
        }
    }
    assert(found);
}

var VG = createComponent(
    'VG',
    ReactComponentMixin,
    ContainerMixin, {

    mountComponent: function(transaction) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VGNode;
        this.applyGroupProps(BLANK_PROPS, this.props);
        this.mountAndInjectChildren(this.props.children, transaction);
        this.node.props = this.props;
        return this.node;
    },

    receiveComponent: function(nextComponent, transaction) {
        var props = nextComponent.props;
        this.applyGroupProps(this.props, props);
        this.updateChildren(props.children, transaction);
        this.node.props = this.props = props;
    },

    applyGroupProps: function(oldProps, props) {
        // pass
    },

    unmountComponent: function() {
        this.unmountChildren();
    }
});

/**
 * GLYPHS
 */

var VGlyphNode = function() {};
VGlyphNode.prototype.inject = function(n) {
    if (this.injected) {
        return;
    }
    this._parent = n;
    this.injected = true;
    n.injectChild(this, "glyphs");
}
VGlyphNode.prototype.eject = function() {
    this._parent.ejectChild(this, "glyphs");
    this._parent = null;
}

pixmapData.glyphs.forEach((g, idx) => g.idx = idx);
var idxByUnicode = _(pixmapData.glyphs).indexBy("code");

var VGlyph = createComponent(
    'VGlyph',
    ReactComponentMixin, {

    mountComponent: function(transaction) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VGlyphNode;
        this.node.props = this.props;
        this.node.idx = this.getIDX(this.props);
        return this.node;
    },

    receiveComponent: function(nextComponent, transaction) {
        var props = nextComponent.props;
        this.node.props = this.props = props;
        this.node.idx = this.getIDX(props);
    },

    applyGroupProps: function(oldProps, props) {
        // pass
    },

    unmountComponent: function() {
    },

    getIDX: function(props) {
        return idxByUnicode[SMuFL.getGlyphCode(props.glyphName)].idx;
    }
});

/**
 * RECTS
 */

var VRectNode = function() {};
VRectNode.prototype.inject = function(n) {
    if (this.injected) {
        return;
    }
    this._parent = n;
    n.injectChild(this, "rects");
}
VRectNode.prototype.eject = function() {
    this._parent.ejectChild(this, "rects");
    this._parent = null;
}

var VRect = createComponent(
    'VRect',
    ReactComponentMixin, {

    mountComponent: function(transaction) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VRectNode;
        this.node.props = this.props;
        this.setDefaults(this.props);
        return this.node;
    },

    receiveComponent: function(nextComponent, transaction) {
        var props = nextComponent.props;
        this.node.props = this.props = props;
        this.setDefaults(this.props);
    },

    setDefaults: function(props) {
        props.stroke = props.stroke || "#000000";
        props.fill = props.fill || "#000000";
        props.skewY = props.skewY || 0;
    },

    unmountComponent: function() {
    }
});


/**
 * CIRCLES
 */


var VCircleNode = function() {};
VCircleNode.prototype.inject = function(n) {
    if (this.injected) {
        return;
    }
    this._parent = n;
    this.injected = true;
    n.injectChild(this, "circles");
}
VCircleNode.prototype.eject = function() {
    this._parent.ejectChild(this, "circles");
    this._parent = null;
}

var VCircle = createComponent(
    'VCircle',
    ReactComponentMixin, {

    mountComponent: function(transaction) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VCircleNode;
        this.node.props = this.props;
        return this.node;
    },

    receiveComponent: function(nextComponent, transaction) {
        var props = nextComponent.props;
        this.node.props = this.props = props;
    },

    unmountComponent: function() {
    }
});


var HelloGL = createComponent(
    'HelloGL',
    ReactDOMComponent.Mixin,
    ReactComponentMixin,
    ContainerMixin,
    ReactBrowserComponentMixin, {

    mountComponent: function(rootID, transaction, mountDepth) {
        this.state = this.getInitialState();
        this.node = {
            injectChild: (node, type) => {
                this.node[type].push(node);
            },
            ejectChild: (node, type) => {
                var g = this.node[type].indexOf(node);
                if (g !== -1) {
                    this.node[type].splice(g, 1);
                }
            },
            glyphs: [],
            rects: [],
            circles: [],
            children: []
        };
        ReactComponentMixin.mountComponent.call(
            this,
            rootID,
            transaction,
            mountDepth);
        transaction.getReactMountReady().enqueue(this, this.componentDidMount);

        var idMarkup = DOMPropertyOperations.createMarkupForID(rootID);
        return '<canvas ' + idMarkup + ' style="width: 100%; height: 100%; position: relative"><canvas>';
    },
    
    fillAvailableSpace: function() {
        var gl = this.node.gl;
        this.width = gl.canvas.drawingBufferWidth;
        this.height = gl.canvas.drawingBufferWidth;
        this.aspectRatio = gl.canvas.width / gl.canvas.height;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    },

    getInitialState: function() {
        return {
            width: null,
            height: null
        };
    },
    componentDidMount: function() {
        var props = this.props;

        var transaction = ReactComponent.ReactReconcileTransaction.getPooled();
        transaction.perform(
            this.mountAndInjectChildren,
            this,
            props.children,
            transaction
        );
        ReactComponent.ReactReconcileTransaction.release(transaction);

        this.props = props;
        this.initGL();
    },
    receiveComponent: function(nextComponent, transaction) {
        var props = nextComponent.props;
        var node = this.node;

        this._updateDOMProperties(props);

        this.updateChildren(props.children, transaction);

        if (node.render) {
            node.render();
        }

        this.props = props;
        this.paint();
    },
    paint: function() {
        var gl = this.node.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        window.CS = window.CS || 0;
        if (window.CS++ < 100) {
            gl.bindTexture(gl.TEXTURE_2D, this.node.spiritTexture);
        }

        ///
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squareTexBuffer);
        gl.vertexAttribPointer(this.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        gl.useProgram(this.node.rectProgram);

        var rects = [];
        var glyphs = [];
        var circles = [];
        var children = [this.node];
        
        var splice = Array.prototype.splice;
        var push = Array.prototype.push;
        while (children.length) {
            push.apply(rects, children[0].rects);
            push.apply(glyphs, children[0].glyphs);
            push.apply(circles, children[0].circles);

            splice.apply(children, [0, 1].concat(children[0].children));
        }

        var oldRed, oldGreen, oldBlue, oldSkew;

        rects.forEach(rect => {
            var x = rect.props.x1;
            var y = rect.props.y1;
            var width = rect.props.x2 - rect.props.x1;
            var height = rect.props.y2 - rect.props.y1;
            var skewY = rect.props.skewY;

            var color = rect.props.fill;

            gl.uniform4f(this.node.rectUniforms.posInfo,
                x/(this.stepsInWidth/2) - 1,
                1 - (y + height)/(this.stepsInWidth/this.aspectRatio/2),
                width/(this.stepsInWidth/2),
                height/(this.stepsInWidth/this.aspectRatio/2));

            var red = parseInt(color.slice(1, 1 + 2), 16)/255;
            var green = parseInt(color.slice(3, 3 + 2), 16)/255;
            var blue = parseInt(color.slice(5, 5 + 2), 16)/255;
            var skew = skewY/(this.stepsInWidth/this.aspectRatio/2);

            if (red !== oldRed || green !== oldGreen || blue !== oldBlue || skew !== oldSkew) {
                gl.uniform4f(this.node.rectUniforms.colorAndSkew,
                    red,
                    green,
                    blue,
                    skew);

                oldRed = red;
                oldGreen = green;
                oldBlue = blue;
                oldSkew = skew;
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        });

        var oldRed, oldGreen, oldBlue, oldIDX;

        gl.useProgram(this.node.glyphProgram);
        glyphs.forEach(glyph => {
            var i = glyph.idx;
            var x = glyph.props.x;
            var y = glyph.props.y;

            var rect = pixmapData.glyphs[i].rect.split(" ");
            var offset = pixmapData.glyphs[i].offset.split(" ");

            var startX = rect[0]/pixmapData.totalWidth;
            var endX = startX + rect[2]/pixmapData.totalWidth;
            var startY = 1 - (rect[1])/pixmapData.totalHeight;
            var endY = startY - rect[3]/pixmapData.totalHeight;

            var color = glyph.props.fill;

            if (oldIDX !== i) {
                oldIDX = i;
                gl.uniform4f(this.node.glyphUniforms.texCoords,
                    startX, endX,
                    startY, endY);
            }

            var offsetX = offset[0]/pixmapData.totalWidth;
            var offsetY = offset[1]/pixmapData.totalHeight;

            var allheight = pixmapData.height/pixmapData.totalHeight;

            gl.uniform4f(this.node.glyphUniforms.posInfo,
                x/(this.stepsInWidth/2) + 0.0014*offset[0] - 1,
                1 - y/(this.stepsInWidth/this.aspectRatio/2) + this.aspectRatio*(offsetY + startY - endY)*-4 + this.aspectRatio/8,
                (endX - startX)/(this.stepsInWidth/2)*pixmapData.height/4,
                (startY - endY)/(this.stepsInWidth/this.aspectRatio/2)*pixmapData.height/4);

            var red = parseInt(color.slice(1, 1 + 2), 16)/255;
            var green = parseInt(color.slice(3, 3 + 2), 16)/255;
            var blue = parseInt(color.slice(5, 5 + 2), 16)/255;

            if ( red !== oldRed || green !== oldGreen || blue !== oldBlue) {
                gl.uniform3f(this.node.glyphUniforms.color,
                    red,
                    green,
                    blue);

                oldRed = red;
                oldGreen = green;
                oldBlue = blue;
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        });


        gl.bindBuffer(gl.ARRAY_BUFFER, this.radTexBuffer);
        gl.vertexAttribPointer(this.vertexTexCoordAttribute, 1, gl.FLOAT, false, 0, 0);

        gl.useProgram(this.node.circleProgram);
        circles.forEach(circles => {
            var cx = circle.props.cx;
            var cy = circle.props.cy;
            var radius = circle.props.radius;

            var color = circle.props.fill;

            gl.uniform4f(this.node.circleUniforms.circleInfo,
                (cx + radius)/(this.stepsInWidth/2) - 1,
                1 - (radius + cy)/(this.stepsInWidth/this.aspectRatio/2),
                radius/(this.stepsInWidth/2),
                radius/(this.stepsInWidth/this.aspectRatio/2));

            gl.uniform3f(this.node.circleUniforms.color,
                parseInt(color.slice(1, 1 + 2), 16)/255,
                parseInt(color.slice(3, 3 + 2), 16)/255,
                parseInt(color.slice(5, 5 + 2), 16)/255);

            gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_RESOLUTION);
        });
    },
    componentWillUnmount: function() {
        ReactComponentMixin.unmountComponent.call(this);
        this.unmountChildren();
    },

    initGL: function() {
        var canvas = this.getDOMNode();
        
        try {
            this.node.gl = canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl");
        } catch(e) {}
        
        if (!this.node.gl) {
            alert("Unable to initialize WebGL. Your browser may not support it.");
            this.node.gl = null;
            return;
        }

        var gl = this.node.gl;

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);

        var rectangle = [
            1, 1,
            0, 1,
            1, 0,
            0, 0
        ];

        var rads = [];
        var twoPI = 2*Math.PI;
        for (var i = 0; i < CIRCLE_RESOLUTION; ++i) {
            rads.push(twoPI*i/(CIRCLE_RESOLUTION - 1));
        }

        ////////////
        // GLYPHS //
        ////////////

        var glyphProgram = this.newProgram(glyphVS, glyphFS);
        gl.useProgram(glyphProgram);
        
        this.vertexTexCoordAttribute = gl.getAttribLocation(glyphProgram, "vTexCoord");
        gl.enableVertexAttribArray(this.vertexTexCoordAttribute);

        this.squareTexBuffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squareTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectangle), gl.STATIC_DRAW);
        gl.vertexAttribPointer(this.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        this.node.glyphProgram = glyphProgram;
        this.node.glyphUniforms = {
            texCoords: gl.getUniformLocation(glyphProgram, 'uGlyphInfo'),
            posInfo: gl.getUniformLocation(glyphProgram, 'uPosInfo'),
            color: gl.getUniformLocation(glyphProgram, 'uColor')
        };

        ////////////////
        // RECTANGLES //
        ////////////////

        var rectProgram = this.newProgram(rectVS, rectFS);
        gl.useProgram(rectProgram);

        var vertexTexCoordAttribute = gl.getAttribLocation(rectProgram, "vTexCoord");
        gl.enableVertexAttribArray(vertexTexCoordAttribute);
        
        this.node.rectProgram = rectProgram;
        this.node.rectUniforms = {
            posInfo: gl.getUniformLocation(rectProgram, 'uPosInfo'),
            colorAndSkew: gl.getUniformLocation(rectProgram, 'uColorAndSkew')
        };

        /////////////
        // CIRCLES //
        /////////////

        var circleProgram = this.newProgram(circleVS, circleFS);
        gl.useProgram(circleProgram);

        this.radCoordAttribute = gl.getAttribLocation(circleProgram, "vRad");
        gl.enableVertexAttribArray(this.radCoordAttribute);
        
        this.radTexBuffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.radTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rads), gl.STATIC_DRAW);
        gl.vertexAttribPointer(this.radCoordAttribute, 1, gl.FLOAT, false, 0, 0);

        this.node.circleProgram = circleProgram;
        this.node.circleUniforms = {
            circleInfo: gl.getUniformLocation(circleProgram, 'uCircleInfo'),
            color: gl.getUniformLocation(circleProgram, 'uColor')
        };

        ////////////////

        this.node.spiritTexture = loadImageTexture(gl, "/res/bravura48.png");
        this.node.gl = gl;
    },
    newProgram: function(vsSRC, fsSRC) {
        var gl = this.node.gl;

        var shaderProgram = gl.createProgram();

        var vs = gl.createShader(gl.VERTEX_SHADER)
        gl.shaderSource(vs, vsSRC()); 
        gl.compileShader(vs);
        gl.attachShader(shaderProgram, vs);

        var fs = gl.createShader(gl.FRAGMENT_SHADER)
        gl.shaderSource(fs, fsSRC()); 
        gl.compileShader(fs);
        gl.attachShader(shaderProgram, fs);

        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Unable to initialize the shader program.");
        }

        return shaderProgram;
    }
});

// Array of images curently loading
var g_loadingImages = [];

// Clears all the images currently loading.
// This is used to handle context lost events.
function clearLoadingImages() {
    for (var ii = 0; ii < g_loadingImages.length; ++ii) {
        g_loadingImages[ii].onload = undefined;
    }
    g_loadingImages = [];
}

//
// loadImageTexture
//
// Load the image at the passed url, place it in a new WebGLTexture object and return the WebGLTexture.
//
function loadImageTexture(ctx, url)
{
    var texture = ctx.createTexture();
    ctx.bindTexture(ctx.TEXTURE_2D, texture);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, 1, 1, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
    var image = new Image();
    g_loadingImages.push(image);
    image.onload = function() { doLoadImageTexture(ctx, image, texture) }
    image.src = url;
    return texture;
}

function doLoadImageTexture(ctx, image, texture)
{
    g_loadingImages.splice(g_loadingImages.indexOf(image), 1);
    ctx.bindTexture(ctx.TEXTURE_2D, texture);
    ctx.texImage2D(
        ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, image);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.bindTexture(ctx.TEXTURE_2D, null);
}

var CIRCLE_RESOLUTION = 40;

module.exports = React.createClass({
    render: function() {
        return <HelloGL ref="glContext">
            {this.props.children}
        </HelloGL>;
    },

    /**
     * Called whenever the window is resized, whether or not the node has actually
     * changed sizes.
     */
    updateDimensions: function() {
        var canvas = this.getDOMNode();
        var r = canvas.getBoundingClientRect();

        canvas.width = Math.round(canvas.clientWidth*window.devicePixelRatio);
        canvas.height = Math.round(canvas.clientHeight*window.devicePixelRatio);
        this.refs.glContext.stepsInWidth = this.props.widthInSpaces;
        this.refs.glContext.fillAvailableSpace();
    },

    componentDidUpdate: function(oldProps) {
        if (this.props.widthInSpaces !== oldProps.widthInSpaces) {
            this.updateDimensions();
        }
        this.refs.glContext.paint();
        this.setupListeners();
    },

    componentDidMount: function() {
        window.addEventListener("resize", this.updateDimensions);
        this.updateDimensions();
        this.refs.glContext.paint();

        this.setupListeners();
    },

    setupListeners: function() {
        var canvas = this.getDOMNode();
        canvas.onmousedown = this.props.onMouseDown;
        canvas.onmouseup = this.props.onMouseUp;
        canvas.onmousemove = this.props.onMouseMove;
        canvas.onclick = this.props.onClick;
    },

    componentWillUnmount: function() {
        window.removeEventListener("resize", this.updateDimensions);
    }
});
module.exports.VG = VG;
module.exports.VRect = VRect;
module.exports.VGlyph = VGlyph;
