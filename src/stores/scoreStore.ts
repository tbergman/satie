/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import _                = require("lodash");
import assert           = require("assert");
import TSEE             = require("./tsee");

import Annotator        = require("./annotator");
import C                = require("./contracts");
import Instruments      = require("./instruments");
import Model            = require("./model");
import MXMLJSON         = require("./mxmljson");

   var isBrowser        = typeof window !== "undefined";

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

    /*---- Properties and derived data ----------------------------------------------------------*/

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

    /*---- Staff Mutators -----------------------------------------------------------------------*/

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

    dangerouslyMarkRendererLineClean: (action: C.IFluxAction<string>) => void =
        this["DELETE /webapp/song/lineDirty"].bind(this);

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

    /*---- Statics ------------------------------------------------------------------------------*/

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

    static PROFILER_ENABLED: boolean = isBrowser && global.location.search.indexOf("profile=1") !== -1;

    /*---- Store Methods ------------------------------------------------------------------------*/

    "DELETE /webapp/song/lineDirty"(action: C.IFluxAction<string>) {
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

        var score               = MXMLJSON.toScore(mxml);
        this._header            = score.header;
        this._parts             = score.parts;
        this._voices            = score.voices;

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

    /*---- Private ------------------------------------------------------------------------------*/

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
            division: context.lines ? context.lines[context.line].division : 0
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
            division: 0
        });
    }

    private _handleAction: (action: C.IFluxAction<void>) => boolean =
            (action: C.IFluxAction<void>) => {
        assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
        var fn: Function = (<any>this)[action.description];
        if (fn) {
            fn.call(this, action);
        }
        return true; // (Success)
    }

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
                    division: 0,
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
            division: obj.ctxData.division,
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
        this._visualCursor.division = visualCursor.division;
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
    division: 0,
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
