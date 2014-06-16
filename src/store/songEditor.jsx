/**
 * Flux store for the song being edited.
 */

var EventEmitter = require('events').EventEmitter; 
var _ = require('underscore');
var assert = require('assert');

var Dispatcher = require("../dispatcher.jsx"); 
var deepFreeze = require("../util/deepFreeze.jsx");

var Bridge = require("../renderer/bridge.jsx");
var Header = require("../primitives/header.jsx");
var KeySignatureBridge = require("../renderer/keySignatureBridge.jsx");
var NewlineBridge = require("../renderer/newlineBridge.jsx");
var SessionStore = require("./session.jsx"); // must be registered before currentSong!!!
var StaveLines = require("../primitives/staveLines.jsx");
var lylite = require("../renderer/lylite.jison").parser;
var renderUtil = require("../renderer/util.jsx");

var CHANGE_EVENT = 'change'; 
var ANNOTATE_EVENT = 'annotate'; 
var PROFILER_ENABLED = window.location.search.indexOf("profile=1") !== -1;

class SongEditorStore extends EventEmitter {
    constructor() {
        this.clear();

        Dispatcher.register(this.handleAction.bind(this));
    }

    handleAction(action) {
        switch(action.description) {
            case "GET /api/song":
            case "SHOW /api/song":
                var activeSong = SessionStore.activeSong();
                if (activeSong !== _prevActiveSong) {
                    this.clear();
                    this.reparse(activeSong);
                    this.emit(CHANGE_EVENT);
                }
                break;
            case "HIDE /api/song":
                this.clear();
                this.emit(CHANGE_EVENT);
                break;

            case "SHOW /local/song/forceUpdate":
                this.clear();
                var activeSong = SessionStore.activeSong();
                this.reparse(activeSong);
                this.emit(CHANGE_EVENT);
                break;

            case "SHOW /local/tool":
                switch(action.resource) {
                    case "hide":
                        if (_cleanup) {
                            _cleanup();
                            this.emit(ANNOTATE_EVENT);
                        }
                        break;
                    case "preview":
                    case "action":
                        _cleanup && _cleanup();
                        if (action.resource === "preview") {
                            _cleanup = () => {
                                _cleanup = null;
                                this.annotate(
                                    action.postData.mouseData,
                                    _tool.hidePreview.bind(_tool));
                                this.emit(ANNOTATE_EVENT);
                            };
                        }
                        this.annotate(
                            action.postData.mouseData,
                            action.postData.fn);

                        this.emit(ANNOTATE_EVENT);
                        break;
                }
                break;
            case "SET /local/tool":
            case "HIDE /local/tool":
                _cleanup && _cleanup();
                _tool = action.postData || null;
                this.emit(CHANGE_EVENT);
                break;

            case "SET /local/selection":
                _selection = action.postData;
                _dirty = true;
                this.emit(CHANGE_EVENT);
                break;
            case "HIDE /local/selection":
                _selection = null;
                _dirty = true;
                this.emit(CHANGE_EVENT);
                break;

            case "SHOW /local/staveHeight":
                var h = Math.round(_staveHeight*100)/100;

                if (action.resource === "larger") {
                    for (var i = renderUtil.rastalToHeight.length - 1; i >= 0; --i) {
                        if (renderUtil.rastalToHeight[i] > h) {
                            _staveHeight = renderUtil.rastalToHeight[i];
                            break;
                        }
                    }
                } else if (action.resource === "smaller") {
                    for (var i = 0; i < renderUtil.rastalToHeight.length; ++i) {
                        if (renderUtil.rastalToHeight[i] < h) {
                            _staveHeight = renderUtil.rastalToHeight[i];
                            break;
                        }
                    }
                } else assert(false, "Not found");
                _dirty = true;
                _cursor = null;
                _(_staves).find(s => s.staveHeight).staveHeight = _staveHeight;
                Bridge.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "SET /local/pageSize":
                _pageSize = action.postData;
                _dirty = true;
                _cursor = null;
                _(nextProps.staves).find(s => s.pageSize).pageSize = nextProps.pageSize;
                Bridge.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "SHOW /local/song":
                switch (action.resource) {
                    case "transpose":
                        this.transpose(action.postData);
                        this.emit(CHANGE_EVENT);
                        break;
                    case "dirty":
                        _dirty = true;
                        // don't emit.
                        break;
                    case "lineDirty":
                        _linesToUpdate[action.postData] = true;
                        // don't emit.
                        break;
                }
                break;

            case "HIDE /local/song":
                switch (action.resource) {
                    case "dirty":
                        _.defer(() => {
                            _dirty = false;
                            // don't emit.
                        });
                        break;
                    case "lineDirty":
                        delete _linesToUpdate[action.postData];
                        // don't emit.
                        break;
                }
                break;

            case "POST /local/visualCursor":
                _visualCursor = {
                    bar: action.postData.bar,
                    beat: action.postData.beat
                };
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "HIDE /local/visualCursor":
                _visualCursor = 0;
                this.emit(CHANGE_EVENT);
                this.annotate();
                break;
        }
        return true;
    }

    clear() {
        _staves = null;
        _staveHeight = null;
        _prevActiveSong = null;
        _pageSize = null;
        _tool = null;
        _selection = null;
        _visualCursor = {
            bar: 1,
            beat: 1
        };
    }

    reparse(activeSong) {
        _staves = lylite.parse(activeSong.src);

        if (!_(_staves).any(s => s.staveHeight)) {
            _staves.splice(0, 0, {staveHeight: renderUtil.rastalToHeight[4]});
        }
        if (!_(_staves).any(s => s.pageSize)) {
            _staves.splice(0, 0, {pageSize: renderUtil.pageSizes[0]});
        }
        _staveHeight = _(_staves).find(s => s.staveHeight).staveHeight;
        _pageSize = _(_staves).find(s => s.pageSize).pageSize;

        this.annotate();
    }

    annotate(pointerData, toolFn) {
        var staves = _staves;

        PROFILER_ENABLED && console.time("annotate");

        _visualCursor.annotatedObj = null;

        var y = 0;
        while (!staves.every((stave, sidx) => {
            if (stave.header) {
                y += Header.getHeight(stave.header);
                return true;
            } else if (!stave.body) {
                return true;
            }

            var cursor = this.cursorFromSnapshot(pointerData, stave) ||
                    this.newCursor(y, _staveHeight, true, _pageSize);

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
                        !_dirty &&
                        exitCode !== "line_created") {
                    return true;
                }

                if (cursor.bar === _visualCursor.bar &&
                        cursor.beats >= _visualCursor.beat &&
                        (stave.body[i].pitch || stave.body[i].chord) &&
                        !_visualCursor.annotatedObj) {
                    _visualCursor.annotatedObj = stave.body[i];
                }

                stave.body[i].cursorData = {
                    bar: cursor.bar,
                    beat: cursor.beats
                };

                if (exitCode === "line_created" && toolFn) {
                    // ... and so must everything else
                    _dirty = true;
                    toolFn = false;
                }
            }

            NewlineBridge.semiJustify(cursor, stave, stave.body.length - 1);

            _cursor = cursor;
            y += 2.25;
            return true;
        })) { /* pass */ }

        PROFILER_ENABLED && console.timeEnd("annotate");
    }

    nextIndex(i, exitCode, stave, cursor) {
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
            delete cursor.clef;
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
            delete cursor.clef;
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
    }
    newCursor(start, fontSize, first, pageSize) {
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
                    accidentals: [],
                    bar: 1,
                    barlineX: [],
                    beats: 0,
                    line: 0,
                    x: firstX,
                    y: renderUtil.mm(15, fontSize) + start
                }
            ]
        };
    }

    markClean() {
        if (_dirty) {
            _.defer(() => {
                _dirty = false;
            });
        }
    }
    markDirty() {
        _dirty = true;
    }

    transpose(how) {
        // The selection is guaranteed to be in song order.
        var lastIdx = 0;
        var body = _staves[3].body; // XXX: Robustness
        var accidentals = null;

        _selection.forEach(item => {
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
        _selection = null;
        this.annotate();
        return true;
    }

    cursorFromSnapshot(pointerData, stave) {
        if (!pointerData) {
            return null;
        }

        if (pointerData && _snapshots[pointerData.musicLine]) {
            var cursor = JSON.parse(_snapshots[pointerData.musicLine]);
            _linesToUpdate[cursor.line] = true;
            cursor.start = pointerData.idx;
            while (cursor.start > 0 && !stave.body[cursor.start - 1].newline) {
                --cursor.start;
            }
            return cursor;
        } else {
            // We don't store snapshots for the 0th line, but we still need
            // to force it to be re-renderered.
            _linesToUpdate[0] = true;
        }
    }

    get tool() {
        return _tool;
    }
    get staves() {
        return _staves;
    }
    get staveHeight() {
        return _staveHeight;
    }
    get pageSize() {
        return _pageSize;
    }
    get src() {
        var staves = _staves;

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
                var bridge = Bridge.getBridgeForItem(obj);
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
    }
    get selection() {
        return _selection;
    }
    get dirty() {
        return _dirty;
    }
    get cursor() {
        return _cursor;
    }
    get visualCursor() {
        return _visualCursor;
    }
    lineDirty(idx) {
        return _linesToUpdate[idx];
    }

    /** 
     * @param {function} callback 
     */ 
    addChangeListener(callback) { 
        this.on(CHANGE_EVENT, callback); 
    }

    addAnnotationListener(callback) { 
        this.on(ANNOTATE_EVENT, callback); 
    }

    /** 
     * @param {function} callback 
     */ 
    removeChangeListener(callback) { 
        this.removeListener(CHANGE_EVENT, callback); 
    } 

    removeAnnotationListener(callback) { 
        this.on(ANNOTATE_EVENT, callback); 
    }
}

var annotate = (item, cursor, stave, idx) => {
    var bridge = Bridge.getBridgeForItem(item);
    return bridge.annotate(item, cursor, stave, idx);
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

var _beamBeatCount = 0;
var _cursor = null;
var _cleanup = null;
var _dirty = false;
var _linesToUpdate = {};
var _pageSize = null;
var _prevActiveSong = null;
var _selection = null;
var _snapshots = {};
var _staveHeight = null;
var _staves = null;
var _visualCursor = {
    bar: 1,
    beat: 1
};
var _tool = null;

// Exposed for console debugging.
window.SongEditorStore = module.exports = new SongEditorStore();
module.exports.beamCountIs = beamCountIs;
module.exports.snapshot = snapshot;
