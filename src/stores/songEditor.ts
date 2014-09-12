/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import Context = require("./context");
import Dispatcher = require("./dispatcher");
import Model = require("./model");
import Tool = require("./tool");
import TSEE = require("./tsee");
import lylite = require("./lylite");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

import SessionStore = require("./session"); // must be registered before SongEditorStore!!!
import PlaybackStore = require("./playback"); // must be registered before SongEditorStore!!!

var isBrowser = typeof window !== "undefined";
var CHANGE_EVENT = "change";
var ANNOTATE_EVENT = "annotate";
var HISTORY_EVENT = "history";
var CLEAR_HISTORY_EVENT = "clearHistory";
export var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

var USING_LEGACY_AUDIO = PlaybackStore.USING_LEGACY_AUDIO;

/**
 * Flux store for the song being edited.
 */
export class SongEditorStore extends TSEE {
    constructor() {
        super();
        this.clear();

        Dispatcher.Instance.register(this.handleAction.bind(this));
    }

    handleAction(action: C.IFluxAction) {
        var activeSong: C.ISong;
        var activeID: string;
        var h: number;
        var i: number;
        switch(action.description) {
            case "GET /api/song":
            case "PUT /local/song/show":
                activeSong = SessionStore.Instance.activeSong;
                if (USING_LEGACY_AUDIO) {
                    _.defer(this.downloadLegacyAudio.bind(this));
                }
                if (activeSong !== _prevActiveSong) {
                    markRendererDirty();
                    this.clear();
                    _prevActiveSong = activeSong;
                    this.reparse(activeSong.src);
                    this.emit(CHANGE_EVENT);
                    this.emit(ANNOTATE_EVENT);
                }

                _.each(this.staves, (stave: C.IStave) => {
                    if (stave.body) {
                        var instrument: C.IInstrument = stave.body.instrument;
                        PlaybackStore.Instance.ensureLoaded(instrument.soundfont, /*avoidEven
                         * 
                         t*/ true);
                    }
                });

                this.emit(CLEAR_HISTORY_EVENT);
                break;
            case "DELETE /local/song/show":
                this.clear();
                this.emit(CHANGE_EVENT);
                this.emit(CLEAR_HISTORY_EVENT);
                break;

            case "PUT /api/song":
                activeSong = SessionStore.Instance.activeSong;
                activeID = activeSong ? activeSong._id : null;
                if (action.resource === activeID) {
                    _savesInTransit++;
                }
                this._allChangesSent = true;
                break;

            case "PUT /api/song DONE":
                activeSong = SessionStore.Instance.activeSong;
                activeID = activeSong ? activeSong._id : null;
                if (action.resource === activeID) {
                    _savesInTransit--;
                    assert(_savesInTransit >= 0);
                    if (!_savesInTransit && this._allChangesSent) {
                        this._changesPending = false;
                    }
                }
                break;

            case "POST /local/selection":
                if (action.resource === "eraseAll") {
                    this.eraseSelection();
                }
                break;

            case "PUT /local/autosaveModal":
                this._autosaveModalVisible = true;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/autosaveModal":
                this._autosaveModalVisible = false;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/copyModal":
                this._copyModalVisible = true;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/copyModal":
                this._copyModalVisible = false;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/metadataModal":
                this._metadataModalVisible = true;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/metadataModal":
                this._metadataModalVisible = false;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/socialModal":
                this._socialModalVisible = true;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/socialModal":
                this._socialModalVisible = false;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/exportModal":
                this._exportModalVisible = true;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/exportModal":
                this._exportModalVisible = false;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/partModal":
                this._partModalStave = action.postData;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/partModal":
                this._partModalStave = null;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /api/song ERROR":
                alert("Could not save changes. Check your Internet connection.");
                activeSong = SessionStore.Instance.activeSong;
                activeID = activeSong ? activeSong._id : null;
                if (action.resource === activeID) {
                    _savesInTransit--;
                }
                this.changesPending = true;
                break;

            case "PUT /local/song/forceUpdate":
                this.clear();
                activeSong = SessionStore.Instance.activeSong;
                this.reparse(activeSong.src);
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/tool":
                if (action.resource) {
                    var tool = _tool;
                    switch(action.resource) {
                        case "hide":
                            if (_cleanupFn) {
                                _cleanupFn();
                                this.emit(ANNOTATE_EVENT);
                            }
                            break;
                        case "action":
                        case "preview":
                            if (_cleanupFn) {
                                _cleanupFn();
                            }
                            if (action.resource === "action") {
                                this.emit(HISTORY_EVENT);
                            }
                            if (action.resource === "preview") {
                                _cleanupFn = () => {
                                    _cleanupFn = null;
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
                if (_cleanupFn) {
                    _cleanupFn();
                }
                _tool = action.postData;
                this.emit(CHANGE_EVENT);
                break;

            case "DELETE /local/tool":
                if (_cleanupFn) {
                    _cleanupFn();
                }
                _tool = null;
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/selection":
                _selection = action.postData;
                markRendererDirty();
                this.emit(CHANGE_EVENT);
                break;
            case "DELETE /local/selection":
                _selection = null;
                markRendererDirty();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/staveHeight":
                this.emit(HISTORY_EVENT);
                h = Math.round(_staveHeight*100)/100;

                if (action.resource === "larger") {
                    for (i = renderUtil.rastalToHeight.length - 1; i >= 0; --i) {
                        if (renderUtil.rastalToHeight[i] > h) {
                            _staveHeight = renderUtil.rastalToHeight[i];
                            break;
                        }
                    }
                } else if (action.resource === "smaller") {
                    for (i = 0; i < renderUtil.rastalToHeight.length; ++i) {
                        if (renderUtil.rastalToHeight[i] < h) {
                            _staveHeight = renderUtil.rastalToHeight[i];
                            break;
                        }
                    }
                } else {
                    assert(false, "Not found");
                }
                markRendererDirty();
                _ctxs = null;
                _.find(_staves, s => s.staveHeight).staveHeight = _staveHeight;
                Model.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/pageSize":
                this.emit(HISTORY_EVENT);
                _pageSize = action.postData;
                markRendererDirty();
                _ctxs = null;
                _.find(_staves, s => s.pageSize).pageSize = _pageSize;
                Model.removeAnnotations(_staves);
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/hmargin":
                this.emit(HISTORY_EVENT);
                switch (action.resource) {
                    case "increase":
                        if (_paper.leftMargin < 50) {
                            _paper.leftMargin += 1;
                            _paper.rightMargin += 1;
                        }
                        break;
                    case "decrease":
                        if (_paper.leftMargin > -1) { // so it can go to -1
                            _paper.leftMargin -= 1;
                            _paper.rightMargin -= 1;
                        }
                        break;
                    default:
                        assert(false, "Not reached");
                }
                Model.removeAnnotations(_staves); // TODO: Should not be needed.
                this.markRendererDirty();
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/indent":
                this.emit(HISTORY_EVENT);
                switch (action.resource) {
                    case "increase":
                        if (_paper.indent < 50) {
                            _paper.indent += 1;
                        }
                        break;
                    case "decrease":
                        if (_paper.indent > -1) { // so it can go to -1
                            _paper.indent -= 1;
                        }
                        break;
                    default:
                        assert(false, "Not reached");
                }
                Model.removeAnnotations(_staves); // TODO: Should not be needed.
                this.markRendererDirty();
                this.annotate();
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/song":
                switch (action.resource) {
                    case "replaceSrc":
                        if (_cleanupFn) {
                            _cleanupFn();
                        }
                        _cleanupFn = null;
                        this.reparse(action.postData);
                        markRendererDirty();
                        this.emit(CHANGE_EVENT);
                        this.emit(ANNOTATE_EVENT);
                        break;
                    case "transpose":
                        this.emit(HISTORY_EVENT);
                        this.transpose(action.postData);
                        this.emit(CHANGE_EVENT);
                        break;
                    case "dirty":
                        markRendererDirty();
                        // don"t emit.
                        break;
                    case "lineDirty":
                        _linesToUpdate[action.postData] = true;
                        // don"t emit.
                        break;
                }
                break;

            case "DELETE /local/song":
                switch (action.resource) {
                    case "dirty":
                        _.defer(() => {
                            markRendererClean();
                            // don"t emit.
                        });
                        break;
                    case "lineDirty":
                        _linesToUpdate[action.postData] = null;
                        // don"t emit.
                        break;
                }
                break;

            case "DELETE /local/visualCursor":
                if (action.resource === "ptr") {
                    this.emit(HISTORY_EVENT);
                    // Remove the item directly before the context.
                    for (h = 0; h < _staves.length; ++h) {
                        // XXX: It's likely the developer will need to adjust this
                        // logic to allow for multiple staffs.
                        if (!_staves[h].body) {
                            continue;
                        }
                        for (i = 0; i < _staves[h].body.length; ++i) {
                            if (_staves[h].body[i] === _visualCursor.annotatedObj) {
                                --i;
                                break;
                            }
                        }
                        if (i === _staves[h].body.length) {
                            console.warn("Cursor not found");
                            break;
                        }
                        while (i >= 0 && !_staves[h].body[i].isNote &&
                            _staves[h].body[i].type !== C.Type.BARLINE) {
                            --i;
                        }
                        var obj = _staves[h].body[i];
                        if (obj) {
                            var line = _visualCursor.annotatedLine;

                            // Remove items based on a white-list.
                            if (obj.isNote) {
                                // The stepCursor call above invalidates _visualCursor
                                // DO NOT CHECK _visualCursor HERE!!!
                                var EraseTool = require("./eraseTool"); // Recursive dependency.
                                var etool = new EraseTool(true);
                                this.annotate(
                                    {
                                        obj: obj,
                                        musicLine: line,
                                        idx: i,
                                        staveIdx: this._activeStaveIdx
                                    },
                                    etool.splice.bind(etool, false));
                            } else {
                                this.annotate();
                                this.stepCursor({
                                    step: -1,
                                    skipThroughBars: false
                                });
                                this.annotate();
                            }
                            this.emit(ANNOTATE_EVENT);
                        }
                    }
                } else {
                    _visualCursor = null;
                    this.emit(CHANGE_EVENT);
                    this.annotate();
                    break;
                }

                break;
            case "PUT /local/instrument":
                var instrument: C.IInstrument = action.postData.instrument;
                var stave: C.IStave = action.postData.stave;

                PlaybackStore.Instance.ensureLoaded(instrument.soundfont);

                this.emit(HISTORY_EVENT);
                stave.body.instrument = instrument;
                this.emit(CHANGE_EVENT);
                break;
            case "POST /local/visualCursor":
                switch (action.resource) {
                    case "ptr":
                    case "octave":
                        if (!_tool) {
                            return;
                        }
                        this.emit(HISTORY_EVENT);
                        assert(_visualCursor && _visualCursor.annotatedObj);
                        var prevObj: Model = null;
                        var prevIdx: number;
                        for (h = 0; h < _staves.length; ++h) {
                            if (!_staves[h].body) {
                                continue;
                            }
                            // XXX: It's likely the developer will need to adjust this logic
                            // for multiple staffs.
                            for (i = 0; i < _staves[h].body.length; ++i) {
                                if (_staves[h].body[i] === _visualCursor.annotatedObj) {
                                    prevObj = _staves[h].body[i - 1];
                                    prevIdx = i - 1;
                                    if (prevObj.type === C.Type.BEAM_GROUP) {
                                        prevObj = _staves[h].body[i - 2];
                                    }
                                }
                            }
                            if (action.postData === "dot") {
                                var DotTool = require("./dotTool");
                                var tmpTool = new DotTool();
                                this.annotate(
                                    {
                                        obj: prevObj,
                                        musicLine: _visualCursor.annotatedLine,
                                        idx: prevIdx,
                                        staveIdx: this._activeStaveIdx
                                    },
                                    tmpTool.visualCursorAction(action.postData));
                            } else {
                                this.annotate(
                                    {
                                        obj: prevObj,
                                        musicLine: _visualCursor.annotatedLine,
                                        idx: prevIdx,
                                        staveIdx: this._activeStaveIdx
                                    },
                                    _tool.visualCursorAction(action.postData));
                            }
                            this.emit(ANNOTATE_EVENT);
                            break;
                        }

                    case "togglePlay":
                        // Not handled here;
                        break;

                    case undefined:
                    case null:
                        if (action.postData.bar) {
                            this.visualCursorIs(action.postData);
                        } else if (action.postData.step) {
                            this.stepCursor({
                                step: action.postData.step,
                                loopThroughEnd: action.postData.loopThroughEnd,
                                skipThroughBars: action.postData.skipThroughBars
                            });
                        }
                        this.annotate();
                        this.emit(ANNOTATE_EVENT);
                        break;
                    default:
                        assert(false, "Invalid value");
                }
                break;
        }
        return true;
    }

    clear() {
        this._activeStaveIdx = null;
        _staves = null;
        _staveHeight = null;
        _prevActiveSong = null;
        _pageSize = null;
        _paper = null;
        _tool = null;
        _selection = null;
        this.visualCursorIs({
            bar: 1,
            beat: 0
        });
    }

    reparse(src: string, profile?: boolean) {
        if (profile) {
            console.time("Parse source");
        }
        _staves = lylite.parse(src);
        C.addDefaults(_staves);

        _staveHeight = _.find(_staves, s => s.staveHeight).staveHeight;
        _pageSize = _.find(_staves, s => s.pageSize).pageSize;
        _paper = _.find(_staves, s => s.paper).paper;

        for (var i = 0; i < _staves.length; ++i) {
            if (_staves[i].body) {
                this._activeStaveIdx = i;
            }
        }

        var origPE = PROFILER_ENABLED;

        if (profile) {
            console.timeEnd("Parse source");
            PROFILER_ENABLED = true;
        }

        this.annotate(null, null, null, null, true);

        if (profile) {
            PROFILER_ENABLED = origPE;
        }
    }

    /**
     * Calls Context.anotate on each stave with a body
     */
    annotate(
        pointerData?: C.IPointerData,
        toolFn?: (obj: Model, ctx: Context) => C.IterationStatus,
        staves?: Array<C.IStave>,
        pageSize?: C.IPageSize,
        profile?: boolean) {

        staves = staves || _staves;

        if (PROFILER_ENABLED) {
            console.time("annotate");
        }

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
            /*
             * Process staffs that aren't actually staffs.
             * (Headers, authors, etc.)
             */
            if (stave.header) {
                y += renderUtil.getHeaderHeight(stave.header);
                return true;
            } else if (!stave.body) {
                return true;
            }

            /*
             * Get a context.
             *
             * Contexts are iterators that hold information such as the current
             * beat, what accidentals have been set, and what accidentals are
             * present on other staffs.  Contexts are retrieved from snapshots
             * when modifying a line other than the first.
             */
            var context = this.ctxFromSnapshot(pointerData, staves, sidx) ||
                    new Context({
                        top: y,
                        fontSize: this.staveHeight,
                        isFirstLine: true,
                        pageSize: pageSize || _pageSize,
                        staves: staves,
                        staveIdx: sidx,
                        leftMargin: _paper.leftMargin,
                        rightMargin: _paper.rightMargin,
                        indent: _paper.indent
                    });

            /*
             * Annotate the stave.
             */
            var info = context.annotate({
                cursor: cursor,
                cursorBar: cursorBar,
                cursorBeat: cursorBeat,
                cursorStave: cursorStave,
                pointerData: pointerData,
                staveIdx: sidx,
                toolFn: toolFn
            });

            /*
             * The _dirty flag is consumed by the client. It forces a complete
             * re-render, which can be expensive in SVG mode, so avoid this when
             * possible. Instead, code should use SongEditorModel.markRendererLineDirty.
             */
            if (info.dirty) {
                markRendererDirty();
            }
            y = info.resetY ? 0 : y;

            if (PROFILER_ENABLED) {
                console.log("ops:", info.operations, "\tbody:", stave.body.length, "\tscore:",
                    (Math.round(info.operations / stave.body.length * 100) / 100));
            }

            if (!info.skip) {
                _ctxs.length = sidx;
                _ctxs[sidx] = context;
                y += 2.25;
            }

            return info.success;
        })) { /* pass */ }

        if (PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }
    }

    markClean() {
        if (_dirty) {
            _.defer(() => {
                _dirty = false;
            });
        }
    }
    markRendererClean() {
        markRendererClean();
    }
    markRendererDirty() {
        markRendererDirty();
    }
    static getDragonAudio(staves: Array<C.IStave>): Array<string> {
        var request: Array<string> = [];
        for (var h = 0; h < staves.length; ++h) {
            if (!staves[h].body) {
                continue;
            }
            var body = staves[h].body;
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;

            var ctx = new Context({
                indent: 0,
                staveIdx: h,
                staves: staves
            });

            for (var i = 0; i < body.length; ++i) {
                var obj = body[i];
                if (obj.type === C.Type.TIME_SIGNATURE) {
                    ctx.timeSignature = <any> obj; // TSFIX
                } else if (obj.isNote && !obj.isRest) {
                    var note: C.IPitchDuration = <any> obj;
                    var beats = note.getBeats(ctx);
                    _.map(note.chord.map(C.midiNote), midiNote => {
                        request.push(delay +
                                " NOTE_ON " + midiNote + " 127");
                        request.push((delay + beats*timePerBeat - 0.019) +
                                " NOTE_OFF " + midiNote + " 0");
                    });
                    delay += beats*timePerBeat;
                }
            }
        }
        return request;
    }

    downloadLegacyAudio(opts?: { forExport?: boolean }, cb?: () => void) {
        Dispatcher.POST("/api/synth", {
            data: SongEditorStore.getDragonAudio(this.staves),
            cb: "" + ++PlaybackStore.latestID,
            forExport: opts && opts.forExport
        }, cb);
    }

    transpose(how: any) { // TSFIX
        // The selection is guaranteed to be in song order.
        for (var staveIdx = 0; staveIdx < _staves.length; ++staveIdx) {
            var lastIdx = 0;
            var body = _staves[staveIdx].body;
            var accidentals: C.IAccidentals = null;

            if (!body) {
                continue;
            }

            _.each(_selection, item => {
                for (var i = lastIdx; i <= body.length && body[i] !== item; ++i) {
                    if (body[i].type === C.Type.KEY_SIGNATURE) {
                        var KeySignatureModel = require("./keySignature"); // Recursive dependency
                        accidentals = KeySignatureModel.getAccidentals(
                            (<any>body[i]).keySignature); // TSFIX
                    }
                }

                assert(body[i] === item, "The selection must be in song order.");
                assert(accidentals, "A key signature must precede any note.");

                if (!item.isNote) {
                    return;
                }

                // For "inKey":
                var noteToNum: { [key: string]: number } = {c:0, d:1, e:2, f:3, g:4, a:5, b:6};
                var numToNote: { [key: number]: string } = "cdefgab";

                // For "chromatic":
                var DurationModel = require("./duration"); // Recursive dependency.
                var noteToVal = DurationModel.chromaticScale;

                var newNote: number;
                var note: C.IPitchDuration = <any> item;

                _.each(note.chord, (note: C.IPitch) => {
                    if (how.mode === "inKey") {
                        var accOffset = (note.acc || 0) - (accidentals[note.pitch] || 0);
                        newNote = noteToNum[note.pitch] + <number>how.letters;

                        note.pitch = numToNote[(noteToNum[note.pitch] + how.letters + 7*7)%7];

                        note.octave = (note.octave||0) + how.octaves + Math.floor(newNote/7);

                        note.acc = accOffset + (accidentals[note.pitch] || 0);

                        if (!note.acc) {
                            note.acc = null;
                        }
                    } else if (how.mode === "chromatic") {
                        var letters = parseInt(how.interval[1], 10) - 1;
                        var semitonesNeeded = parseInt(how.interval.split("_")[1], 10);

                        newNote = noteToNum[note.pitch] + letters;
                        var newPitch = numToNote[(newNote + 7*7)%7];
                        var semitonesDone = (noteToVal[newPitch] - noteToVal[note.pitch] + 12*12)%12;

                        note.pitch = newPitch;
                        note.octave = (note.octave||0) + how.octaves + Math.floor(newNote/7);
                        note.acc = semitonesNeeded - semitonesDone + note.acc;
                        if (!note.acc) {
                            note.acc = null;
                        }
                    }
                });
                item.selected = null;
            });
        }
        markRendererDirty();
        _selection = null;
        this.annotate();
        return true;
    }

    eraseSelection() {
        this.emit(HISTORY_EVENT);
        var staves = this.staves;
        for (var h = 0; h < staves.length; ++h) {
            if (!staves[h].body) {
                continue;
            }
            var body = staves[h].body;
            var removeEntireBarStartingAt: number = 0;
            for (var i = 0; i < body.length; ++i) {
                var type = body[i].type;
                if (type === C.Type.CLEF || type === C.Type.BEGIN ||
                        type === C.Type.KEY_SIGNATURE ||
                        type === C.Type.TIME_SIGNATURE) {
                    // We'll have to eventually have a way of getting rid of/hiding
                    // these...
                    removeEntireBarStartingAt = i + 1;
                    body[i].selected = false;
                    continue;
                }

                if (type === C.Type.DURATION && body[i].selected) {
                    body[i].note.isRest = true;
                }

                if (type === C.Type.BARLINE) {
                    if (removeEntireBarStartingAt !== null) {
                        var delCount = i - removeEntireBarStartingAt;
                        body.splice(removeEntireBarStartingAt, delCount);
                        i -= delCount;
                    }
                    removeEntireBarStartingAt = i;
                } else if (type === C.Type.END_MARKER) {
                    // Pass.
                } else if (!body[i].selected) {
                    removeEntireBarStartingAt = null;
                }
                body[i].selected = false;
            }
        }

        // This isn't very efficient, obviously.
        Model.removeAnnotations(_staves);
        _selection = null;
        this.annotate();
        this.markRendererDirty();
        this.emit(CHANGE_EVENT);
    }

    stepCursor(spec: any) {
        if (!_visualCursor || !_visualCursor.annotatedObj) {
            return;
        }
        var obj = _visualCursor.annotatedObj;
        var throughNewline = false;
        for (var h = 0; h < _staves.length; ++h) {
            if (!_staves[h].body) {
                continue;
            }
            for (var i = 0; i < _staves[h].body.length; ++i) {
                if (_staves[h].body[i] === obj) {
                    if ((!_staves[h].body[i + 1] ||
                            _staves[h].body[i + 1].type !== C.Type.BARLINE ||
                            _staves[h].body[i + 1].barline === C.Barline.Double) &&
                            spec.loopThroughEnd) {
                        this.visualCursorIs({
                            beat: 0,
                            bar: 1
                        });
                        break;
                    }
                    var cd = _staves[h].body[i].ctxData;
                    var throughBar = false;
                    while (_staves[h].body[i += spec.step]) {
                        if (!_staves[h].body[i]) {
                            break;
                        }
                        if (_staves[h].body[i].type === C.Type.BARLINE) {
                            throughBar = true;
                        }
                        if (_staves[h].body[i].type === C.Type.NEWLINE) {
                            // TODO: we don't need to update all the lines
                            throughNewline = true;
                            markRendererDirty();
                        }
                        if (_visualCursor.endMarker &&
                            spec.step === 1) {
                            var last = _staves[h].body[_staves[h].body.length - 1];
                            assert(last.endMarker);
                            if (last.ctxData.bar !== _visualCursor.bar + 1) {
                                this.visualCursorIs({
                                    beat: 0,
                                    bar: _visualCursor.bar + 1
                                });
                            }
                            break;
                        } else if (cd.bar !== _staves[h].body[i].ctxData.bar ||
                            cd.beat !== _staves[h].body[i].ctxData.beat) {

                            if (_staves[h].body[i] && spec.step === -1 &&
                                    _staves[h].body[i].ctxData.bar > 1 &&
                                    _staves[h].body[i].ctxData.beat === 0 && spec.skipThroughBars) {
                                var tbar = _staves[h].body[i].ctxData.bar;
                                while (_staves[h].body[i].ctxData.bar === tbar) {
                                    if (_staves[h].body[i].type === C.Type.NEWLINE) {
                                        // TODO: we don't need to update all the lines
                                        throughNewline = true;
                                        markRendererDirty();
                                    }
                                    --i;
                                }
                                this.visualCursorIs({
                                    bar: _staves[h].body[i].ctxData.bar,
                                    beat: _staves[h].body[i].ctxData.beat,
                                    endMarker: true });
                                break;
                            }

                            if (spec.skipThroughBars) {
                                while (_staves[h].body[i + 1] &&
                                        (_staves[h].body[i].endMarker ||
                                        _staves[h].body[i].type === C.Type.BARLINE)) {
                                    i += spec.step;
                                }
                            }
                            this.visualCursorIs(
                                _staves[h].body[i].ctxData);

                            // If we're walking through a bar, make up for that.
                            if (throughBar) {
                                if (spec.step < 0) {
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

        return throughNewline;
        // Does not emit
    }

    ctxFromSnapshot( pointerData: C.IPointerData,
            staves: Array<C.IStave>,
            idx: number) {

        if (!pointerData) {
            return null;
        }

        var stave = staves[idx];

        if (pointerData && _snapshots[pointerData.musicLine]) {
            var ctx: Context = new Context({
                indent: 15, // FIXME
                snapshot: this._recreateSnapshot(pointerData.musicLine),
                staves: staves,
                staveIdx: idx
            });
            _linesToUpdate[ctx.staveIdx + "_" + ctx.line] = true;
            ctx.start = pointerData.idx;
            while (ctx.start > 0 && stave.body[ctx.start - 1].type !==
                    C.Type.NEWLINE) {
                --ctx.start;
            }
            return ctx;
        } else {
            // We don't store snapshots for the 0th line, but we still need
            // to force it to be re-rendered.
            _linesToUpdate[idx + "_0"] = true;
        }
    }

    get tool() {
        return _tool; }
    get staves() {
        return _staves; }
    get staveHeight() {
        return _staveHeight; }
    get pageSize() {
        return _pageSize; }
    get paper() {
        return _paper; }
    get src() {
        var staves = _staves;

        var lyliteArr: Array<string> = [];
        var unresolved: Array<(obj: Model) => boolean> = [];
        _.each(staves, (stave, sidx) => {
            if (stave.body) {
                lyliteArr.push("\\new Staff {\n");
                lyliteArr.push("\\set Staff.midiInstrument = #\"" + stave.body.instrument.lilypond + "\"");

                var body = stave.body;
                for (var i = 0; i < body.length; ++i) {
                    var obj = body[i];
                    obj.toLylite(lyliteArr, unresolved);

                    for (var j = 0; j < unresolved.length; ++j) {
                        var ret: boolean = unresolved[j](obj);

                        if (ret) {
                            unresolved.splice(j, 1);
                            --j;
                        }
                    }
                }

                lyliteArr.push("}\n");
            } else if (stave.staveHeight) {
                lyliteArr.push("#(set-global-staff-size " +
                    stave.staveHeight*renderUtil.ptPerMM + ")\n");
            } else if (stave.pageSize) {
                if (!stave.pageSize.lilypondName) {
                    alert("Custom sizes cannot currently be saved. (BUG)"); // XXX
                    return;
                }
                lyliteArr.push("#(set-default-paper-size \"" +
                    stave.pageSize.lilypondName + "\")\n");
            } else if (stave.paper) {
                lyliteArr.push("\\paper {");
                if (stave.paper.leftMargin) {
                    lyliteArr.push("left-margin=" + stave.paper.leftMargin);
                }
                if (stave.paper.rightMargin) {
                    lyliteArr.push("right-margin=" + stave.paper.rightMargin);
                }
                lyliteArr.push("}\n");

            } else if (stave.header) {
                lyliteArr.push("\\header {");
                if (stave.header.title) {
                    // XXX: XSS
                    lyliteArr.push("title=\"" + stave.header.title + "\"");
                }
                if (stave.header.composer) {
                    // XXX: XSS
                    lyliteArr.push("composer=\"" + stave.header.composer + "\"");
                }
                lyliteArr.push("}\n");
            }
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
    ctx(idx: any) {
        if (idx === undefined) {
            console.warn("Calling context without an index is deprecated.");
            console.trace();
        }
        if (idx === undefined || idx.first) {
            idx = 0;
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
    visualCursorIs(visualCursor: C.IVisualCursor) {
        // Assign directly to keep references in tact.
        // Alternatively, Context could be updated with the updated
        // cursor.
        _visualCursor.bar = visualCursor.bar;
        _visualCursor.beat = visualCursor.beat;
        _visualCursor.endMarker = visualCursor.endMarker;
        _visualCursor.annotatedObj = null;
        _visualCursor.annotatedLine = null;
        _visualCursor.annotatedPage = null;
        // Does not emit.
    }
    isLineDirty(idx: number, h: number) {
        return _linesToUpdate[h + "_" + idx];
    }

    addChangeListener(callback: any) {
        this.on(CHANGE_EVENT, callback); }

    addAnnotationListener(callback: any) {
        this.on(ANNOTATE_EVENT, callback); }

    addHistoryListener(callback: any) {
        this.on(HISTORY_EVENT, callback); }

    addClearHistoryListener(callback: any) {
        this.on(CLEAR_HISTORY_EVENT, callback); }

    removeChangeListener(callback: any) {
        this.removeListener(CHANGE_EVENT, callback); }

    removeAnnotationListener(callback: any) {
        this.removeListener(ANNOTATE_EVENT, callback); }

    removeHistoryListener(callback: any) {
        this.removeListener(HISTORY_EVENT, callback); }

    removeClearHistoryListener(callback: any) {
        this.removeListener(CLEAR_HISTORY_EVENT, callback); }

    get changesPending() {
        return this._changesPending;
    }

    set changesPending(pending: boolean) {
        assert(pending === true, "Only SongEditor can clear pending changes");
        this._allChangesSent = false;
        this.throttledAutosave();
        this._changesPending = pending;
    }

    get autosaveModalVisible() {
        return this._autosaveModalVisible;
    }

    set autosaveModalVisible(visible: boolean) {
        assert(false, "Use the dispatcher to send this type of request");
    }

    get copyModalVisible() {
        return this._copyModalVisible;
    }

    set copyModalVisible(visible: boolean) {
        assert(false, "Use the dispatcher to send this type of request");
    }

    get metadataModalVisible() {
        return this._metadataModalVisible;
    }

    set metadataModalVisible(visible: boolean) {
        assert(false, "Use the dispatcher to send this type of request");
    }

    get socialModalVisible() {
        return this._socialModalVisible;
    }

    set socialModalVisible(visible: boolean) {
        assert(false, "Use the dispatcher to send this type of request");
    }

    get exportModalVisible() {
        return this._exportModalVisible;
    }

    set exportModalVisible(visible: boolean) {
        assert(false, "Use the dispatcher to send this type of request");
    }

    get partModalStave() {
        return this._partModalStave;
    }

    set partModalStave(modal: C.IStave) {
        assert(false, "Use the dispatcher to send this type of request");
    }

    set indent(i: number) {
        assert(false, "Use the dispatcher to send this type of request.");
    }


    throttledAutosave = _.throttle(() => {
        var active = SessionStore.Instance.activeSong;
        if (active) {
            Dispatcher.PUT("/api/song/_" + active._id, { src: this.src });
        }
    }, (1000 * ((global.localStorage && global.localStorage.autosaveDelay) || 3)),
        { leading: false });

    _activeStaveIdx: number;
    private _recreateSnapshot(line: number) {
        var lines: Array<any> = [];
        for (var i = 1; i <= line; ++i) {
            var sn = JSON.parse(_snapshots[i]);
            lines.push(sn.lines[0]);
            if (i === line) {
                lines.push(sn.lines[1]);
                sn.lines = lines;
                return sn;
            }
        }
    }
    private _changesPending: boolean;
    private _allChangesSent: boolean = true;
    private _autosaveModalVisible: boolean = false;
    private _copyModalVisible: boolean = false;
    private _metadataModalVisible: boolean = false;
    private _socialModalVisible: boolean = false;
    private _exportModalVisible: boolean = false;
    private _partModalStave: C.IStave = null;
}

/**
 * Called at the end of beginning of every line so that when a certain line
 * needs to be updated, the context can be unfrozen from here instead of
 * recalculating the context from the beginning of the song.
 */
export var snapshot = (ctx: Context) => {
    _snapshots[ctx.line] = ctx.snapshot();
};

/**
 * Called at the beginning of every beam. Called so that if the annotator has
 * to be "backed up", it can do so without recalculating from the beginning
 * of the line.
 */
export var beamCountIs = (beamCount: number) => {
    _beamBeatCount = beamCount;
};

export var getBeamCount = () => {
    return _beamBeatCount;
};

var _beamBeatCount = 0;
var _ctxs: Array<Context> = null;
var _cleanupFn: Function = null;
var _dirty = false;
var _linesToUpdate: { [key: string]: boolean } = {};
var _pageSize: C.IPageSize = null;
var _paper: C.Paper = null;
var _prevActiveSong: C.ISong = null;
var _selection: Array<Model> = null;
var _snapshots: { [key: string]: any } = {};
var _staveHeight: number = null;
var _staves: Array<C.IStave>;

var _visualCursor: IVisualCursor = {
    bar: 1,
    beat: 0,
    endMarker: <boolean> null,
    annotatedObj: <Model> null,
    annotatedLine: <number> null,
    annotatedPage: <number> null
};
var _tool: Tool = null;

export var markRendererClean = () => {
    // Mark entire score as clean.
    // NOT a Flux method.
    _.defer(() => {
        _dirty = false;
    });
};

export var markRendererLineDirty = (line: number, staveIdx: number ) => {
    // Mark a given line as dirty
    // NOT a Flux method.
    _linesToUpdate[staveIdx + "_" + line] = true;
};

export var markRendererDirty = () => {
    // Mark entire score as dirty, so everything has to be re-rendered.
    // NOT a Flux method.
    _dirty = true;
};

var _savesInTransit: number = 0;

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require TSEE since we extend it. This line forces the require()
// line to not be optimized out.
TSEE.length;
/* tslint:enable */

export interface IVisualCursor {
    bar: number;
    beat: number;
    endMarker: boolean;
    annotatedObj?: Model;
    annotatedLine?: number;
    annotatedPage?: number;
};

export var Instance = new SongEditorStore();

// Exposed for console debugging.
global.SongEditorStore = Instance;
