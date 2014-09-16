/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import ReactTS = require("react-typescript");
import _ = require("lodash");
import assert = require("assert");

import Molasses = require("./molasses");
var Victoria = require("./victoria/hellogl.jsx");

import Dispatcher = require("../stores/dispatcher");
import Context = require("../stores/context");
import C = require("../stores/contracts");
import Header = require("../views/_header");
import History = require("../stores/history");
import Model = require("../stores/model");
import SongEditorStore = require("../stores/songEditor");
import Tool = require("../stores/tool");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");
var Rect = require("../views/_rect.jsx");
var Group = require("../views/_group.jsx");
var Line = require("../views/_line.jsx");
var SelectionRect = require("./selectionRect.jsx");

var isBrowser = typeof window !== "undefined";
var useGL = (typeof global.libripienoclient !== "undefined") ||
    (isBrowser && global.location.search.indexOf("engine=gl") !== -1);

renderUtil.useGL = useGL;

var RenderEngine: (props: Molasses.IProps, ...children: any[]) => Molasses.Molasses = useGL
    ? Victoria : Molasses.Component;

var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

var html = React.DOM;

/**
 * The main home of the renderer. The renderer accepts annotated Models and
 * either uses Molasses (the SVG engine) or Victoria (the OpenGL ES engine)
 * to draw some sheet music.
 */
export class Renderer extends ReactTS.ReactComponentBase<IRendererProps, IRendererState> {
    render() {
        if (PROFILER_ENABLED) {
            console.time("render");
        }

        var fontSize = this.props.staveHeight;
        var y = 0;
        var staves = this.props.staves;

        var pages: Array<IPage> = [];
        var firstStaveIdx = 0;
        while(staves[firstStaveIdx] && !staves[firstStaveIdx].body) {
            ++firstStaveIdx;
        }
        var ctx = this.getCtx(firstStaveIdx);
        var pageStarts = ctx.pageStarts;
        var pageLines = ctx.pageLines;

        var pageCount = pageStarts.length;
        for (var i = 1; i < pageCount; ++i) {
            pages.push({from: pageStarts[i - 1], to: pageStarts[i], idx: i-1});
        }
        pages.push({
            from: pageStarts[pageCount - 1],
            to: staves[firstStaveIdx].body.length,
            idx: pageCount - 1
        });

        var mInchW = 85000*(this.props.pageSize.width/215.9);
        var mInchH = 110000*(this.props.pageSize.height/279.4);

        var viewbox = "0 0 " + Math.round(mInchW) + " " + Math.round(mInchH);

        // XXX: Currently we only support single and double staffs.
        // isPianoStaff is set to true when there is at least 2 staffs.
        var isPianoStaff = _.reduce(staves, function (memo: number, s: C.IStave) {
            return memo + (s.body ? 1 : 0);
        }, 0) >= 2;

        var vcHeight = 1.2 + (isPianoStaff ? 1.2 : 0);

        var rawPages = _.map(pages, (page: IPage, pidx: number) => {
            return RenderEngine(
                {
                    onClick: this.handleMouseClick,
                    onMouseDown: this.handleMouseDown,
                    onMouseUp: this.handleMouseUp,
                    onMouseLeave: this.handleMouseLeave,
                    onMouseMove: this.handleMouseMove,
                    page: page,
                    staves: staves,
                    width: this.props.raw ? mInchW/10000 + "in" : "100%",
                    height: this.props.raw ? mInchH/10000 + "in" : "100%",
                    widthInSpaces: renderUtil.mm(this.props.pageSize.width, fontSize),
                    viewbox: viewbox
                },
                /* Using staves is an anti-pattern. Ideally, we would have a getModels()
                    method in SongEditorStore or something. */
                _.map(staves, (stave: C.IStave, idx: number) => {
                    if (stave.header) {
                        if (page.from) {
                            return null;
                        }
                        y += renderUtil.getHeaderHeight(stave.header);
                        return !useGL && Header({
                            fontSize: fontSize,
                            middle: renderUtil.mm(this.props.pageSize.width/2 +
                                this.props.paper.rightMargin -
                                this.props.paper.leftMargin, fontSize),
                            right: renderUtil.mm(this.props.pageSize.width -
                                this.props.paper.rightMargin, fontSize * 0.75),
                            key: "HEADER",
                            model: stave.header});
                    } else if (stave.body) {
                        return Group({key: idx, style: {fontSize: fontSize*FONT_SIZE_FACTOR + "px"}},
                            _.reduce(stave.body.slice(page.from, page.to), function(memo: Array<Model>[], obj: Model)  {
                                if (obj.type === C.Type.NEWLINE) {
                                    memo.push([]);
                                }
                                memo[memo.length - 1].push(obj);
                                return memo;
                            }, [[]]).splice(page.idx ? 1 : 0 /* BUG!! */).map(
                            function (s: Array<Model>, lidx: number) {

                                return LineContainerComponent({
                                        isCurrent: this.state.visualCursor.annotatedLine ===
                                            lidx + pageLines[page.idx],
                                        store: this.props.store,
                                        staveHeight: this.props.staveHeight,
                                        h: idx,
                                        generate: function () {
                                            var components = new Array(s.length * 2);
                                            var h = 0;
                                            // I think selected items currently HAVE to
                                            // be consecutive, but this could change.
                                            var selIdx = -1;
                                            var selProps: any = null;
                                            for (var i = 0; i < s.length; ++i) {
                                                if (s[i].selected && s[i].type !== C.Type.NEWLINE &&
                                                        s[i].type !== C.Type.END_MARKER) {
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
                                                    components[selIdx] = Rect(selProps);
                                                    selIdx = -1;
                                                }
                                                if (s[i].visible()) {
                                                    components[h++] = s[i].render(fontSize);
                                                }
                                            }
                                            components.length = h;
                                            return components;
                                        },
                                        idx: lidx + pageLines[page.idx], key: lidx
                                    });
                                }.bind(this))
                        );
                    } else {
                        return null;
                    }
                }),
                this.props.tool && _.map(staves, (stave: C.IStave,idx: number) => stave.body &&
                    this.props.tool.render(
                        this.getCtx(idx),
                        this.state.mouse,
                        _pointerData,
                        fontSize,
                        pidx)),
                this.state.selectionRect && SelectionRect({
                    fontSize: fontSize,
                    x: Math.min(this.state.selectionRect.start.x, this.state.selectionRect.end.x),
                    y: Math.min(this.state.selectionRect.start.y, this.state.selectionRect.end.y),
                    width: Math.abs(this.state.selectionRect.start.x - this.state.selectionRect.end.x),
                    height: Math.abs(this.state.selectionRect.start.y -
                            this.state.selectionRect.end.y)}),

                (pidx === this.state.visualCursor.annotatedPage) &&
                    this.state.visualCursor && this.state.visualCursor.annotatedObj && Group({
                            style: {fontSize: fontSize*FONT_SIZE_FACTOR + "px"}},
                        Line({
                            x1: this.state.visualCursor.annotatedObj.x - 0.2,
                            x2: this.state.visualCursor.annotatedObj.x - 0.2,
                            y1: this.state.visualCursor.annotatedObj.y +
                                (isPianoStaff ? 1.15 : 0) - vcHeight,
                            y2: this.state.visualCursor.annotatedObj.y +
                                (isPianoStaff ? 1.15 : 0) + vcHeight,
                            stroke: "#008CFF",
                            strokeWidth: 0.05})
                    )

            );});

        var ret: Object; // React component
        var currY = this.props.marginTop;
        if (!this.props.raw) {
            ret = html.div({ className: "workspace", onScroll: this.handleScroll, style: { top: "" + this.props.top } },
                _.map(rawPages, function (rawPage: any, pidx: number) {
                    var page = html.div({
                        className: "page",
                        key: "page" + pidx,
                        style: {
                            position: "absolute",
                            width: this.props.width,
                            height: this.props.height,
                            left: "50%",
                            marginLeft: -this.props.width/2,
                            top: currY,
                            marginBottom: this.props.marginBottom}},
                        rawPage);
                    currY += 40 + this.props.height;
                    return page;
                }.bind(this))
            );
        } else {
            ret = rawPages[0];
        }

        if (this.props.store) {
            this.props.store.markRendererClean();
        }

        if (PROFILER_ENABLED) {
            console.timeEnd("render");
        }
        return ret;
    }

    componentWillReceiveProps(newProps: IRendererProps) {
        if (this.props.tool !== newProps.tool) {
            if (this.props.tool) {
                this.props.tool.toolWillBeUnactive();
            }
            if (newProps.tool) {
                newProps.tool.toolWillBeActive();
            }
        }
    }

    componentDidMount() {
        if (isBrowser) {
            this.setupBrowserListeners();
        }
        if (this.props.store) {
            this.props.store.addAnnotationListener(this.update);
        }

        if (this.props.tool) {
            this.props.tool.toolWillBeActive();
        }
    }

    _getPointerData(mouse: C.IMouse) : C.IPointerData {
        var dynY = mouse.y;
        var dynX = mouse.x;
        var dynLine = 3;
        var foundObj: Model = null;
        var foundIdx: number;
        var musicLine: number;
        var ctxData: { beat: number; bar: number };
        var staveIdx: number;
        var info = this.getStaveInfoForY(mouse.y, mouse.page);
        if (info) {
            var h = info.h;
            var i = info.i;
            var ctx = this.getCtx(h);

            staveIdx = h;

            musicLine = i;
            dynY = ctx.lines[i].y;
            dynLine = Math.round((ctx.lines[i].y - mouse.y)/0.125)/2 + 3;
            var body = this.props.staves[h].body;
            for (var j = ctx.pageStarts[mouse.page];
                    j < body.length && body[i].type !== C.Type.NEWPAGE; ++j) {
                var item = body[j];
                ctxData = item.ctxData;
                if (Math.abs(item.y - dynY) < 0.001) {
                    if ((item.type === C.Type.KEY_SIGNATURE ||
                                item.type === C.Type.TIME_SIGNATURE ||
                                item.type === C.Type.CLEF ||
                                item.type === C.Type.DURATION) &&
                            Math.abs(dynX - item.x) < 0.27 +
                                (item.isNote ? (item.note.dots||0)*0.2 : 0)) {
                        dynX = item.x;
                        foundIdx = j;
                        foundObj = item;
                        break;
                    } else if (dynX < item.x ||
                            (j === body.length - 1 && h === this.getCtxCount() - 1)) {

                        // End of a line.
                        // XXX: Instead, use EndMarker.
                        if (dynX < item.x) {
                            j -= 1;
                        }
                        _pointerData = {
                            mouse: mouse,
                            line: dynLine,
                            idx: j,
                            staveIdx: h,
                            musicLine: musicLine,
                            ctxData: item.ctxData,
                            obj: new Model({
                                placeholder: true,
                                idx: j,
                                item: item,
                                musicLine: musicLine,
                                Source: C.Source.ANNOTATOR,
                                fontSize: 0,
                                _key: null,
                                x: () => NaN,
                                y: () => NaN,
                                setX: null,
                                setY: null,
                                _x: NaN,
                                _y: NaN,
                                ctxData: null,
                                endMarker: false,
                                intersects: [],
                                inBeam: false,
                                isNote: false,
                                isRest: false,
                                selected: false,
                                type: null,
                                note: null,
                                annotate: null,
                                _generateKey: null,
                                key: null,
                                annotateImpl: null,
                                visible: () => false,
                                render: null,
                                toLylite: null
                            })
                        };
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
            musicLine: musicLine,
            obj: foundObj,
            staveIdx: staveIdx
        };

        return _pointerData;
    }

    /**
     * Given a y position and a page, returns a part (h) and
     * and a line (i).
     */
    getStaveInfoForY(my: number, page: number) {
        for (var h = 0; h < this.getCtxCount(); ++h) {
            var ctx = this.getCtx(h);
            if (!ctx) {
                continue;
            }
            for (var i = ctx.pageLines[page]; i < ctx.lines.length; ++i) {
                if (Math.abs(ctx.lines[i].y - my) < 1.01) {
                    return {
                        h: h,
                        i: i
                    };
                }
            }
        }
        return null;
    }

    _elementsInBBox(box: ClientRect, mouse: C.IMouse): Array<Model> {
        var ret: Array<Model> = [];

        for (var h = 0; h < this.getCtxCount(); ++h) {
            var ctx = this.getCtx(h);
            if (!ctx) {
                continue;
            }
            var body = this.props.staves[h].body;
            var inRange = function(min: number, val: number, max: number)  {return min < val && val < max;};

            for (var i = ctx.pageStarts[mouse.page];
                    i < body.length && body[i].type !== C.Type.NEWPAGE; ++i) {
                var item = body[i];
                if (inRange(box.top - 1, item.y,
                            box.bottom + 1) &&
                        inRange(box.left, item.x, box.right)) {
                    ret.push(item);
                }
            }
        }

        return ret;
    }
    getInitialState() {
        return {
            mouse: {x: 0, y: 0},
            visualCursor: this.props.store && this.props.store.visualCursor || {
                annotatedPage: 0
            } // TODO: render multiple pages
        };
    }

    getPositionForMouse(event: React.MouseEvent): IPosInfo {
        var target: Element;
        if (useGL) {
            var widthInSpaces = renderUtil.mm(this.props.pageSize.width, this.props.staveHeight);
            target = <Element> event.target;
            var rect = target.getBoundingClientRect();

            return {
                x: (event.clientX - rect.left) / target.clientWidth * widthInSpaces,
                y: (event.clientY - rect.top) / target.clientWidth * widthInSpaces,
                page: 0,
                selectionInfo: null
            };
        }
        var locatable: SVGLocatable = <any> event.target;
        target = <Element> event.target;

        var svg_elt = <SVGSVGElement> (locatable.farthestViewportElement || target);
        var svg_pt = svg_elt.createSVGPoint();
        svg_pt.x = event.clientX;
        svg_pt.y = event.clientY;
        var pt = svg_pt.matrixTransform(svg_elt.getScreenCTM().inverse());
        return {
            x: pt.x / this.props.staveHeight / FONT_SIZE_FACTOR - 0.15,
            y: pt.y / this.props.staveHeight / FONT_SIZE_FACTOR,
            page: parseInt(svg_elt.getAttribute("data-page"), 10),
            selectionInfo: target.getAttribute("data-selectioninfo")
        };
    }

    handleMouseClick(event: React.MouseEvent) {
        var mouse = this.getPositionForMouse(event);
        var data = this._getPointerData(mouse);
        // No tool is also known as the "select" tool.
        if (!this.props.tool && data.ctxData) {
            Dispatcher.POST("/local/visualCursor", {
                bar: data.ctxData.bar,
                beat: data.ctxData.beat,
                endMarker: data.ctxData.endMarker
            });
        }
        if (!this.props.tool) {
            return;
        }
        var fn = this.props.tool.handleMouseClick(mouse, data.line, data.obj);
        if (fn) {
            Dispatcher.PUT("/local/tool/_action", {mouseData: data, fn: fn});
        }
        this.forceUpdate();
    }

    handleMouseDown(event: React.MouseEvent) {
        if (event.button === 0) {
            if (this.props.selection) {
                _.each(this.props.selection, function(s: Model)  {
                    s.selected = null;
                });
            }
            var pos = this.getPositionForMouse(event);
            if (this.props.selection && this.props.selection.length) {
                // Bottleneck: detect lines with selected content
                if (this.props.store) {
                    this.props.store.markRendererDirty();
                }
            }
            this.setState({
                selectionRect: {
                    start: pos,
                    end: pos
                }
            });
            if (this.props.selection) {
                Dispatcher.DELETE("/local/selection");
            }
        }
    }

    handleMouseUp(event: React.MouseEvent) {
        if (event.button === 0 && this.state.selectionRect) {
            var rect = this.state.selectionRect;
            var bbox = {
                left: Math.min(rect.start.x, rect.end.x),
                right: Math.max(rect.start.x, rect.end.x),
                top: Math.min(rect.start.y, rect.end.y),
                bottom: Math.max(rect.start.y, rect.end.y),
                width: Math.abs(rect.end.x - rect.start.x),
                height: Math.abs(rect.end.y - rect.start.y)
            };
            _selection = this._elementsInBBox(bbox, this.getPositionForMouse(event));
            if (_selection.length) {
                _.each(_selection, function (s: Model) {
                    s.selected = true;
                    _.each(s.intersects, function (intersect: Model) {
                        intersect.selected = true;
                    });
                });
                // Bottleneck: detect lines with selected content
                if (this.props.store) {
                    this.props.store.markRendererDirty();
                }
            } else {
                _selection = null;
            }
            this.setState({
                selectionRect: null
            });
            if (_selection) {
                Dispatcher.PUT("/local/selection", _selection.length ? _selection : null);
            }
        }
    }

    handleMouseMove(event: React.MouseEvent) {
        if (this.state.selectionRect) {
            this.setState({
                selectionRect: {
                    start: this.state.selectionRect.start,
                    end: this.getPositionForMouse(event)
                }
            });
            var rect = this.state.selectionRect;
            var area = Math.abs((rect.start.x - rect.end.x)*(rect.start.y - rect.end.y));
            if (area > 1 && this.props.tool) {
                Dispatcher.DELETE("/local/tool");
            }
            return;
        }
        if (!this.props.tool) {
            if (this.state.mouse) {
                this.setState({
                    mouse: null
                });
            }
            return;
        }
        this.handleMouseMoveThrottled(this.getPositionForMouse(event));
    }

    handleMouseLeave() {
        if (this._cleanup) {
            this._cleanup();
        }

        this.setState({
            mouse: null
        });
    }

    handleMouseMoveThrottled = _.throttle((mouse: IPosInfo) => {
        var data = this._getPointerData(mouse);
        var fn = this.props.tool.handleMouseMove(mouse, data.line, data.obj);
        if (fn === "hide" || !data.obj) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            if (this.props.store) {
                this.props.store.handleAction({
                    description: "PUT /local/tool",
                    response: null,
                    query: null,
                    postData: null,
                    resource: "hide"
                });
            }
        } else if (fn && this.props.store) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            this.props.store.handleAction({
                description: "PUT /local/tool",
                resource: "preview",
                response: null,
                query: null,
                postData: { mouseData: data, fn: fn }
            });
        }

        this.setState({
            mouse: mouse
        });
    }, 16 /* 60 Hz */);

    handleScroll = _.throttle(() => {
        this.forceUpdate();
    }, 16 /* 60 Hz */);

    getCtx(idx: number) {
        return this.props.contexts ?
            this.props.contexts[idx] :
            (this.props.store && this.props.store.ctx(idx));
    }

    getCtxCount() {
        return this.props.contexts ?
            this.props.contexts.length :
            (this.props.store && this.props.store.ctxCount);
    }

    setupBrowserListeners() {
        var AccidentalTool = require("../stores/accidentalTool.ts");
        var DotTool = require("../stores/dotTool.ts");
        var NoteTool = require("../stores/noteTool.ts");
        var RestTool = require("../stores/restTool.ts");
        var TieTool = require("../stores/tieTool.ts");

        // Handle keys that aren't letters or numbers, and keys with modifiers
        document.onkeydown = (event: KeyboardEvent) => {
            if (document.activeElement.tagName === "INPUT" ||
                    this.props.store.metadataModalVisible) {
                return;
            }
            var keyCode = event.keyCode || event.charCode || 0;
            switch(keyCode) { // Relevant tool: http://ryanflorence.com/keycodes/
                case 32: // space
                    event.preventDefault(); // don't navigate backwards
                    Dispatcher.POST("/local/visualCursor/_togglePlay", null);
                    break;
                case 27: // escape
                    Dispatcher.PUT("/local/tool", null);
                    break;
                case 8: // backspace
                case 46: // delete
                    event.preventDefault(); // don't navigate backwards
                    if (_selection) {
                        Dispatcher.POST("/local/selection/_eraseAll");
                    } else if (!this.props.tool) {
                        Dispatcher.PUT("/local/tool", new NoteTool("note8thUp"));
                    }
                    if (this.props.tool) {
                        this.props.tool.handleKeyPressEvent("backspace", event);
                    }
                    break;
                case 37: // left arrow
                    event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                    Dispatcher.POST("/local/visualCursor", {step: -1});
                    break;
                case 39: // right arrow
                    event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                    Dispatcher.POST("/local/visualCursor", {step: 1});
                    break;
                case 38: // up arrow
                    if (this.props.tool instanceof NoteTool) {
                        event.preventDefault(); // scroll by mouse only
                        Dispatcher.POST("/local/visualCursor/_octave", { delta: 1 });
                    }
                    break;
                case 40: // down arrow
                    if (this.props.tool instanceof NoteTool) {
                        event.preventDefault(); // scroll by mouse only
                        Dispatcher.POST("/local/visualCursor/_octave", { delta: -1 });
                    }
                    break;
                case 90: // 'z'
                    event.preventDefault(); // we control all undo behaviour
                    if (event.ctrlKey || event.metaKey) {
                        if (event.shiftKey) {
                            History.Instance.redo();
                        } else {
                            History.Instance.undo();
                        }
                    }
                    break;
            }
        };

        // Handle letters or numbers
        document.onkeypress = _.throttle((event: KeyboardEvent) => {
            if (document.activeElement.tagName === "INPUT" ||
                    this.props.store.metadataModalVisible) {
                return;
            }
            var keyCode = event.keyCode || event.charCode || 0;

            var key = String.fromCharCode(keyCode);

            // Tools
            var keyToTool: { [key: string]: () => Tool } = {
                "1": function () { return new NoteTool("noteWhole"); },
                "2": function()  {return new NoteTool("noteHalfUp");},
                "3": function()  {return new NoteTool("noteQuarterUp");},
                "4": function()  {return new NoteTool("note8thUp");},
                "5": function()  {return new NoteTool("note16thUp");},
                "6": function()  {return new NoteTool("note32ndUp");},
                "7": function()  {return new NoteTool("note64thUp");},
                "~": function()  {return new TieTool();},
                "=": function()  {return new AccidentalTool(1);},
                "-": function()  {return new AccidentalTool(-1);},
                "0": function()  {return new AccidentalTool(0);}
            };
            if (!this.props.tool) {
                if (key.charCodeAt(0) >= "a".charCodeAt(0) &&
                    key.charCodeAt(0) <= "g".charCodeAt(0)) {
                    Dispatcher.PUT("/local/tool", new NoteTool("note8thUp"));
                } else if (key === "r") {
                    Dispatcher.PUT("/local/tool", new RestTool());
                } else if (key === ".") {
                    Dispatcher.PUT("/local/tool", new DotTool());
                }
            }
            var toolFn = keyToTool[key];
            if (toolFn) {
                Dispatcher.PUT("/local/tool", toolFn());
            } else if (this.props.tool) {
                this.props.tool.handleKeyPressEvent(key, event);
            }
        }, 70);

    }

    componentWillUnmount() {
        if (isBrowser) {
            this.clearBrowserListeners();
        }
        if (this.props.store) {
            this.props.store.removeAnnotationListener(this.update);
        }
    }

    clearBrowserListeners() {
        document.onkeypress = null;
        document.onkeydown = null;
    }

    update() {
        this.setState({
            visualCursor: this.props.store && this.props.store.visualCursor
        });
    }

    getDefaultProps() {
        return {
            marginTop: 20
        };
    }

    _cleanup: () => void = null;
}

export var Component = ReactTS.createReactComponent(Renderer);

export interface IRendererProps {
    contexts?: Array<Context>;
    marginTop?: number;
    pageSize?: C.IPageSize;
    raw?: boolean;
    staveHeight?: number;
    staves?: Array<C.IStave>;
    store?: SongEditorStore.SongEditorStore;
    tool?: Tool;
    top?: number;
    selection?: Array<Model>;
    height?: number;
    paper?: C.Paper;
}

export interface IRendererState {
    selectionRect?: IRect;
    visualCursor?: SongEditorStore.IVisualCursor;
    mouse?: C.IMouse;
}


/**
 * Contains a line. Exists for two reasons:
 *  1. React prefers deeper trees to shallower trees.
 *  2. We know, based on annotation, when a line needs to be updated
 *     and when it does not need to be updated.
 * 
 * Sometimes, the goal of a piece of code gets lost in optimizations.
 * This code is equivilant to the following unoptimized component:
 *     function LineContainerComponent(props: ILineProps, children?: any) {
 *         return props.generate();
 *     }
 */
class LineContainer extends ReactTS.ReactComponentBase<ILineProps, ILineState> {
    render() {
        if (this.shouldClear) {
            assert(this.dirty);
            this.shouldClear = false;
            return Group(null, null);
        }
        if (PROFILER_ENABLED) {
            console.log("Rendering line", this.props.idx);
        }
        return Group(null, this.props.generate());
    }

    shouldComponentUpdate(nextProps: ILineProps, nextState: ILineState) {
        var songDirty = this.props.store && this.props.store.dirty;
        var heightChanged = nextProps.staveHeight !== this.props.staveHeight;
        var lineDirty = this.props.store && this.props.store.isLineDirty(nextProps.idx, nextProps.h);

        if (lineDirty) {
            if (PROFILER_ENABLED) {
                console.log("Line dirty", this.props.idx);
            }
            if (this.props.store) {
                this.props.store.handleAction({
                    description: "DELETE /local/song",
                    query: null,
                    resource: "lineDirty", postData: nextProps.h + "_" + nextProps.idx,
                    response: null
                });
            }
        }
        if (songDirty || heightChanged || lineDirty || this.dirty) {
            // Throttle updating, unless we're on the active line.
            if (this.props.isCurrent) {
                this.dirty = false;
                return true;
            } else {
                if (!this.onScreen) {
                    if (!this.dirty) {
                        // Render a blank thing.
                        this.dirty = true;
                        this.shouldClear = true;
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    this.dirty = false;
                    _.delay(this.updateIfNeeded, 6);
                }
            }
        }
        return false;
    }

    get onScreen(): boolean {
        var domNode: SVGGElement = <any> this.getDOMNode();
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
    }

    updateIfNeeded = _.throttle(() => {
        if (this.isMounted()) {
            this.forceUpdate();
        }
    }, 20, { leading: false });

    dirty: boolean = false;
    shouldClear: boolean = false;
};

var LineContainerComponent = ReactTS.createReactComponent(LineContainer);

var _selection: Array<Model> = null;

interface ILineProps {
    generate: () => any;
    h: number;
    idx: number;
    isCurrent: boolean;
    staveHeight: number;
    store: SongEditorStore.SongEditorStore;
}

interface ILineState {

}

// Ratio between svg coordinate system and 1mm.
export var FONT_SIZE_FACTOR = renderUtil.FONT_SIZE_FACTOR;

var _pointerData: C.IPointerData = {
    staveIdx: null,
    obj: null,
    musicLine: null,
    idx: null
};

interface IPage {
    from: number;
    to: number;
    idx: number;
}

export interface IPosInfo {
    x: number;
    y: number;
    page: number;
    selectionInfo: any;
}

export interface IRect {
    start: {
        x: number;
        y: number;
    };
    end: {
        x: number;
        y: number;
    };
}
