/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");
var assert = require("assert");

var Molasses = require("./molasses/molasses.jsx");
var Victoria = require("./victoria/hellogl.jsx");

var isBrowser = typeof window !== "undefined";
var useGL = (typeof libripienoclient !== "undefined") ||
    (isBrowser && global.location.search.indexOf("engine=gl") !== -1);

var History = require("../stores/history.jsx");
var Group = require("../views/_group.jsx");
var Header = require("../views/_header.jsx");
var Line = require("../views/_line.jsx");
var SelectionRect = require("./selectionRect.jsx");
var renderUtil = require("ripienoUtil/renderUtil.jsx");
renderUtil.useGL = useGL;

var RenderEngine = useGL ? Victoria : Molasses;

var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

var Renderer = React.createClass({
    render: function() {
        PROFILER_ENABLED && console.time("render");

        var fontSize = this.props.staveHeight;
        var y = 0;
        var staves = this.props.staves;

        var pages = [];
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

        // XXX: Currently we only support single and double staves.
        // isPianoStaff is set to true when there is at least 2 staves.
        var isPianoStaff = _.reduce(staves, (memo, s) => memo + (s.body ? 1 : 0), 0) >= 2;

        var vcHeight = 2/4 + 0.1 + (isPianoStaff ? 1.2 : 0);

        var rawPages = _.map(pages, (page, pidx) =>
            <RenderEngine
                onClick={this.handleMouseClick}
                onMouseDown={this.handleMouseDown}
                onMouseUp={this.handleMouseUp}
                onMouseLeave={this.handleMouseLeave}
                onMouseMove={this.handleMouseMove}
                page={page}
                staves={staves}
                width={this.props.raw ? mInchW/10000 + "in" : "100%"}
                height={this.props.raw ? mInchH/10000 + "in" : "100%"}
                widthInSpaces={renderUtil.mm(this.props.pageSize.width, fontSize)}
                viewbox={viewbox}>
            {/* Using staves is an anti-pattern. Ideally, we would have a getModels()
                method in SongEditorStore or something. */}
            {_.map(staves, (stave, idx) => {
                if (stave.header) {
                    if (page.from) {
                        return null;
                    }
                    y += Header.getHeight(stave.header);
                    return !useGL && <Header
                        fontSize={fontSize}
                        middle={renderUtil.mm(this.props.pageSize.width, fontSize)/2}
                        right={renderUtil.mm(this.props.pageSize.width - 15, fontSize*0.75)}
                        key="HEADER"
                        model={stave.header} />;
                } else if (stave.body) {
                    return <Group key={idx} style={{fontSize: fontSize*FONT_SIZE_FACTOR + "px"}}>
                        {_.reduce(stave.body.slice(page.from, page.to), (memo, obj) => {
                            if (obj.newline) {
                                memo.push([]);
                            }
                            memo[memo.length - 1].push(obj);
                            return memo;
                        }, [[]]).splice(page.idx ? 1 : 0 /* BUG!! */).map((s, lidx) =>
                            <LineContainer
                                store={this.props.store}
                                staveHeight={this.props.staveHeight}
                                h={idx}
                                generate={() => _.map(s, item => item.visible() && item.render())}
                                idx={lidx + pageLines[page.idx]} key={lidx} />)}
                    </Group>;
                } else {
                    return null;
                }
            })}
            {!pidx && this.props.tool && _.map(staves, (stave,idx) => stave.body &&
                this.props.tool.render(
                    this.getCtx(idx),
                    this.state.mouse,
                    _pointerData,
                    fontSize,
                    idx))}
            {this.state.selectionRect && <SelectionRect
                fontSize={fontSize}
                x={Math.min(this.state.selectionRect.start.x, this.state.selectionRect.end.x)}
                y={Math.min(this.state.selectionRect.start.y, this.state.selectionRect.end.y)}
                width={Math.abs(this.state.selectionRect.start.x - this.state.selectionRect.end.x)}
                height={Math.abs(this.state.selectionRect.start.y -
                        this.state.selectionRect.end.y)} />}

            {pidx === this.state.visualCursor.annotatedPage &&
                this.state.visualCursor && this.state.visualCursor.annotatedObj && <Group
                        key={"visualCursorGroup" + Math.random() /* chrome bug */}
                        style={{fontSize: fontSize*FONT_SIZE_FACTOR + "px"}}>
                    <Line key="visualCursor"
                        className="visualCursor"
                        x1={this.state.visualCursor.annotatedObj["$Model_x"] - 0.1}
                        x2={this.state.visualCursor.annotatedObj["$Model_x"] - 0.1}
                        y1={this.state.visualCursor.annotatedObj["$Model_y"] +
                            (isPianoStaff ? 1.15 : 0) - vcHeight}
                        y2={this.state.visualCursor.annotatedObj["$Model_y"] +
                            (isPianoStaff ? 1.15 : 0) + vcHeight}
                        stroke={"#008CFF"}
                        strokeWidth={0.04} />
                </Group>}

        </RenderEngine>);

        var ret;
        if (!this.props.raw) {
            ret = <div className="workspace" style={{top: this.props.top}}>
                {_.map(rawPages, (rawPage, pidx) => <div className="page" 
                    key={"page" + pidx}
                    style={{
                        position: "relative",
                        width: this.props.width,
                        height: this.props.height,
                        marginTop: this.props.marginTop,
                        marginBottom: this.props.marginBottom}}>
                    {rawPage}
                </div>)}
            </div>;
        } else {
            ret = rawPages[0];
        }

        this.props.store && this.props.store.rendererIsClean();

        PROFILER_ENABLED && console.timeEnd("render");
        return ret;
    },

    _getPointerData: function(mouse) {
        var dynY = mouse.y;
        var dynX = mouse.x;
        var dynLine = 3;
        var foundObj = false;
        var foundIdx;
        var musicLine;
        var ctxData;
        var staveIdx;
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
                    j < body.length && !body[i].newpage; ++j) {
                var item = body[j];
                ctxData = item.ctxData;
                if (Math.abs(item["$Model_y"] - dynY) < 0.001) {
                    if ((item.keySignature ||
                                item.timeSignature ||
                                item.clef ||
                                item.pitch ||
                                item.chord) &&
                            Math.abs(dynX - item["$Model_x"]) < 0.27 +
                                (item.dots ? item.dots*0.2 : 0)) {
                        dynX = item["$Model_x"];
                        foundIdx = j;
                        foundObj = item;
                        break;
                    } else if (dynX < item["$Model_x"] ||
                            (j === body.length - 1 && h === this.getCtxCount() - 1)) {

                        // End of a line.
                        // XXX: Instead, use EndMarker.
                        if (dynX < item["$Model_x"]) {
                            j -= 1;
                        }
                        _pointerData = {
                            mouse: mouse,
                            line: dynLine,
                            idx: j,
                            staveIdx: h,
                            musicLine: musicLine,
                            ctxData: item.ctxData,
                            obj: {
                                placeholder: true,
                                idx: j,
                                item: item,
                                musicLine: musicLine
                            }
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
    },

    /**
     * Given a y position and a page, returns a part (h) and
     * and a line (i).
     */
    getStaveInfoForY: function(my, page) {
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
    },
    _elementsInBBox: function(box, mouse) {
        var ret = [];

        for (var h = 0; h < this.getCtxCount(); ++h) {
            var ctx = this.getCtx(h);
            if (!ctx) {
                continue;
            }
            var body = this.props.staves[h].body;
            var inRange = (min, val, max) => min < val && val < max;

            for (var i = ctx.pageStarts[mouse.page]; i < body.length && !body[i].newpage; ++i) {
                var item = body[i];
                if (inRange(box.top - 1, item["$Model_y"],
                            box.bottom + 1) &&
                        inRange(box.left, item["$Model_x"], box.right)) {
                    ret.push(item);
                }
            }
        }

        return ret;
    },
    getInitialState: function() {
        return {
            mouse: {x: 0, y: 0},
            visualCursor: this.props.store && this.props.store.visualCursor()
        };
    },
    getPositionForMouse: function(event) {
        if (useGL) {
            var widthInSpaces = renderUtil.mm(this.props.pageSize.width, this.props.staveHeight);
            var rect = event.target.getBoundingClientRect();

            return {
                x: (event.clientX - rect.left) / event.target.clientWidth * widthInSpaces,
                y: (event.clientY - rect.top) / event.target.clientWidth * widthInSpaces,
                page: 0,
                selectionInfo: null
            };
        }
        var svg_elt = event.target.farthestViewportElement || event.target;
        var svg_pt = svg_elt.createSVGPoint();
        svg_pt.x = event.clientX;
        svg_pt.y = event.clientY;
        var pt = svg_pt.matrixTransform(svg_elt.getScreenCTM().inverse());
        return {
            x: pt.x / this.props.staveHeight / FONT_SIZE_FACTOR - 0.15,
            y: pt.y / this.props.staveHeight / FONT_SIZE_FACTOR,
            page: svg_elt.getAttribute("data-page"),
            selectionInfo: event.target.getAttribute("data-selectioninfo")
        };
    },
    handleMouseClick: function(event) {
        var mouse = this.getPositionForMouse(event);
        var data = this._getPointerData(mouse);
        // No tool is also known as the "select" tool.
        if (!this.props.tool && data.ctxData) {
            "/local/visualCursor".POST({
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
            "/local/tool/_action".PUT({mouseData: data, fn: fn});
        }
        this.forceUpdate();
    },
    handleMouseDown: function(event) {
        if (event.button === 0) {
            if (this.props.selection) {
                _.each(this.props.selection, s => {
                    delete s.selected;
                });
            }
            var pos = this.getPositionForMouse(event);
            if (this.props.selection && this.props.selection.length) {
                // Bottleneck: detect lines with selected content
                this.props.store && this.props.store.rendererIsDirty();
            }
            this.setState({
                selectionRect: {
                    start: pos,
                    end: pos
                }
            });
            if (this.props.selection) {
                "/local/selection".DELETE();
            }
        }
    },
    handleMouseUp: function(event) {
        if (event.button === 0 && this.state.selectionRect) {
            var rect = this.state.selectionRect;
            var bbox = {
                left: Math.min(rect.start.x, rect.end.x),
                right: Math.max(rect.start.x, rect.end.x),
                top: Math.min(rect.start.y, rect.end.y),
                bottom: Math.max(rect.start.y, rect.end.y)
            };
            var selection = this._elementsInBBox(bbox, this.getPositionForMouse(event));
            if (selection.length) {
                _.each(selection, s => {
                    s.selected = true;
                });
                // Bottleneck: detect lines with selected content
                this.props.store && this.props.store.rendererIsDirty();
            }
            this.setState({
                selectionRect: null
            });
            if (selection.length) {
                "/local/selection".PUT(selection.length ? selection : null);
            }
        }
    },
    handleMouseMove: function(event) {
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
                "/local/tool".DELETE();
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
    },
    handleMouseLeave: function() {
        this._cleanup && this._cleanup();
        this.setState({
            mouse: null
        });
    },
    handleMouseMoveThrottled: _.throttle(function(mouse) {
        var data = this._getPointerData(mouse);
        var fn = this.props.tool.handleMouseMove(mouse, data.line, data.obj);
        if (fn === "hide" || !data.obj) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            this.props.store && this.props.store.handleAction({
                description: "PUT /local/tool",
                resource: "hide"
            });
        } else if (fn) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            this.props.store && this.props.store.handleAction({
                description: "PUT /local/tool",
                resource: "preview",
                postData: {mouseData: data, fn: fn}
            });
        }

        this.setState({
            mouse: mouse
        });
    }, 16 /* 60 Hz */),

    getCtx: function(idx) {
        return this.props.contexts ?
            this.props.contexts[idx] :
            (this.props.store && this.props.store.ctx(idx));
    },
    getCtxCount: function() {
        return this.props.contexts ?
            this.props.contexts.length :
            (this.props.store && this.props.store.ctxCount());
    },

    componentDidMount: function() {
        if (isBrowser) {
            this.setupBrowserListeners();
        }
        this.props.store && this.props.store.addAnnotationListener(this.update);
    },
    setupBrowserListeners: function() {
        var AccidentalTool = require("../stores/accidentalTool.jsx");
        var DotTool = require("../stores/dotTool.jsx");
        var NoteTool = require("../stores/noteTool.jsx");
        var RestTool = require("../stores/restTool.jsx");
        var TieTool = require("../stores/tieTool.jsx");

        // Handle keys that aren't letters or numbers, and keys with modifiers
        document.onkeydown = (event) => {
            var keyCode = event.keyCode || event.charCode || 0;
            switch(keyCode) {
                case 8: // backspace
                    event.preventDefault(); // don't navigate backwards
                    if (this.props.tool) {
                        this.props.tool.handleKeyPressEvent("backspace", event);
                    }
                    break;
                case 37: // left arrow
                    event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                    "/local/visualCursor".POST({step: -1});
                    break;
                case 39: // right arrow
                    event.preventDefault(); // don't scroll (shouldn't happen anyway!)
                    "/local/visualCursor".POST({step: 1});
                    break;
                case 90: // 'z'
                    event.preventDefault(); // we control all undo behaviour
                    if (event.ctrlKey || event.metaKey) {
                        if (event.shiftKey) {
                            History.redo();
                        } else {
                            History.undo();
                        }
                    }
                    break;
            }
        };

        // Handle letters or numbers
        document.onkeypress = (event) => {
            var keyCode = event.keyCode || event.charCode || 0;

            var key = String.fromCharCode(keyCode);

            // Tools
            var keyToTool = {
                '1': () => new NoteTool("noteWhole"),
                '2': () => new NoteTool("noteHalfUp"),
                '3': () => new NoteTool("noteQuarterUp"),
                '4': () => new NoteTool("note8thUp"),
                '5': () => new NoteTool("note16thUp"),
                '6': () => new NoteTool("note32ndUp"),
                '7': () => new NoteTool("note64thUp"),
                'r': () => new RestTool(),
                '.': () => new DotTool(),
                '~': () => new TieTool(),
                '=': () => new AccidentalTool(1),
                '-': () => new AccidentalTool(-1),
                '0': () => new AccidentalTool(0)
            };
            var toolFn = keyToTool[key];
            if (toolFn) {
                "/local/tool".PUT(toolFn());
            } else if (this.props.tool) {
                this.props.tool.handleKeyPressEvent(key, event);
            }
        };

    },
    componentWillUnmount: function() {
        if (isBrowser) {
            this.clearBrowserListeners();
        }
        this.props.store && this.props.store.removeAnnotationListener(this.update);
    },
    clearBrowserListeners: function() {
        document.onkeypress = null;
        document.onkeydown = null;
    },
    update: function() {
        this.setState({
            visualCursor: this.props.store && this.props.store.visualCursor()
        });
    }
});


/**
 * Contains a line. Exists for two reasons:
 *  1. React prefers deeper trees to shallower trees.
 *  2. We know, based on annotation, when a line needs to be updated
 *     and when it does not need to be updated.
 */
var LineContainer = React.createClass({
    render: function() {
        return <Group>{this.props.generate()}</Group>;
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        var songDirty = this.props.store && this.props.store.dirty();
        var heightChanged = nextProps.staveHeight !== this.props.staveHeight;
        var lineDirty = this.props.store && this.props.store.isLineDirty(nextProps.idx, nextProps.h);

        if (lineDirty) {
            this.props.store && this.props.store.handleAction({description: "DELETE /local/song",
                resource: "lineDirty", postData: nextProps.h + "_" + nextProps.idx});
        }
        return songDirty || heightChanged || lineDirty;
    }
});

// Ratio between svg coordinate system and 1mm.
var FONT_SIZE_FACTOR = renderUtil.FONT_SIZE_FACTOR;

var _pointerData = {};

module.exports = Renderer;
module.exports.FONT_SIZE_FACTOR = FONT_SIZE_FACTOR;
