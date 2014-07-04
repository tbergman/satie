/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");
var assert = require("assert");

var Molasses = require("./primitives/molasses/molasses.jsx");
var Victoria = require("./primitives/victoria/hellogl.jsx");

var isBrowser = typeof window !== "undefined";
var useGL = isBrowser && global.location.search.indexOf("engine=gl") !== -1;
global.useGL = useGL;

var Barline = require("./primitives/barline.jsx");
var Brace = require("./primitives/brace.jsx");
var Group = require("./primitives/group.jsx");
var Header = require("./primitives/header.jsx");
var SelectionRect = require("./selectionRect.jsx");
var SongEditorStore = require("../stores/songEditor.jsx");
var StaveLines = require("./primitives/staveLines.jsx");
var renderUtil = require("./util.jsx");

var RenderEngine = useGL ? Victoria : Molasses;

var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

var getCtx = (idx) => SongEditorStore.ctx(idx);
var getCtxCount = () => SongEditorStore.ctxCount();

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
        var ctx = getCtx(firstStaveIdx);
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

        var viewbox = "0 0 " +
            Math.round(85000*(this.props.pageSize.width/215.9)) + " " +
            Math.round(110000*(this.props.pageSize.height/279.4));

        // XXX: Currently we only support single and double staves.
        // isPianoStaff is set to true when there is at least 2 staves.
        var isPianoStaff = staves.reduce((memo, s) => memo + (s.body ? 1 : 0), 0) >= 2;

        var ret = <div className="workspace" style={{top: this.props.top}}>
            {pages.map((page, pidx) => <div className="page" 
                key={"page" + page.idx}
                style={{
                    position: "relative",
                    width: this.props.width,
                    height: this.props.height,
                    marginTop: this.props.marginTop,
                    marginBottom: this.props.marginBottom}}>
            <RenderEngine
                onClick={this.handleMouseClick}
                onMouseDown={this.handleMouseDown}
                onMouseUp={this.handleMouseUp}
                onMouseLeave={this.handleMouseLeave}
                onMouseMove={this.handleMouseMove}
                page={page}
                staves={staves}
                widthInSpaces={renderUtil.mm(this.props.pageSize.width, fontSize)}
                viewbox={viewbox}>
            {/* Using staves is an anti-pattern. Ideally, we would have a getBridges()
                method in SongEditorStore or something. */}
            {staves.map((stave, idx) => {
                if (stave.header) {
                    if (page.from) {
                        return null;
                    }
                    y += Header.getHeight(stave.header);
                    return !useGL && <Header
                        fontSize={fontSize*FONT_SIZE_FACTOR}
                        middle={renderUtil.mm(this.props.pageSize.width, fontSize)/2}
                        right={renderUtil.mm(this.props.pageSize.width - 15, fontSize*0.75)}
                        key="HEADER"
                        model={stave.header} />;
                } else if (stave.body) {
                    return <Group key={idx} style={{fontSize: fontSize*FONT_SIZE_FACTOR + "px"}}>
                        {stave.body.slice(page.from, page.to).reduce((memo, obj) => {
                            if (obj.newline) {
                                memo.push([]);
                            }
                            memo[memo.length - 1].push(obj);
                            return memo;
                        }, [[]]).splice(page.idx ? 1 : 0 /* BUG!! */).map((s, idx) =>
                            <LineContainer
                                staveHeight={this.props.staveHeight}
                                generate={() => s.map(item => item.visible() && item.render())}
                                idx={idx + pageLines[page.idx]} key={idx} />)}
                    </Group>;
                } else {
                    return null;
                }
            })}
            {!pidx && this.props.tool && staves.map((stave,idx) => stave.body &&
                this.props.tool.render(
                    getCtx(idx),
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

            {!pidx && this.state.visualCursor && this.state.visualCursor.annotatedObj && <Group
                        key={"visualCursorGroup"}
                        style={{fontSize: fontSize*FONT_SIZE_FACTOR + "px"}}>
                    <Barline key="visualCursor"
                        className="visualCursor"
                        height={2/4 + 0.1 + (isPianoStaff ? 1.2 : 0)}
                        x={this.state.visualCursor.annotatedObj["$Bridge_x"] - 0.1}
                        y={this.state.visualCursor.annotatedObj["$Bridge_y"] +
                            (isPianoStaff ? 1.15 : 0)}
                        stroke={"#008CFF"}
                        strokeWidth={0.04} />
                </Group>}

        </RenderEngine>
        </div>)}
        </div>;

        SongEditorStore.rendererIsClean();

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
        for (var h = 0; h < getCtxCount(); ++h) {
            var ctx = getCtx(h);
            if (!ctx) {
                continue;
            }
            for (var i = ctx.pageLines[mouse.page]; i < ctx.lines.length; ++i) {
                if (mouse.y < ctx.lines[i].y + 8/4) {
                    musicLine = i;
                    dynY = ctx.lines[i].y;
                    dynLine = Math.round((ctx.lines[i].y - mouse.y)/0.125)/2 + 3;
                    if (dynLine > 8.5 || dynLine < -2.5) {
                        break;
                    }
                    var body = this.props.staves[h].body;
                    for (var j = ctx.pageStarts[mouse.page];
                            j < body.length && !body[i].newpage; ++j) {
                        var item = body[j];
                        ctxData = item.ctxData;
                        if (Math.abs(item["$Bridge_y"] - dynY) < 0.001) {
                            if ((item.keySignature ||
                                        item.timeSignature ||
                                        item.clef ||
                                        item.pitch ||
                                        item.chord) &&
                                    Math.abs(dynX - item["$Bridge_x"]) < 0.27 +
                                        (item.dots ? item.dots*0.2 : 0)) {
                                dynX = item["$Bridge_x"];
                                foundIdx = j;
                                foundObj = item;
                                break;
                            } else if (dynX < item["$Bridge_x"] ||
                                    (j === body.length - 1 && h === getCtxCount() - 1)) {
                                if (dynX < item["$Bridge_x"]) {
                                    j -= 1;
                                }
                                _pointerData = {
                                    mouse: mouse,
                                    line: dynLine,
                                    idx: j,
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
                    break;
                }
            }
        }
        _pointerData = {
            mouse: mouse,
            line: dynLine,
            obj: foundObj,
            idx: foundIdx,
            musicLine: musicLine,
            ctxData: ctxData
        };

        return _pointerData;
    },
    _elementsInBBox: function(box, mouse) {
        var ret = [];

        for (var h = 0; h < getCtxCount(); ++h) {
            var ctx = getCtx(h);
            if (!ctx) {
                continue;
            }
            var body = this.props.staves[h].body;
            var inRange = (min, val, max) => min < val && val < max;

            for (var i = ctx.pageStarts[mouse.page]; i < body.length && !body[i].newpage; ++i) {
                var item = body[i];
                if (inRange(box.top - 1, item["$Bridge_y"],
                            box.bottom + 1) &&
                        inRange(box.left, item["$Bridge_x"], box.right)) {
                    ret.push(item);
                }
            }
        }

        return ret;
    },
    getInitialState: function() {
        return {
            mouse: {x: 0, y: 0},
            visualCursor: SongEditorStore.visualCursor()
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
                this.props.selection.forEach(s => {
                    delete s.selected;
                });
            }
            var pos = this.getPositionForMouse(event);
            if (this.props.selection && this.props.selection.length) {
                // Bottleneck: detect lines with selected content
                SongEditorStore.rendererIsDirty();
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
                selection.forEach(s => {
                    s.selected = true;
                });
                // Bottleneck: detect lines with selected content
                SongEditorStore.rendererIsDirty();
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
            SongEditorStore.handleAction({description: "PUT /local/tool", resource: "hide"});
        } else if (fn) {
            // Skip the dispatcher and unneeded stores (potentially dangerous!)
            SongEditorStore.handleAction({description: "PUT /local/tool", resource: "preview",
                postData: {mouseData: data, fn: fn}});
        }

        this.setState({
            mouse: mouse
        });
    }, 16 /* 60 Hz */),

    componentDidMount: function() {
        if (isBrowser) {
            this.setupBrowserListeners();
        }
        SongEditorStore.addAnnotationListener(this.update);
    },
    setupBrowserListeners: function() {
        var AccidentalTool = require("../tools/accidentalTool.jsx");
        var DotTool = require("../tools/dotTool.jsx");
        var NoteTool = require("../tools/noteTool.jsx");
        var RestTool = require("../tools/restTool.jsx");
        var TieTool = require("../tools/tieTool.jsx");

        // Handle backspace and arrows
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
            }
        };

        // Handle other keys
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
        SongEditorStore.removeAnnotationListener(this.update);
    },
    clearBrowserListeners: function() {
        document.onkeypress = null;
        document.onkeydown = null;
    },
    update: function() {
        this.setState({
            visualCursor: SongEditorStore.visualCursor()
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
        var songDirty = SongEditorStore.dirty();
        var heightChanged = nextProps.staveHeight !== this.props.staveHeight;
        var lineDirty = SongEditorStore.lineDirty(nextProps.idx);

        if (lineDirty) {
            SongEditorStore.handleAction({description: "DELETE /local/song",
                resource: "lineDirty", postData: nextProps.idx});
        }
        return songDirty || heightChanged || lineDirty;
    }
});

// Ratio between svg coordinate system and 1mm.
var FONT_SIZE_FACTOR = 378;

var _pointerData = {};

module.exports = Renderer;
module.exports.FONT_SIZE_FACTOR = FONT_SIZE_FACTOR;
