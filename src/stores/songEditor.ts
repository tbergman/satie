/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import Collab = require("./collab");
import Annotator = require("./annotator");
import Instruments = require("./instruments");
import Model = require("./model");
import Tool = require("./tool");
import TSEE = require("./tsee");
import lylite = require("./lylite");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

import PlaybackStore = require("./playback"); // must be registered before SongEditorStore!!!

var isBrowser = typeof window !== "undefined";
var CHANGE_EVENT = "change";
var ANNOTATE_EVENT = "annotate";
var HISTORY_EVENT = "history";
var CLEAR_HISTORY_EVENT = "clearHistory";

var USING_LEGACY_AUDIO = PlaybackStore.USING_LEGACY_AUDIO;

/**
 * Flux store for the song being edited.
 * 
 * [DELETE | GET |        |      | PUT] /api/v0/song
 * 
 * [DELETE |     |        |      | PUT] /local/modal/autosave
 * [DELETE |     |        |      | PUT] /local/modal/copy
 * [DELETE |     |        |      | PUT] /local/modal/export
 * [DELETE |     |        |      | PUT] /local/modal/metadata
 * [DELETE |     |        |      | PUT] /local/modal/part
 * [DELETE |     |        |      | PUT] /local/modal/social
 * 
 * [DELETE |     |        | POST |    ] /local/selection
 * [DELETE |              |      |    ] /local/selection/contents
 * 
 * [       |     | PATCH  |      | ---] /local/song
 * [DELETE |     |        |      | PUT] /local/song/dirty*
 * [       |     |        |      | PUT] /local/song/forceUpdate*
 * [       |     |        |      | PUT] /local/song/hmargin/increase
 * [       |     |        |      | PUT] /local/song/hmargin/decrease
 * [       |     |        |      | PUT] /local/song/indent/increase
 * [       |     |        |      | PUT] /local/song/indent/decrease
 * [DELETE |     |        |      | PUT] /local/song/lineDirty*
 * [                      |      | PUT] /local/song/pageSize
 * [DELETE |     |        |      | PUT] /local/song/show
 * [       |     |        |      | PUT] /local/song/src
 * [       |     |        |      | PUT] /local/song/transpose
 * 
 * [       |     |        |      | PUT] /local/staveHeight/larger
 * [       |     |        |      | PUT] /local/staveHeight/smaller
 * 
 * [DELETE |     |        |      | PUT] /local/tool
 * [       |     |        |      | PUT] /local/tool/action
 * [DELETE |     |        |      | PUT] /local/tool/preview
 * 
 * [DELETE |     |        |      | PUT] /local/visualCursor
 *               |        |      |  ^^    {bar: number, beat: number}
 *               |        |      |  or    {step: -1 | 1}
 * [DELETE |     |        |      | PUT] /local/visualCursor/after
 * [             |        |      | PUT] /local/visualCursor/before/octave
 * 
 * [       |     |        |      | PUT] /local/instrument
 */
class SongEditorStore extends TSEE implements C.ISongEditor {
    constructor(dispatcher: C.IDispatcher, session: C.ISessionStore) {
        super();
        dispatcher.register(this._handleAction.bind(this));

        this._dispatcher = dispatcher;
        this._session = session;

        this._clear();
        this._ping();
    }

    ///////////////////
    // SUBSCRIPTIONS // 
    ///////////////////

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

    /////////////////////////////////
    // PROPERTIES AND DERIVED DATA // 
    /////////////////////////////////

    get autosaveModalVisible() {
        return this._autosaveModalVisible; }
    get beamStartBeat(): number {
        return this._beamStartBeat; }
    get changesPending() {
        return this._changesPending; }

    set changesPending(pending: boolean) {
        assert(pending === true, "Only SongEditor can clear pending changes");
        this._allChangesSent = false;
        this._throttledAutosave();
        this._changesPending = pending;
    }

    get copyModalVisible() {
        return this._copyModalVisible; }
    get dirty() {
        return this._dirty; }

    get dragonAudio(): Array<string> {
        var staves = this.staves;
        var request: Array<string> = [];
        for (var h = 0; h < staves.length; ++h) {
            if (!staves[h].body) {
                continue;
            }
            var body = staves[h].body;
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;

            var ctx = new Annotator.Context(staves, {
                indent: 0
            }, this);

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

    get exportModalVisible() {
        return this._exportModalVisible; }
    get finalCtx(): Annotator.Context {
        return this._ctx; }
    getLineDirty(idx: number, h: number) {
        return this._linesToUpdate[h + "_" + idx]; }

    get ly() {
        var staves = this._staves;

        var lyliteArr: Array<string> = [];
        var unresolved: Array<(obj: Model) => boolean> = [];
        var inPianoStaff = false;
        _.each(staves, (stave, sidx) => {
            if (stave.body) {
                if (inPianoStaff) {
                    lyliteArr.push("{");
                } else if (stave.pianoStaff) {
                    lyliteArr.push("\\new PianoStaff << {\n");
                } else {
                    lyliteArr.push("\\new Staff {\n");
                }
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
                if (stave.pianoStaff) {
                    inPianoStaff = true;
                } else if (inPianoStaff) {
                    lyliteArr.push(">>");
                    inPianoStaff = false;
                }
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

    get metadataModalVisible() {
        return this._metadataModalVisible; }
    get pageSize() {
        return this._pageSize; }
    get paper() {
        return this._paper; }
    get partModalStave() {
        return this._partModalStave; }
    get selection() {
        return this._selection; }
    get socialModalVisible() {
        return this._socialModalVisible; }
    get staveHeight() {
        return this._staveHeight; }
    get staves() {
        return this._staves; }
    get src() {
        return JSON.stringify(this._staves); }
    get tool() {
        return this._tool; }
    get visualCursor() {
        return this._visualCursor; }

    ////////////////////
    // STAVE MUTATORS // 
    ////////////////////

    ctxFromSnapshot(pointerData: C.IPointerData, staves: Array<C.IStave>): Annotator.Context {
        var i: number;

        if (!pointerData) {
            return null;
        }

        if (pointerData && this._snapshots[pointerData.musicLine]) {
            var ctx = new Annotator.Context(staves, {
                indent: 15, // FIXME
                snapshot: this._recreateSnapshot(pointerData.musicLine)
            }, this);
            for (i = 0; i < staves.length; ++i) {
                this._linesToUpdate[i + "_" + ctx.line] = true;
            }
            return ctx;
        } else {
            // We don't store snapshots for the 0th line, but we still need
            // to force it to be re-rendered.
            for (i = 0; i < staves.length; ++i) {
                this._linesToUpdate[i + "_0"] = true;
            }
        }
    }

    /**
     * Should not be any different than going through dispatcher,
     * but skips checks and routing to save time and attain 60 Hz.
     */
    dangerouslyHidePreview = this["DELETE /local/tool/preview"].bind(this);

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

    dangerouslyMarkRendererLineClean = this["DELETE /local/song/lineDirty"].bind(this);

    /**
     * Marks a specific line as dirty.
     * To be called by the Annotator.
     */
	dangerouslyMarkRendererLineDirty(line: number) {
	    // Mark a given line as dirty
	    // NOT a Flux method.
	    if (!this._staves) {
	        return;
	    }
	    for (var i = 0; i < this._staves.length; ++i) {
	        this._linesToUpdate[i + "_" + line] = true;
	    }
	}

    /**
     * Sets the current visual cursor.
     * To be called by the Annotator.
     */
    dangerouslySetVisualCursor: (visualCursor: C.IVisualCursor) => void = this._visualCursorIs.bind(this);

    /**
     * Sets the start beat of the current or previous beam.
     * To be called by the Annotator.
     */
    dangerouslySetBeamStartBeat: (beamCount: number) => void = this._setBeamStartBeat.bind(this);

    /**
     * Goes forwards or backwards by a step.
     * To be called by the Annotator.
     * @param spec {step: 1 | -1}
     */
    dangerouslyStepCursor: (spec: any) => boolean = this._stepCursor.bind(this);

    /**
     * Should not be any different than going through dispatcher,
     * but skips checks and routing to save time and attain 60 Hz.
     */
    dangerouslyShowPreview = this["PUT /local/tool/action"].bind(this);

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

    static parse(src: string): Array<C.IStave> {
        var staves: Array<C.IStave> = null;
        if (src.length && src[0] === "[") {
            staves = JSON.parse(src);
            for (var i = 0; i < staves.length; ++i) {
                var body = staves[i].body;
                if (body) {
                    body.instrument = Instruments.List[0];
                    for (var j = 0; j < body.length; ++j) {
                        body[j] = Model.fromJSON(body[j]);
                    }
                }
                if (staves[i].paper) {
                    staves[i].paper = new C.Paper(staves[i].paper);
                }
            }
        } else {
            staves = lylite.parse(src);
        }
        return staves;
    }

    static PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;

    //////////////////
    // FLUX METHODS // 
    //////////////////

    "GET /api/v0/song"(action: C.IFluxAction) {
        var activeSong = this._session.activeSong;
        if (USING_LEGACY_AUDIO) {
            _.defer(() => {
                this._dispatcher.POST("/api/v0/synth", {
                    data: this.dragonAudio,
                    cb: "" + ++PlaybackStore.latestID,
                    forExport: true
                });
            });
        }
        if (activeSong !== this._prevActiveSong) {
            this.dangerouslyMarkRendererDirty();
            this._clear();
            this._prevActiveSong = activeSong;
            this._reparse(activeSong.src);
            this._activatePeerRelay(activeSong._id);
            this.emit(CHANGE_EVENT);
            this.emit(ANNOTATE_EVENT);
        }

        _.each(this.staves, (stave: C.IStave) => {
            if (stave.body) {
                var instrument: C.IInstrument = stave.body.instrument;
                this.ensureSoundfontLoaded(instrument.soundfont, /*avoidEvent*/ true);
            }
        });
        this.emit(CLEAR_HISTORY_EVENT);
    }

    "PUT /api/v0/song"(action: C.IFluxAction) {
        var activeSong: C.ISong = this._session.activeSong;
        var activeID: string = activeSong ? activeSong._id : null;
        if (action.resource === activeID) {
            this._savesInTransit++;
        }
        this._allChangesSent = true;
    } // Continued...

    "PUT /api/v0/song DONE"(action: C.IFluxAction) {
        var activeSong = this._session.activeSong;
        var activeID = activeSong ? activeSong._id : null;
        if (action.resource === activeID) {
            this._savesInTransit--;
            assert(this._savesInTransit >= 0);
            if (!this._savesInTransit && this._allChangesSent) {
                this._changesPending = false;
            }
        }
    }

    "PUT /api/v0/song ERROR"(action: C.IFluxAction) {
        alert("Could not save changes. Check your Internet connection.");
        var activeSong = this._session.activeSong;
        var activeID = activeSong ? activeSong._id : null;
        if (action.resource === activeID) {
            this._savesInTransit--;
        }
        this.changesPending = true;
    }

    "PUT /local/modal/autosave"(action: C.IFluxAction) {
        this._autosaveModalVisible = true;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/autosave"(action: C.IFluxAction) {
        this._autosaveModalVisible = false;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/modal/copy"(action: C.IFluxAction) {
        this._copyModalVisible = true;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/copy"(action: C.IFluxAction) {
        this._copyModalVisible = false;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/modal/export"(action: C.IFluxAction) {
        this._exportModalVisible = true;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/export"(action: C.IFluxAction) {
        this._exportModalVisible = false;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/modal/metadata"(action: C.IFluxAction) {
        this._metadataModalVisible = true;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/metadata"(action: C.IFluxAction) {
        this._metadataModalVisible = false;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/modal/part"(action: C.IFluxAction) {
        this._partModalStave = action.postData;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/part"(action: C.IFluxAction) {
        this._partModalStave = null;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/modal/social"(action: C.IFluxAction) {
        this._socialModalVisible = true;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/social"(action: C.IFluxAction) {
        this._socialModalVisible = false;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/selection"(action: C.IFluxAction) {
        this._selection = action.postData;
        this.dangerouslyMarkRendererDirty();
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/selection"(action: C.IFluxAction) {
        this._selection = null;
        this.dangerouslyMarkRendererDirty();
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/selection/contents" = this._eraseSelection;

    "PATCH /local/song"(action: C.IFluxAction) {
        var lines = Collab.patch(action.postData, this.staves[4].body); // XXX: MULTISTAVE
        _.each(lines, line => this.dangerouslyMarkRendererLineDirty(line));
        this._annotate(null, null, null, null, null, true);
        this.emit(ANNOTATE_EVENT);
    }

    "PUT /local/song/dirty"(action: C.IFluxAction) {
        this.dangerouslyMarkRendererDirty();
        // don"t emit.
    }

    "DELETE /local/song/dirty"(action: C.IFluxAction) {
        _.defer(() => {
            this.dangerouslyMarkRenderDone();
            // don"t emit.
        });
        // this._linesToUpdate[action.postData] = null; ?
    }

    "PUT /local/song/forceUpdate"(action: C.IFluxAction) {
        this._clear();
        var activeSong = this._session.activeSong;
        this._reparse(activeSong.src);
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/song/hmargin/increase"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        if (this._paper.leftMargin < 50) {
            this._paper.leftMargin += 1;
            this._paper.rightMargin += 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/hmargin/decrease"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        if (this._paper.leftMargin > -1) { // so it can go to -1
            this._paper.leftMargin -= 1;
            this._paper.rightMargin -= 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/indent/increase"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        if (this._paper.indent < 50) {
            this._paper.indent += 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/indent/decrease"(action: C.IFluxAction) {
        if (this._paper.indent > -1) { // so it can go to -1
            this._paper.indent -= 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/lineDirty"(action: C.IFluxAction) {
        this._linesToUpdate[action.postData] = true;
        // don"t emit.
    }

    "DELETE /local/song/lineDirty"(action: C.IFluxAction) {
        this._linesToUpdate[action.postData] = false;
        // don"t emit.
    }

    "PUT /local/song/pageSize"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        this._pageSize = action.postData;
        this.dangerouslyMarkRendererDirty();
        this._ctx = null;
        _.find(this._staves, s => s.pageSize).pageSize = this._pageSize;
        Model.removeAnnotations(this._staves);
        this._annotate(null, null, null, null, null, false); // XXX: collaboration
        this.emit(CHANGE_EVENT);
    }


    "PUT /local/song/show" = this["GET /api/v0/song"];

    "DELETE /local/song/show"(action: C.IFluxAction) {
        this._clear();
        this.emit(CHANGE_EVENT);
        this.emit(CLEAR_HISTORY_EVENT);
    }

    "PUT /local/song/src"(action: C.IFluxAction) {
        // XXX: create patches
        if (this._cleanupFn) {
            this._cleanupFn();
        }
        this._cleanupFn = null;
        this._reparse(action.postData);
        this.dangerouslyMarkRendererDirty();
        this.emit(CHANGE_EVENT);
        this.emit(ANNOTATE_EVENT);
    }

    "PUT /local/song/transpose"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        this._transpose(action.postData);
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/staveHeight/larger"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        var h = Math.round(this._staveHeight * 100) / 100;

        for (var i = renderUtil.rastalToHeight.length - 1; i >= 0; --i) {
            if (renderUtil.rastalToHeight[i] > h) {
                this._staveHeight = renderUtil.rastalToHeight[i];
                break;
            }
        }
        this.dangerouslyMarkRendererDirty();
        this._ctx = null;
        _.find(this._staves, s => s.staveHeight).staveHeight = this._staveHeight;
        this._everythingIsDirty();
    }

    "PUT /local/staveHeight/smaller"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        var h = Math.round(this._staveHeight * 100) / 100;
        for (var i = 0; i < renderUtil.rastalToHeight.length; ++i) {
            if (renderUtil.rastalToHeight[i] < h) {
                this._staveHeight = renderUtil.rastalToHeight[i];
                break;
            }
        }
        this.dangerouslyMarkRendererDirty();
        this._ctx = null;
        _.find(this._staves, s => s.staveHeight).staveHeight = this._staveHeight;
        this._everythingIsDirty();
    }

    "PUT /local/tool"(action: C.IFluxAction) {
        if (this._cleanupFn) {
            this._cleanupFn();
        }
        this._tool = action.postData;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/tool"(action: C.IFluxAction) {
        if (this._cleanupFn) {
            this._cleanupFn();
        }
        this._tool = null;
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/tool/action"(action: C.IFluxAction) {
        var isPreview = action.description.indexOf("preview") !== -1;
        var isAction = action.description.indexOf("action") !== -1;
        assert(isPreview && !isAction || !isPreview && isAction);

        if (this._cleanupFn) {
            this._cleanupFn();
        }
        if (isAction) {
            this.emit(HISTORY_EVENT);
        }
        if (isPreview) {
            this._cleanupFn = () => {
                this._cleanupFn = null;
                this._annotate(
                    action.postData.mouseData,
                    this._tool.hidePreview.bind(this._tool), null, null, null, true);
                this.emit(ANNOTATE_EVENT);
            };
        }
        this._annotate(
            action.postData.mouseData,
            action.postData.fn, null, null, null, isPreview);

        this.emit(ANNOTATE_EVENT);
    }

    "DELETE /local/tool/preview"(action: C.IFluxAction) {
        if (this._cleanupFn) {
            this._cleanupFn();
            this.emit(ANNOTATE_EVENT);
        }
    }

    "PUT /local/tool/preview" = this["PUT /local/tool/action"];

    "PUT /local/visualCursor"(action: C.IFluxAction) {
        // Simply move cursor
        if (action.postData.bar) {
            this._visualCursorIs(action.postData);
        } else if (action.postData.step) {
            this._stepCursor({
                step: action.postData.step,
                loopThroughEnd: action.postData.loopThroughEnd,
                skipThroughBars: action.postData.skipThroughBars
            });
        }
        this._annotate(null, null, null, null, null, true);
        this.emit(ANNOTATE_EVENT);
    }

    "DELETE /local/visualCursor"(action: C.IFluxAction) {
        this._visualCursor = null;
        this.emit(CHANGE_EVENT);
        this._annotate(null, null, null, null, null, true);
    }

    "PUT /local/visualCursor/after"(action: C.IFluxAction) {
        if (!this._tool) {
            return;
        }
        this.emit(HISTORY_EVENT);
        assert(this._visualCursor && this._visualCursor.annotatedObj);
        var prevObj: Model = null;
        var prevIdx: number;
        for (var h = 0; h < this._staves.length; ++h) {
            if (!this._staves[h].body) {
                continue;
            }
            // XXX: It's likely the developer will need to adjust this logic
            // for multiple staffs.
            for (var i = 0; i < this._staves[h].body.length; ++i) {
                if (this._staves[h].body[i] === this._visualCursor.annotatedObj) {
                    prevObj = this._staves[h].body[i - 1];
                    prevIdx = i - 1;
                    if (prevObj.type === C.Type.BEAM_GROUP) {
                        prevObj = this._staves[h].body[i - 2];
                    }
                }
            }
            if (action.postData === "dot") {
                var DotTool = require("./dotTool");
                var tmpTool = new DotTool();
                this._annotate(
                    {
                        obj: prevObj,
                        musicLine: this._visualCursor.annotatedLine,
                        idx: prevIdx,
                        staveIdx: this._activeStaveIdx
                    },
                    tmpTool.visualCursorAction(action.postData), null, null, null, false);
            } else {
                this._annotate(
                    {
                        obj: prevObj,
                        musicLine: this._visualCursor.annotatedLine,
                        idx: prevIdx,
                        staveIdx: this._activeStaveIdx
                    },
                    this._tool.visualCursorAction(action.postData), null, null, null, false);
            }
            this.emit(ANNOTATE_EVENT);
        }
    }

    "DELETE /local/visualCursor/after"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        // Remove the item directly before the context.
        for (var h = 0; h < this._staves.length; ++h) {
            // XXX: It's likely the developer will need to adjust this
            // logic to allow for multiple staffs.
            if (!this._staves[h].body) {
                continue;
            }
            for (var i = 0; i < this._staves[h].body.length; ++i) {
                if (this._staves[h].body[i] === this._visualCursor.annotatedObj) {
                    --i;
                    break;
                }
            }
            if (i === this._staves[h].body.length) {
                console.warn("Cursor not found");
                break;
            }
            while (i >= 0 && !this._staves[h].body[i].isNote &&
                this._staves[h].body[i].type !== C.Type.BARLINE) {
                --i;
            }
            var obj = this._staves[h].body[i];
            if (obj) {
                var line = this._visualCursor.annotatedLine;

                // Remove items based on a white-list.
                if (obj.isNote) {
                    // The stepCursor call above invalidates _visualCursor
                    // DO NOT CHECK _visualCursor HERE!!!
                    var EraseTool = require("./eraseTool"); // Recursive dependency.
                    var etool = new EraseTool(true);
                    this._annotate(
                        {
                            obj: obj,
                            musicLine: line,
                            idx: i,
                            staveIdx: this._activeStaveIdx
                        },
                        etool.splice.bind(etool, false),
                        null, null, null, false);
                } else {
                    this._annotate(null, null, null, null, null, false);
                    this._stepCursor({
                        step: -1,
                        skipThroughBars: false
                    });
                    this._annotate(null, null, null, null, null, false);
                }
                this.emit(ANNOTATE_EVENT);
            }
        }
    }

    "PUT /local/visualCursor/before/octave"(action: C.IFluxAction) {
        // TODO
    }

    "PUT /local/instrument"(action: C.IFluxAction) {
        var instrument: C.IInstrument = action.postData.instrument;
        var stave: C.IStave = action.postData.stave;

        this.ensureSoundfontLoaded(instrument.soundfont);

        this.emit(HISTORY_EVENT);
        stave.body.instrument = instrument;
        this.emit(CHANGE_EVENT);
    }

    /////////////
    // PRIVATE //
    /////////////

    private _activatePeerRelay(id: string) {
        if (!global.WebSocket) {
            return;
        }
        if (this._peerRelay) {
            assert(false, "Why?");
        }
        this._peerRelay = new WebSocket("ws://" + window.location.host +
            "/api/v0/song/_" + id + "/peerRelay");
        this._peerRelay.onmessage = this._handleRelayMessage.bind(this);
        // TODO : this._peerRelay.{onerror | onopen | onclose }
    }

    /**
     * Calls Context.anotate on each stave with a body
     */
    private _annotate(
            pointerData: C.IPointerData,
            toolFn: (obj: Model, ctx: Annotator.Context) => C.IterationStatus,
            staves: Array<C.IStave>,
            pageSize: C.IPageSize,
            profile: boolean,
            disableRecording: boolean,
            godAction?: Function) {

        staves = staves || this._staves;

        if (SongEditorStore.PROFILER_ENABLED) {
            console.time("annotate");
        }

        var oldBarKeys = Collab.getBarKeys(staves[4].body); // XXX: MULTISTAVE
        var cursor = this._visualCursor;

        if (!pointerData) {
            cursor.annotatedObj = null;
            cursor.annotatedLine = null;
            cursor.annotatedStave = null;
        }

        var layout: Annotator.ILayoutOpts = {
            top: y,
            fontSize: this.staveHeight,
            isFirstLine: true,
            pageSize: pageSize || this._pageSize,
            leftMargin: this._paper.leftMargin,
            rightMargin: this._paper.rightMargin,
            indent: this._paper.indent
        };

        if (godAction) {
            godAction();
        }

        // Records ctxData for every item.
        Annotator.recordMetreData(staves);

        // Get a context.

        // Contexts are iterators that hold information such as the current
        // beat, what accidentals have been set, and what accidentals are
        // present on other staffs.  Contexts are retrieved from snapshots
        // when modifying a line other than the first.
        var context = this.ctxFromSnapshot(pointerData, staves) || new Annotator.Context(staves, layout, this);

        var y = 0;
        for (var i = 0; i < staves.length; ++i) {
            if (staves[i].header) {
                y += renderUtil.getHeaderHeight(staves[i].header);
            }
        }

        // Annotate the stave.
        var location = {
            bar: context.lines ? context.lines[context.line].bar : 1,
            beat: context.lines ? context.lines[context.line].beat : 0
        };

        var customAction: Annotator.ICustomAction = {
            toolFn: toolFn,
            pointerData: pointerData
        };
        var result = context.annotate(location, customAction, cursor, disableRecording);

        if (result.patch && result.patch.length) {
            this._broadcastPatch(result.patch, oldBarKeys, Collab.getBarKeys(context.body));
        }

        y = result.resetY ? 0 : y;

        if (SongEditorStore.PROFILER_ENABLED) {
            console.log("I broke the profiler");
            // console.log("ops:", result.operations, "\tbody:", stave.body.length, "\tscore:",
            //     (Math.round(result.operations / stave.body.length * 100) / 100));
        }

        if (!result.skip) {
            this._ctx = context;
            y += 2.25;
        }

        if (SongEditorStore.PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }
    }

    private _broadcastPatch(diff: Array<string>, origBars: Array<string>, newBars: Array<string>) {
        diff = diff.filter(d => !!d);
        if (!diff.length) { return; }

        if (this._relayHistory.length > 6000) {
            this._relayHistory = this._relayHistory.substr(this._relayHistory.length - 6000);
        }

        var permission = this._session.apiRole === C.ApiRole.PRIMARY ? "[BROADCAST]" : "[REQUEST]";

        var msg = permission + "PATCH\n";
        msg += Collab.barKeysDiff(origBars, newBars) + "\n";
        msg += diff.join("") + "\n";
        if (this._session.apiRole === C.ApiRole.OFFLINE) {
            this._relayHistory += "Offline: " + msg;
        } else {
            this._relayHistory += "Sending: " + msg + "\n";
            this._peerRelay.send(msg);
        }
    }

    private _clear() {
        this._activeStaveIdx = null;
        if (this._peerRelay) {
            this._peerRelay.close();
            this._peerRelay = null;
        }
        this._staves = null;
        this._staveHeight = null;
        this._prevActiveSong = null;
        this._pageSize = null;
        this._paper = null;
        this._tool = null;
        this._selection = null;
        this._visualCursorIs({
            bar: 1,
            beat: 0
        });
    }

    private _everythingIsDirty() {
        Model.removeAnnotations(this._staves); // TODO: Should not be needed.
        this.dangerouslyMarkRendererDirty();
        this._annotate(null, null, null, null, null, false); // XXX: collaboration
        this.emit(CHANGE_EVENT);
    }

    private _eraseSelection() {
        this.emit(HISTORY_EVENT);

        var doAction = () => {
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
            this._selection = null;
            Model.removeAnnotations(this._staves);
        };

        this._annotate(null, null, null, null, null, false, doAction);
        this.dangerouslyMarkRendererDirty();
        this.emit(CHANGE_EVENT);
    }

    private _handleAction(action: C.IFluxAction) {
        assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
        var fn: Function = (<any>this)[action.description];
        if (fn) {
            fn.call(this, action);
        }
        return true; // (Success)
    }

    private _handleRelayMessage(msg: any) {
        if (global.localStorage && localStorage["superCowPowers"]) {
            if (this._relayHistory.length > 6000) {
                this._relayHistory = this._relayHistory.substr(this._relayHistory.length - 6000);
            }
            this._relayHistory += "Received: " + msg.data + "\n";
        }
        if (msg.data.indexOf("PATCH") === 0) {
            this._dispatcher.PATCH("/local/song", msg.data);
            return;
        }
        var parsed = JSON.parse(msg.data);

        if (parsed.newStatus) {
            this._dispatcher.PUT("/local/apiRole", parsed.newStatus);
        }
    }

    private _markLKG() {
        for (var i = 0; i < this.staves.length; ++i) {
            var body = this.staves[i].body;
            if (!body) {
                continue;
            }
            for (var j = 0; j < body.length; ++j) {
                if (body[j].type === C.Type.BARLINE) {
                    (<any>body[j]).markLKG(j, this.staves[i].body);
                }
            }
        }
    }

    private _ping() {
        if (this._peerRelay && this._peerRelay.readyState === WebSocket.OPEN) {
            this._peerRelay.send("");
        }
        _.delay(this._ping.bind(this), 128);
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

        this._staves = SongEditorStore.parse(src);
        C.addDefaults(this._staves);

        this._staveHeight = _.find(this._staves, s => s.staveHeight).staveHeight;
        this._pageSize = _.find(this._staves, s => s.pageSize).pageSize;
        this._paper = _.find(this._staves, s => s.paper).paper;

        for (var i = 0; i < this._staves.length; ++i) {
            if (this._staves[i].body) {
                this._activeStaveIdx = i;
            }
        }

        var origPE = SongEditorStore.PROFILER_ENABLED;

        if (profile) {
            console.timeEnd("Parse source");
            SongEditorStore.PROFILER_ENABLED = true;
        }

        this._annotate(null, null, null, null, null, true);
        this._markLKG();

        if (profile) {
            SongEditorStore.PROFILER_ENABLED = origPE;
        }
    }

    /**
     * Called at the beginning of every beam. Called so that if the annotator has
     * to be "backed up", it can do so without recalculating from the beginning
     * of the line.
     */
    private _setBeamStartBeat(beamCount: number) {
        this._beamStartBeat = beamCount;
    }

    private _stepCursor(spec: any) {
        if (!this._visualCursor || !this._visualCursor.annotatedObj) {
            return;
        }
        var obj = this._visualCursor.annotatedObj;
        var throughNewline = false;
        for (var h = 0; h < this._staves.length; ++h) {
            if (!this._staves[h].body) {
                continue;
            }
            for (var i = 0; i < this._staves[h].body.length; ++i) {
                if (this._staves[h].body[i] === obj) {
                    if ((!this._staves[h].body[i + 1] ||
                            this._staves[h].body[i + 1].type !== C.Type.BARLINE ||
                            this._staves[h].body[i + 1].barline === C.Barline.Double) &&
                            spec.loopThroughEnd) {
                        this._visualCursorIs({
                            beat: 0,
                            bar: 1
                        });
                        break;
                    }
                    var cd = this._staves[h].body[i].ctxData;
                    var throughBar = false;
                    while (this._staves[h].body[i += spec.step]) {
                        if (!this._staves[h].body[i]) {
                            break;
                        }
                        if (this._staves[h].body[i].type === C.Type.BARLINE) {
                            throughBar = true;
                        }
                        if (this._staves[h].body[i].type === C.Type.NEWLINE) {
                            // TODO: we don't need to update all the lines
                            throughNewline = true;
                            this.dangerouslyMarkRendererDirty();
                        }
                        if (this._visualCursor.endMarker &&
                            spec.step === 1) {
                            var last = this._staves[h].body[this._staves[h].body.length - 1];
                            assert(last.endMarker);
                            if (last.ctxData.bar !== this._visualCursor.bar) {
                                this._visualCursorIs({
                                    beat: 0,
                                    bar: this._visualCursor.bar + 1
                                });
                            }
                            break;
                        } else if (cd.bar !== this._staves[h].body[i].ctxData.bar ||
                            cd.beat !== this._staves[h].body[i].ctxData.beat) {

                            if (this._staves[h].body[i] && spec.step === -1 &&
                                    this._staves[h].body[i].ctxData.bar > 1 &&
                                    this._staves[h].body[i].ctxData.beat === 0 && spec.skipThroughBars) {
                                var tbar = this._staves[h].body[i].ctxData.bar;
                                while (this._staves[h].body[i].ctxData.bar === tbar) {
                                    if (this._staves[h].body[i].type === C.Type.NEWLINE) {
                                        // TODO: we don't need to update all the lines
                                        throughNewline = true;
                                        this.dangerouslyMarkRendererDirty();
                                    }
                                    --i;
                                }
                                this._visualCursorIs({
                                    bar: this._staves[h].body[i].ctxData.bar,
                                    beat: this._staves[h].body[i].ctxData.beat,
                                    endMarker: true });
                                break;
                            }

                            if (spec.skipThroughBars) {
                                while (this._staves[h].body[i + 1] &&
                                        (this._staves[h].body[i].endMarker ||
                                        this._staves[h].body[i].type === C.Type.BARLINE)) {
                                    i += spec.step;
                                }
                            }
                            this._visualCursorIs(
                                this._staves[h].body[i].ctxData);

                            // If we're walking through a bar, make up for that.
                            if (throughBar) {
                                if (spec.step < 0) {
                                    this._visualCursor.endMarker = true;
                                } else {
                                    this._visualCursor.beat = 0;
                                    this._visualCursor.bar++;
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

    private _throttledAutosave = _.throttle(() => {
        if (this._session.apiRole !== C.ApiRole.PRIMARY) {
            return;
        }

        var active = this._session.activeSong;
        if (active) {
            this._dispatcher.PUT("/api/v0/song/_" + active._id, { src: this.src });
        }
    }, (1000 * ((global.localStorage && global.localStorage.autosaveDelay) || 3)),
        { leading: false });

    private _transpose(how: any) { // TSFIX
        // The selection is guaranteed to be in song order.
        for (var staveIdx = 0; staveIdx < this._staves.length; ++staveIdx) {
            var lastIdx = 0;
            var body = this._staves[staveIdx].body;
            var accidentals: C.IAccidentals = null;

            if (!body) {
                continue;
            }

            _.each(this._selection, item => {
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
        this.dangerouslyMarkRendererDirty();
        this._selection = null;
        this._annotate(null, null, null, null, null, false);
        return true;
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

    private _activeStaveIdx: number;
    private _allChangesSent: boolean = true;
    private _autosaveModalVisible: boolean = false;
    private _beamStartBeat = 0;
    private _changesPending: boolean;
	private _cleanupFn: Function = null;
    private _copyModalVisible: boolean = false;
	private _ctx: Annotator.Context = null;
	private _dirty = false;
    private _dispatcher: C.IDispatcher;
    private _exportModalVisible: boolean = false;
	private _linesToUpdate: { [key: string]: boolean } = {};
    private _metadataModalVisible: boolean = false;
	private _pageSize: C.IPageSize = null;
	private _paper: C.Paper = null;
    private _partModalStave: C.IStave = null;
    private _peerRelay: WebSocket = null;
	private _prevActiveSong: C.ISong = null;
    private _relayHistory: string = "";
	private _savesInTransit: number = 0;
	private _selection: Array<Model> = null;
    private _session: C.ISessionStore;
	private _snapshots: { [key: string]: any } = {};
    private _socialModalVisible: boolean = false;
	private _staveHeight: number = null;
	private _staves: Array<C.IStave>;
	private _tool: Tool = null;
    private _visualCursor: C.IVisualCursor = {
        bar: 1,
        beat: 0,
        endMarker: <boolean> null,
        annotatedObj: <Model> null,
        annotatedLine: <number> null,
        annotatedPage: <number> null
    };
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require TSEE since we extend it. This line forces the require()
// line to not be optimized out.
TSEE.length;
/* tslint:enable */

export = SongEditorStore;