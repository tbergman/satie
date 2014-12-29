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
import Instruments       = require("./instruments");
import Model             = require("./model");

   var isBrowser         = typeof window !== "undefined";

/**
 * Flux store for a MusicXML song.
 */
class SongEditorStore extends TSEE implements C.ISongEditor, C.IApi {
    constructor(dispatcher: C.IDispatcher) {
        super();
        dispatcher.register(this._handleAction);

        this._dispatcher = dispatcher;

        global.SongEditor = this;
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
    get header() {
        return this._header; }
    get src() {
        return "RIPMUS0," + JSON.stringify({
            parts: this._parts,
            header: this._header
        });
    }
    get visualCursor() {
        return this._visualCursor; }

    ////////////////////
    // STAVE MUTATORS // 
    ////////////////////

    ctxFromSnapshot(pointerData: C.IPointerData, parts: Array<C.IPart>, assertionPolicy: Annotator.AssertionPolicy): Annotator.Context {
        var i: number;

        if (!pointerData) {
            return null;
        }

        if (pointerData && this._snapshots[pointerData.musicLine]) {
            var ctx = new Annotator.Context(parts, {
                header: this.header,
                snapshot: this._recreateSnapshot(pointerData.musicLine)
            }, this, assertionPolicy);
            for (i = 0; i < parts.length; ++i) {
                this._linesToUpdate[i + "_" + ctx.line] = true;
            }
            return ctx;
        } else {
            // We don't store snapshots for the 0th line, but we still need
            // to force it to be re-rendered.
            for (i = 0; i < parts.length; ++i) {
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
        if (!this._parts) {
            return;
        }
        for (var i = 0; i < this._parts.length; ++i) {
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

    static parse(src: string): { parts: Array<C.IPart>; header: C.ScoreHeader; } {
        var song: { header: C.ScoreHeader; parts: Array<C.IPart>; } = null;

        if (src.length && src.substr(0, 8) === "RIPMUS0,") {
            // Ripieno native
            var songJson = JSON.parse(src.substring(8));
            song = {
                parts: [],
                header: new C.ScoreHeader(songJson.header)
            };
            for (var i = 0; i < songJson.parts.length; ++i) {
                song.parts.push({
                    body: [],
                    instrument: songJson.parts[i].instrument || Instruments.List[0]
                });
                var body = songJson.parts[i].body;
                if (body) {
                    for (var j = 0; j < body.length; ++j) {
                        song.parts[i].body[j] = Model.fromJSON(body[j]);
                    }
                    for (var j = 0; j < body.length; ++j) {
                        song.parts[i].body[j].modelDidLoad(song.parts[i].body, j);
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

    static extractMXMLParts(m: C.MusicXML.ScoreTimewise): C.IPart[] {
        var idxToPart: {[key: number]: string} = {};

        var partCount = 0;
        _.forEach(m.partList.scoreParts, (part, idx) => {
            idxToPart[partCount++] = part.id;
        });

        var partToIdx = _.invert(idxToPart);

        assert(partCount, "At least one part is needed.");

        var parts: C.IPart[] = _.times(partCount, () => new Object({
                instrument: Instruments.List[0],
                body: <Model[]> [new BeginModel({}, true)]
            }));

        var mxmlClassToType: {[key: string]: C.Type} = {
            "Note": C.Type.Duration,
            "Attributes": C.Type.Attributes,
            "Barline": C.Type.Barline
        };

        // Hackily convert MXMLJSON types to Models
        // Note that the caller should not be able to detect any mutation
        // (aside from object property ordering, which is always undefined)
        _.forEach(m.measures, (measure, measureIdx) => {
            var minPriority: number;
            var idxPerPart = _.map(parts, part => 0);
            do {
                // Constraint: all parts at a given index have the same type. We add placeholders
                // so that this is true.
                var elements: any[]         = _.map(measure.parts, (p, partID) => p[idxPerPart[partToIdx[partID]]] || <any> {});
                var priorities              = _.map(elements, element => mxmlClassToType[<string>element._class] || C.MAX_NUM);
                minPriority                 = _.min(priorities);

                _.forEach(elements, (element, partIdx) => {
                    if (mxmlClassToType[element._class] === minPriority) {
                        if (minPriority === C.Type.Duration) {
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
                        parts[partIdx].body.push(Model.fromJSON(element));
                        element._class = _class;
                        delete element._;

                        ++idxPerPart[partIdx];
                    } else {
                    }
                });

            } while(minPriority !== C.MAX_NUM);

            if (measureIdx !== m.measures.length - 1) { 
                for (var i = 0; i < partCount; ++i) {
                    parts[i].body.push(new BarlineModel({
                        barStyle: {
                            data: C.MusicXML.BarStyleType.Regular
                        }
                    }, true));
                }
            }
        });

        // Call model hooks
        _.forEach(parts, part => {
            _.forEach(part.body, (model, j) => {
                model.modelDidLoad(part.body, j);
            });
        });

        return parts;
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

        this._header            = SongEditorStore.extractMXMLHeader(mxml);
        this._parts             = SongEditorStore.extractMXMLParts(mxml);

        Annotator.recordMetreData(this._parts);

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

    "PUT /webapp/visualCursor/step"(action: C.IFluxAction<SongEditorStore.IStepCursorSpec>) {
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

    "PUT /webapp/instrument"(action: C.IFluxAction<{instrument: C.IInstrument; part: C.IPart}>) {
        var instrument: C.IInstrument = action.postData.instrument;
        var part: C.IPart = action.postData.part;

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
            parts: Array<C.IPart>,
            profile: boolean,
            disableRecording: boolean,
            godAction?: Function,
            assertionPolicy?: Annotator.AssertionPolicy) {

        assertionPolicy = isNaN(assertionPolicy) ? Annotator.AssertionPolicy.Strict : assertionPolicy;

        parts = parts || this._parts;

        if (SongEditorStore.PROFILER_ENABLED) {
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

        if (SongEditorStore.PROFILER_ENABLED) {
            console.log("I broke the profiler");
            // console.log("ops:", result.operations, "\tbody:", part.body.length, "\tscore:",
            //     (Math.round(result.operations / part.body.length * 100) / 100));
        }

        if (!result.skip) {
            this._ctx = context;
        }

        if (SongEditorStore.PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }

        return result;
    }

    private _clear() {
        this._activeStaveIdx = null;
        this._parts = null;
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

        var song = SongEditorStore.parse(src);
        this._header = song.header;
        this._parts = song.parts;

        for (var i = 0; i < this._parts.length; ++i) {
            if (this._parts[i].body) {
                this._activeStaveIdx = i;
            }
        }

        var origPE = SongEditorStore.PROFILER_ENABLED;

        if (profile) {
            console.timeEnd("Parse source");
            SongEditorStore.PROFILER_ENABLED = true;
        }

        var res = this._annotate(null, null, null, null, true, null, Annotator.AssertionPolicy.NoAssertions);

        if (profile) {
            SongEditorStore.PROFILER_ENABLED = origPE;
        }
        return res;
    }

    private _stepCursor(spec: SongEditorStore.IStepCursorSpec) {
        if (!this._visualCursor || !this._visualCursor.annotatedObj) {
            return;
        }
        var sign = spec.step > 0 ? 1 : -1;
        var steps = spec.step;
        var idx = this._visualCursor.annotatedObj.idx;
        var parts = this._parts;
        var iterations = 0;

        var page = this._visualCursor.annotatedPage;
        var part = 0;
        var line = this._visualCursor.annotatedLine;

        while(steps && parts[part].body[idx += sign]) {
            var priority = parts[part].body[idx].priority;
            var visible = false;
            for (var i = 0; !visible && i < parts.length; ++i) {
                visible = visible || !!parts[i].body[idx].visible;
            }

            if (!visible) {
                // Nothing to do.
            } else if (priority === C.Type.Duration) {
                steps -= sign;
            } else if (!spec.skipDurationlessContent) {
                // Skip to the end of the duration-less content!
                while (parts[part].body[idx] && parts[part].body[idx].priority !== C.Type.Duration &&
                        parts[part].body[idx].priority !== C.Type.EndMarker) {
                    if (parts[part].body[idx].type === C.Type.NewPage) {
                        page += sign;
                    }
                    if (parts[part].body[idx].type === C.Type.NewLine) {
                        line += sign;
                    }
                    idx += sign;
                    ++iterations;
                }
                break;
            }
            ++iterations;
        }

        var obj = parts[part].body[idx];
        if (!obj) {
            if (sign === 1 && spec.loopThroughEnd) {
                this._visualCursor = {
                    bar: 0,
                    beat: 0,
                    endMarker: false,
                    annotatedObj: parts[part].body[0],
                    annotatedLine: line,
                    annotatedPage: page,
                    annotatedStave: part
                };
                this._stepCursor({step: 1});
            }
            return;
        }
        for (var i = 1; obj.placeholder && i < parts.length; ++i) {
            obj = parts[i].body[idx];
        }
        this._visualCursor = {
            bar: obj.ctxData.bar,
            beat: obj.ctxData.beat,
            endMarker: obj.priority <= C.Type.EndMarker,
            annotatedObj: obj,
            annotatedLine: 0,
            annotatedPage: page,
            annotatedStave: part
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
    private _parts:                     C.IPart[]                   = null;
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

module SongEditorStore {
    "use strict";
    export interface IStepCursorSpec {
        step: number;
        loopThroughEnd?: boolean;
        skipDurationlessContent?: boolean;
    }
}

export = SongEditorStore;
