/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _ = require("lodash");
import assert = require("assert");
import TSEE = require("./tsee");

import Annotator = require("./annotator");
import C = require("./contracts");
import Collab = require("./collab");
import DurationModelType = require("./duration"); // Cyclic dependency. For types only.
import Instruments = require("./instruments");
import lylite = require("./lylite");
import History = require("./history");
import Model = require("./model");
import PlaybackStore = require("./playback");
import renderUtil = require("../util/renderUtil");
import StackableTool = require("./stackableTool");
import Tool = require("./tool");

var isBrowser = typeof window !== "undefined";
var CHANGE_EVENT = "change";
var ANNOTATE_EVENT = "annotate";
var HISTORY_EVENT = "history";
var CLEAR_HISTORY_EVENT = "clearHistory";
var MIDI_OUT_HINT = "midiOut";

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
 * [DELETE |     |        |      |    ] /local/selection/contents
 * 
 * [       |     | PATCH  |      | ---] /local/song
 * [DELETE |     |        |      | PUT] /local/song/dirty*
 * [       |     |        |      | PUT] /local/song/forceUpdate*
 * [       |     |        |      | PUT] /local/song/hmargin/increase
 * [       |     |        |      | PUT] /local/song/hmargin/decrease
 * [       |     |        |      | PUT] /local/song/indent/increase
 * [       |     |        |      | PUT] /local/song/indent/decrease
 * [DELETE |     |        |      | PUT] /local/song/lineDirty*
 * [       |     |        |      | PUT] /local/song/pageSize
 * [       |     |        |      | PUT] /local/song/undo
 * [       |     |        |      | PUT] /local/song/redo
 * 
 * [DELETE |     |        |      | PUT] /local/song/show
 * [       |     |        |      | PUT] /local/song/src
 * [       |     |        |      | PUT] /local/song/transpose
 * 
 * [       |     |        |      | PUT] /local/staveHeight/increase
 * [       |     |        |      | PUT] /local/staveHeight/decrease
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
        dispatcher.register(this._handleAction);

        this._dispatcher = dispatcher;
        this._session = session;

        global.SongEditor = this;
        this._clear();
        this._ping();
        this._history = new History(this._dispatcher, this);
    }

    destructor() {
        this._dispatcher.unregister(this._handleAction);
        this._history.destructor();
        this._clear();
        this._ping = (): void => undefined;
    }

    ///////////////////
    // SUBSCRIPTIONS // 
    ///////////////////

    addChangeListener(callback: any) {
        this.addListener(CHANGE_EVENT, callback); }

    addAnnotationListener(callback: any) {
        this.addListener(ANNOTATE_EVENT, callback); }

    addHistoryListener(callback: any) {
        this.addListener(HISTORY_EVENT, callback); }

    addClearHistoryListener(callback: any) {
        this.addListener(CLEAR_HISTORY_EVENT, callback); }

    addMidiHintListener(callback: (out: Array<number>) => void) {
        this.addListener(MIDI_OUT_HINT, callback); }

    removeChangeListener(callback: any) {
        this.removeListener(CHANGE_EVENT, callback); }

    removeAnnotationListener(callback: any) {
        this.removeListener(ANNOTATE_EVENT, callback); }

    removeHistoryListener(callback: any) {
        this.removeListener(HISTORY_EVENT, callback); }

    removeClearHistoryListener(callback: any) {
        this.removeListener(CLEAR_HISTORY_EVENT, callback); }

    removeMidiHintListener(callback: (out: Array<number>) => void) {
        this.removeListener(MIDI_OUT_HINT, callback); }

    /////////////////////////////////
    // PROPERTIES AND DERIVED DATA // 
    /////////////////////////////////

    get autosaveModalVisible() {
        return this._autosaveModalVisible; }
    get midiModalTab() {
        return this._midiModalTab; }
    get notationsSidebarVisible() {
        return this._notationsSidebarVisible; }
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
        var parts = this.parts;
        var request: Array<string> = [];
        for (var h = 0; h < parts.length; ++h) {
            if (!parts[h].body) {
                continue;
            }
            var body = parts[h].body;
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;

            var ctx = new Annotator.Context(parts, {
                indent: 0
            }, this, Annotator.AssertionPolicy.NoAssertions);

            for (var i = 0; i < body.length; ++i) {
                var obj = body[i];
                if (obj.type === C.Type.TimeSignature) {
                    ctx.timeSignature = <any> obj; // TSFIX
                } else if (obj.isNote && !obj.isRest) {
                    var note: C.IPitchDuration = <any> obj;
                    var beats = note.getBeats(ctx);
                    _.map(note.chord.map(C.NoteUtil.pitchToMidiNumber), midiNote => {
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
        return this._ly(false);
    }

    get testly() {
        return this._ly(true);
    }

    private _ly(debugMode: boolean) {
        return SongEditorStore.ly(debugMode, this.parts, this.header);
    }
    static ly(debugMode: boolean, parts: Array<C.IPart>, header: C.IHeader) {
        var lyliteArr: Array<string> = [];
        var unresolved: Array<(obj: Model) => boolean> = [];
        var inPianoStaff = false;

        if (!debugMode) {
            assert(header);
            lyliteArr.push("#(set-global-staff-size " +
                header.staveHeight * renderUtil.ptPerMM + ")\n");
            if (!header.pageSize.lilypondName) {
                alert("Custom sizes cannot currently be saved. (BUG)"); // XXX
                return;
            }
            lyliteArr.push("#(set-default-paper-size \"" +
                header.pageSize.lilypondName + "\")\n");
            lyliteArr.push("\\paper {");
            if (header.paper.leftMargin) {
                lyliteArr.push("left-margin=" + header.paper.leftMargin);
            }
            if (header.paper.rightMargin) {
                lyliteArr.push("right-margin=" + header.paper.rightMargin);
            }
            lyliteArr.push("}\n");

            lyliteArr.push("\\header {");
            if (header.title) {
                // XXX: XSS
                lyliteArr.push("title=\"" + header.title + "\"");
            }
            if (header.composer) {
                // XXX: XSS
                lyliteArr.push("composer=\"" + header.composer + "\"");
            }
            lyliteArr.push("}\n");
        }

        _.each(parts, (part, sidx) => {
            if (part.body) {
                if (!debugMode) {
                    if (inPianoStaff) {
                        lyliteArr.push("{");
                    } else if (part.pianoSystemContinues) {
                        lyliteArr.push("\\new PianoStaff << {\n");
                    } else {
                        lyliteArr.push("\\new Staff {\n");
                    }
                    lyliteArr.push("\\set Staff.midiInstrument = #\"" + part.instrument.lilypond + "\"");
                }

                var body = part.body;
                for (var i = 0; i < body.length; ++i) {
                    var obj = body[i];
                    obj.toLylite(lyliteArr, unresolved);
                    if (debugMode) {
                        if (body[i].placeholder) {
                            lyliteArr.push(":" + C.Type[body[i].priority]);
                        } else if (body[i].type === C.Type.EndMarker) {
                            lyliteArr.push("/$");
                        } else if (body[i].type === C.Type.NewLine) {
                            lyliteArr.push("/n");
                        }
                    }

                    for (var j = 0; j < unresolved.length; ++j) {
                        var ret: boolean = unresolved[j](obj);

                        if (ret) {
                            unresolved.splice(j, 1);
                            --j;
                        }
                    }
                }

                if (debugMode) {
                    lyliteArr.push("###");
                } else {
                    lyliteArr.push("}\n");
                }
                if (part.pianoSystemContinues) {
                    inPianoStaff = true;
                } else if (inPianoStaff && !debugMode) {
                    lyliteArr.push(">>");
                    inPianoStaff = false;
                }
            }
        });
        var lyliteStr = lyliteArr.join(" ");
        if (debugMode) {
            return lyliteStr.split("\n").join("");
        }
        return lyliteStr;
    }

    get metadataModalVisible() {
        return this._metadataModalVisible; }
    get pageSize() {
        return this.header ? this.header.pageSize : null; }
    get paper() {
        return this.header ? this.header.paper : null; }
    get partModalStave() {
        return this._partModalStave; }
    get selection() {
        return this._selection; }
    get socialModalVisible() {
        return this._socialModalVisible; }
    get staveHeight() {
        return this.header ? this.header.staveHeight : null; }
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
    get tool() {
        if (!this._tool) {
            this._tool = new Tool.Null;
        }
        return this._tool; }
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
                indent: 15, // FIXME
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

    static parse(src: string): { parts: Array<C.IPart>; header: C.IHeader; } {
        var song: { header: C.IHeader; parts: Array<C.IPart>; } = null;
        if (src.length && src.substr(0, 8) === "RIPMUS0,") {
            // Ripieno native
            song = JSON.parse(src.substring(8));
            for (var i = 0; i < song.parts.length; ++i) {
                var body = song.parts[i].body;
                if (body) {
                    if (!song.parts[i].instrument) {
                        song.parts[i].instrument = Instruments.List[0];
                    }

                    for (var j = 0; j < body.length; ++j) {
                        body[j] = Model.fromJSON(body[j]);
                    }
                    for (var j = 0; j < body.length; ++j) {
                        body[j].modelDidLoad(body, j);
                    }
                }
            }
        } else {
            // Lilypond!
            song = lylite.parse(src);
            Annotator.Context.insertPlaceholders(song.parts);
        }
        if (song.header) {
            song.header.composerHovered = song.header.titleHovered = false;
            if (song.header.paper) {
                song.header.paper = new C.Paper(song.header.paper);
            }
        }
        return song;
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
                     forExport: false
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

        _.each(this.parts, (part: C.IPart) => {
            if (part.body) {
                var instrument: C.IInstrument = part.instrument;
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

    "PUT /local/sidebar/notations"(action: C.IFluxAction) {
        this._notationsSidebarVisible = true;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/sidebar/notations"(action: C.IFluxAction) {
        this._notationsSidebarVisible = false;
        this.emit(CHANGE_EVENT);
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

    "PUT /local/modal/midi"(action: C.IFluxAction) {
        this._midiModalTab = <number> action.postData;
        this.emit(CHANGE_EVENT);
    }

    "DELETE /local/modal/midi"(action: C.IFluxAction) {
        this._midiModalTab = null;
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
        var lines = Collab.patch(action.postData, this.parts[0].body); // XXX: MULTISTAVE
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
        if (this.header.paper.leftMargin < 50) {
            this.header.paper.leftMargin += 1;
            this.header.paper.rightMargin += 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/hmargin/decrease"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        if (this.header.paper.leftMargin > -1) { // so it can go to -1
            this.header.paper.leftMargin -= 1;
            this.header.paper.rightMargin -= 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/indent/increase"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        if (this.header.paper.indent < 50) {
            this.header.paper.indent += 1;
        }
        this._everythingIsDirty();
    }

    "PUT /local/song/indent/decrease"(action: C.IFluxAction) {
        if (this.header.paper.indent > -1) { // so it can go to -1
            this.header.paper.indent -= 1;
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
        this.header.pageSize = action.postData;
        this.dangerouslyMarkRendererDirty();
        this._ctx = null;
        this.header.pageSize = this.header.pageSize;
        Model.removeAnnotations(this._parts);
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

    "PUT /local/song/undo"(action: C.IFluxAction) {
        this._history.undo();
    }

    "PUT /local/song/redo"(action: C.IFluxAction) {
        this._history.redo();
    }

    "PUT /local/staveHeight/increase"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        var h = Math.round(this.header.staveHeight * 100) / 100;

        for (var i = renderUtil.rastalToHeight.length - 1; i >= 0; --i) {
            if (renderUtil.rastalToHeight[i] > h) {
                this.header.staveHeight = renderUtil.rastalToHeight[i];
                break;
            }
        }
        this.dangerouslyMarkRendererDirty();
        this._ctx = null;
        this.header.staveHeight = this.header.staveHeight;
        this._everythingIsDirty();
    }

    "PUT /local/staveHeight/decrease"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        var h = Math.round(this.header.staveHeight * 100) / 100;
        for (var i = 0; i < renderUtil.rastalToHeight.length; ++i) {
            if (renderUtil.rastalToHeight[i] < h) {
                this.header.staveHeight = renderUtil.rastalToHeight[i];
                break;
            }
        }
        this.dangerouslyMarkRendererDirty();
        this._ctx = null;
        this.header.staveHeight = this.header.staveHeight;
        this._everythingIsDirty();
    }

    "PUT /local/tool"(action: C.IFluxAction) {
        if (this._cleanupFn) {
            this._cleanupFn();
        }
        if (this._tool instanceof StackableTool && action.postData instanceof StackableTool) {
            if (StackableTool.contains(<StackableTool> this._tool, action.postData._priority)) {
                var hasNoteTool = action.postData._priority === 0;
                this._tool = StackableTool.unstack((<StackableTool>this._tool), action.postData._priority);
                if (!hasNoteTool) {
                    this.emit(CHANGE_EVENT);
                    return;
                }
            }
            this._tool = StackableTool.stack((<StackableTool>this._tool), action.postData);
        } else {
            this._tool = action.postData;
        }
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
        if (action.resource === "togglePlay") {
            return;
        }
        // Simply move cursor
        if (action.postData.bar) {
            this._visualCursorIs(action.postData);
        } else if (action.postData.step) {
            this._stepCursor({
                step: action.postData.step,
                loopThroughEnd: action.postData.loopThroughEnd,
                skipDurationlessContent: action.postData.skipDurationlessContent
            });
        }
        if (!this._visualCursor.annotatedObj) {
            this._annotate(null, null, null, null, null, true);
        }
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
        for (var h = 0; h < this._parts.length; ++h) {
            if (!this._parts[h].body) {
                continue;
            }
            for (var i = 0; i < this._parts[h].body.length; ++i) {
                if (this._parts[h].body[i] === this._visualCursor.annotatedObj) {
                    prevObj = this._parts[h].body[i - 1];
                    prevIdx = i - 1;
                    if (prevObj.type === C.Type.BeamGroup) {
                        prevObj = this._parts[h].body[i - 2];
                    }
                }
            }
            if (!prevObj) {
                continue;
            }
            if (action.postData === "dot") {
                var DotTool = require("./dotTool");
                var tmpTool = new DotTool();
                this._annotate(
                    {
                        obj: prevObj,
                        musicLine: this._visualCursor.annotatedLine,
                        idx: prevIdx,
                        visualIdx: NaN,
                        partIdx: this._activeStaveIdx
                    },
                    tmpTool.visualCursorAction(action.postData), null, null, null, false);
            } else {
                this._annotate(
                    {
                        obj: prevObj,
                        musicLine: this._visualCursor.annotatedLine,
                        idx: prevIdx,
                        visualIdx: NaN,
                        partIdx: this._activeStaveIdx
                    },
                    this._tool.visualCursorAction(action.postData), null, null, null, false);
            }
            this.emit(ANNOTATE_EVENT);
        }
    }

    private _stepBackwards(skip: boolean) {
        this._stepCursor({
            step: -1,
            skipDurationlessContent: skip
        });
    }

    private _repairCursor(currPart: number) {
        var body = this.parts[currPart].body;
        for (var i = this._visualCursor.annotatedObj.idx; body[i] && !body[i].endMarker; --i) {
            if (body[i].isNote && body[i].ctxData.beat === this._visualCursor.beat) {
                this._visualCursor.annotatedObj = body[i];
                break;
            }
        }
    }

    "DELETE /local/visualCursor/after"(action: C.IFluxAction) {
        this.emit(HISTORY_EVENT);
        // Remove the item directly before the context.
        for (var h = 0; h < this._parts.length; ++h) {
            if (!this._parts[h].body) {
                continue;
            }
            for (var i = 0; i < this._parts[h].body.length; ++i) {
                if (this._parts[h].body[i] === this._visualCursor.annotatedObj) {
                    --i;
                    break;
                }
            }
            if (i === this._parts[h].body.length) {
                console.warn("Cursor not found");
                break;
            }
            while (i >= 0 && !this._parts[h].body[i].isNote &&
                this._parts[h].body[i].type !== C.Type.Barline) {
                --i;
            }
            var obj = this._parts[h].body[i];
            if (obj) {
                // Remove items based on a white-list.
                if (obj.isNote) {
                    var currPart = 0;
                    var pointer: C.IPointerData = {
                        partIdx: currPart,
                        obj: obj,
                        idx: obj.idx
                    };
                    this._stepBackwards(false);

                    this._annotate(pointer, (obj: Model, ctx: Annotator.Context) => {
                        ctx.removeAdjacentBeams();
                        ctx.removeRemainingBeamsInBar();
                        ctx.eraseCurrent(Annotator.SplicePolicy.Masked);
                        if (obj.inBeam) {
                            var idx = obj.idx - 1;
                            while (ctx.body[idx].type !== C.Type.BeamGroup) {
                                --idx;
                            }
                            ctx.removeFollowingBeam(idx - 1, true);
                        }
                        this.dangerouslyMarkRendererLineDirty(ctx.line);
                        return C.IterationStatus.RetryLine;
                    }, null, null, false, false);
                    this._repairCursor(currPart);
                    this._annotate(null, null, null, null, null, false);
                } else {
                    this._stepBackwards(false);
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
        var part: C.IPart = action.postData.part;

        this.ensureSoundfontLoaded(instrument.soundfont);

        this.emit(HISTORY_EVENT);
        part.instrument = instrument;
        this.emit(CHANGE_EVENT);
    }

    midiOutHint(out: Array<number>) {
        this.emit(MIDI_OUT_HINT, out);
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
        this._peerRelay = new WebSocket((window.location.protocol === "https:" ? "wss://" : "ws://") +
            window.location.host + "/api/v0/song/_" + id + "/peerRelay");
        this._peerRelay.onmessage = this._handleRelayMessage.bind(this);
        // TODO : this._peerRelay.{onerror | onopen | onclose}
    }

    /**
     * Calls Context.anotate on each part with a body
     */
    private _annotate(
            pointerData: C.IPointerData,
            toolFn: (obj: Model, ctx: Annotator.Context) => C.IterationStatus,
            parts: Array<C.IPart>,
            pageSize: C.IPageSize,
            profile: boolean,
            disableRecording: boolean,
            godAction?: Function,
            assertionPolicy?: Annotator.AssertionPolicy) {

        assertionPolicy = isNaN(assertionPolicy) ? Annotator.AssertionPolicy.Strict : assertionPolicy;

        parts = parts || this._parts;

        if (SongEditorStore.PROFILER_ENABLED) {
            console.time("annotate");
        }

        var aBody: C.IBody; // XXX: MULTISTAVE
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                aBody = parts[i].body;
                break;
            }
        }
        var oldBarKeys = Collab.getBarKeys(aBody);
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
            pageSize: pageSize || this.header.pageSize,
            leftMargin: this.header.paper.leftMargin,
            rightMargin: this.header.paper.rightMargin,
            indent: this.header.paper.indent
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
        if (context.line !== 0) {
            assert(Object.keys(context.prevClefByStave).length >= 1, "Previous clefs were not stored");
        }

        var y = renderUtil.getHeaderHeight(this.header);

        // Annotate the part.
        var location = {
            bar: context.lines ? context.lines[context.line].bar : 1,
            beat: context.lines ? context.lines[context.line].beat : 0
        };

        var customAction: Annotator.ICustomAction = {
            toolFn: toolFn,
            pointerData: pointerData
        };
        var result = context.annotate(location, customAction, cursor, disableRecording, this._dispatcher);

        if (result.patch && result.patch.length) {
            this._broadcastPatch(result.patch, oldBarKeys, Collab.getBarKeys(context.body));
        }

        y = result.resetY ? 0 : y;

        if (SongEditorStore.PROFILER_ENABLED) {
            console.log("I broke the profiler");
            // console.log("ops:", result.operations, "\tbody:", part.body.length, "\tscore:",
            //     (Math.round(result.operations / part.body.length * 100) / 100));
        }

        if (!result.skip) {
            this._ctx = context;
            y += 2.25;
        }

        if (SongEditorStore.PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }

        if (!disableRecording) {
            // For legacy audio, invalidate the current mp3.
            this.legacyAudioID = -1;
        }
    }

    private _broadcastPatch(diff: Array<string>, origBars: Array<string>, newBars: Array<string>) {
        diff = diff.filter(d => !!d);
        if (!diff.length) { return; }

        if (this._relayHistory.length > 6000) {
            this._relayHistory = this._relayHistory.substr(this._relayHistory.length - 6000);
        }

        var permission = this._session.apiRole === C.ApiRole.Primary ? "[BROADCAST]" : "[REQUEST]";

        var msg = permission + "PATCH\n";
        msg += Collab.barKeysDiff(origBars, newBars) + "\n";
        msg += diff.join("") + "\n";
        if (this._session.apiRole === C.ApiRole.Offline) {
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
        this._parts = null;
        this._prevActiveSong = null;
        this._header = null;
        this._tool = null;
        this._selection = null;
        this._visualCursorIs({
            bar: 1,
            beat: 0
        });
    }

    private _everythingIsDirty() {
        Model.removeAnnotations(this._parts); // TODO: Should not be needed.
        this.dangerouslyMarkRendererDirty();
        this._annotate(null, null, null, null, null, false); // XXX: collaboration
        this.emit(CHANGE_EVENT);
    }

    private _eraseSelection() {
        this.emit(HISTORY_EVENT);

        var doAction = () => {
            var parts = this.parts;
            for (var h = 0; h < parts.length; ++h) {
                if (!parts[h].body) {
                    continue;
                }
                var body = parts[h].body;
                var removeEntireBarStartingAt: number = 0;
                for (var i = 0; i < body.length; ++i) {
                    var type = body[i].type;
                    if (type === C.Type.Clef || type === C.Type.Begin ||
                        type === C.Type.KeySignature ||
                        type === C.Type.TimeSignature) {
                        // We'll have to eventually have a way of getting rid of/hiding
                        // these...
                        removeEntireBarStartingAt = i + 1;
                        body[i].selected = false;
                        continue;
                    }

                    if (type === C.Type.Duration && body[i].selected) {
                        body[i].note.isRest = true;
                    }

                    if (type === C.Type.Barline) {
                        if (removeEntireBarStartingAt !== null) {
                            var delCount = i - removeEntireBarStartingAt;
                            // XXX: Check this.
                            body.splice(removeEntireBarStartingAt, delCount);
                            i -= delCount;
                        }
                        removeEntireBarStartingAt = i;
                    } else if (type === C.Type.EndMarker) {
                        // Pass.
                    } else if (!body[i].selected) {
                        removeEntireBarStartingAt = null;
                    }
                    body[i].selected = false;
                }
            }

            // This isn't very efficient, obviously.
            this._selection = null;
            Model.removeAnnotations(this._parts);
        };

        this._annotate(null, null, null, null, null, false, doAction);
        this.dangerouslyMarkRendererDirty();
        this.emit(CHANGE_EVENT);
    }

    private _handleAction = (action: C.IFluxAction) => {
        assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
        var fn: Function = (<any>this)[action.description];
        if (fn) {
            fn.call(this, action);
        }
        return true; // (Success)
    };

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
        for (var i = 0; i < this.parts.length; ++i) {
            var body = this.parts[i].body;
            if (!body) {
                continue;
            }
            for (var j = 0; j < body.length; ++j) {
                if (body[j].type === C.Type.Barline) {
                    (<any>body[j]).markLKG(j, this.parts[i].body);
                }
            }
        }
    }

    private _ping = () => {
        if (this._peerRelay && this._peerRelay.readyState === WebSocket.OPEN) {
            this._peerRelay.send("");
        }
        _.delay(this._ping, 128);
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

        C.addDefaults(this.header);
        this.header.staveHeight = this.header.staveHeight;
        this.header.pageSize = this.header.pageSize;
        this.header.paper = this.header.paper;

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

        this._annotate(null, null, null, null, null, true, null, Annotator.AssertionPolicy.NoAssertions);
        this._markLKG();

        if (profile) {
            SongEditorStore.PROFILER_ENABLED = origPE;
        }
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

    private _throttledAutosave = _.throttle(() => {
        if (this._session.apiRole !== C.ApiRole.Primary) {
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
        for (var partIdx = 0; partIdx < this._parts.length; ++partIdx) {
            var lastIdx = 0;
            var body = this._parts[partIdx].body;
            var accidentals: C.IAccidentals = null;

            if (!body) {
                continue;
            }

            _.each(this._selection, item => {
                for (var i = lastIdx; i <= body.length && body[i] !== item; ++i) {
                    if (body[i].type === C.Type.KeySignature) {
                        accidentals = C.NoteUtil.getAccidentals(
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
                var DurationModel: typeof DurationModelType = require("./duration");
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
    private _notationsSidebarVisible: boolean = false;
    private _autosaveModalVisible: boolean = false;
    private _changesPending: boolean;
	private _cleanupFn: Function = null;
    private _copyModalVisible: boolean = false;
	private _ctx: Annotator.Context = null;
	private _dirty = false;
    private _dispatcher: C.IDispatcher;
    private _history: History;
    private _exportModalVisible: boolean = false;
	private _linesToUpdate: { [key: string]: boolean } = {};
    private _metadataModalVisible: boolean = false;
    private _partModalStave: C.IPart = null;
    private _peerRelay: WebSocket = null;
	private _prevActiveSong: C.ISong = null;
    private _relayHistory: string = "";
	private _savesInTransit: number = 0;
	private _selection: Array<Model> = null;
    private _session: C.ISessionStore;
	private _snapshots: { [key: string]: any } = {};
    private _socialModalVisible: boolean = false;
    private _midiModalTab: number = null;
	private _parts: Array<C.IPart>;
	private _header: C.IHeader;
	private _tool: Tool = new Tool.Null;
    private _visualCursor: C.IVisualCursor = {
        bar: 1,
        beat: 0,
        endMarker: <boolean> null,
        annotatedObj: <Model> null,
        annotatedLine: <number> null,
        annotatedPage: <number> null
    };
    legacyAudioID: number = -1;
}

module SongEditorStore {
    "use strict";
    export interface IStepCursorSpec {
        step: number;
        loopThroughEnd?: boolean;
        skipDurationlessContent?: boolean;
    }
}

export = SongEditorStore;
