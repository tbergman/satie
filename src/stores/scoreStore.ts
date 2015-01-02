/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _                 = require("lodash");
import assert            = require("assert");
import TSEE              = require("./tsee");

import Annotator         = require("./annotator");
import BarlineModel      = require("./barline");
import BeginModel        = require("./begin");
import C                 = require("./contracts");
import DurationModel     = require("./duration"); // Cyclic?
import Instruments       = require("./instruments");
import Model             = require("./model");
import PlaceholderModel  = require("./placeholder");

   var isBrowser         = typeof window !== "undefined";

/**
 * Flux store for a MusicXML song.
 */
class ScoreStoreStore extends TSEE implements C.IScoreStore, C.IApi {
    constructor(dispatcher: C.IDispatcher) {
        super();
        dispatcher.register(this._handleAction);

        this._dispatcher = dispatcher;

        global.ScoreStore = this;
        this._clear();
    }

    destructor() {
        this._dispatcher.unregister(this._handleAction);
        this._clear();
    }

    /////////////////////////////////
    // PROPERTIES AND DERIVED DATA // 
    /////////////////////////////////

    get dirty() {
        return this._dirty; }

    get finalCtx(): Annotator.Context {
        return this._ctx; }
    getLineDirty(idx: number, h: number) {
        return this._linesToUpdate[h + "_" + idx]; }

    get parts() {
        return this._parts; }
    get voices() {
        return this._voices; }
    get header() {
        return this._header; }
    get src() {
        return "Ripieno State Transfer (dev)," + JSON.stringify({
            voices: this._voices,
            header: this._header
        });
    }
    get visualCursor() {
        return this._visualCursor; }

    ////////////////////
    // STAVE MUTATORS // 
    ////////////////////

    ctxFromSnapshot(pointerData: C.IPointerData, voices: Array<C.IVoice>, assertionPolicy: Annotator.AssertionPolicy): Annotator.Context {
        var i: number;

        if (!pointerData) {
            return null;
        }

        if (pointerData && this._snapshots[pointerData.musicLine]) {
            var ctx = new Annotator.Context(voices, {
                header: this.header,
                snapshot: this._recreateSnapshot(pointerData.musicLine)
            }, this, assertionPolicy);
            for (i = 0; i < voices.length; ++i) {
                this._linesToUpdate[i + "_" + ctx.line] = true;
            }
            return ctx;
        } else {
            // We don't store snapshots for the 0th line, but we still need
            // to force it to be re-rendered.
            for (i = 0; i < voices.length; ++i) {
                this._linesToUpdate[i + "_0"] = true;
            }
        }
    }

    /**
     * Marks the entire score as clean once the current frame is complete.
     * To be called by the Renderer.
     */
    dangerouslyMarkRenderDone(): void {
        _.defer(() => {
            this._dirty = false;
        });
    }
    /**
     * Marks the entire score as dirty.
     * To be called by the Annotator.
     */
    dangerouslyMarkRendererDirty() {
        // Mark entire score as dirty, so everything has to be re-rendered.
        // NOT a Flux method.
        this._dirty = true;
    }

    dangerouslyMarkRendererLineClean = this["DELETE /webapp/song/lineDirty"].bind(this);

    /**
     * Marks a specific line as dirty.
     * To be called by the Annotator.
     */
    dangerouslyMarkRendererLineDirty(line: number) {
        // Mark a given line as dirty
        // NOT a Flux method.
        if (!this._voices) {
            return;
        }
        for (var i = 0; i < this._voices.length; ++i) {
            this._linesToUpdate[i + "_" + line] = true;
        }
    }

    /**
     * Sets the current visual cursor.
     * To be called by the Annotator.
     */
    dangerouslySetVisualCursor: (visualCursor: C.IVisualCursor) => void = this._visualCursorIs.bind(this);

    /**
     * Called at the end of beginning of every line so that when a certain line
     * needs to be updated, the context can be unfrozen from here instead of
     * recalculating the context from the beginning of the song.
     */
    dangerouslyTakeSnapshot(ctx: Annotator.Context) {
        this._snapshots[ctx.line] = JSON.stringify(ctx.captureSnapshot());
    }

    ensureSoundfontLoaded: (soundfont: string, avoidEvent?: boolean) => void = (s: string, e?: boolean) => false;

    /////////////
    // STATICS // 
    /////////////

    static parse(src: string): { voices: Array<C.IVoice>; header: C.ScoreHeader; } {
        var song: { header: C.ScoreHeader; voices: Array<C.IVoice>; } = null;

        if (src.length && src.substr(0, 8) === "Ripieno State Transfer (dev),") {
            // Ripieno native
            var songJson = JSON.parse(src.substring(8));
            song = {
                voices: [],
                header: new C.ScoreHeader(songJson.header)
            };
            for (var i = 0; i < songJson.parts.length; ++i) {
                song.voices.push({
                    body: [],
                    instrument: songJson.parts[i].instrument || Instruments.List[0]
                });
                var body = songJson.parts[i].body;
                if (body) {
                    for (var j = 0; j < body.length; ++j) {
                        song.voices[i].body[j] = Model.fromJSON(body[j]);
                    }
                    for (var j = 0; j < body.length; ++j) {
                        song.voices[i].body[j].modelDidLoad(song.voices[i].body, j);
                    }
                }
            }
        } else {
            assert(false, "Unknown format");
        }
        return song;
    }

    static extractMXMLHeader(m: C.MusicXML.ScoreTimewise): C.ScoreHeader {
        var header = new C.ScoreHeader({
            work:           m.work,
            movementNumber: m.movementNumber,
            movementTitle:  m.movementTitle,
            identification: m.identification,
            defaults:       m.defaults,
            credits:        m.credits,
            partList:       m.partList
        });

        // Some systems, especially small open source projects, don't record credits,
        // but do record movementTitle. So add credits for them.
        if ((!header.credits || !header.credits.length) && header.movementTitle) {
            header.title = header.movementTitle;
        }

        return header;
    }

    /**
     * Hackily convert a JSON MusicXML (I know, I know...) structure to a Satie-native structure.
     *
     * @param mxmlJson JSON structure generated by github.com/ripieno/musicxml-interfaces.
     */
    static extractMXMLParts(mxmlJson: C.MusicXML.ScoreTimewise): {voices: C.IVoice[]; parts: C.IPart[]} {
        var idxToPart: {[key: number]: string} = {};

        var parts: C.IPart[] = [];
        var partCount = 0;
        _.forEach(mxmlJson.partList.scoreParts, (part, idx) => {
            idxToPart[partCount++] = part.id;
            parts.push({
                id: part.id,
                staves: 0,
                voices: []
            });
        });

        var partToIdx = _.invert(idxToPart);

        assert(partCount, "At least one part is needed.");

        var voices: C.IVoice[] = [];

        function mxmlClassToType(type: string) {
            switch(type) {
                case "Note":
                    return C.Type.Duration;
                case "Attributes":
                    return C.Type.Attributes;
                case "Barline":
                    return C.Type.Barline;
                default:
                    throw type + " is not implemented";
            }
        };

        var divisionsPerPart: number[] = [];
        var timeSignaturePerPart: C.MusicXML.Time[] = [];

        var _voiceHash: {[key: string]: number} = {};
        var partToVoices: number[][] = _.times(partCount, () => <number[]> []);
        var _maxVoice = -1;
        function getVoiceIdx(mPartIdx: number, voice: number) {
            var key = (mPartIdx || 0) + "_" + (voice||1);
            if (_voiceHash[key] === undefined) {
                ++_maxVoice;
                partToVoices[mPartIdx].push(_maxVoice);
                parts[mPartIdx].voices.push(_maxVoice);
                return _voiceHash[key] = _maxVoice;
            }
            return _voiceHash[key];
        }

        var outputIdx: number = 1; // ([Begin])
        _.forEach(mxmlJson.measures, (measure, measureIdx) => {
            var minPriority: number;
            var currBeat = 0;
            var idxPerPart: number[]        = _.times(partCount, part => 0);  // Input index.
            do {
                var elements: any[]         = _.map(measure.parts, (p, partID) => p[idxPerPart[partToIdx[partID]]] || <any> {});

                // Check for backups/forwards
                var splits                  = getSplits(elements);
                if (splits.length) {
                    _.forEach(splits, split => {
                        var partIdx         = split.idx;
                        ++idxPerPart[partIdx];
                        if (split.el._class === "Backup") {
                            var beats       = split.el.duration / divisionsPerPart[partIdx]; // Does this work in /8?

                            currBeat = currBeat - beats;
                            --outputIdx;
                            while (getCurrBeat() > currBeat) {
                                --outputIdx;
                            }

                            function getCurrBeat() {
                                return _.chain(voices)
                                    .map(voice => (voice.body[outputIdx].ctxData||{beat:0}).beat)
                                    .max() // _should_ be all the same, but we're not quite that awesome yet.
                                    .value();
                            }
                        }
                    });
                    continue;
                }
                var priorities              = _.map(elements, element => !element || typeof element === "string" ? C.MAX_NUM : mxmlClassToType(element._class));
                minPriority                 = _.min(priorities);

                // Constraint: all parts at a given index have the same type. We add placeholders
                // so that this is true. See PlaceholderModel for details.
                if (minPriority !== C.MAX_NUM) {
                    var newBeat = 1000;
                    _.forEach(elements, (element, mPartIdx) => {
                        var voiceIdx = getVoiceIdx(mPartIdx, element.voice);
                        parts[mPartIdx].staves = Math.max(parts[mPartIdx].staves, element.staff||1);
                        if (!voices[voiceIdx]) {
                            voices[voiceIdx] = {
                                instrument: Instruments.List[0],
                                body: <Model[]> [new BeginModel({}, true)]
                            };
                            if (voiceIdx) {
                                for (var i = 1; i < voices[0].body.length; ++i) {
                                    voices[voiceIdx].body.push(new PlaceholderModel(
                                        {priority: voices[0].body[i].priority}, true));
                                }
                            }
                        }

                        Annotator.recordMetreData(voices); // XXX: O(n^2) for no reason.

                        if (mxmlClassToType(element._class) === minPriority) { // STOPSHIP: Also check beats...
                            var beatsInEl = 0;
                            if (minPriority === C.Type.Attributes) {
                                assert(element.voice === undefined, "Attributes are voiceless");
                                assert(element.staff === undefined, "Attributes are staffless");
                                divisionsPerPart[mPartIdx] = element.divisions || divisionsPerPart[mPartIdx];
                                timeSignaturePerPart[mPartIdx] = element.time || timeSignaturePerPart[mPartIdx];
                            } else if (minPriority === C.Type.Duration) {
                                var note = <C.MusicXML.Note> element;
                                element = {
                                    _notes:     [note],
                                    _class:     element._class,
                                    dots:       note.dots ? note.dots.length : 0 // FIXME
                                };
                                if (note.chord) {
                                    assert(false, "TODO");
                                }
                            }

                            var _class = element._class;
                            delete element._class;
                            element._ = [Model.newKey(), minPriority, 0];

                            var curr = voices[voiceIdx].body[outputIdx];
                            var model = Model.fromJSON(element);
                            if (curr && curr.placeholder && curr.priority === minPriority && curr.ctxData.beat === currBeat) {
                                voices[voiceIdx].body[outputIdx] = model;
                            } else {
                                voices[voiceIdx].body.splice(outputIdx, 0, model);

                                _.chain(partToVoices[mPartIdx])
                                    .filter(vidx => vidx !== voiceIdx)
                                    .map(vidx => voices[vidx])
                                    .forEach(voice => voice.body.splice(outputIdx, 0,
                                        new PlaceholderModel({priority: minPriority}, true)))
                                    .value();
                            }


                            element._class = _class;
                            delete element._;

                            Annotator.recordMetreData(voices); // XXX: O(n^2) for no reason.

                            if (minPriority === C.Type.Duration) {
                                // needs recordMetreData to be called.
                                beatsInEl = (<DurationModel>model)._beats;
                            }

                            ++idxPerPart[mPartIdx];
                            newBeat = Math.min(newBeat, currBeat + beatsInEl);
                        } else {
                            // Most likely, we put in a placeholder.
                            assert(false, "Not implemented");
                        }
                    });
                    currBeat = newBeat;
                    ++outputIdx;
                }
            } while(minPriority !== C.MAX_NUM);
            
            if (measureIdx !== mxmlJson.measures.length - 1) { 
                for (var i = 0; i < voices.length; ++i) {
                    voices[i].body.push(new BarlineModel({
                        barStyle: {
                            data: C.MusicXML.BarStyleType.Regular
                        }
                    }, true));
                    outputIdx = voices[i].body.length;
                }
            }
        });

        // Call model hooks
        _.forEach(voices, part => {
            _.forEach(part.body, (model, j) => {
                model.modelDidLoad(part.body, j);
            });
        });

        function getSplits(elements: any[]) {
            return _.map(elements, (element, idx) =>
                    element._class === "Forward" || element._class === "Backup" ? {el: element, idx: idx} : null)
                .filter(a => !!a);
        }

        return {
            voices: voices,
            parts: parts
        }
    }


    static PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

    //////////////////
    // FLUX METHODS // 
    //////////////////

    "DELETE /webapp/song/lineDirty"(action: C.IFluxAction<number>) {
        this._linesToUpdate[action.postData] = false;
        // don"t emit.
    }

    "PUT /webapp/song/src"(action: C.IFluxAction<string>) {
        this._reparse(action.postData);
        this.dangerouslyMarkRendererDirty();
        this.emit(C.EventType.Change);
        this.emit(C.EventType.Annotate);
    }

    "PUT /webapp/song/mxmlJSON"(action: C.IFluxAction<C.MusicXML.ScoreTimewise>) {
        var mxml                = C.JSONx.clone(action.postData);

        this._header            = ScoreStoreStore.extractMXMLHeader(mxml);

        var partData            = ScoreStoreStore.extractMXMLParts(mxml);
        this._parts             = partData.parts;
        this._voices            = partData.voices;

        Annotator.recordMetreData(this._voices);

        this._annotate(null, null, null, null, true, null, Annotator.AssertionPolicy.NoAssertions);
        this.dangerouslyMarkRendererDirty();
        this.emit(C.EventType.Change);
        this.emit(C.EventType.Annotate);
    }

    "PUT /webapp/visualCursor"(action: C.IFluxAction<C.IVisualCursor>) {
        this._visualCursorIs(action.postData);
        if (!this._visualCursor.annotatedObj) {
            this._annotate(null, null, null, null, true);
        }
        this.emit(C.EventType.Annotate);
    }

    "PUT /webapp/visualCursor/step"(action: C.IFluxAction<ScoreStoreStore.IStepCursorSpec>) {
        this._stepCursor({
            step: action.postData.step,
            loopThroughEnd: action.postData.loopThroughEnd,
            skipDurationlessContent: action.postData.skipDurationlessContent
        });
        if (!this._visualCursor.annotatedObj) {
            this._annotate(null, null, null, null, true);
        }
        this.emit(C.EventType.Annotate);
    }

    "DELETE /webapp/visualCursor"(action: C.IFluxAction<void>) {
        this._visualCursor = null;
        this.emit(C.EventType.Change);
        this._annotate(null, null, null, null, true);
    }

    "PUT /webapp/instrument"(action: C.IFluxAction<{instrument: C.IInstrument; part: C.IVoice}>) {
        var instrument: C.IInstrument = action.postData.instrument;
        var part: C.IVoice = action.postData.part;

        this.ensureSoundfontLoaded(instrument.soundfont);

        this.emit(C.EventType.History);
        part.instrument = instrument;
        this.emit(C.EventType.Change);
    }

    midiOutHint(out: Array<number>) {
        this.emit(C.EventType.MidiOut, out);
    }

    /////////////
    // PRIVATE //
    /////////////

    /**
     * Calls Context.anotate on each part with a body
     */
    private _annotate(
            pointerData: C.IPointerData,
            toolFn: (obj: Model, ctx: Annotator.Context) => C.IterationStatus,
            parts: Array<C.IVoice>,
            profile: boolean,
            disableRecording: boolean,
            godAction?: Function,
            assertionPolicy?: Annotator.AssertionPolicy) {

        assertionPolicy = isNaN(assertionPolicy) ? Annotator.AssertionPolicy.Strict : assertionPolicy;

        parts = parts || this._voices;

        if (ScoreStoreStore.PROFILER_ENABLED) {
            console.time("annotate");
        }

        var aBody: Model[]; // XXX: MULTISTAVE
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                aBody = parts[i].body;
                break;
            }
        }
        var cursor = this._visualCursor;

        if (!pointerData) {
            cursor.annotatedObj = null;
            cursor.annotatedLine = null;
            cursor.annotatedStave = null;
        }

        var layout: Annotator.ILayoutOpts = {
            header: this.header,
            isFirstLine: true
        };

        if (godAction) {
            godAction();
        }

        // Get a context.

        // Contexts are iterators that hold information such as the current
        // beat, what accidentals have been set, and what accidentals are
        // present on other staffs.  Contexts are retrieved from snapshots
        // when modifying a line other than the first.
        var context = this.ctxFromSnapshot(pointerData, parts, assertionPolicy) ||
            new Annotator.Context(parts, layout, this, assertionPolicy);

        // Annotate the part.
        var location = {
            bar: context.lines ? context.lines[context.line].bar : 1,
            beat: context.lines ? context.lines[context.line].beat : 0
        };

        var result = context.annotate(location, cursor, disableRecording, this._dispatcher);

        if (ScoreStoreStore.PROFILER_ENABLED) {
            console.log("I broke the profiler");
            // console.log("ops:", result.operations, "\tbody:", part.body.length, "\tscore:",
            //     (Math.round(result.operations / part.body.length * 100) / 100));
        }

        if (!result.skip) {
            this._ctx = context;
        }

        if (ScoreStoreStore.PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }

        return result;
    }

    private _clear() {
        this._activeStaveIdx = null;
        this._voices = null;
        this._header = null;
        this._visualCursorIs({
            bar: 1,
            beat: 0
        });
    }

    private _handleAction = (action: C.IFluxAction<void>) => {
        assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
        var fn: Function = (<any>this)[action.description];
        if (fn) {
            fn.call(this, action);
        }
        return true; // (Success)
    };

    private _recreateSnapshot(line: number) {
        var lines: Array<any> = [];
        for (var i = 1; i <= line; ++i) {
            var sn: Annotator.ICompleteSnapshot = JSON.parse(this._snapshots[i]);
            lines.push(sn.prevLine);
            if (i === line) {
                lines.push(sn.partialLine);
                sn.lines = lines;
                return sn;
            }
        }
    }

    private _reparse(src: string, profile?: boolean) {
        if (profile) {
            console.time("Parse source");
        }

        assert(false, "Fix voice & parts");
        var song = ScoreStoreStore.parse(src);
        this._header = song.header;
        this._voices = song.voices;

        for (var i = 0; i < this._voices.length; ++i) {
            if (this._voices[i].body) {
                this._activeStaveIdx = i;
            }
        }

        var origPE = ScoreStoreStore.PROFILER_ENABLED;

        if (profile) {
            console.timeEnd("Parse source");
            ScoreStoreStore.PROFILER_ENABLED = true;
        }

        var res = this._annotate(null, null, null, null, true, null, Annotator.AssertionPolicy.NoAssertions);

        if (profile) {
            ScoreStoreStore.PROFILER_ENABLED = origPE;
        }
        return res;
    }

    private _stepCursor(spec: ScoreStoreStore.IStepCursorSpec) {
        if (!this._visualCursor || !this._visualCursor.annotatedObj) {
            return;
        }
        var sign = spec.step > 0 ? 1 : -1;
        var steps = spec.step;
        var idx = this._visualCursor.annotatedObj.idx;
        var voices = this._voices;
        var iterations = 0;

        var page = this._visualCursor.annotatedPage;
        var voice = 0;
        var line = this._visualCursor.annotatedLine;

        while(steps && voices[voice].body[idx += sign]) {
            var priority = voices[voice].body[idx].priority;
            var visible = false;
            for (var i = 0; !visible && i < voices.length; ++i) {
                visible = visible || !!voices[i].body[idx].visible;
            }

            if (!visible) {
                // Nothing to do.
            } else if (priority === C.Type.Duration) {
                steps -= sign;
            } else if (!spec.skipDurationlessContent) {
                // Skip to the end of the duration-less content!
                while (voices[voice].body[idx] && voices[voice].body[idx].priority !== C.Type.Duration &&
                        voices[voice].body[idx].priority !== C.Type.EndMarker) {
                    if (voices[voice].body[idx].type === C.Type.NewPage) {
                        page += sign;
                    }
                    if (voices[voice].body[idx].type === C.Type.NewLine) {
                        line += sign;
                    }
                    idx += sign;
                    ++iterations;
                }
                break;
            }
            ++iterations;
        }

        var obj = voices[voice].body[idx];
        if (!obj) {
            if (sign === 1 && spec.loopThroughEnd) {
                this._visualCursor = {
                    bar: 0,
                    beat: 0,
                    endMarker: false,
                    annotatedObj: voices[voice].body[0],
                    annotatedLine: line,
                    annotatedPage: page,
                    annotatedStave: voice
                };
                this._stepCursor({step: 1});
            }
            return;
        }
        for (var i = 1; obj.placeholder && i < voices.length; ++i) {
            obj = voices[i].body[idx];
        }
        this._visualCursor = {
            bar: obj.ctxData.bar,
            beat: obj.ctxData.beat,
            endMarker: obj.priority <= C.Type.EndMarker,
            annotatedObj: obj,
            annotatedLine: 0,
            annotatedPage: page,
            annotatedStave: voice
        };
    }

    private _visualCursorIs(visualCursor: C.IVisualCursor) {
        // Assign directly to keep references in tact.
        // Alternatively, Context could be updated with the updated
        // cursor.
        this._visualCursor.bar = visualCursor.bar;
        this._visualCursor.beat = visualCursor.beat;
        this._visualCursor.endMarker = visualCursor.endMarker;
        this._visualCursor.annotatedObj = null;
        this._visualCursor.annotatedLine = null;
        this._visualCursor.annotatedPage = null;
        this._visualCursor.annotatedStave = null;
    }

    private _activeStaveIdx:            number                      = NaN;
    private _ctx:                       Annotator.Context           = null;
    private _dirty:                     boolean                     = false;
    private _dispatcher:                C.IDispatcher               = null;
    private _linesToUpdate:             { [key: string]: boolean }  = {};

    // Staves, voices, and parts - components of a song
    // ------------------------------------------------

    /**
     * Staves, voices, and voices are all distinct concepts. A part is usually one instrument.
     * There is a one-to-many relation between parts and voices, as well as between parts and
     * staves. Staves of a single part are grouped together.
     */
    private _parts:                     C.IPart[]                   = null;

    /**
     * Staves, voices, and parts are all distinct concepts. A staff is a physical staff. There
     * is a many-to-many relationship between voices and staves. A voice can technically occupy
     * multiple staves at the same time, but this isn't supported yet.
     */
    // Modeled in C.IPart.

    /**
     * Staves, voices, and parts are all distinct concepts. A voice is a monotonic time-stream
     * of Models. A voice can "switch" staves, but it must remain in the same part.
     */
    private _voices:                    C.IVoice[]                  = null;

    private _header:                    C.ScoreHeader               = null;

    private _snapshots:                 { [key: string]: any }      = {};
    private _visualCursor:              C.IVisualCursor             = defaultCursor;
}

var defaultCursor = {
    bar: 1,
    beat: 0,
    endMarker: <boolean> null,
    annotatedObj: <Model> null,
    annotatedLine: <number> null,
    annotatedPage: <number> null
};

module ScoreStoreStore {
    "use strict";
    export interface IStepCursorSpec {
        step: number;
        loopThroughEnd?: boolean;
        skipDurationlessContent?: boolean;
    }
}

export = ScoreStoreStore;
