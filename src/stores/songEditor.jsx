/**
 * Flux store for the song being edited.
 */

var EventEmitter = require('events').EventEmitter; 
var _ = require("lodash");
var assert = require('assert');

var Dispatcher = require("./dispatcher.jsx"); 
var deepFreeze = require("../util/deepFreeze.jsx");

var Bridge = require("../renderer/bridges/bridge.jsx");
var Context = require("./context.jsx");
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

var latestID = 0;

var USING_LEGACY_AUDIO = PlaybackStore.USING_LEGACY_AUDIO;

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
                if (USING_LEGACY_AUDIO) {
                    _.defer(this.downloadLegacyAudio.bind(this));
                }
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
                _ctxs = null;
                _.find(_staves, s => s.staveHeight).staveHeight = _staveHeight;
                Bridge.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/pageSize":
                _pageSize = action.postData;
                _dirty = true;
                _ctxs = null;
                _.find(_staves, s => s.pageSize).pageSize = _pageSize;
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
                    // Remove the item directly before the ctx.
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
                        console.warn("Cursor not found");
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
                                    var cd = _staves[3].body[i].ctxData;
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
                                        } else if (cd.bar !== _staves[3].body[i].ctxData.bar ||
                                                cd.beat !== _staves[3].body[i].ctxData.beat) {

                                            if (action.postData.skipThroughBars) {
                                                while (_staves[3].body[i + 1] &&
                                                        (_staves[3].body[i].endMarker ||
                                                        _staves[3].body[i].barline)) {
                                                    ++i;
                                                }
                                            }
                                            _visualCursor = JSON.parse(JSON.stringify(
                                                _staves[3].body[i].ctxData));

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
        renderUtil.addDefaults(_staves);

        _staveHeight = _.find(_staves, s => s.staveHeight).staveHeight;
        _pageSize = _.find(_staves, s => s.pageSize).pageSize;

        this.annotate();
    }

    annotate(pointerData, toolFn, staves, pageSize) {
        staves = staves || _staves;

        PROFILER_ENABLED && console.time("annotate");

        var cursorStave = 0;
        var cursorBar = 0;
        var cursorBeat = 0;
        var cursor = _visualCursor;

        if (!pointerData) {
            cursor.annotatedObj = null;
            cursor.annotatedLine = null;
            _ctxs = [];
        }

        var y = 0;
        while (!staves.every((stave, sidx) => {
            /**
             * Process staves that aren't actually staves.
             * (Headers, authors, etc.)
             */
            if (stave.header) {
                y += Header.getHeight(stave.header);
                return true;
            } else if (!stave.body) {
                return true;
            }
        
            /**
             * Get a context.
             *
             * Contexts are retreived from snapshots when modifying a line
             * other than the first line.
             */
            var dirty = _dirty;
            var context = this.ctxFromSnapshot(pointerData, staves, sidx) ||
                    new Context({
                        top: y,
                        fontSize: this.staveHeight(),
                        isFirstLine: true,
                        pageSize: pageSize || _pageSize,
                        staves: staves,
                        staveIdx: sidx
                    });

            /**
             * Annotate the stave.
             */
            var info = context.annotate({
                cursor: cursor,
                cursorBar: cursorBar,
                cursorBeat: cursorBeat,
                cursorStave: cursorStave,
                dirty: dirty,
                pointerData: pointerData,
                staveIdx: sidx,
                toolFn: toolFn
            });

            if (!_visualCursor.annotatedObj) {
                _visualCursor = info.cursor;
            }

            _dirty = _dirty || info.dirty;
            y = info.resetY ? 0 : y;

            if (!info.skip) {
                PROFILER_ENABLED && console.log("Annotation efficiency: " +
                        (info.operations / stave.body.length));

                _ctxs.length = sidx;
                _ctxs[sidx] = context;
                y += 2.25;
            }

            return info.success;
        })) { /* pass */ }

        PROFILER_ENABLED && console.timeEnd("annotate");
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

    downloadLegacyAudio() {
        var data = [];
        for (var h = 0; h < this.ctxCount(); ++h) {
            if (!this.staves()[h].body) {
                continue;
            }
            var body = this.staves()[h].body;
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;

            // XXX: assuming 4/4 for now 

            for (var i = 0; i < body.length; ++i) {
                var obj = body[i];
                if (obj.pitch || obj.chord) {
                    var beats = obj.getBeats();
                    _.map(obj.pitch ? [obj.midiNote()] : obj.midiNote(), midiNote => {
                        data.push(delay +
                                " NOTE_ON " + midiNote + " 127");
                        data.push((delay + beats*timePerBeat - 0.019) +
                                " NOTE_OFF " + midiNote + " 0");
                    });
                    delay += beats*timePerBeat;
                }
            }
        }
        "/api/synth".POST({
            data: data,
            cb: "" + ++PlaybackStore.latestID
        });
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

            _.each(_selection, item => {
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

                _.each(item.pitch ? [item] : item.chord, note => {
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

    ctxFromSnapshot(pointerData, staves, idx) {
        if (!pointerData) {
            return null;
        }

        var stave = staves[idx];

        if (pointerData && _snapshots[pointerData.musicLine]) {
            var ctx = new Context({
                snapshot: _snapshots[pointerData.musicLine],
                staves: staves,
                staveIdx: idx
            });
            _linesToUpdate[ctx.line] = true;
            ctx.start = pointerData.idx;
            while (ctx.start > 0 && !stave.body[ctx.start - 1].newline) {
                --ctx.start;
            }
            return ctx;
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
        _.each(staves, (stave, sidx) => {
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
    ctx(idx) {
        if (idx === undefined) {
            console.warn("Calling ctx without an index is deprecated.");
            console.trace();
        }
        if (idx === undefined || idx.first) {
            var idx = 0;
            while (!_ctxs[idx] && idx < _ctxs.length) {
                ++idx;
            }
        }
        return _ctxs[idx];
    }
    get ctxCount() {
        return _ctxs.length;
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
 * needs to be updated, the ctx can be unfrozen from here instead of
 * recalculating the ctx from the begining of the song.
 */
var snapshot = (ctx) => {
    _snapshots[ctx.line] = ctx.snapshot();
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
var _ctxs = null;
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
