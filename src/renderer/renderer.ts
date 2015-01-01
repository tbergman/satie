/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/* tslint:disable */ 

import React        	= require("react");
import TypedReact   	= require("typed-react");
import _            	= require("lodash");
import assert       	= require("assert");
(<any>Object).assign    = require("react/lib/Object.assign");   // For DisqusThread

import Molasses         = require("./molasses");

import Annotator        = require("../stores/annotator");
import C                = require("../stores/contracts");
import Header           = require("../views/_header");
import Model            = require("../stores/model");
import PlaceholderModel = require("../stores/placeholder");
import Rect             = require("../views/_rect");
import Line             = require("../views/_line");

var    isBrowser        = typeof window !== "undefined";
var    useGL            = (typeof global.libripienoclient !== "undefined") ||
                          (isBrowser && global.location.search.indexOf("engine=gl") !== -1);

C.renderUtil.useGL      = useGL;
var RenderEngine        = Molasses.Component;
var profilerEnabled     = isBrowser && global.location.search.indexOf("profile=1") !== -1;

/**
 * The main home of the renderer. The renderer accepts annotated Models and
 * either uses Molasses (the SVG engine) or Victoria (the OpenGL ES engine)
 * to draw some sheet music.
 */
class Renderer extends TypedReact.Component<Renderer.IProps, Renderer.IState> {
    render() {
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

        var pages: Array<IPage> = [];
        var ctx = this.getCtx();
        var scale40 = ctx.calcFontSize();
        assert(ctx, "You must annotate before rendering");
        var pageStarts = ctx.pageStarts;
        var pageLines = ctx.pageLines;

        var pageCount = pageStarts.length;
        for (var i = 1; i < pageCount; ++i) {
            pages.push({from: pageStarts[i - 1], to: pageStarts[i], idx: i-1});
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
        var rawPages = _.map(pages, (page: IPage, pidx: number) => {
            return <!RenderEngine
                    onClick={this.handleMouseClick}
                    onMouseLeave={this.handleMouseLeave}
                    onMouseMove={this.handleMouseMove}
                    page={page}
                    parts={parts}
                    width={this.props.raw ? C.renderUtil.tenthsToMM(scale40, width10s) + "mm" : "100%"}
                    height={this.props.raw ? C.renderUtil.tenthsToMM(scale40, height10s) + "mm" : "100%"}
                    viewbox={viewbox}>
                {!page.from && !useGL && <!Header.Component
                    editMode={this.props.editMode}
                    fontSize={scale40}
                    key="HEADER"
                    model={this.props.header} />}
                {/* Using parts is an anti-pattern. Ideally, we would have a getModels()
                    method in ScoreStore or something. */}
                {_.map(parts, (part: C.IPart, idx: number) =>
                    _.chain(part.voices).map(voice => voices[voice]).map((voice, vidx) => 
                            <!g key={idx + "_" + vidx} style={{ fontSize: scale40 + "px" }}>
                        {_.reduce(voice.body.slice(page.from, page.to), function (memo: Array<Model>[], obj: Model) {
                            if (obj.type === C.Type.NewLine) {
                                memo.push([]);
                            }
                            memo[memo.length - 1].push(obj);
                            return memo;
                        }, [[]]).splice(page.idx ? 1 : 0 /* BUG!! */).map(
                            (s: Array<Model>, lidx: number) => {
                                return React.createElement(LineContainerComponent, {
                                    parts: this.props.parts,
                                    isCurrent: this.state.visualCursor.annotatedLine ===
                                        lidx + pageLines[page.idx],
                                    store: this.props.store,
                                    h: idx,
                                    generate: function generate() {
                                        var components = new Array(s.length * 2);
                                        var h = 0;
                                        // I think selected items currently HAVE to
                                        // be consecutive, but this could change.
                                        var selIdx = -1;
                                        var selProps: any = null;
                                        for (var i = 0; i < s.length; ++i) {
                                            if (s[i].selected && s[i].type !== C.Type.NewLine &&
                                                s[i].type !== C.Type.EndMarker) {
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
                                            if (selIdx !== -1 &&
                                                (!s[i].selected || i + 1 === s.length)) {
                                                selProps.width = Math.abs(s[i].x - selProps.x);
                                                components[selIdx]= <!Rect.Component {...selProps} />;
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
                            }
                        )}
                    </g>).value()
                )}
                {(pidx === this.state.visualCursor.annotatedPage) &&
                    this.state.visualCursor && this.state.visualCursor.annotatedObj && <!g
                            style={{fontSize: scale40 + "px"}}>
                        <!Line.Component
                            x1={this.state.visualCursor.annotatedObj.x - 8}
                            x2={this.state.visualCursor.annotatedObj.x - 8}
                            y1={this.state.visualCursor.annotatedObj.y - ctx.staveSpacing * (ctx._voices.length - 1) *
                                this.state.visualCursor.annotatedStave + (false/*isPiano MXFIX*/ ? ctx.staveSpacing * (ctx._voices.length - 1)/2 : 0) - vcHeight}
                            y2={this.state.visualCursor.annotatedObj.y - ctx.staveSpacing * (ctx._voices.length - 1) *
                                this.state.visualCursor.annotatedStave + (false/*isPiano MXFIX*/ ? ctx.staveSpacing * (ctx._voices.length - 1)/2 : 0) + vcHeight}
                            stroke="#008CFF"
                            strokeWidth={2} />
                    </g>}
                </RenderEngine>});

        var ret: React.ReactElement<any>;
        var yPtr = {y: this.props.marginTop};
        if (!this.props.raw) {
            ret = <!div className="workspace" onScroll={this.handleScroll} style={{top: "" + this.props.top}}>

                {_.map(rawPages, (rawPage: any, pidx: number) => {
                    var page = <!div
                            className="page"
                            key={"page" + pidx}
                            style={{
                                position: "absolute",
                                width: this.props.width,
                                height: this.props.height,
                                left: "50%",
                                marginLeft: -this.props.width/2,
                                top: yPtr.y,
                                marginBottom: this.props.marginBottom}}>
                        {rawPage}</div>
                    yPtr.y += 40 + this.props.height;
                    return page;
                })}
            </div>;
        } else {
            ret = <any> rawPages[0]; // TRFIX
        }

        if (this.props.store) {
            this.props.store.dangerouslyMarkRenderDone();
        }

        if (profilerEnabled) {
            console.timeEnd("render");
        }
        return ret;
    }

    private _hideMidiEntry = () => {
        localStorage["midiEntry"] = "closed";
        this.forceUpdate();
    }

    componentDidMount() {
        if (isBrowser && this.props.dispatcher) {
            this._attachToBrowser();
        }
        if (this.props.store) {
            this.props.store.addListener(C.EventType.Annotate, this.update);
        }
    }

    componentWillUnmount() {
        if (isBrowser) {
            this._detachFromBrowser();
        }
        if (this.props.store) {
            this.props.store.removeListener(C.EventType.Annotate, this.update);
        }
    }

    _getPointerData(mouse: C.IMouse) : C.IPointerData {
        var dynY = mouse.y;
        var dynX = mouse.x;
        var dynLine = 3;
        var foundObj: Model = null;
        var foundIdx: number;
        var ctxData: { beat: number; bar: number };
        var ctx = this.getCtx();
        var info = this._getStaveInfoForY(mouse.y, mouse.page);
        if (info) {
            var ctx = this.getCtx();

            dynY = ctx.lines[info.musicLine].y + ctx.staveSpacing * (ctx._voices.length - 1) * info.visualIdx;
            dynLine = Math.round((dynY - mouse.y)/5)/2 + 3;
            var body = this.props.voices[info.partIdx].body;
            for (var j = ctx.pageStarts[mouse.page];
                    j < body.length && body[info.musicLine].type !== C.Type.NewPage; ++j) {
                var item = body[j];
                ctxData = item.ctxData;
                if (Math.abs(item.y - dynY) < 0.04) {
                    if ((item.type === C.Type.KeySignature ||
                                item.type === C.Type.TimeSignature ||
                                item.type === C.Type.Clef ||
                                item.type === C.Type.Duration) &&
                            Math.abs(dynX - item.x + item.spacing*2) < 10.8 + item.spacing*4 +
                                (item.isNote ? (item.note.dots||0)*8 : 0)) {
                        dynX = item.x;
                        foundIdx = j;
                        foundObj = item;
                        break;
                    } else if (dynX < item.x ||
                            (j === body.length - 1 && info.partIdx === this.props.voices.filter(s => !!s.body).length - 1)) {

                        // End of a line.
                        // XXX: Instead, use EndMarker.
                        if (dynX < item.x) {
                            j -= 1;
                        }
                        _pointerData = {
                            mouse: mouse,
                            line: dynLine,
                            idx: j,
                            partIdx:        info.partIdx,
                            musicLine:      info.musicLine,
                            ctxData:        item.ctxData,
                            visualIdx:      info.visualIdx,
                            obj: new PlaceholderModel({
                                priority:   C.Type.Unknown,
                                item:       item,
                                musicLine:  info.musicLine,
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
    }

    /**
     * Given a y position and a page, returns a part (h) and
     * and a line (i).
     */
    private _getStaveInfoForY(my: number, page: number): { musicLine: number; partIdx: number; visualIdx: number } {
        var ctx = this.getCtx();
        var visualIdx = -1;
        for (var h = 0; h < this.props.voices.length; ++h) {
            var body = this.props.voices[h].body;
            if (!body) {
                continue;
            }
            ++visualIdx;

            for (var i = ctx.pageLines[page]; i < ctx.lines.length; ++i) {
                if (Math.abs(ctx.lines[i].y + visualIdx*ctx.staveSpacing * (ctx._voices.length - 1) - my) < 55) {
                    return {
                        musicLine: i,
                        partIdx: h,
                        visualIdx: visualIdx
                    };
                }
            }
        }
        return null;
    }

    _elementsInBBox(box: ClientRect, mouse: C.IMouse): Array<Model> {
        var ret: Array<Model> = [];

        var ctx = this.getCtx();
        for (var h = 0; h < this.props.voices.length; ++h) {
            var body = this.props.voices[h].body;
            if (!body) {
                continue;
            }
            var inRange = function(min: number, val: number, max: number)  {return min < val && val < max;};

            for (var i = ctx.pageStarts[mouse.page]; i < body.length && body[i].type !== C.Type.NewPage; ++i) {
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
            visualCursor: this.props.store && this.props.store.visualCursor ||
                this.props.cursor || { annotatedPage: 0 }
        };
    }

    getPositionForMouse(event: React.MouseEvent): Renderer.IPosInfo {
        var target: Element;
        if (useGL) {
            var ctx = this.getCtx();
            var scale40 = ctx.calcFontSize();
            var print = C.getPrint(ctx._layout.header);
            var widthMM = print.pageLayout.pageWidth;
            target = <Element> event.target;
            var rect = target.getBoundingClientRect();

            return {
                x: (event.clientX - rect.left) / target.clientWidth,
                y: (event.clientY - rect.top) / target.clientWidth,
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
            x: pt.x - 6,
            y: pt.y,
            page: parseInt(svg_elt.getAttribute("data-page"), 10),
            selectionInfo: target.getAttribute("data-selection-info")
        };
    }

    handleMouseClick(event: React.MouseEvent) {
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
    }

    handleMouseMove(event: React.MouseEvent) {
        this.handleMouseMoveThrottled(this.getPositionForMouse(event));
    }

    handleMouseLeave() {
        this.setState({
            mouse: null
        });
    }

    handleMouseMoveThrottled = _.throttle((mouse: Renderer.IPosInfo) => {
        var data = this._getPointerData(mouse);
        this.setState({
            mouse: mouse
        });
    }, 16 /* 60 Hz */);

    handleScroll = _.throttle(() => {
        this.forceUpdate();
    }, 16 /* 60 Hz */);

    getCtx(): Annotator.Context {
        return this.props.context ?
            this.props.context :
            (this.props.store && this.props.store.finalCtx);
    }

    private _oldTitle: string;

    _attachToBrowser() {
        document.addEventListener("keydown", this._handleKeyDown);
        this._oldTitle = document.title;
        document.title = this.props.header.movementTitle;
    }

    _detachFromBrowser() {
        document.removeEventListener("keydown", this._handleKeyDown);
        if (global.DISQUS) {
            global.DISQUS.reset();
        }
        document.title = this._oldTitle;
    }

    private _handleKeyDown(event: KeyboardEvent) {
        var keyCode = event.keyCode || event.charCode || 0;
        switch(keyCode) { // Relevant tool: http://ryanflorence.com/keycodes/
            case 32: // space
                event.preventDefault(); // don't navigate backwards
                this.props.dispatcher.PUT("/webapp/visualCursor/togglePlay", null);
                break;
            case 8: // backspace
            case 37: // left arrow
                event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                this.props.dispatcher.PUT("/webapp/visualCursor/step", {step: -1});
                break;
            case 39: // right arrow
                event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                this.props.dispatcher.PUT("/webapp/visualCursor/step", {step: 1});
                break;
        }
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
}

module Renderer {
    "use strict";
    export var Component = TypedReact.createClass(Renderer);

    export interface IState {
        visualCursor?:  C.IVisualCursor;
        mouse?:         C.IMouse;
    }

    export interface IProps {
        context?: Annotator.Context;
        cursor?: C.IVisualCursor;
        dispatcher?: C.IDispatcher;
        editMode?: boolean;
        marginTop?: number;
        marginBottom?: number;
        raw?: boolean;
        header: C.ScoreHeader;
        parts?: Array<C.IPart>;
        voices?: Array<C.IVoice>;
        songId?: string;
        store?: C.IScoreStore;
        top?: number;
        width?: number;
        height?: number;
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
}

/**
 * Contains a line. Exists for two reasons:
 *  1. React prefers deep trees to wide trees.
 *  2. We know, based on annotation, when a line needs to be updated
 *     and when it does not need to be updated.
 * 
 * Sometimes, the goal of a piece of code gets lost in optimizations.
 * This code is equivalent to the following unoptimized component:
 *     function LineContainerComponent(props: ILineProps, children?: any) {
 *         return props.generate();
 *     }
 */
class LineContainer extends TypedReact.Component<ILineProps, ILineState> {
    render() {
        if (this.shouldClear) {
            assert(this.dirty);
            this.shouldClear = false;
            return <!g />;
        }
        if (profilerEnabled) {
            console.log("Rendering line", this.props.idx);
        }
        return <!g>{this.props.generate()}</g>;
    }

    shouldComponentUpdate(nextProps: ILineProps, nextState: ILineState) {
        var songDirty = this.props.store && this.props.store.dirty ||
                nextProps.parts !== this.props.parts;
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
            // Throttle updating, unless we're on the active line, or if we're
            // completely replacing the song.
            if (this.props.isCurrent || this.props.parts !== nextProps.parts) {
                this.dirty = false;
                return true;
            } else if (!this.onScreen) {
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
        return false;
    }

    onScreen(): boolean {
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

var LineContainerComponent = TypedReact.createClass(LineContainer);

interface ILineProps {
    generate: () => any;
    h: number;
    idx: number;
    isCurrent: boolean;
    parts: Array<C.IVoice>;
    store: C.IScoreStore;
}

interface ILineState {

}

var _pointerData: C.IPointerData = {
    partIdx: null,
    obj: null,
    musicLine: null,
    idx: null,
    visualIdx: null
};

interface IPage {
    from: number;
    to: number;
    idx: number;
}

export = Renderer;
