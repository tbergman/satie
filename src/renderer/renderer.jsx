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

var BarlineBridge = require("./barlineBridge.jsx");
var BeamBridge = require("./beamGroupBridge.jsx");
var Bridge = require("./bridge.jsx");
var ClefBridge = require("./clefBridge.jsx");
var Header = require("../primitives/header.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var NewPageBridge = require("./newpageBridge.jsx");
var NewlineBridge = require("./newlineBridge.jsx");
var PitchBridge = require("./pitchBridge.jsx");
var SelectionRect = require("./selectionRect.jsx");
var SlurBridge = require("./slurBridge.jsx");
var StaveLines = require("../primitives/staveLines.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");
var renderUtil = require("./util.jsx");
var unittest = require("../unittest.jsx");

var RenderEngine = useGL ? Victoria : Molasses;
var Group = useGL ? Victoria.VG : React.DOM.g;

var bridges = {
    barline: new BarlineBridge(),
    beam: new BeamBridge(),
    chord: new PitchBridge(),
    clef: new ClefBridge(),
    keySignature: new KeySignatureBridge(),
    newpage: new NewPageBridge(),
    newline: new NewlineBridge(),
    pitch: new PitchBridge(),
    slur: new SlurBridge(),
    timeSignature: new TimeSignatureBridge()
};

var PROFILER_ENABLED = window.location.search.indexOf("profile=1") !== -1;
var LYLITE_DEBUG = window.location.search.indexOf("lyDebug=1") !== -1;

var Renderer = React.createClass({
    render: function() {
        PROFILER_ENABLED && console.time("render");

        var fontSize = this.props.staveHeight;
        var y = 0;
        var staves = this.props.staves;

        var pages = [];
        var pageStarts = this._cursor.pageStarts;
        var pageLines = this._cursor.pageLines;
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
                    this._cursor,
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

        this.markClean();

        PROFILER_ENABLED && console.timeEnd("render");
        return ret;
    },

    annotate: function(staves, pointerData, toolFn, props) {
        props = props || this.props;
        staves = staves || props.staves;

        PROFILER_ENABLED && console.time("annotate");

        var y = 0;
        while (!staves.every((stave, sidx) => {
            if (stave.header) {
                y += Header.getHeight(stave.header);
                return true;
            } else if (!stave.body) {
                return true;
            }

            var cursor = this.cursorFromSnapshot(pointerData, stave) ||
                    this.newCursor(y, props.staveHeight, true, props.pageSize);

            var exitCode;
            for (var i = cursor.start; i < stave.body.length;
                    i = this.nextIndex(i, exitCode, stave, cursor)) {

                var doCustomAction = pointerData && (stave.body[i] === pointerData.obj ||
                        (pointerData && pointerData.obj && pointerData.obj.idx === i));

                if (doCustomAction) {
                    exitCode = toolFn(stave.body[i], cursor, stave, i);
                    pointerData = undefined;
                } else {
                    exitCode = annotate(stave.body[i], cursor, stave, i);
                }

                if (!doCustomAction &&
                        toolFn &&
                        !pointerData &&
                        stave.body[i].newline &&
                        exitCode !== "line_created") {
                    return true;
                }

                if (exitCode === "line_created" && toolFn) {
                    // ... and so must everything else
                    _dirty = true;
                    toolFn = false;
                }
            }

            NewlineBridge.semiJustify(cursor, stave, stave.body.length - 1);

            this._cursor = cursor;
            y += 2.25;
            return true;
        })) { /* pass */ }

        if (LYLITE_DEBUG) {
            console.log(this.writeLylite(staves));
        }

        PROFILER_ENABLED && console.timeEnd("annotate");
    },
    writeLylite: function(staves) {
        staves = staves || this.props.staves;

        var lyliteArr = [];
        var unresolved = [];
        staves.forEach((stave, sidx) => {
            if (stave.staveHeight) {
                lyliteArr.push("#(set-global-staff-size " + stave.staveHeight*renderUtil.ptPerMM + ")\n");
                return;
            }
            if (stave.pageSize) {
                if (!stave.pageSize.lilypondName) {
                    alert("Custom sizes cannot currently be saved. (BUG)"); // XXX
                    return;
                }
                lyliteArr.push("#(set-default-paper-size \"" + stave.pageSize.lilypondName + "\")\n");
                return;
            }
            if (stave.header) {
                lyliteArr.push("\\header {");
                if (stave.header.title) {
                    // XXX: XSS
                    lyliteArr.push('title="' + stave.header.title + '"');
                }
                if (stave.header.composer) {
                    // XXX: XSS
                    lyliteArr.push('composer="' + stave.header.composer + '"');
                }
                lyliteArr.push("}\n");
                return;
            }

            lyliteArr.push("\\new Staff {");

            var body = stave.body;
            for (var i = 0; i < body.length; ++i) {
                var obj = body[i];
                var bridge = getBridgeForItem(obj);
                bridge.toLylite(obj, lyliteArr, unresolved);

                for (var j = 0; j < unresolved.length; ++j) {
                    var ret = unresolved[j](obj, lyliteArr, unresolved);

                    if (ret) {
                        unresolved.splice(j, 1);
                        --j;
                    }
                }
            }

            lyliteArr.push("}\n");
        });
        var lyliteStr = lyliteArr.join(" ");
        return lyliteStr;
    },
    getSelection: function() {
        return this.state.selection;
    },
    transpose: function(how) {
        // The selection is guaranteed to be in song order.
        var lastIdx = 0;
        var body = this.props.staves[3].body; // XXX: Robustness
        var accidentals = null;

        this.state.selection.forEach(item => {
            for (var i = lastIdx; i <= body.length && body[i] !== item; ++i) {
                if (body[i].keySignature) {
                    accidentals = KeySignatureBridge.getAccidentals(body[i].keySignature);
                }
            }

            assert(body[i] === item, "The selection must be in song order.");
            assert(accidentals, "A key signature must preceed any note.");

            if (!item.pitch && !item.chord) {
                return;
            }

            // For "inKey":
            var noteToNum = {c:0, d:1, e:2, f:3, g:4, a:5, b:6};
            var numToNote = "cdefgab";

            // For "chromatic":
            var noteToVal = {c:0, d:2, e:4, f:5, g:7, a:9, b:11}; //c:12

            (item.pitch ? [item] : item.chord).forEach(note => {
                if (how.mode === "inKey") {
                    var accOffset = (note.acc || 0) - (accidentals[note.pitch] || 0);
                    var newNote = noteToNum[note.pitch] + how.letters;

                    note.pitch = numToNote[(noteToNum[note.pitch] + how.letters + 7*7)%7];

                    note.octave = (note.octave||0) + how.octaves + Math.floor(newNote/7);

                    note.acc = accOffset + (accidentals[note.pitch] || 0);

                    if (!note.acc) {
                        delete note.acc;
                    }
                } else if (how.mode === "chromatic") {
                    var letters = parseInt(how.interval[1]) - 1;
                    var semitonesNeeded = parseInt(how.interval.split("_")[1]);

                    var newNote = noteToNum[note.pitch] + letters;
                    var newPitch = numToNote[(newNote + 7*7)%7];
                    var semitonesDone = (noteToVal[newPitch] - noteToVal[note.pitch] + 12*12)%12;

                    note.pitch = newPitch;
                    note.octave = (note.octave||0) + how.octaves + Math.floor(newNote/7)
                    note.acc = semitonesNeeded - semitonesDone + note.acc;
                    if (!note.acc) {
                        delete note.acc;
                    }
                }
            });
            delete item.selected;
        });
        _dirty = true;
        this.setState({
            selection: null
        });
        this.annotate();
        return true;
    },

    _getPointerData: function(mouse) {
        var cursor = this._cursor;

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
        var cursor = this._cursor;
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
    newCursor: function(start, fontSize, first, pageSize) {
        var initialX = renderUtil.mm(15, fontSize) + 1/4;
        var firstX = renderUtil.mm(first ? 30 : 15, fontSize) + 1/4;
        return {
            accidentals: {},
            bar: 1,
            barlineX: [],
            beats: 0,
            count: 4,
            fontSize: fontSize,
            initialX: initialX,
            line: 0,
            lineSpacing: 3.3,
            maxX: renderUtil.mm(pageSize.width - 15, fontSize),
            maxY: renderUtil.mm(pageSize.height - 15, fontSize),
            pageLines: [0],
            pageSize: pageSize,
            pageStarts: [0],
            smallest: 10000,
            start: 0,
            x: firstX,
            y: renderUtil.mm(15, fontSize) + start,
            lines: [
                {
                    all: [],
                    accidentals: {},
                    barlineX: [],
                    beats: 0,
                    x: firstX,
                    y: renderUtil.mm(15, fontSize) + start
                }
            ]
        };
    },
    cursorFromSnapshot: function(pointerData, stave) {
        if (!pointerData) {
            return null;
        }

        if (pointerData && _snapshots[pointerData.musicLine]) {
            var cursor = JSON.parse(_snapshots[pointerData.musicLine]);
            linesToUpdate[cursor.line] = true;
            cursor.start = pointerData.idx;
            while (cursor.start > 0 && !stave.body[cursor.start - 1].newline) {
                --cursor.start;
            }
            return cursor;
        } else {
            // We don't store snapshots for the 0th line, but we still need
            // to force it to be re-renderered.
            linesToUpdate[0] = true;
        }
    },
    nextIndex: function(i, exitCode, stave, cursor) {
        switch(exitCode) {
        case true:
            // All of the pre-conditions of the object were met, and
            // annotations have been added.
            return i + 1;
        case false:
            // At least one of the pre-conditions of the object were
            // not met and the entire document must be rerendered.
            return cursor.start;
        case "line_created":
            // A line break was added somewhere to the current line
            // The current line must be re-rendered...
            var line = cursor.lines[cursor.line];
            _(line).each((v, attrib) => {
                cursor[attrib] = line[attrib];
            });
            while (i >= 0 && !stave.body[i].newline) {
                --i;
            }
            --i;
            while (i >= 0 && !stave.body[i].newline) {
                --i;
            }
            break;
        case "line":
            // At least one of the pre-conditions of the object were
            // not met and the entire line must be rerendered.
            var line = cursor.lines[cursor.line];
            _(line).each((v, attrib) => {
                cursor[attrib] = line[attrib];
            });
            --i;
            while (i >= 0 && !stave.body[i].newline) {
                --i;
            }
            break;
        case "beam":
            // The beam needs to be re-rendered.
            cursor.beats = _beamBeatCount;
            --i;
            while(i >= 0 && !stave.body[i].beam) {
                --i;
            }
            cursor.x = stave.body[i]["$Bridge_x"];
            --i;
            break;
        case -1:
            // At least one of the pre-conditions of the object were
            // not met and an item has been inserted in place of the
            // current item.
            i += exitCode;
            break;
        default:
            assert(false, "Not reached");
        }

        return i + 1;
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
            this._cleanup && this._cleanup();
            this.annotate(
                this.props.staves,
                data,
                fn
            );
        }
        this.forceUpdate();
    },
    handleMouseDown: function(event) {
        if (event.button === 0) {
            if (this.state.selection) {
                this.state.selection.forEach(s => {
                    delete s.selected;
                });
            }
            var pos = this.getPositionForMouse(event);
            if (this.state.selection && this.state.selection.length) {
                _dirty = true; // Bottleneck: detect lines with selected content
            }
            this.setState({
                selectionRect: {
                    start: pos,
                    end: pos
                },
                selection: false
            });
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
                _dirty = true;
            }
            this.setState({
                selectionRect: null,
                selection: selection.length ? selection : null
            });
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
                this.props.setToolFn(null);
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
            if (this._cleanup) {
                this._cleanup && this._cleanup();
                this.forceUpdate();
            }
        } else if (fn) {
            if (this._cleanup) {
                this._cleanup();
            }
            this._cleanup = () => {
                delete this._cleanup;
                this.annotate(
                    this.props.staves,
                    data,
                    this.props.tool.hidePreview.bind(this.props.tool));
            };

            this.annotate(
                this.props.staves,
                data,
                fn
            );
        }

        this.setState({
            mouse: mouse
        });
    }, 16 /* 60 Hz */),
    markClean: function() {
        if (_dirty) {
            _.defer(() => {
                _dirty = false;
            });
        }
    },

    componentWillMount: function() {
        this.annotate(this.props.staves);
    },

    componentWillReceiveProps: function(nextProps) {
        var staves = this.props.staves;

        if (this.props.tool !== nextProps.tool) {
            this._cleanup && this._cleanup();
        }

        if (this.props.staveHeight !== nextProps.staveHeight ||
                this.props.pageSize !== nextProps.pageSize ||
                staves !== nextProps.staves) {
            _dirty = true;
            delete this._cursor;
            Bridge.removeAnnotations(staves);
            this.annotate(nextProps.staves, undefined, undefined, nextProps);
        }
        if (staves !== nextProps.staves) {
            delete this._cursor;
            this.annotate(nextProps.staves, undefined, undefined, nextProps);
        }

        if (nextProps.staves) {
            assert(nextProps.staveHeight, "must be defined");
            _(nextProps.staves).find(s => s.staveHeight).staveHeight = nextProps.staveHeight;
            _(nextProps.staves).find(s => s.pageSize).pageSize = nextProps.pageSize;
        }
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
        if (_dirty) {
            return true;
        }
        if (nextProps.staveHeight !== this.props.staveHeight) {
            return true;
        }
        var ret = linesToUpdate[nextProps.idx];
        delete linesToUpdate[nextProps.idx];
        return ret;
    }
});

// Ratio between svg coordinate system and 1mm.
var FONT_SIZE_FACTOR = 378;

/**
 * A bridge knows how to annotate and render a certain type of object
 * such as a beam or a clef.
 *
 * See bridge.jsx
 */
var getBridgeForItem = item => {
    if (item._bridge) {
        return item._bridge;
    }

    var ret = _(bridges).find((bridge, name) => item[name]);
    item._bridge = ret;
    return ret;
};

var annotate = (item, cursor, stave, idx) => {
    var bridge = getBridgeForItem(item);
    return bridge.annotate(item, cursor, stave, idx);
};
var render = item => {
    var bridge = getBridgeForItem(item);
    return bridge.visible(item) && bridge.render(item);
};

/**
 * Called at the end of begining of every line so that when a certain line
 * needs to be updated, the cursor can be unfrozen from here instead of
 * recalculating the cursor from the begining of the song.
 */
var snapshot = (cursor) => {
    _snapshots[cursor.line] = JSON.stringify(cursor);
};

/**
 * Called at the begining of every beam. Called so that if the annotater has
 * to be "backed up", it can do so without recalculating from the begining
 * of the line.
 */
var beamCountIs = (beamCount) => {
    _beamBeatCount = beamCount;
};


var linesToUpdate = {};
var _snapshots = {};
var _dirty;
var _beamBeatCount;
var _pointerData = {};


module.exports = Renderer;
module.exports.FONT_SIZE_FACTOR = FONT_SIZE_FACTOR;
module.exports.beamCountIs = beamCountIs;
module.exports.snapshot = snapshot;
