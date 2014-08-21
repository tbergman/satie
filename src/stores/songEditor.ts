/**
 * Flux store for the song being edited.
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
var PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

var USING_LEGACY_AUDIO = PlaybackStore.USING_LEGACY_AUDIO;

export class SongEditorStore extends TSEE {
    _activeStaveIdx: number;

    constructor() {
        this.clear();

        Dispatcher.Instance.register(this.handleAction.bind(this));
        super();
    }

    handleAction(action: C.IFluxAction) {
        var activeSong: C.ISong;
        var i: number;
        switch(action.description) {
            case "GET /api/song":
            case "PUT /local/song/show":
                activeSong = SessionStore.Instance.activeSong();
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
                this.emit(CLEAR_HISTORY_EVENT);
                break;
            case "DELETE /local/song/show":
                this.clear();
                this.emit(CHANGE_EVENT);
                this.emit(CLEAR_HISTORY_EVENT);
                break;

            case "PUT /local/song/forceUpdate":
                this.clear();
                activeSong = SessionStore.Instance.activeSong();
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
                var h = Math.round(_staveHeight*100)/100;

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
                        delete _linesToUpdate[action.postData];
                        // don"t emit.
                        break;
                }
                break;

            case "DELETE /local/visualCursor":
                if (action.resource === "ptr") {
                    // Remove the item directly before the ctx.
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
                    while(i >= 0 && !_staves[3].body[i].isNote &&
                            _staves[3].body[i].type !== C.Type.BARLINE) {
                        --i;
                    }
                    var obj = _staves[3].body[i];
                    if (obj) {
                        var line = _visualCursor.annotatedLine;
                        this.stepCursor({
                            step: -1,
                            skipThroughBars: false
                        });

                        // Remove items based on a whitelist.
                        if (obj.isNote) {
                            // The stepCursor call above invalidates _visualCursor
                            // DO NOT CHECK _visualCursor HERE!!!
                            var EraseTool = require("./eraseTool"); // Recursive dependency.
                            var etool = new EraseTool();
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
                        }
                        this.emit(ANNOTATE_EVENT);
                    }
                } else {
                    _visualCursor = null;
                    this.emit(CHANGE_EVENT);
                    this.annotate();
                    break;
                }

                break;
            case "POST /local/visualCursor":
                switch (<any>action.resource) { // TSFIX
                    case "ptr":
                        assert(_visualCursor && _visualCursor.annotatedObj);
                        var prevObj: Model = null;
                        var prevIdx: number;
                        for (i = 0; i < _staves[3].body.length; ++i) {
                            if (_staves[3].body[i] === _visualCursor.annotatedObj) {
                                prevObj = _staves[3].body[i - 1];
                                prevIdx = i - 1;
                                if (prevObj.type === C.Type.BEAM_GROUP) {
                                    prevObj = _staves[3].body[i - 2];
                                }
                            }
                        }
                        this.annotate(
                            {
                                obj: prevObj,
                                musicLine: _visualCursor.annotatedLine,
                                idx: prevIdx,
                                staveIdx: this._activeStaveIdx
                            },
                            _tool.visualCursorAction(action.postData));
                        this.emit(ANNOTATE_EVENT);
                        break;

                    case undefined:
                    case null:
                    case false:
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
        _tool = null;
        _selection = null;
        this.visualCursorIs({
            bar: 1,
            beat: 0
        });
    }

    reparse(src: string) {
        _staves = lylite.parse(src);
        renderUtil.addDefaults(_staves);

        _staveHeight = _.find(_staves, s => s.staveHeight).staveHeight;
        _pageSize = _.find(_staves, s => s.pageSize).pageSize;
        for (var i = 0; i < _staves.length; ++i) {
            if (_staves[i].body) {
                this._activeStaveIdx = i;
            }
        }

        this.annotate();
    }

    /**
     * Calls Context.anotate on each stave with a body
     */
    annotate(
        pointerData?: C.IPointerData,
        toolFn?: (obj: Model, ctx: Context) => C.IterationStatus,
        staves?: Array<C.IStave>,
        pageSize?: C.IPageSize) {

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
             * Process staves that aren"t actually staves.
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
             * present on other staves.  Contexts are retreived from snapshots
             * when modifying a line other than the first.
             */
            var context = this.ctxFromSnapshot(pointerData, staves, sidx) ||
                    new Context({
                        top: y,
                        fontSize: this.staveHeight(),
                        isFirstLine: true,
                        pageSize: pageSize || _pageSize,
                        staves: staves,
                        staveIdx: sidx
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

            if (!info.skip) {
                if (PROFILER_ENABLED) {
                    console.log("Annotation efficiency: " +
                        (info.operations / stave.body.length));
                }

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
    downloadLegacyAudio() {
        var request: Array<string> = [];
        for (var h = 0; h < this.ctxCount(); ++h) {
            if (!this.staves()[h].body) {
                continue;
            }
            var body = this.staves()[h].body;
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;

            var ctx = new Context({ staveIdx: h, staves: this.staves() });

            for (var i = 0; i < body.length; ++i) {
                var obj = body[i];
                if (obj.type === C.Type.TIME_SIGNATURE) {
                    ctx.timeSignature = <any> obj; // TSFIX
                } else if (obj.isNote) {
                    var note: C.IPitchDuration = <any> obj;
                    var beats = note.getBeats(ctx);
                    _.map(note.pitch ? [C.midiNote(note)] : C.midiNote(note), midiNote => {
                        request.push(delay +
                                " NOTE_ON " + midiNote + " 127");
                        request.push((delay + beats*timePerBeat - 0.019) +
                                " NOTE_OFF " + midiNote + " 0");
                    });
                    delay += beats*timePerBeat;
                }
            }
        }
        Dispatcher.POST("/api/synth", {
            data: request,
            cb: "" + ++PlaybackStore.latestID
        });
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
                assert(accidentals, "A key signature must preceed any note.");

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

                _.each(note.pitch ? [note] : note.chord, (note: C.IPitch) => {
                    if (how.mode === "inKey") {
                        var accOffset = (note.acc || 0) - (accidentals[note.pitch] || 0);
                        newNote = noteToNum[note.pitch] + <number>how.letters;

                        note.pitch = numToNote[(noteToNum[note.pitch] + how.letters + 7*7)%7];

                        note.octave = (note.octave||0) + how.octaves + Math.floor(newNote/7);

                        note.acc = accOffset + (accidentals[note.pitch] || 0);

                        if (!note.acc) {
                            delete note.acc;
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
                            delete note.acc;
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

    stepCursor(spec: any) {
        if (!_visualCursor || !_visualCursor.annotatedObj) {
            return;
        }
        var obj = _visualCursor.annotatedObj;
        for (var i = 0; i < _staves[3].body.length; ++i) {
            if (_staves[3].body[i] === obj) {
                if ((!_staves[3].body[i + 1] ||
                            _staves[3].body[i + 1].type !== C.Type.BARLINE ||
                            _staves[3].body[i + 1].barline === C.Barline.Double) &&
                        spec.loopThroughEnd) {
                    this.visualCursorIs({
                        beat: 0,
                        bar: 1
                    });
                    break;
                }
                var cd = _staves[3].body[i].ctxData;
                var throughBar = false;
                while (_staves[3].body[i += spec.step]) {
                    if (!_staves[3].body[i]) {
                        break;
                    }
                    if (_staves[3].body[i].type === C.Type.BARLINE) {
                        throughBar = true;
                    }
                    if (_staves[3].body[i].type === C.Type.NEWLINE) {
                        // TODO: we don"t need to update all the lines
                        markRendererDirty();
                    }
                    if (_visualCursor.endMarker &&
                            spec.step === 1) {
                        var last = _staves[3].body[_staves[3].body.length -1];
                        assert(last.endMarker);
                        if (last.ctxData.bar !== _visualCursor.bar +1) {
                            this.visualCursorIs({
                                beat: 0,
                                bar: _visualCursor.bar + 1
                            });
                        }
                        break;
                    } else if (cd.bar !== _staves[3].body[i].ctxData.bar ||
                            cd.beat !== _staves[3].body[i].ctxData.beat) {

                        if (spec.skipThroughBars) {
                            while (_staves[3].body[i + 1] &&
                                    (_staves[3].body[i].endMarker ||
                                    _staves[3].body[i].type === C.Type.BARLINE)) {
                                ++i;
                            }
                        }
                        this.visualCursorIs(
                            _staves[3].body[i].ctxData);

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
                snapshot: _snapshots[pointerData.musicLine],
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
            // to force it to be re-renderered.
            _linesToUpdate[idx + "_0"] = true;
        }
    }

    tool() {
        return _tool;
    }
    staves() {
        return _staves;
    }
    staveHeight() {
        return _staveHeight;
    }
    pageSize() {
        return _pageSize;
    }
    src() {
        var staves = _staves;

        var lyliteArr: Array<string> = [];
        var unresolved: Array<(obj: Model) => boolean> = [];
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
                    lyliteArr.push("title=\"" + stave.header.title + "\"");
                }
                if (stave.header.composer) {
                    // XXX: XSS
                    lyliteArr.push("composer=\"" + stave.header.composer + "\"");
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
                    var ret: boolean = unresolved[j](obj);

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
    selection() {
        return _selection;
    }
    dirty() {
        return _dirty;
    }
    ctx(idx: any) {
        if (idx === undefined) {
            console.warn("Calling ctx without an index is deprecated.");
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
    ctxCount() {
        return _ctxs.length;
    }
    visualCursor() {
        return _visualCursor;
    }
    visualCursorIs(visualCursor: C.IVisualCursor) {
        // Assign directly to keep refrences in tact.
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
}

/**
 * Called at the end of begining of every line so that when a certain line
 * needs to be updated, the ctx can be unfrozen from here instead of
 * recalculating the ctx from the begining of the song.
 */
export var snapshot = (ctx: Context) => {
    _snapshots[ctx.line] = ctx.snapshot();
};

/**
 * Called at the begining of every beam. Called so that if the annotater has
 * to be "backed up", it can do so without recalculating from the begining
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
    annotatedObj: Model;
    annotatedLine: number;
    annotatedPage: number;
};

export var Instance = new SongEditorStore();

// Exposed for console debugging.
global.SongEditorStore = Instance;
