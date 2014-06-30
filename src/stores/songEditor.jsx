/**
 * Flux store for the song being edited.
 */

var EventEmitter = require('events').EventEmitter; 
var _ = require('underscore');
var assert = require('assert');

var Dispatcher = require("./dispatcher.jsx"); 
var deepFreeze = require("../util/deepFreeze.jsx");

var Bridge = require("../renderer/bridges/bridge.jsx");
var Header = require("../renderer/primitives/header.jsx");
var KeySignatureBridge = require("../renderer/bridges/keySignatureBridge.jsx");
var NewlineBridge = require("../renderer/bridges/newlineBridge.jsx");
var lylite = require("../renderer/lylite.jison").parser;
var renderUtil = require("../renderer/util.jsx");

var isBrowser = typeof window !== "undefined";

var CHANGE_EVENT = 'change'; 
var ANNOTATE_EVENT = 'annotate'; 
var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

///
var SessionStore = require("./session.jsx"); // must be registered before SongEditorStore!!!
var PlaybackStore = require("./playback.jsx"); // must be registered before SongEditorStore!!!

class SongEditorStore extends EventEmitter {
    constructor() {
        this.clear();

        Dispatcher.register(this.handleAction.bind(this));
    }

    handleAction(action) {
        switch(action.description) {
            case "GET /api/song":
            case "PUT /local/song/show":
                var activeSong = SessionStore.activeSong();
                if (activeSong !== _prevActiveSong) {
                    _dirty = true;
                    this.clear();
                    this.reparse(activeSong);
                    this.emit(CHANGE_EVENT);
                    this.emit(ANNOTATE_EVENT);
                }
                break;
            case "DELETE /local/song/show":
                this.clear();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/song/forceUpdate":
                this.clear();
                var activeSong = SessionStore.activeSong();
                this.reparse(activeSong);
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/tool":
                if (action.resource) {
                    var tool = _tool;
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
                                        tool.hidePreview.bind(tool));
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
                }
                _cleanup && _cleanup();
                _tool = action.postData;
                this.emit(CHANGE_EVENT);
                break;
            case "DELETE /local/tool":
                _cleanup && _cleanup();
                _tool = null;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/selection":
                _selection = action.postData;
                _dirty = true;
                this.emit(CHANGE_EVENT);
                break;
            case "DELETE /local/selection":
                _selection = null;
                _dirty = true;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/staveHeight":
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
                } else {
                    assert(false, "Not found");
                }
                _dirty = true;
                _cursors = null;
                _(_staves).find(s => s.staveHeight).staveHeight = _staveHeight;
                Bridge.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/pageSize":
                _pageSize = action.postData;
                _dirty = true;
                _cursors = null;
                _(nextProps.staves).find(s => s.pageSize).pageSize = nextProps.pageSize;
                Bridge.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/song":
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

            case "DELETE /local/song":
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

            case "DELETE /local/visualCursor":
                if (action.resource === "ptr") {
                    // Remove the item directly before the cursor.
                    var PitchBridge = require("../renderer/bridges/pitchBridge.jsx");
                    var EraseTool = require("../tools/eraseTool.jsx");
                    var i;
                    for (i = 0; i < _staves[3].body.length; ++i) {
                        if (_staves[3].body[i] === _visualCursor.annotatedObj) {
                            --i;
                            break;
                        }
                    }
                    if (i === _staves[3].body.length) {
                        console.log("Not found");
                        break;
                    }
                    while(i >= 0 && !_staves[3].body[i].pitch &&
                            !_staves[3].body[i].chord &&
                            !_staves[3].body[i].barline) {
                        --i;
                    }
                    var obj = _staves[3].body[i];
                    if (obj) {
                        var tool = new EraseTool();
                        _visualCursor.beat -= (obj.getBeats ? obj.getBeats() : 0);
                        this.annotate(
                            {
                                obj: obj,
                                musicLine: _visualCursor.annotatedLine,
                                idx: i
                            },
                            tool.splice.bind(tool, false));
                        this.emit(ANNOTATE_EVENT);
                    }
                } else {
                    _visualCursor = 0;
                    this.emit(CHANGE_EVENT);
                    this.annotate();
                    break;
                }

                break;
            case "POST /local/visualCursor":
                switch (action.resource) {
                    case "ptr":
                        var PitchBridge = require("../renderer/bridges/pitchBridge.jsx");
                        assert(_visualCursor && _visualCursor.annotatedObj);
                        var prevObj = null;
                        var prevIdx;
                        for (var i = 0; i < _staves[3].body.length; ++i) {
                            if (_staves[3].body[i] === _visualCursor.annotatedObj) {
                                prevObj = _staves[3].body[i - 1];
                                prevIdx = i - 1;
                                if (prevObj.beam) {
                                    prevObj = _staves[3].body[i - 2];
                                }
                            }
                        }
                        this.annotate(
                            {
                                obj: prevObj,
                                musicLine: _visualCursor.annotatedLine,
                                idx: prevIdx
                            },
                            _tool.visualCursorAction(action.postData));
                        this.emit(ANNOTATE_EVENT);
                        break;
                        
                    case undefined:
                    case null:
                    case false:
                        if (action.postData.bar) {
                            _visualCursor = {
                                bar: action.postData.bar,
                                beat: action.postData.beat,
                                endMarker: action.postData.endMarker
                            };
                        } else if (action.postData.step) {
                            if (!_visualCursor || !_visualCursor.annotatedObj) {
                                break;
                            }
                            var obj = _visualCursor.annotatedObj;
                            for (var i = 0; i < _staves[3].body.length; ++i) {
                                if (_staves[3].body[i] === obj) {
                                    if ((!_staves[3].body[i + 1] ||
                                                _staves[3].body[i + 1].barline === "double") &&
                                            action.postData.loopThroughEnd) {
                                        _visualCursor = {
                                            beat: 0,
                                            bar: 1
                                        };
                                        break;
                                    }
                                    var cd = _staves[3].body[i].cursorData;
                                    var throughBar = false;
                                    while (_staves[3].body[i += action.postData.step]) {
                                        if (!_staves[3].body[i]) {
                                            break;
                                        }
                                        if (_staves[3].body[i].barline) {
                                            throughBar = true;
                                        }
                                        if (_staves[3].body[i].newline) {
                                            // TODO: we don't need to update all the lines
                                            _dirty = true;
                                        }
                                        if (_visualCursor.endMarker &&
                                                action.postData.step === 1) {
                                            _visualCursor = {
                                                beat: 0,
                                                bar: _visualCursor.bar + 1
                                            };
                                            break;
                                        } else if (cd.bar !== _staves[3].body[i].cursorData.bar ||
                                                cd.beat !== _staves[3].body[i].cursorData.beat) {

                                            if (action.postData.skipThroughBars) {
                                                while (_staves[3].body[i + 1] &&
                                                        (_staves[3].body[i].endMarker ||
                                                        _staves[3].body[i].barline)) {
                                                    ++i;
                                                }
                                            }
                                            _visualCursor = JSON.parse(JSON.stringify(
                                                _staves[3].body[i].cursorData));

                                            // If we're walking through a bar, make up for that.
                                            if (throughBar) {
                                                if (action.postData.step < 0) {
                                                    _visualCursor.endMarker = true;
                                                } else {
                                                    _visualCursor.beat = 0;
                                                    _visualCursor.bar++;
                                                }
                                            }
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        this.annotate();
                        this.emit(ANNOTATE_EVENT);
                        break;
                }
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
            beat: 0
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

    annotate(pointerData, toolFn, staves, pageSize) {
        staves = staves || _staves;

        PROFILER_ENABLED && console.time("annotate");

        var vcStave = 0;
        var vcBar = 0;
        var vcBeat = 0;

        if (!pointerData) {
            _visualCursor.annotatedObj = null;
            _visualCursor.annotatedLine = null;
            _cursors = [];
        }

        var y = 0;
        while (!staves.every((stave, sidx) => {
            if (stave.header) {
                y += Header.getHeight(stave.header);
                return true;
            } else if (!stave.body) {
                return true;
            }
        
            var cursor = this.cursorFromSnapshot(pointerData, stave) ||
                    this.newCursor(y, _staveHeight, true, pageSize || _pageSize);

            var exitCode;
            var operations = 0;
            for (var i = cursor.start; i < stave.body.length;
                    i = this.nextIndex(i, exitCode, stave, cursor)) {

                ++operations;

                var doCustomAction = pointerData && (stave.body[i] === pointerData.obj ||
                        (pointerData && pointerData.obj && pointerData.obj.idx === i));

                if (!pointerData && cursor.bar === _visualCursor.bar &&
                        ((!_visualCursor.beat && !_visualCursor.annotatedObj) ||
                            cursor.beats === _visualCursor.beat) &&
                        (((stave.body[i].pitch || stave.body[i].chord) &&
                            !_visualCursor.endMarker) || (_visualCursor.endMarker &&
                            stave.body[i].endMarker))) {

                    if (vcStave === sidx || cursor.bar > vcBar || (vcBar === cursor.bar &&
                            cursor.beats > vcBeat)) {
                        vcStave = sidx;
                        vcBar = cursor.bar;
                        vcBeat = cursor.beats;
                        _visualCursor.annotatedObj = stave.body[i];
                        _visualCursor.annotatedLine = cursor.line;
                    }
                }

                stave.body[i].cursorData = {
                    bar: cursor.bar,
                    beat: cursor.beats,
                        // TODO: Move into the bridge layer
                    endMarker: stave.body[i].endMarker
                };

                if (doCustomAction) {
                    exitCode = toolFn(stave.body[i], cursor, stave, i);
                    pointerData = undefined;
                } else {
                    exitCode = stave.body[i].annotate(cursor, stave, i);
                }

                if (!doCustomAction &&
                        toolFn &&
                        !pointerData &&
                        stave.body[i].newline &&
                        !_dirty &&
                        exitCode !== "line_created") {
                    return true;
                }

                if (exitCode === "line_created" && toolFn) {
                    // ... and so must everything else
                    _dirty = true;
                    toolFn = false;
                }
            }
            if (cursor.bar === 1 && !cursor.beats && !_visualCursor.endMarker) {
                _visualCursor.endMarker = true;
                y = 0;
                return false;
            }

            NewlineBridge.semiJustify(cursor, stave, stave.body.length - 1);

            PROFILER_ENABLED && console.log("Annotation efficiency: " +
                    (operations / stave.body.length));

            _cursors.length = sidx;
            _cursors[sidx] = cursor;
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
            cursor.x = stave.body[i].x();
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
        // TODO: fontSize logic belongs in render.jsx
        // XXX: Indent should be 30. See also renderer.jsx
        var noMargin = false;
        if (typeof window !== "undefined" &&
                window.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            noMargin = true;
        }
        var initialX = renderUtil.mm(15, fontSize) + 1/4;
        var firstX = renderUtil.mm(first && !noMargin ? 30 : 15, fontSize) + 1/4;
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
        var PitchBridge = require("../renderer/bridges/pitchBridge.jsx");

        // The selection is guaranteed to be in song order.
        for (var staveIdx = 0; staveIdx < _staves.length; ++staveIdx) {
            var lastIdx = 0;
            var body = _staves[staveIdx].body;
            var accidentals = null;

            if (!body) {
                continue;
            }

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
                var noteToVal = PitchBridge.chromaticScale;

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
                        note.octave = (note.octave||0) + how.octaves + Math.floor(newNote/7);
                        note.acc = semitonesNeeded - semitonesDone + note.acc;
                        if (!note.acc) {
                            delete note.acc;
                        }
                    }
                });
                delete item.selected;
            });
        }
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
                lyliteArr.push("#(set-global-staff-size " +
                    stave.staveHeight*renderUtil.ptPerMM + ")\n");
                return;
            }
            if (stave.pageSize) {
                if (!stave.pageSize.lilypondName) {
                    alert("Custom sizes cannot currently be saved. (BUG)"); // XXX
                    return;
                }
                lyliteArr.push("#(set-default-paper-size \"" +
                    stave.pageSize.lilypondName + "\")\n");
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
                obj.toLylite(lyliteArr, unresolved);

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
    cursor(idx) {
        if (idx === undefined) {
            console.warn("Calling cursor without an index is deprecated.");
            console.trace();
        }
        if (idx === undefined || idx.first) {
            var idx = 0;
            while (!_cursors[idx] && idx < _cursors.length) {
                ++idx;
            }
        }
        return _cursors[idx];
    }
    get cursorCount() {
        return _cursors.length;
    }
    get visualCursor() {
        return _visualCursor;
    }
    set visualCursorIs(visualCursor) {
        _visualCursor = {
            bar: visualCursor.bar,
            beat: visualCursor.beat,
            endMarker: visualCursor.endMarker
        };
        // Does not emit.
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
        this.removeListener(ANNOTATE_EVENT, callback); 
    }
}

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
var _cursors = null;
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
    beat: 0
};
var _tool = null;

var rendererIsClean = () => {
    // Mark entire score as clean.
    // NOT a Flux method.
    _.defer(() => {
        _dirty = false;
    });
};

var rendererLineIsClean = (line) => {
    // Mark a given line as clean.
    // NOT a Flux method.
    _linesToUpdate[line] = true;
};

var rendererIsDirty = () => {
    // Mark entire score as dirty, so everything has to be re-rendered.
    // NOT a Flux method.
    _dirty = true;
};

// Exposed for console debugging.
global.SongEditorStore = module.exports = new SongEditorStore();
module.exports.beamCountIs = beamCountIs;
module.exports.snapshot = snapshot;
module.exports.rendererIsClean = rendererIsClean;
module.exports.rendererIsDirty = rendererIsDirty;
module.exports.rendererLineIsClean = rendererLineIsClean;
