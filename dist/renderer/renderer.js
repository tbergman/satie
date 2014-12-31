var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var _ = require("lodash");
var assert = require("assert");
Object.assign = require("react/lib/Object.assign");
var Molasses = require("./molasses");
var C = require("../stores/contracts");
var Header = require("../views/_header");
var PlaceholderModel = require("../stores/placeholder");
var Rect = require("../views/_rect");
var Line = require("../views/_line");
var isBrowser = typeof window !== "undefined";
var useGL = (typeof global.libripienoclient !== "undefined") || (isBrowser && global.location.search.indexOf("engine=gl") !== -1);
C.renderUtil.useGL = useGL;
var RenderEngine = Molasses.Component;
var profilerEnabled = isBrowser && global.location.search.indexOf("profile=1") !== -1;
var Renderer = (function (_super) {
    __extends(Renderer, _super);
    function Renderer() {
        var _this = this;
        _super.apply(this, arguments);
        this._hideMidiEntry = function () {
            localStorage["midiEntry"] = "closed";
            _this.forceUpdate();
        };
        this.handleMouseMoveThrottled = _.throttle(function (mouse) {
            var data = _this._getPointerData(mouse);
            _this.setState({
                mouse: mouse
            });
        }, 16);
        this.handleScroll = _.throttle(function () {
            _this.forceUpdate();
        }, 16);
    }
    Renderer.prototype.render = function () {
        var _this = this;
        if (profilerEnabled) {
            console.time("render");
        }
        var parts = this.props.parts;
        var voices = this.props.voices;
        var bodyLength = 0;
        for (var i = 0; i < voices.length; ++i) {
            if (voices[i].body) {
                bodyLength = voices[i].body.length;
                break;
            }
        }
        var pages = [];
        var ctx = this.getCtx();
        var scale40 = ctx.calcFontSize();
        assert(ctx, "You must annotate before rendering");
        var pageStarts = ctx.pageStarts;
        var pageLines = ctx.pageLines;
        var pageCount = pageStarts.length;
        for (var i = 1; i < pageCount; ++i) {
            pages.push({ from: pageStarts[i - 1], to: pageStarts[i], idx: i - 1 });
        }
        pages.push({
            from: pageStarts[pageCount - 1],
            to: bodyLength,
            idx: pageCount - 1
        });
        var print = C.getPrint(ctx._layout.header);
        var scaling = ctx._layout.header.defaults.scaling;
        var width10s = print.pageLayout.pageWidth;
        var height10s = print.pageLayout.pageHeight;
        var viewbox = "0 0 " + width10s + " " + height10s;
        var vcHeight = 48 + ctx.staveSpacing * (ctx._voices.length - 1) / 2;
        var rawPages = _.map(pages, function (page, pidx) {
            return React.createElement(RenderEngine, { onClick: _this.handleMouseClick, onMouseLeave: _this.handleMouseLeave, onMouseMove: _this.handleMouseMove, page: page, parts: parts, width: _this.props.raw ? C.renderUtil.tenthsToMM(scale40, width10s) + "mm" : "100%", height: _this.props.raw ? C.renderUtil.tenthsToMM(scale40, height10s) + "mm" : "100%", viewbox: viewbox }, !page.from && !useGL && React.createElement(Header.Component, { editMode: _this.props.editMode, fontSize: scale40, key: "HEADER", model: _this.props.header }), _.map(parts, function (part, idx) { return _.chain(part.voices).map(function (voice) { return voices[voice]; }).map(function (voice, vidx) { return React.createElement("g", { key: idx + "_" + vidx, style: { fontSize: scale40 + "px" } }, _.reduce(voice.body.slice(page.from, page.to), function (memo, obj) {
                if (obj.type === 130 /* NewLine */) {
                    memo.push([]);
                }
                memo[memo.length - 1].push(obj);
                return memo;
            }, [[]]).splice(page.idx ? 1 : 0).map(function (s, lidx) {
                return React.createElement(LineContainerComponent, {
                    parts: _this.props.parts,
                    isCurrent: _this.state.visualCursor.annotatedLine === lidx + pageLines[page.idx],
                    store: _this.props.store,
                    h: idx,
                    generate: function generate() {
                        var components = new Array(s.length * 2);
                        var h = 0;
                        var selIdx = -1;
                        var selProps = null;
                        for (var i = 0; i < s.length; ++i) {
                            if (s[i].selected && s[i].type !== 130 /* NewLine */ && s[i].type !== 110 /* EndMarker */) {
                                if (selIdx === -1) {
                                    selIdx = h++;
                                    selProps = {
                                        key: "selectionrect-" + Math.random(),
                                        x: s[i].x,
                                        y: s[i].y - 1 / 2,
                                        height: 1,
                                        fill: "#75A1D0",
                                        opacity: 0.33
                                    };
                                }
                            }
                            if (selIdx !== -1 && (!s[i].selected || i + 1 === s.length)) {
                                selProps.width = Math.abs(s[i].x - selProps.x);
                                components[selIdx] = React.createElement(Rect.Component, selProps);
                                selIdx = -1;
                            }
                            if (s[i].visible) {
                                components[h++] = s[i].render(scale40);
                            }
                        }
                        components.length = h;
                        return components;
                        return null;
                    },
                    idx: lidx + pageLines[page.idx],
                    key: lidx
                });
            })); }).value(); }), (pidx === _this.state.visualCursor.annotatedPage) && _this.state.visualCursor && _this.state.visualCursor.annotatedObj && React.createElement("g", { style: { fontSize: scale40 + "px" } }, React.createElement(Line.Component, { x1: _this.state.visualCursor.annotatedObj.x - 8, x2: _this.state.visualCursor.annotatedObj.x - 8, y1: _this.state.visualCursor.annotatedObj.y - ctx.staveSpacing * (ctx._voices.length - 1) * _this.state.visualCursor.annotatedStave + (false ? ctx.staveSpacing * (ctx._voices.length - 1) / 2 : 0) - vcHeight, y2: _this.state.visualCursor.annotatedObj.y - ctx.staveSpacing * (ctx._voices.length - 1) * _this.state.visualCursor.annotatedStave + (false ? ctx.staveSpacing * (ctx._voices.length - 1) / 2 : 0) + vcHeight, stroke: "#008CFF", strokeWidth: 2 })));
        });
        var ret;
        var yPtr = { y: this.props.marginTop };
        if (!this.props.raw) {
            ret = React.createElement("div", { className: "workspace", onScroll: this.handleScroll, style: { top: "" + this.props.top } }, _.map(rawPages, function (rawPage, pidx) {
                var page = React.createElement("div", { className: "page", key: "page" + pidx, style: {
                    position: "absolute",
                    width: _this.props.width,
                    height: _this.props.height,
                    left: "50%",
                    marginLeft: -_this.props.width / 2,
                    top: yPtr.y,
                    marginBottom: _this.props.marginBottom
                } }, rawPage);
                yPtr.y += 40 + _this.props.height;
                return page;
            }));
        }
        else {
            ret = rawPages[0];
        }
        if (this.props.store) {
            this.props.store.dangerouslyMarkRenderDone();
        }
        if (profilerEnabled) {
            console.timeEnd("render");
        }
        return ret;
    };
    Renderer.prototype.componentDidMount = function () {
        if (isBrowser && this.props.dispatcher) {
            this._attachToBrowser();
        }
        if (this.props.store) {
            this.props.store.addListener(1 /* Annotate */, this.update);
        }
    };
    Renderer.prototype.componentWillUnmount = function () {
        if (isBrowser) {
            this._detachFromBrowser();
        }
        if (this.props.store) {
            this.props.store.removeListener(1 /* Annotate */, this.update);
        }
    };
    Renderer.prototype._getPointerData = function (mouse) {
        var dynY = mouse.y;
        var dynX = mouse.x;
        var dynLine = 3;
        var foundObj = null;
        var foundIdx;
        var ctxData;
        var ctx = this.getCtx();
        var info = this._getStaveInfoForY(mouse.y, mouse.page);
        if (info) {
            var ctx = this.getCtx();
            dynY = ctx.lines[info.musicLine].y + ctx.staveSpacing * (ctx._voices.length - 1) * info.visualIdx;
            dynLine = Math.round((dynY - mouse.y) / 5) / 2 + 3;
            var body = this.props.voices[info.partIdx].body;
            for (var j = ctx.pageStarts[mouse.page]; j < body.length && body[info.musicLine].type !== 120 /* NewPage */; ++j) {
                var item = body[j];
                ctxData = item.ctxData;
                if (Math.abs(item.y - dynY) < 0.04) {
                    if ((item.type === 160 /* KeySignature */ || item.type === 170 /* TimeSignature */ || item.type === 150 /* Clef */ || item.type === 600 /* Duration */) && Math.abs(dynX - item.x + item.spacing * 2) < 10.8 + item.spacing * 4 + (item.isNote ? (item.note.dots || 0) * 8 : 0)) {
                        dynX = item.x;
                        foundIdx = j;
                        foundObj = item;
                        break;
                    }
                    else if (dynX < item.x || (j === body.length - 1 && info.partIdx === this.props.voices.filter(function (s) { return !!s.body; }).length - 1)) {
                        if (dynX < item.x) {
                            j -= 1;
                        }
                        _pointerData = {
                            mouse: mouse,
                            line: dynLine,
                            idx: j,
                            partIdx: info.partIdx,
                            musicLine: info.musicLine,
                            ctxData: item.ctxData,
                            visualIdx: info.visualIdx,
                            obj: new PlaceholderModel({
                                priority: 1111 /* Unknown */,
                                item: item,
                                musicLine: info.musicLine,
                            }, true)
                        };
                        _pointerData.obj.idx = j;
                        return _pointerData;
                    }
                }
            }
        }
        _pointerData = {
            ctxData: ctxData,
            idx: foundIdx,
            line: dynLine,
            mouse: mouse,
            musicLine: info && info.musicLine,
            obj: foundObj,
            partIdx: info && info.partIdx,
            visualIdx: info ? info.visualIdx : null
        };
        return _pointerData;
    };
    Renderer.prototype._getStaveInfoForY = function (my, page) {
        var ctx = this.getCtx();
        var visualIdx = -1;
        for (var h = 0; h < this.props.voices.length; ++h) {
            var body = this.props.voices[h].body;
            if (!body) {
                continue;
            }
            ++visualIdx;
            for (var i = ctx.pageLines[page]; i < ctx.lines.length; ++i) {
                if (Math.abs(ctx.lines[i].y + visualIdx * ctx.staveSpacing * (ctx._voices.length - 1) - my) < 55) {
                    return {
                        musicLine: i,
                        partIdx: h,
                        visualIdx: visualIdx
                    };
                }
            }
        }
        return null;
    };
    Renderer.prototype._elementsInBBox = function (box, mouse) {
        var ret = [];
        var ctx = this.getCtx();
        for (var h = 0; h < this.props.voices.length; ++h) {
            var body = this.props.voices[h].body;
            if (!body) {
                continue;
            }
            var inRange = function (min, val, max) {
                return min < val && val < max;
            };
            for (var i = ctx.pageStarts[mouse.page]; i < body.length && body[i].type !== 120 /* NewPage */; ++i) {
                var item = body[i];
                if (inRange(box.top - 1, item.y, box.bottom + 1) && inRange(box.left, item.x, box.right)) {
                    ret.push(item);
                }
            }
        }
        return ret;
    };
    Renderer.prototype.getInitialState = function () {
        return {
            mouse: { x: 0, y: 0 },
            visualCursor: this.props.store && this.props.store.visualCursor || this.props.cursor || { annotatedPage: 0 }
        };
    };
    Renderer.prototype.getPositionForMouse = function (event) {
        var target;
        if (useGL) {
            var ctx = this.getCtx();
            var scale40 = ctx.calcFontSize();
            var print = C.getPrint(ctx._layout.header);
            var widthMM = print.pageLayout.pageWidth;
            target = event.target;
            var rect = target.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) / target.clientWidth,
                y: (event.clientY - rect.top) / target.clientWidth,
                page: 0,
                selectionInfo: null
            };
        }
        var locatable = event.target;
        target = event.target;
        var svg_elt = (locatable.farthestViewportElement || target);
        var svg_pt = svg_elt.createSVGPoint();
        svg_pt.x = event.clientX;
        svg_pt.y = event.clientY;
        var pt = svg_pt.matrixTransform(svg_elt.getScreenCTM().inverse());
        return {
            x: pt.x - 6,
            y: pt.y,
            page: parseInt(svg_elt.getAttribute("data-page"), 10),
            selectionInfo: target.getAttribute("data-selection-info")
        };
    };
    Renderer.prototype.handleMouseClick = function (event) {
        var mouse = this.getPositionForMouse(event);
        var data = this._getPointerData(mouse);
        if (data.ctxData) {
            this.props.dispatcher.PUT("/webapp/visualCursor", {
                bar: data.ctxData.bar,
                beat: data.ctxData.beat,
                endMarker: data.ctxData.endMarker
            });
        }
        this.forceUpdate();
    };
    Renderer.prototype.handleMouseMove = function (event) {
        this.handleMouseMoveThrottled(this.getPositionForMouse(event));
    };
    Renderer.prototype.handleMouseLeave = function () {
        this.setState({
            mouse: null
        });
    };
    Renderer.prototype.getCtx = function () {
        return this.props.context ? this.props.context : (this.props.store && this.props.store.finalCtx);
    };
    Renderer.prototype._attachToBrowser = function () {
        document.addEventListener("keydown", this._handleKeyDown);
        this._oldTitle = document.title;
        document.title = this.props.header.movementTitle;
    };
    Renderer.prototype._detachFromBrowser = function () {
        document.removeEventListener("keydown", this._handleKeyDown);
        if (global.DISQUS) {
            global.DISQUS.reset();
        }
        document.title = this._oldTitle;
    };
    Renderer.prototype._handleKeyDown = function (event) {
        var keyCode = event.keyCode || event.charCode || 0;
        switch (keyCode) {
            case 32:
                event.preventDefault();
                this.props.dispatcher.PUT("/webapp/visualCursor/togglePlay", null);
                break;
            case 8:
            case 37:
                event.preventDefault();
                this.props.dispatcher.PUT("/webapp/visualCursor/step", { step: -1 });
                break;
            case 39:
                event.preventDefault();
                this.props.dispatcher.PUT("/webapp/visualCursor/step", { step: 1 });
                break;
        }
    };
    Renderer.prototype.update = function () {
        this.setState({
            visualCursor: this.props.store && this.props.store.visualCursor
        });
    };
    Renderer.prototype.getDefaultProps = function () {
        return {
            marginTop: 20
        };
    };
    return Renderer;
})(TypedReact.Component);
var Renderer;
(function (Renderer) {
    "use strict";
    Renderer.Component = TypedReact.createClass(Renderer);
})(Renderer || (Renderer = {}));
var LineContainer = (function (_super) {
    __extends(LineContainer, _super);
    function LineContainer() {
        var _this = this;
        _super.apply(this, arguments);
        this.updateIfNeeded = _.throttle(function () {
            if (_this.isMounted()) {
                _this.forceUpdate();
            }
        }, 20, { leading: false });
        this.dirty = false;
        this.shouldClear = false;
    }
    LineContainer.prototype.render = function () {
        if (this.shouldClear) {
            assert(this.dirty);
            this.shouldClear = false;
            return React.createElement("g", null);
        }
        if (profilerEnabled) {
            console.log("Rendering line", this.props.idx);
        }
        return React.createElement("g", null, this.props.generate());
    };
    LineContainer.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        var songDirty = this.props.store && this.props.store.dirty || nextProps.parts !== this.props.parts;
        var lineDirty = this.props.store && this.props.store.getLineDirty(nextProps.idx, nextProps.h);
        if (lineDirty) {
            if (profilerEnabled) {
                console.log("Line dirty", this.props.idx);
            }
            if (this.props.store) {
                this.props.store.dangerouslyMarkRendererLineClean({
                    description: null,
                    response: null,
                    query: null,
                    postData: nextProps.h + "_" + nextProps.idx
                });
            }
        }
        if (songDirty || lineDirty || this.dirty) {
            if (this.props.isCurrent || this.props.parts !== nextProps.parts) {
                this.dirty = false;
                return true;
            }
            else if (!this.onScreen) {
                if (!this.dirty) {
                    this.dirty = true;
                    this.shouldClear = true;
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                this.dirty = false;
                _.delay(this.updateIfNeeded, 6);
            }
        }
        return false;
    };
    LineContainer.prototype.onScreen = function () {
        var domNode = this.getDOMNode();
        var bBox = domNode.getBBox();
        var svg = domNode.ownerSVGElement;
        var point = svg.createSVGPoint();
        var matrix = svg.getScreenCTM();
        point.x = bBox.x;
        point.y = bBox.y;
        var topLeft = point.matrixTransform(matrix);
        point.y += bBox.height;
        var bottomLeft = point.matrixTransform(matrix);
        return bottomLeft.y >= 0 && topLeft.y <= window.innerHeight;
    };
    return LineContainer;
})(TypedReact.Component);
;
var LineContainerComponent = TypedReact.createClass(LineContainer);
var _pointerData = {
    partIdx: null,
    obj: null,
    musicLine: null,
    idx: null,
    visualIdx: null
};
module.exports = Renderer;
