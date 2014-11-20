/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");
import assert = require("assert");
(<any>Object).assign = require("react/lib/Object.assign"); // For DisqusThread
var DisqusThread = require("react-disqus-thread");

import Molasses = require("./molasses");
var Victoria = require("./victoria/victoria");

import Annotator = require("../stores/annotator");
import C = require("../stores/contracts");
import Header = require("../views/_header");
import History = require("../stores/history");
import Model = require("../stores/model");
import Tool = require("../stores/tool");
import renderUtil = require("../util/renderUtil");
import Rect = require("../views/_rect");
import Group = require("../views/_group");
import Line = require("../views/_line");
import RipienoFooter = require("../ui/ripienoFooter");
import SelectionRect = require("./selectionRect");

var isBrowser = typeof window !== "undefined";
var useGL = (typeof global.libripienoclient !== "undefined") ||
    (isBrowser && global.location.search.indexOf("engine=gl") !== -1);

renderUtil.useGL = useGL;

var RenderEngine: typeof Molasses.Component = useGL ? Victoria : Molasses.Component;

var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

/**
 * The main home of the renderer. The renderer accepts annotated Models and
 * either uses Molasses (the SVG engine) or Victoria (the OpenGL ES engine)
 * to draw some sheet music.
 */
class Renderer extends TypedReact.Component<Renderer.IProps, Renderer.IState> {
    render() {
        if (PROFILER_ENABLED) {
            console.time("render");
        }

        var fontSize = NaN;
        var parts = this.props.parts;
        var bodyLength = 0;

        fontSize = this.props.header.staveHeight;
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                bodyLength = parts[i].body.length;
            }
        }

        var pages: Array<IPage> = [];
        var ctx = this.getCtx();
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

        var mInchW = 85000*(this.props.pageSize.width/215.9);
        var mInchH = 110000*(this.props.pageSize.height/279.4);

        var viewbox = "0 0 " + Math.round(mInchW) + " " + Math.round(mInchH);

        // XXX: Currently we only support single and double staffs.
        // isPianoStaff is set to true when there is at least 2 staffs.
        var isPianoStaff = _.reduce(parts, function (memo: number, s: C.IPart) {
            return memo + (s.body ? 1 : 0);
        }, 0) >= 2;

        var vcHeight = 1.2 + ctx.staveSeperation / 2;
        var rawPages = _.map(pages, (page: IPage, pidx: number) => {
            return <!RenderEngine
                    onClick={this.handleMouseClick}
                    onMouseDown={this.handleMouseDown}
                    onMouseUp={this.handleMouseUp}
                    onMouseLeave={this.handleMouseLeave}
                    onMouseMove={this.handleMouseMove}
                    page={page}
                    parts={parts}
                    width={this.props.raw ? mInchW/10000 + "in" : "100%"}
                    height={this.props.raw ? mInchH/10000 + "in" : "100%"}
                    widthInSpaces={renderUtil.mm(this.props.pageSize.width, fontSize)}
                    viewbox={viewbox}>
                {!page.from && !useGL && <!Header
                    fontSize={fontSize}
                    middle={renderUtil.mm(this.props.pageSize.width/2 +
                        this.props.paper.rightMargin -
                        this.props.paper.leftMargin, fontSize)}
                    right={renderUtil.mm(this.props.pageSize.width -
                        this.props.paper.rightMargin, fontSize * 0.75)}
                    key="HEADER"
                    model={this.props.header} />}
                {/* Using parts is an anti-pattern. Ideally, we would have a getModels()
                    method in SongEditorStore or something. */}
                {_.map(parts, (part: C.IPart, idx: number) => {
                    assert(part.body);
                    return <!Group.Component key={idx} style={{ fontSize: fontSize * Renderer.FONT_SIZE_FACTOR + "px" }}>
                        {_.reduce(part.body.slice(page.from, page.to), function (memo: Array<Model>[], obj: Model) {
                            if (obj.type === C.Type.NewLine) {
                                memo.push([]);
                            }
                            memo[memo.length - 1].push(obj);
                            return memo;
                        }, [[]]).splice(page.idx ? 1 : 0 /* BUG!! */).map(
                            (s: Array<Model>, lidx: number) => {
                                return <!LineContainerComponent
                                    parts={this.props.parts}
                                    isCurrent={this.state.visualCursor.annotatedLine ===
                                        lidx + pageLines[page.idx]}
                                    store={this.props.store}
                                    staveHeight={this.props.staveHeight}
                                    h={idx}
                                    generate={function () {
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
                                            if (s[i].visible()) {
                                                components[h++] = s[i].render(fontSize);
                                            }
                                        }
                                        components.length = h;
                                        return components;
                                    }}
                                    idx={lidx + pageLines[page.idx]}
                                    key={lidx} />;
                            }
                        )}
                    </Group.Component>
                })}
                {this.props.tool && this.props.tool.render(
                    this.getCtx(),
                    this.state.mouse,
                    _pointerData,
                    fontSize,
                    pidx)}
                {this.state.selectionRect && <!SelectionRect.Component
                    fontSize={fontSize}
                    x={Math.min(this.state.selectionRect.start.x, this.state.selectionRect.end.x)}
                    y={Math.min(this.state.selectionRect.start.y, this.state.selectionRect.end.y)}
                    width={Math.abs(this.state.selectionRect.start.x - this.state.selectionRect.end.x)}
                    height={Math.abs(this.state.selectionRect.start.y - this.state.selectionRect.end.y)} />}
                {(pidx === this.state.visualCursor.annotatedPage) &&
                    this.state.visualCursor && this.state.visualCursor.annotatedObj && <!Group.Component
                            style={{fontSize: fontSize*Renderer.FONT_SIZE_FACTOR + "px"}}>
                        <!Line.Component
                            x1={this.state.visualCursor.annotatedObj.x - 0.2}
                            x2={this.state.visualCursor.annotatedObj.x - 0.2}
                            y1={this.state.visualCursor.annotatedObj.y - ctx.staveSeperation *
                                this.state.visualCursor.annotatedStave + (isPianoStaff ? ctx.staveSeperation/2 : 0) - vcHeight}
                            y2={this.state.visualCursor.annotatedObj.y - ctx.staveSeperation *
                                this.state.visualCursor.annotatedStave + (isPianoStaff ? ctx.staveSeperation/2 : 0) + vcHeight}
                            stroke="#008CFF"
                            strokeWidth={0.05} />
                    </Group.Component>}
                </RenderEngine>});

        var ret: React.ReactElement<any, any>; // React component
        var currY = this.props.marginTop;
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
                                top: currY,
                                marginBottom: this.props.marginBottom}}>
                        {rawPage}</div>
                    currY += 40 + this.props.height;
                    return page;
                })}
                {this.props.comments && this.props.header.title && <!div
                        className="commentBox"
                        style={{
                            width: this.props.width + "px",
                            marginLeft: "calc(50% - " + this.props.width / 2 + "px)",
                            marginTop: currY + 13 + "px" }}>
                    <!DisqusThread
                        shortname={(global.document &&
                            document.location.hostname === "ripieno.io" ||
                                document.location.hostname === "ripienostaging.me") ? "ripieno" : "ripieno-dev"}
                        identifier={"usermedia-" + this.props.songId}
                        title={this.props.header.title}
                        categoryId={<any>null}
                        url={"ripieno.io/songs/" + this.props.songId} />
                    </div>}
                {this.props.showFooter ? <!RipienoFooter.Component
                    marginTop={123}
                    dispatcher={this.props.dispatcher}
                    noShadow={this.props.comments} /> : null}
            </div>;
        } else {
            ret = <any> rawPages[0]; // TRFIX
        }

        if (this.props.store) {
            this.props.store.dangerouslyMarkRenderDone();
        }

        if (PROFILER_ENABLED) {
            console.timeEnd("render");
        }
        return ret;
    }

    componentWillReceiveProps(newProps: Renderer.IProps) {
        if (this.props.tool !== newProps.tool) {
            if (this.props.tool) {
                this.props.tool.toolWillBeUnactive(this.props.store);
            }
            if (newProps.tool) {
                newProps.tool.toolWillBeActive(this.props.store);
            }
        }
    }

    componentDidMount() {
        if (isBrowser && this.props.dispatcher) {
            this.attachToBrowser();
        }
        if (this.props.store) {
            this.props.store.addAnnotationListener(this.update);
        }

        if (this.props.tool) {
            this.props.tool.toolWillBeActive(this.props.store);
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

            dynY = ctx.lines[info.musicLine].y + ctx.staveSeperation * info.visualIdx;
            dynLine = Math.round((dynY - mouse.y)/0.125)/2 + 3;
            var body = this.props.parts[info.partIdx].body;
            for (var j = ctx.pageStarts[mouse.page];
                    j < body.length && body[info.musicLine].type !== C.Type.NewPage; ++j) {
                var item = body[j];
                ctxData = item.ctxData;
                if (Math.abs(item.y - dynY) < 0.001) {
                    if ((item.type === C.Type.KeySignature ||
                                item.type === C.Type.TimeSignature ||
                                item.type === C.Type.Clef ||
                                item.type === C.Type.Duration) &&
                            Math.abs(dynX - item.x + item.cachedSpacing*2) < 0.27 + item.cachedSpacing*4 +
                                (item.isNote ? (item.note.dots||0)*0.2 : 0)) {
                        dynX = item.x;
                        foundIdx = j;
                        foundObj = item;
                        break;
                    } else if (dynX < item.x ||
                            (j === body.length - 1 && info.partIdx === this.props.parts.filter(s => !!s.body).length - 1)) {

                        // End of a line.
                        // XXX: Instead, use EndMarker.
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
                            obj: new Model({
                                placeholder: true,
                                idx: j,
                                item: item,
                                musicLine: info.musicLine,
                                Source: C.Source.Annotator,
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
        for (var h = 0; h < this.props.parts.length; ++h) {
            var body = this.props.parts[h].body;
            if (!body) {
                continue;
            }
            ++visualIdx;

            for (var i = ctx.pageLines[page]; i < ctx.lines.length; ++i) {
                if (Math.abs(ctx.lines[i].y + visualIdx*ctx.staveSeperation - my) < 1.01) {
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
        for (var h = 0; h < this.props.parts.length; ++h) {
            var body = this.props.parts[h].body;
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
            x: pt.x / this.props.staveHeight / Renderer.FONT_SIZE_FACTOR - 0.15,
            y: pt.y / this.props.staveHeight / Renderer.FONT_SIZE_FACTOR,
            page: parseInt(svg_elt.getAttribute("data-page"), 10),
            selectionInfo: target.getAttribute("data-selection-info")
        };
    }

    handleMouseClick(event: React.MouseEvent) {
        var mouse = this.getPositionForMouse(event);
        var data = this._getPointerData(mouse);
        // No tool is also known as the "select" tool.
        if (!this.props.tool && data.ctxData) {
            this.props.dispatcher.PUT("/local/visualCursor", {
                bar: data.ctxData.bar,
                beat: data.ctxData.beat,
                endMarker: data.ctxData.endMarker
            });
        }
        if (!this.props.tool) {
            return;
        }
        try {
            var fn = this.props.tool.handleMouseClick(mouse, data.line, data.obj);
        } catch(err) {
            if (err instanceof C.DispatcherRedirect) {
                var redirect = <C.DispatcherRedirect> err;
                (<any>this.props.dispatcher)[redirect.verb](redirect.newUrl);
            } else {
                throw err;
            }
        }
        if (fn) {
            this.props.dispatcher.PUT("/local/tool/action", {mouseData: data, fn: fn});
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
                    this.props.store.dangerouslyMarkRendererDirty();
                }
            }
            this.setState({
                selectionRect: {
                    start: pos,
                    end: pos
                }
            });
            if (this.props.selection) {
                this.props.dispatcher.DELETE("/local/selection");
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
                });
                // Bottleneck: detect lines with selected content
                if (this.props.store) {
                    this.props.store.dangerouslyMarkRendererDirty();
                }
            } else {
                _selection = null;
            }
            this.setState({
                selectionRect: null
            });
            if (_selection) {
                this.props.dispatcher.PUT("/local/selection", _selection.length ? _selection : null);
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
                this.props.dispatcher.DELETE("/local/tool");
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

    handleMouseMoveThrottled = _.throttle((mouse: Renderer.IPosInfo) => {
        var data = this._getPointerData(mouse);
        var fn = this.props.tool.handleMouseMove(mouse, data.line, data.obj);
        if (fn === "hide" || !data.obj) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            if (this.props.store) {
                this.props.store.dangerouslyHidePreview(null);
            }
        } else if (fn && this.props.store) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            this.props.store.dangerouslyShowPreview({
                description: "PUT /local/tool/preview",
                response: null,
                query: null,
                postData: {
                    mouseData: data, fn: fn
                }
            });
        }

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

    attachToBrowser() {
        document.addEventListener("keydown", this._handleKeyDown);
        document.addEventListener("keypress", this._handleKeyPress);
        this._oldTitle = document.title;
        document.title = this.props.header.title;
    }

    detachFromBrowser() {
        document.removeEventListener("keydown", this._handleKeyDown);
        document.removeEventListener("keypress", this._handleKeyPress);;
        if (global.DISQUS) {
            global.DISQUS.reset();
        }
        document.title = this._oldTitle;
    }

    private _handleKeyDown(event: KeyboardEvent) {
        var NoteTool = require("../stores/noteTool");

        if (document.activeElement.tagName === "INPUT" ||
                this.props.store.metadataModalVisible) {
            return;
        }
        var keyCode = event.keyCode || event.charCode || 0;
        switch(keyCode) { // Relevant tool: http://ryanflorence.com/keycodes/
            case 32: // space
                event.preventDefault(); // don't navigate backwards
                this.props.dispatcher.PUT("/local/visualCursor/_togglePlay", null);
                break;
            case 27: // escape
                this.props.dispatcher.PUT("/local/tool", null);
                break;
            case 8: // backspace
            case 46: // DELETE
                event.preventDefault(); // don't navigate backwards
                if (_selection) {
                    this.props.dispatcher.DELETE("/local/selection/contents");
                } else if (!this.props.tool) {
                    this.props.dispatcher.PUT("/local/tool", new NoteTool("note8thUp"));
                }
                if (this.props.tool) {
                    this.props.tool.handleKeyPressEvent("backspace", event, this.props.dispatcher);
                }
                break;
            case 37: // left arrow
                event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                this.props.dispatcher.PUT("/local/visualCursor", {step: -1});
                break;
            case 39: // right arrow
                event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                this.props.dispatcher.PUT("/local/visualCursor", {step: 1});
                break;
            case 38: // up arrow
                if (this.props.tool instanceof NoteTool) {
                    event.preventDefault(); // scroll by mouse only
                    this.props.dispatcher.PUT("/local/visualCursor/before/octave", { delta: 1 });
                }
                break;
            case 40: // down arrow
                if (this.props.tool instanceof NoteTool) {
                    event.preventDefault(); // scroll by mouse only
                    this.props.dispatcher.PUT("/local/visualCursor/before/octave", { delta: -1 });
                }
                break;
            case 90: // 'z'
                event.preventDefault(); // we control all undo behavior
                if (event.ctrlKey || event.metaKey) {
                    if (event.shiftKey) {
                        this.props.history.redo();
                    } else {
                        this.props.history.undo();
                    }
                }
                break;
        }
    }

    private _handleKeyPress = _.throttle((event: KeyboardEvent) => {
        var AccidentalTool = require("../stores/accidentalTool");
        var DotTool = require("../stores/dotTool");
        var NoteTool = require("../stores/noteTool");
        var RestTool = require("../stores/restTool");
        var TieTool = require("../stores/tieTool");

        var keyCode = event.keyCode || event.charCode || 0;

        var key = String.fromCharCode(keyCode);
        if (event.ctrlKey || event.metaKey) {
            // Rudely prevent tab switches on Chrome/Firefox on Windows (+Linux?)
            event.stopPropagation();
            event.preventDefault();

            switch (key) {
                case "1": this.props.setRibbonTabFn(1); break;
                case "2": this.props.setRibbonTabFn(2); break;
                case "3": this.props.setRibbonTabFn(3); break;
                case "4": this.props.setRibbonTabFn(4); break;
            }
            return;
        }

        // Tools don't apply here.
        if (document.activeElement.tagName === "INPUT" ||
            this.props.store.metadataModalVisible) {
            return;
        }

        // Tools
        var keyToTool: { [key: string]: () => Tool } = {
            "1": function () { return new NoteTool("noteWhole"); },
            "2": function () { return new NoteTool("noteHalfUp"); },
            "3": function () { return new NoteTool("noteQuarterUp"); },
            "4": function () { return new NoteTool("note8thUp"); },
            "5": function () { return new NoteTool("note16thUp"); },
            "6": function () { return new NoteTool("note32ndUp"); },
            "7": function () { return new NoteTool("note64thUp"); },
            "~": function () { return new TieTool(); },
            "=": function () { return new AccidentalTool(1); },
            "-": function () { return new AccidentalTool(-1); },
            "0": function () { return new AccidentalTool(0); }
        };
        if (!this.props.tool) {
            if (key.charCodeAt(0) >= "a".charCodeAt(0) &&
                key.charCodeAt(0) <= "g".charCodeAt(0)) {
                this.props.dispatcher.PUT("/local/tool", new NoteTool("note8thUp"));
            } else if (key === "r") {
                this.props.dispatcher.PUT("/local/tool", new RestTool());
            } else if (key === ".") {
                this.props.dispatcher.PUT("/local/tool", new DotTool());
            }
        }
        var toolFn = keyToTool[key];
        if (toolFn) {
            this.props.dispatcher.PUT("/local/tool", toolFn());
        } else if (this.props.tool) {
            this.props.tool.handleKeyPressEvent(key, event, this.props.dispatcher);
        }
    }, 70);

    componentWillUnmount() {
        if (isBrowser) {
            this.detachFromBrowser();
        }
        if (this.props.store) {
            this.props.store.removeAnnotationListener(this.update);
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

    _cleanup: () => void = null;
}

module Renderer {
    "use strict";
    export var Component = TypedReact.createClass<Renderer.IProps, Renderer.IState>(React.createClass, Renderer);

    export interface IProps {
        comments?: boolean;
        context?: Annotator.Context;
        cursor?: C.IVisualCursor;
        dispatcher?: C.IDispatcher;
        marginTop?: number;
        marginBottom?: number;
        pageSize?: C.IPageSize;
        raw?: boolean;
        sessionInfo?: C.ISession;
        staveHeight?: number;
        header: C.IHeader;
        parts?: Array<C.IPart>;
        songId?: string;
        store?: C.ISongEditor;
        tool?: Tool;
        top?: number;
        selection?: Array<Model>;
        width?: number;
        showFooter?: boolean;
        height?: number;
        history?: History.History;
        paper?: C.Paper;
        setRibbonTabFn: (tab: number) => void;
    }

    export interface IState {
        selectionRect?: IRect;
        visualCursor?: C.IVisualCursor;
        mouse?: C.IMouse;
    }

    // Ratio between SVG coordinate system and 1mm.
    export var FONT_SIZE_FACTOR = renderUtil.FONT_SIZE_FACTOR;

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
            return <!Group.Component />;
        }
        if (PROFILER_ENABLED) {
            console.log("Rendering line", this.props.idx);
        }
        return <!Group.Component>{this.props.generate()}</Group.Component>;
    }

    shouldComponentUpdate(nextProps: ILineProps, nextState: ILineState) {
        var songDirty = this.props.store && this.props.store.dirty ||
                nextProps.parts !== this.props.parts;
        var heightChanged = nextProps.staveHeight !== this.props.staveHeight;
        var lineDirty = this.props.store && this.props.store.getLineDirty(nextProps.idx, nextProps.h);

        if (lineDirty) {
            if (PROFILER_ENABLED) {
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
        if (songDirty || heightChanged || lineDirty || this.dirty) {
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

var LineContainerComponent = TypedReact.createClass(React.createClass, LineContainer);

var _selection: Array<Model> = null;

interface ILineProps {
    generate: () => any;
    h: number;
    idx: number;
    isCurrent: boolean;
    staveHeight: number;
    parts: Array<C.IPart>;
    store: C.ISongEditor;
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