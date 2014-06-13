/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");
var assert = require("assert");

var Molasses = require("../primitives/molasses/molasses.jsx");
var Victoria = require("../primitives/victoria/hellogl.jsx");

var useGL = window.location.search.indexOf("engine=gl") !== -1;
window.useGL = useGL;

var Bridge = require("./bridge.jsx");
var Header = require("../primitives/header.jsx");
var SelectionRect = require("./selectionRect.jsx");
var SongEditorStore = require("../store/songEditor.jsx");
var StaveLines = require("../primitives/staveLines.jsx");
var renderUtil = require("./util.jsx");

var RenderEngine = useGL ? Victoria : Molasses;
var Group = useGL ? Victoria.VG : React.DOM.g;

var PROFILER_ENABLED = window.location.search.indexOf("profile=1") !== -1;

var getCursor = () => SongEditorStore.cursor();

var Renderer = React.createClass({
    render: function() {
        PROFILER_ENABLED && console.time("render");

        var fontSize = this.props.staveHeight;
        var y = 0;
        var staves = this.props.staves;

        var pages = [];
        var pageStarts = getCursor().pageStarts;
        var pageLines = getCursor().pageLines;

        var pageCount = pageStarts.length;
        for (var i = 1; i < pageCount; ++i) {
            pages.push({from: pageStarts[i - 1], to: pageStarts[i], idx: i-1});
        }
        pages.push({from: pageStarts[pageCount - 1], to: staves[3].body.length, idx: pageCount - 1});
            // XXX: Robustness

        var viewbox = "0 0 " +
            Math.round(85000*(this.props.pageSize.width/215.9)) + " " +
            Math.round(110000*(this.props.pageSize.height/279.4));

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
                renderFn={render}
                widthInSpaces={renderUtil.mm(this.props.pageSize.width, fontSize)}
                viewbox={viewbox}>
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
                        {/* TODO: move to /annotate/ */}
                        {!page.from && <StaveLines
                            key={idx + "StaveLinesMain"}
                            width={renderUtil.mm(this.props.pageSize.width - 45, fontSize)}
                            x={renderUtil.mm(30, fontSize)}
                            y={stave.body[0]["$Bridge_y"]} />}

                        {stave.body.slice(page.from, page.to).reduce((memo, obj) => {
                            if (obj.newline) {
                                memo.push([]);
                            }
                            memo[memo.length - 1].push(obj);
                            return memo;
                        }, [[]]).splice(page.idx ? 1 : 0 /* BUG!! */).map((s, idx) => <LineContainer
                                staveHeight={this.props.staveHeight}
                                generate={() => s.map(t => render(t))}
                                idx={idx + pageLines[page.idx]} key={idx} />)}
                    </Group>;
                } else {
                    return null;
                }
            })}
            {!pidx && this.props.tool && this.props.tool.render(
                    getCursor(),
                    this.state.mouse,
                    _pointerData,
                    fontSize)}
            {this.state.selectionRect && <SelectionRect
                fontSize={fontSize}
                x={Math.min(this.state.selectionRect.start.x, this.state.selectionRect.end.x)}
                y={Math.min(this.state.selectionRect.start.y, this.state.selectionRect.end.y)}
                width={Math.abs(this.state.selectionRect.start.x - this.state.selectionRect.end.x)}
                height={Math.abs(this.state.selectionRect.start.y - this.state.selectionRect.end.y)} />}
        </RenderEngine>
        </div>)}
        </div>;

        SongEditorStore.handleAction({description: "HIDE /local/song",
            resource: "dirty"});

        PROFILER_ENABLED && console.timeEnd("render");
        return ret;
    },

    getSelection: function() {
        return this.props.selection;
    },

    _getPointerData: function(mouse) {
        var cursor = getCursor();

        var dynY = mouse.y;
        var dynX = mouse.x;
        var dynLine = 3;
        var foundObj = false;
        var foundIdx;
        var musicLine;
        for (var i = cursor.pageLines[mouse.page]; i < cursor.lines.length; ++i) {
            if (mouse.y < cursor.lines[i].y + 8/4) {
                musicLine = i;
                dynY = cursor.lines[i].y;
                dynLine = Math.round((cursor.lines[i].y - mouse.y)/0.125)/2 + 3;
                if (dynLine > 8.5 || dynLine < -2.5) {
                    return <Group />;
                }
                var body = this.props.staves[3].body; // XXX: Make more robust!
                for (var j = cursor.pageStarts[mouse.page]; j < body.length && !body[i].newpage; ++j) {
                    var item = body[j];
                    if (Math.abs(item["$Bridge_y"] - dynY) < 0.001) {
                        if ((item.keySignature ||
                                    item.timeSignature ||
                                    item.clef ||
                                    item.pitch ||
                                    item.chord) &&
                                Math.abs(dynX - item["$Bridge_x"]) < 0.27 + (item.dots ? item.dots*0.2 : 0)) {
                            dynX = item["$Bridge_x"];
                            foundIdx = j;
                            foundObj = item;
                            break;
                        } else if (dynX < item["$Bridge_x"] || j === body.length - 1) {
                            if (dynX < item["$Bridge_x"]) {
                                j -= 1;
                            }
                            _pointerData = {
                                mouse: mouse,
                                line: dynLine,
                                idx: j,
                                musicLine: musicLine,
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
        _pointerData = {
            mouse: mouse,
            line: dynLine,
            obj: foundObj,
            idx: foundIdx,
            musicLine: musicLine
        };

        return _pointerData;
    },
    _elementsInBBox: function(box, mouse) {
        var cursor = getCursor();
        var ret = [];

        var body = this.props.staves[3].body; // XXX: Make more robust!
        var inRange = (min, val, max) => min < val && val < max;

        for (var i = cursor.pageStarts[mouse.page]; i < body.length && !body[i].newpage; ++i) {
            var item = body[i];
            if (inRange(box.top - 1, item["$Bridge_y"],
                        box.bottom + 1) &&
                    inRange(box.left, item["$Bridge_x"], box.right)) {
                ret.push(item);
            }
        }

        return ret;
    },
    getInitialState: function() {
        return {
            mouse: {x: 0, y: 0}
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
        if (!this.props.tool) {
            return;
        }
        var mouse = this.getPositionForMouse(event);
        var data = this._getPointerData(mouse);
        var fn = this.props.tool.handleMouseClick(mouse, data.line, data.obj);
        if (fn) {
            "/local/tool/_action".SHOW({mouseData: data, fn: fn});
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
                SongEditorStore.handleAction({description: "SHOW /local/song",
                    resource: "dirty"});
            }
            this.setState({
                selectionRect: {
                    start: pos,
                    end: pos
                }
            });
            if (this.props.selection) {
                SongEditorStore.handleAction({description: "HIDE /local/selection"});
            }
        }
    },
    handleMouseUp: function(event) {
        if (event.button === 0) {
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
                SongEditorStore.handleAction({description: "SHOW /local/song",
                    resource: "dirty"});
            }
            this.setState({
                selectionRect: null
            });
            if (selection.length) {
                "/local/selection".SET(selection.length ? selection : null);
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
            if (area > 1) {
                "/local/tool".HIDE();
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
            SongEditorStore.handleAction({description: "SHOW /local/tool", resource: "hide"});
        } else if (fn) {
            SongEditorStore.handleAction({description: "SHOW /local/tool", resource: "preview",
                postData: {mouseData: data, fn: fn}});
        }

        this.setState({
            mouse: mouse
        });
    }, 16 /* 60 Hz */),

    componentDidMount: function() {
        var AccidentalTool = require("../tools/accidentalTool.jsx");
        var DotTool = require("../tools/dotTool.jsx");
        var NoteTool = require("../tools/noteTool.jsx");
        var RestTool = require("../tools/restTool.jsx");
        var TieTool = require("../tools/tieTool.jsx");

        document.onkeypress = (event) => {
            var keyCode = event.keyCode;
            var key = String.fromCharCode(keyCode);
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
                '#': () => new AccidentalTool(1),
                'b': () => new AccidentalTool(-1),
                'n': () => new AccidentalTool(0)
            };
            var toolFn = keyToTool[key];
            if (toolFn) {
                "/local/tool".SET(toolFn());
            }
        };

        SongEditorStore.addAnnotationListener(this.update);
    },
    componentWillUnmount: function() {
        document.onkeypress = null;
        SongEditorStore.removeAnnotationListener(this.update);
    },
    update: function() {
        this.forceUpdate;
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
        if (SongEditorStore.dirty()) {
            return true;
        }
        if (nextProps.staveHeight !== this.props.staveHeight) {
            return true;
        }
        if (SongEditorStore.lineDirty(nextProps.idx)) {
            SongEditorStore.handleAction({description: "HIDE /local/song",
                resource: "lineDirty", postData: nextProps.idx});
            return true;
        }
        return false;
    }
});

// Ratio between svg coordinate system and 1mm.
var FONT_SIZE_FACTOR = 378;

var render = item => {
    var bridge = Bridge.getBridgeForItem(item);
    return bridge.visible(item) && bridge.render(item);
};

var _pointerData = {};

module.exports = Renderer;
module.exports.FONT_SIZE_FACTOR = FONT_SIZE_FACTOR;
