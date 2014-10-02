/**
 * @file VICTORIA -- Fast WebGL and React sheet music rendering.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");
var assert = require("assert");

var DOMPropertyOperations = require("react/lib/DOMPropertyOperations");
var ReactBrowserComponentMixin = require("react/lib/ReactBrowserComponentMixin");
var ReactComponent = require("react/lib/ReactComponent");
var ReactDOMComponent = require("react/lib/ReactDOMComponent");
var ReactDescriptor = require("react/lib/ReactDescriptor");
var ReactMultiChild = require("react/lib/ReactMultiChild");
var mixInto = require("react/lib/mixInto");
var merge = require("react/lib/merge");

var RiactUpdateTransaction = require("../../riactUpdateTransaction.js");
var SMuFL = require("../../util/SMuFL.ts");
var bezierFS = require("./bezier.fs");
var bezierVS = require("./bezier.vs");
var circleFS = require("./circle.fs");
var circleVS = require("./circle.vs");
var glyphFS = require("./glyph.fs");
var glyphVS = require("./glyph.vs");
var rectFS = require("./rect.fs");
var rectVS = require("./rect.vs");
var pixmapData = require("./bravura48PixmapData.json");
var globalGL = typeof global.gl === "undefined" ? null : global.gl;

var BLANK_PROPS = {};
var DEBUG_GLYPH_POSITION = false;
var ReactComponentMixin = ReactComponent.Mixin;


/**********************
 * LEGACY DESCRIPTORS *
 **********************/
var invariant = require("react/lib/invariant");

/**
 * Transfer static properties from the source to the target. Functions are
 * rebound to have this reflect the original source.
 */
function proxyStaticMethods(target, source) {
  if (typeof source !== 'function') {
    return;
  }
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      var value = source[key];
      if (typeof value === 'function') {
        var bound = value.bind(source);
        // Copy any properties defined on the function, such as `isRequired` on
        // a PropTypes validator. (mergeInto refuses to work on functions.)
        for (var k in value) {
          if (value.hasOwnProperty(k)) {
            bound[k] = value[k];
          }
        }
        target[key] = bound;
      } else {
        target[key] = value;
      }
    }
  }
}

var ReactLegacyDescriptorFactory = {};

ReactLegacyDescriptorFactory.wrapFactory = function(factory) {
  invariant(
    ReactDescriptor.isValidFactory(factory),
    'This is suppose to accept a descriptor factory'
  );
  var legacyDescriptorFactory = function(/*config, children*/) {
    // This factory should not be called when the new JSX transform is in place.
    // TODO: Warning - Use JSX instead of direct function calls.
    return factory.apply(this, arguments);
  };
  proxyStaticMethods(legacyDescriptorFactory, factory.type);
  legacyDescriptorFactory.isReactLegacyFactory = true;
  legacyDescriptorFactory.type = factory.type;
  return legacyDescriptorFactory;
};

/**********************
 * STUFF              *
 **********************/

global.requestAnimationFrame = global.requestAnimationFrame || global.mozRequestAnimationFrame ||
    global.webkitRequestAnimationFrame || global.msRequestAnimationFrame;

function createComponent(name) {
    var VictoriaComponent = function(descriptor) {
        this.construct(descriptor);
    };
    VictoriaComponent.displayName = name;
    for (var i = 1, l = arguments.length; i < l; i++) {
        mixInto(VictoriaComponent, arguments[i]);
    }

    var ConvenienceConstructor = ReactDescriptor.createFactory(VictoriaComponent);
    
    return ReactLegacyDescriptorFactory.wrapFactory(ConvenienceConstructor);
}

var ContainerMixin = merge(ReactMultiChild.Mixin, {
    /**
     * Creates a child component.
     *
     * @param {ReactComponent} child Component to create.
     * @param {object} childNode custom node to insert.
     * @protected
     */
    createChild: function(child, childNode) {
        child._mountImage = childNode;
        var mostRecentlyPlacedChild = this._mostRecentlyPlacedChild;
        if (mostRecentlyPlacedChild === null) {
            if (this.node.firstChild) {
                childNode.injectBefore(this.node.firstChild);
            } else {
                childNode.inject(this.node);
            }
        } else {
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
     * @param {RiactUpdateTransaction} transaction
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
                    console.warn(mountedImages[i], "is not a Victoria component");
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
    this.beziers = [];
    this.children = [];
};
VGNode.prototype.inject = function(n) {
    if (this.injected) {
        return;
    }
    this._parent = n;
    this.injected = true;
    n.injectChild(this, "children");
};
VGNode.prototype.eject = function() {
    this._parent.ejectChild(this, "children");
    this._parent = null;
};
VGNode.prototype.injectChild = function(child, type) {
    this[type].push(child);
};
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
};

var VG = createComponent(
    'VG',
    ReactComponentMixin,
    ContainerMixin, {

    mountComponent: function(rootID, transaction/*, mountDepth*/) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VGNode();
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

    applyGroupProps: function(/*oldProps, props*/) {
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
};
VGlyphNode.prototype.eject = function() {
    this._parent.ejectChild(this, "glyphs");
    this._parent = null;
};

_.each(pixmapData.glyphs, function(g, idx)  {
    g.idx = idx;
});
var idxByUnicode = _.indexBy(pixmapData.glyphs, "code");

var VGlyph = createComponent(
    'VGlyph',
    ReactComponentMixin, {

    mountComponent: function(/*rootID, transaction, mountDepth*/) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VGlyphNode();
        this.node.props = this.props;
        this.node.idx = this.getIDX(this.props);
        return this.node;
    },

    receiveComponent: function(nextComponent/*, transaction*/) {
        var props = nextComponent.props;
        this.node.props = this.props = props;
        this.node.idx = this.getIDX(props);
    },

    applyGroupProps: function(/*oldProps, props*/) {
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
};
VRectNode.prototype.eject = function() {
    this._parent.ejectChild(this, "rects");
    this._parent = null;
};

var VRect = createComponent(
    'VRect',
    ReactComponentMixin, {

    mountComponent: function(/*rootID, transaction, mountDepth*/) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VRectNode();
        this.node.props = this.props;
        this.setDefaults(this.props);
        return this.node;
    },

    receiveComponent: function(nextComponent/*, transaction*/) {
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
};
VCircleNode.prototype.eject = function() {
    this._parent.ejectChild(this, "circles");
    this._parent = null;
};

var VCircle = createComponent(
    'VCircle',
    ReactComponentMixin, {

    mountComponent: function(/*rootID, transaction, mountDepth*/) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VCircleNode();
        this.node.props = this.props;
        return this.node;
    },

    receiveComponent: function(nextComponent/*, transaction*/) {
        var props = nextComponent.props;
        this.node.props = this.props = props;
    },

    unmountComponent: function() {
    }
});


/**
 * BEZIER CURVES
 */


var VBezierNode = function() {};
VBezierNode.prototype.inject = function(n) {
    if (this.injected) {
        return;
    }
    this._parent = n;
    this.injected = true;
    n.injectChild(this, "beziers");
};
VBezierNode.prototype.eject = function() {
    this._parent.ejectChild(this, "bezier");
    this._parent = null;
};

var VBezier = createComponent(
    'VBezier',
    ReactComponentMixin, {

    mountComponent: function(/*rootID, transaction, mountDepth*/) {
        ReactComponentMixin.mountComponent.apply(this, arguments);
        this.node = new VBezierNode();
        this.node.props = this.props;
        return this.node;
    },

    receiveComponent: function(nextComponent/*, transaction*/) {
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
            injectChild: function(node, type)  {
                this.node[type].push(node);
            }.bind(this),
            ejectChild: function(node, type)  {
                var g = this.node[type].indexOf(node);
                if (g !== -1) {
                    this.node[type].splice(g, 1);
                }
            }.bind(this),
            glyphs: [],
            rects: [],
            circles: [],
            beziers: [],
            children: []
        };
        ReactComponentMixin.mountComponent.call(
            this,
            rootID,
            transaction,
            mountDepth);
        transaction.getReactMountReady().enqueue(this.componentDidMount, this);

        var idMarkup = DOMPropertyOperations.createMarkupForID(rootID);
        return '<canvas ' + idMarkup + ' style="' +
            'width: 100%; height: 100%; position: relative"><canvas>';
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

        var transaction = RiactUpdateTransaction.getPooled();
        transaction.perform(
            this.mountAndInjectChildren,
            this,
            props.children,
            transaction
        );
        RiactUpdateTransaction.release(transaction);

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
        var rects = [];
        var glyphs = [];
        var circles = [];
        var beziers = [];
        var children = [this.node];
        
        var splice = Array.prototype.splice;
        var push = Array.prototype.push;
        while (children.length) {
            push.apply(rects, children[0].rects);
            push.apply(glyphs, children[0].glyphs);
            push.apply(circles, children[0].circles);
            push.apply(beziers, children[0].beziers);

            splice.apply(children, [0, 1].concat(children[0].children));
        }

        var gl = globalGL || this.node.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        global.CS = global.CS || 0;
        if (global.CS++ < 100) {
            gl.bindTexture(gl.TEXTURE_2D, this.node.spiritTexture);
        }

        ///
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squareTexBuffer);
        gl.vertexAttribPointer(this.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        gl.useProgram(this.node.rectProgram);

        var oldRed, oldGreen, oldBlue, oldSkew, oldIDX;

        _.each(rects, function(rect)  {
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
        }.bind(this));

        var PNG_SPACE = 44; // 51 px @ 128 dpi

        if (DEBUG_GLYPH_POSITION) {
            _.each(glyphs, function(glyph)  {
                var i = glyph.idx;

                var rect = pixmapData.glyphs[i].rect.split(" ");
                var offset = pixmapData.glyphs[i].offset.split(" ");

                var fx = 1/PNG_SPACE/2;
                var fy = 1/PNG_SPACE/2;

                // Outer border
                var width = pixmapData.glyphs[i].width*fx;
                var height = pixmapData.height*fy;

                var x = glyph.props.x;
                var y = glyph.props.y - pixmapData.height*fy/2;

                gl.uniform4f(this.node.rectUniforms.posInfo,
                    x/(this.stepsInWidth/2) - 1,
                    1 - (y + height)/(this.stepsInWidth/this.aspectRatio/2),
                    width/(this.stepsInWidth/2),
                    height/(this.stepsInWidth/this.aspectRatio/2));

                var red = Math.random()/2 + 0.5;
                var green = 0;
                var blue = 0;

                if (red !== oldRed || green !== oldGreen || blue !== oldBlue) {
                    gl.uniform4f(this.node.rectUniforms.colorAndSkew,
                        red,
                        green,
                        blue,
                        0);

                    oldRed = red;
                    oldGreen = green;
                    oldBlue = blue;
                }

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                // Inner border
                
                width = pixmapData.glyphs[i].width*fx;
                height = rect[3]*fy;

                x = glyph.props.x;
                var actualOffsetX = (offset[1] - (pixmapData.height - rect[3])/2)*2;
                y = glyph.props.y - (rect[3]*1 - actualOffsetX)*fy/2;

                gl.uniform4f(this.node.rectUniforms.posInfo,
                    x/(this.stepsInWidth/2) - 1,
                    1 - (y + height)/(this.stepsInWidth/this.aspectRatio/2),
                    width/(this.stepsInWidth/2),
                    height/(this.stepsInWidth/this.aspectRatio/2));

                red = 0;
                green = Math.random()/2 + 0.5;
                blue = 0;

                if (red !== oldRed || green !== oldGreen || blue !== oldBlue) {
                    gl.uniform4f(this.node.rectUniforms.colorAndSkew,
                        red,
                        green,
                        blue,
                        0);

                    oldRed = red;
                    oldGreen = green;
                    oldBlue = blue;
                }

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            }.bind(this));
        }

        oldRed = oldGreen = oldBlue = oldIDX = null;

        gl.useProgram(this.node.glyphProgram);
        _.each(glyphs, function(glyph)  {
            var i = glyph.idx;

            // Outer border
            var rect = pixmapData.glyphs[i].rect.split(" ");
            var offset = pixmapData.glyphs[i].offset.split(" ");
            var actualOffsetY = Math.ceil((offset[1] - (pixmapData.height - rect[3])/2)*2);

            var fx = 1/PNG_SPACE/2;
            var fy = 1/PNG_SPACE/2;

            var width = rect[2]*fx;
            var height = rect[3]*fy;

            var x = glyph.props.x + offset[0]*fx;
            var y = glyph.props.y - (rect[3]*1 - actualOffsetY)*fy/2;

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            var startX = (rect[0]*1)/pixmapData.totalWidth;
            var endX = startX + (rect[2]*1)/pixmapData.totalWidth;
            var startY = 1 - (rect[1]*1)/pixmapData.totalHeight;
            var endY = startY - (rect[3]*1)/pixmapData.totalHeight;

            var color = glyph.props.fill;

            if (oldIDX !== i) {
                oldIDX = i;
                gl.uniform4f(this.node.glyphUniforms.texCoords,
                    startX, endX,
                    startY, endY);
            }

            gl.uniform4f(this.node.glyphUniforms.posInfo,
                x/(this.stepsInWidth/2) - 1,
                1 - (y + height)/(this.stepsInWidth/this.aspectRatio/2),
                width/(this.stepsInWidth/2),
                height/(this.stepsInWidth/this.aspectRatio/2));

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
        }.bind(this));


        gl.bindBuffer(gl.ARRAY_BUFFER, this.tTexBuffer);
        gl.vertexAttribPointer(this.vertexTexCoordAttribute, 1, gl.FLOAT, 0, 0, 0);

        gl.useProgram(this.node.circleProgram);
        _.each(circles, function(circle)  {
            var cx = circle.props.cx;
            var cy = circle.props.cy;
            var radius = circle.props.radius;

            var color = circle.props.fill;

            gl.uniform4f(this.node.circleUniforms.circleInfo,
                (cx)/(this.stepsInWidth/2) - 1,
                1 - (cy)/(this.stepsInWidth/this.aspectRatio/2),
                radius/(this.stepsInWidth/2),
                radius/(this.stepsInWidth/this.aspectRatio/2));

            gl.uniform3f(this.node.circleUniforms.color,
                parseInt(color.slice(1, 1 + 2), 16)/255,
                parseInt(color.slice(3, 3 + 2), 16)/255,
                parseInt(color.slice(5, 5 + 2), 16)/255);

            gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_RESOLUTION);
        }.bind(this));


        gl.bindBuffer(gl.ARRAY_BUFFER, this.tTexBuffer2);
        gl.vertexAttribPointer(this.vertexTexCoordAttribute, 1, gl.FLOAT, 0, 0, 0);

        gl.useProgram(this.node.bezierProgram);
        _.each(beziers, function(bezier)  {
            var color = bezier.props.fill;

            gl.uniform4f(this.node.bezierUniforms.x,
                (bezier.props.x1) / (this.stepsInWidth / 2) - 1,
                (bezier.props.x2) / (this.stepsInWidth / 2) - 1,
                (bezier.props.x3) / (this.stepsInWidth / 2) - 1,
                (bezier.props.x4) / (this.stepsInWidth / 2) - 1);

            gl.uniform4f(this.node.bezierUniforms.y,
                1 - (bezier.props.y1)/(this.stepsInWidth/this.aspectRatio/2),
                1 - (bezier.props.y2)/(this.stepsInWidth/this.aspectRatio/2),
                1 - (bezier.props.y3)/(this.stepsInWidth/this.aspectRatio/2),
                1 - (bezier.props.y4)/(this.stepsInWidth/this.aspectRatio/2));

            gl.uniform4f(this.node.bezierUniforms.r,
                (bezier.props.x5)/(this.stepsInWidth/2) - 1,
                1 - (bezier.props.y5)/(this.stepsInWidth/this.aspectRatio/2),
                (bezier.props.x6)/(this.stepsInWidth/2) - 1,
                1 - (bezier.props.y6)/(this.stepsInWidth/this.aspectRatio/2));

            gl.uniform4f(this.node.bezierUniforms.colorAndStroke,
                parseInt(color.slice(1, 1 + 2), 16)/255,
                parseInt(color.slice(3, 3 + 2), 16)/255,
                parseInt(color.slice(5, 5 + 2), 16)/255,
                0.03);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, BEZIER_RESOLUTION);
        }.bind(this));
    },
    componentWillUnmount: function() {
        ReactComponentMixin.unmountComponent.call(this);
        this.unmountChildren();
    },

    initGL: function() {
        var gl;
        if (!globalGL) {
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

            gl = this.node.gl;
        } else {
            gl = globalGL;
        }

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

        var ts = [];
        for (var i = 0; i < CIRCLE_RESOLUTION; ++i) {
            ts.push(i/(CIRCLE_RESOLUTION - 1));
        }

        var t2s = [];
        for (i = 0; i < BEZIER_RESOLUTION/2; ++i) {
            t2s.push(i/(BEZIER_RESOLUTION - 1));
            t2s.push(1 - i/(BEZIER_RESOLUTION - 1));
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
        if (typeof libripienoclient !== "undefined") {
            // For use in libripienoclient (Potentially old JSC)
            gl.bufferData(gl.ARRAY_BUFFER, rectangle, gl.STATIC_DRAW);
        } else {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectangle), gl.STATIC_DRAW);
        }
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

        this.tCoordAttribute = gl.getAttribLocation(circleProgram, "t");
        gl.enableVertexAttribArray(this.tCoordAttribute);
        
        this.tTexBuffer = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tTexBuffer);
        if (typeof Float32Array !== "undefined") {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ts), gl.STATIC_DRAW);
        } else {
            gl.bufferData(gl.ARRAY_BUFFER, ts, gl.STATIC_DRAW);
        }
        gl.vertexAttribPointer(this.tCoordAttribute, 1, gl.FLOAT, false, 0, 0);

        this.node.circleProgram = circleProgram;

        this.node.circleUniforms = {
            circleInfo: gl.getUniformLocation(circleProgram, 'uCircleInfo'),
            color: gl.getUniformLocation(circleProgram, 'uColor')
        };

        ///////////////////
        // BEZIER CURVES //
        ///////////////////
        
        var bezierProgram = this.newProgram(bezierVS, bezierFS);
        gl.useProgram(bezierProgram);

        this.tCoordAttribute2 = gl.getAttribLocation(bezierProgram, "t");
        gl.enableVertexAttribArray(this.tCoordAttribute2);
        
        this.tTexBuffer2 = gl.createBuffer();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tTexBuffer2);
        if (typeof Float32Array !== "undefined") {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(t2s), gl.STATIC_DRAW);
        } else {
            gl.bufferData(gl.ARRAY_BUFFER, t2s, gl.STATIC_DRAW);
        }
        gl.vertexAttribPointer(this.tCoordAttribute2, 1, gl.FLOAT, false, 0, 0);

        this.node.bezierProgram = bezierProgram;

        this.node.bezierUniforms = {
            x: gl.getUniformLocation(bezierProgram, 'uBezierX'),
            y: gl.getUniformLocation(bezierProgram, 'uBezierY'),
            r: gl.getUniformLocation(bezierProgram, 'uBezierR'),
            colorAndStroke: gl.getUniformLocation(bezierProgram, 'uColorAndStroke')
        };

        ////////////////

        this.node.spiritTexture = loadImageTexture(gl, "/res/bravura48.png",
                function()  {return this.paint();}.bind(this));
        this.node.gl = gl;
    },
    newProgram: function(vsSRC, fsSRC) {
        var gl = globalGL || this.node.gl;

        var shaderProgram = gl.createProgram();

        var prelude = (globalGL && globalGL.ripieno_isDesktopGL) ? 
            "" : "precision mediump float;\n";

        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, prelude + vsSRC()); 
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.log("invalid shader1: " + gl.getShaderInfoLog(vs));
            return null;
        }
        gl.attachShader(shaderProgram, vs);

        var fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, prelude + fsSRC()); 
        gl.compileShader(fs);
        if(!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.log("invalid shader2: " + gl.getShaderInfoLog(fs));
            return null;
        }
        gl.attachShader(shaderProgram, fs);

        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.log("invalid shader : " + gl.getProgramInfoLog(shaderProgram));
            console.warn("Unable to initialize the shader program.");
        }

        return shaderProgram;
    }
});

// Array of images curently loading
var g_loadingImages = [];

//
// loadImageTexture
//
// Load the image at the passed url, place it in a new WebGLTexture
// object and return the WebGLTexture.
//
var loadImageTexture = (globalGL && globalGL.ripieno_loadImageTexture) ||
    function (ctx, url, cb) {
        var texture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, texture);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, 1, 1, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
        var image = new Image();
        g_loadingImages.push(image);
        image.onload = function () {
            doLoadImageTexture(ctx, image, texture);
            cb();
        };
        image.src = url;
        return texture;
    };

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
var BEZIER_RESOLUTION = 120;

module.exports = React.createClass({displayName: 'exports',
    render: function() {
        return HelloGL({ref: "glContext"}, 
            this.props.children
        );
    },

    /**
     * Called whenever the window is resized, whether or not the node has actually
     * changed sizes.
     */
    updateDimensions: function() {
        if (!globalGL) {
            // We are using WebGL
            var canvas = this.getDOMNode();

            var devicePixelRatio = window.devicePixelRatio ||
                                    window.webkitDevicePixelRatio ||
                                    window.mozDevicePixelRatio ||
                                    window.opDevicePixelRatio || 1;

            canvas.width = Math.round(canvas.clientWidth*devicePixelRatio);
            canvas.height = Math.round(canvas.clientHeight*devicePixelRatio);
            this.refs.glContext.stepsInWidth = this.props.widthInSpaces;
            this.refs.glContext.fillAvailableSpace();
        } else {
            // We are using libripienoclient GL bindings.
            var width = globalGL.ripieno_getWidth();
            var height = globalGL.ripieno_getHeight();

            this.latest_width = width;
            this.latest_height = height;

            this.refs.glContext.stepsInWidth = this.props.widthInSpaces;
            this.refs.glContext.aspectRatio = width / height;
            globalGL.viewport(0, 0, width, height);
        }
    },

    componentDidUpdate: function(oldProps) {
        var shouldUpdateDimensions =
            this.props.widthInSpaces !== oldProps.widthInSpaces ||
            globalGL && (
                    this.latest_width !== globalGL.ripieno_getWidth() ||
                    this.latest_height !== globalGL.ripieno_getHeight());
        
        if (shouldUpdateDimensions) {
            this.updateDimensions();
        }
        this.refs.glContext.paint();
        this.setupListeners();
    },

    componentDidMount: function() {
        if (!globalGL) {
            // We are using webGL.
            global.addEventListener("resize", this.updateDimensions);
            this.refs.glContext.paint();

            this.setupListeners();
        }
        
        this.updateDimensions();
    },

    setupListeners: function() {
        if (typeof window !== "undefined") {
            var canvas = this.getDOMNode();
            canvas.onmousedown = this.props.onMouseDown;
            canvas.onmouseup = this.props.onMouseUp;
            canvas.onmousemove = this.props.onMouseMove;
            canvas.onclick = this.props.onClick;
        }
    },

    componentWillUnmount: function() {
        global.removeEventListener("resize", this.updateDimensions);
    }
});
module.exports.VG = VG;
module.exports.VRect = VRect;
module.exports.VGlyph = VGlyph;
module.exports.VBezier = VBezier;
module.exports.VCircle = VCircle;
