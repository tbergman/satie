/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, September 2014
 */

import _ = require("lodash");
import assert = require("assert");

import BarlineModel = require("./barline");
import C = require("./contracts");
import Model = require("./model");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

/**
 * Annotator has two goals:
 * 
 *  1) Put a set of staves into a state where they can be rendered. For example, Annotator would
 *     set the position of all items, insert barlines/rests, and add the appropriate accidentals.
 *     When a song is loaded from source (e.g., MusicXML, lilypond), it cannot out of the box be
 *     displayed. Calling (new Annotator(staves)).annotate() is all that is necessary to make it
 *     renderable.
 * 
 *  2) Wrap all mutations to the staves. For example, the NoteTool will use an annotator to add
 *     a note, or change a rest into a note. In this case, Annotator.annotate should be called
 *     with all parameters. It is worth noting that Annotator does NOT specify what the change is.
 *     Instead, it just ensures that all the appropriate changes are made to the staves so that
 *     after the change is made, the staves are in a valid and renderable state.
 */
export class Context implements C.MetreContext {
    constructor(staves: Array<C.IStave>, layout: ILayoutOpts) {
        this._staves = staves;

        if (layout.snapshot) {
            _cpysnapshot(this, layout.snapshot);
        } else {
            _fillLayoutDefaults(layout);
            _cpylayout(this, layout);
        }
    }

    /**
     * After the function exits, any part of the Annotator's staves after 'from' can be rendered.
     * The default value of 'from' is the beginning of the song.
     * 
     * If 'mutation' is set, then the staves will be modified according to what is specified in
     * 'mutation'. The mutation must be after 'from'. All modifications to staves must go through
     * Annotator.annotate.
     */
    annotate(from: C.ILocation, mutation: ICustomAction,
            cursor: C.IVisualCursor, disableRecording: boolean): C.IAnnotationResult {
        assert(!Context._ANNOTATING, "annotate() may not be called recursively.");
        Context._ANNOTATING = true;
        var error: Error = null;
        var result: C.IAnnotationResult;
        assert(from.bar !== 0);

        try {
            result = this._annotateImpl(from, mutation, cursor, disableRecording);
        } catch (err) {
            // Catch the error so we can set _ANNOTATING to false and thus allow future annotations.
            error = err;
        }

        Context._ANNOTATING = false;

        if (error) {
            throw error;
        }
        return result;
    }

    /**
     * Only properties that change per line or within a line are saved to by captureLine
     * 
     * To restore an Annotator back to a state saved to by JSON.stringify(ctx.captureLine()), see _cpyline.
     */
    captureLine(): ILineSnapshot {
        if (this.bar !== 1) {
            assert(this.prevClef);
        }
        return {
            accidentals: this.accidentals,
            bar: this.loc.bar,
            barKeys: this.barKeys,
            barlineX: this.barlineX,
            beat: this.loc.beat,
            keySignature: this.keySignature,
            line: this.line,
            pageLines: this.pageLines,
            pageStarts: this.pageStarts,
            prevClef: this.prevClef,
            prevKeySignature: this.prevKeySignature,
            x: this.x,
            y: this.y
        };
    }

    captureSnapshot(): IPartialSnapshot {
        return {
            fontSize: this.fontSize,
            initialX: this.initialX,
            lineSpacing: this.lineSpacing,
            maxX: this.maxX,
            maxY: this.maxY,
            pageSize: this.pageSize,
            prevLine: this.lines[this.line - 1],
            partialLine: this.lines[this.line],
            timeSignature: this.timeSignature
        };
    }



    /**
     * The element currently being annotated.
     */
    get curr(): Model {
        return this.body[this.idx];
    }

    /**
     * Returns the next element in the current stave, subject to certain options.
     * By default, this function skips over beams.
     * 
     * @param condition: Function that returns false if model should be skipped.
     * @param skip: Start looking at Models <skip> after current. 1 if unspecified.
     * @param allowBeams: True if beams should not be skipped. False by default.
     */
    next(condition?: (model: Model) => boolean, skip?: number, allowBeams?: boolean) {
        // Don't ask me why, but doing this.body[nextIdx...] is 10x slower!
        var i: number;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && (
                (this.body[this.idx + i].type === C.Type.BEAM_GROUP && !allowBeams) ||
                (condition && !condition(this.body[this.idx + i])))) {
            ++i;
        }
        return this.body[this.idx + i];
    }

    /**
     * Search all staves for the next elements of type 'type' at the current location
     * 
     * @param direct if true, only return objects directly after the current object.
     */
    intersects(type: C.Type, direct?: boolean) {
        var loc = new C.Location(this.curr.ctxData);
        var intersects: Array<Model> = [];
        for (var i = 0; i < this._staves.length; ++i) {
            var body = this._staves[i].body;
            if (!body) { continue; }
            for (var j = this.idx + 1; j < body.length; ++j) {
                if (!loc.eq(body[j].ctxData)) { break; }
                if (body[j].type === type) { intersects.push(body[j]); }

                if (direct) { break; }
            }
        }
        return intersects;
    }

    /**
     * Returns the index of the next element in the current stave, subject to certain options.
     * By default, this function skips over beams.
     * 
     * @param condition: Function that returns false if model should be skipped.
     * @param skip: Start looking at Models <skip> after current. 1 if unspecified.
     * @param allowBeams: True if beams should not be skipped. False by default.
     */
    nextIdx(cond?: (model: Model) => boolean, skip?: number, allowBeams?: boolean) {
        var i: number;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && (
                (this.body[this.idx + i].type === C.Type.BEAM_GROUP && !allowBeams) ||
                (cond && !cond(this.body[this.idx + i])))) {
            ++i;
        }
        return this.idx + i;
    }

    /**
     * Returns a BeamGroup, if one follows. Otherwise, returns null.
     */
    beamFollows(idx?: number): Array<{ inBeam: boolean; }> {
        // Must return .beam
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        return (this.body[idx + 1].type === C.Type.BEAM_GROUP) ?
            (<any>this.body[idx + 1]).beam : null;
    }

    /**
     * Removes the next beam. One must exist.
     */
    removeFollowingBeam(idx?: number, past?: boolean): C.IterationStatus {
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }

        assert(past || idx >= this.idx, "Set past to true if you are " +
                "removing an already-processed beam (this is inefficient)");
        var beam = this.beamFollows(idx);
        assert(beam, "There must be a beam to remove");
        beam.forEach(p => p.inBeam = false);
        return (past ? this.erasePast : this.eraseFuture).call(this, idx + 1);
    }

    /**
     * If a condition is given, searches backwards starting at the CURRENT
     * item. Otherwise, returns the item directly before the current item.
     */
    prev(condition?: (m: Model) => boolean) {
        if (!condition) {
            return this.body[this.idx - 1];
        } else {
            for (var i = this.idx; i >= 0; --i) {
                if (condition(this.body[i])) {
                    return this.body[i];
                }
            }
            return null;
        }
    }

    /**
     * Removes the current item.
     */
    eraseCurrent(): C.IterationStatus {
        this.body.splice(this.idx, 1);
        return C.IterationStatus.RETRY_CURRENT;
    }

    /**
     * Removes an item that is after the current item. This is efficient.
     */
    eraseFuture(idx: number): C.IterationStatus {
        assert(idx > this.idx, "Invalid use of eraseFuture");

        this.body.splice(idx, 1);
        return C.IterationStatus.SUCCESS;
    }

    /**
     * Removes an item that is before the current item. This is inefficient.
     */
    erasePast(idx: number): C.IterationStatus {
        assert(idx <= this.idx, "Invalid use of erasePast");

        this.body.splice(idx, 1);
        return C.IterationStatus.RETRY_FROM_ENTRY;
    }

    /**
     * Inserts an element somewhere after the current element. This is efficient.
     * 
     * @param index: The absolute position to insert an element at.
     *     By default, one after current position.
     */
    insertFuture(obj: Model, index?: number): C.IterationStatus {
        index = (index === null || index === undefined) ? (this.idx + 1) : index;
        assert(index > this.idx, "Otherwise, use 'insertPast'");

        this.body.splice(index, 0, obj);
        return C.IterationStatus.SUCCESS;
    }

    /**
     * Inserts an element somewhere before the current element. This is inefficient.
     * 
     * @param index The absolute position to insert an element at.
     *     By default, just before current position.
     */
    insertPast(obj: Model, index?: number): any {
        index = (index === null || index === undefined) ? this.idx : index;
        assert(index <= this.idx, "Otherwise, use 'insertFuture'");

        var exitCode = this.idx === index ? C.IterationStatus.RETRY_CURRENT :
            C.IterationStatus.RETRY_FROM_ENTRY;

        this.body.splice(index, 0, obj);
        return exitCode;
    }

    splice(start: number, count: number, replaceWith?: Array<Model>) {
        Array.prototype.splice.apply(this.body, [start, count].concat(<any>replaceWith));
    }

    _barAfter(index: number): Model {
        for (var i = index; i < this.body.length; ++i) {
            if (this.body[i].type === C.Type.BARLINE) {
                return this.body[i];
            }
        }
    }

    /**
     * Makes C.IterationStatus.RETRY_FROM_ENTRY restart from the very beginning of the song.
     * 
     * Avoid if possible.
     */
    markEntireSongDirty(): void {
        this.nullEntry = true;
    }

    /**
     * @deprecated DO NOT USE
     * 
     * The body in the current stave. Annotation is now interlaced, so if you're using body,
     * you're likely doing something dangerous.
     * @scope temporary
     */
    body: C.IBody;

    /**
     * @deprecated DO NOT USE
     * 
     * The index of body currently being annotated. Annotation is now interlaced, so if you're
     * using idx, you're likely doing something dangerous.
     * @scope temporary
     */
    idx: number;

    /**
     * The current stave.
     * @scope temporary
     */
    currStave: C.IStave;

    /**
     * For marking stave lines dirty, for example.
     * @scope temporary
     */
    currStaveIdx: number;

    /**
     * @deprecated DO NOT USE
     * 
     * Use loc.beat
     */
    get beat() {
        return this.loc.beat;
    }

    set beat(b: number) {
        this.loc.beat = b;
    }

    /**
     * @deprecated DO NOT USE
     * 
     * Use loc.bar
     */
    get bar() {
        return this.loc.bar;
    }

    set bar(b: number) {
        this.loc.bar = b;
    }

    /**
     * @deprecated DO NOT USE
     */
    get endMarker() {
        return false;
    }

    /**
     * The current clef.
     * @scope temporary
     */
    clef: string;

    /**
     * The length of a Duration (rest or chord), if not specified in a Duration itself.
     * @scope temporary
     */
    defaultCount: number = 4;



    /**
     * The default accidental for all notes. Reset to the key signature on each barline
     * @scope line
     */
    accidentals: C.IAccidentals = {};

    /**
     * The positions of all the barlines in the current line.
     * @scope line
     */
    barlineX: Array<number> = [];

    /**
     * The key signature on the current line.
     * @seeAlso prevKeySignature
     * @scope line
     */
    keySignature: C.IKeySignature;

    /**
     * The current line number.
     * @scope line
     */
    line: number = 0;

    /**
     * The current beat and bar
     * @scope line
     */
    loc: C.ILocation = {
        bar: 1,
        beat: 0
    };

    /**
     * The first line number of every page
     * @scope line
     */
    pageLines: Array<number> = [0];

    /**
     * The first index of every page
     * @scope line
     */
    pageStarts: Array<number> = [0];

    /**
     * The clef to add the current line, if one is not specified.
     * @scope line
     */
    prevClef: string;

    /**
     * The smallest raw count (duration) in a line.
     * @scope line
     */
    smallest: number = 10000;

    /**
     * The current position (x)
     * @scope line
     */
    x: number;

    /**
     * The current position of the top stave (y)
     * @scope line
     */
    y: number;

    /**
     * The ordered keys of bars. Should be the same for all staves.
     * @scope line
     */
    barKeys: Array<string>;



    /**
     * The current time signature on the page.
     * @seeAlso prevTimeSignature
     * @scope page
     */
    timeSignature: C.ITimeSignature;


    /**
     * The font size.
     * @scope layout
     */
    fontSize: number;

    /**
     * The x on the first line.
     * @scope layout
     */
    initialX: number;

    /**
     * The spacing from bottom of one staff, to the top of another.
     * @scope layout
     */
    lineSpacing: number = 3.3;

    /**
     * The end of a line.
     * @scope layout
     */
    maxX: number;

    /**
     * The end of a page
     * @scope layout
     * 
     */
    maxY: number;

    /**
     * The physical size of a page.
     * @scope layout
     */
    pageSize: C.IPageSize;

    /**
     * The key signature on the previous line, if any.
     * @scope layout
     */
    prevKeySignature: C.IKeySignature;



    private static _ANNOTATING: boolean = false;
    disableRecordings: boolean = true;
    _recordings: { [key: string]: BarlineModel } = null;
    record(model: BarlineModel) {
        this._recordings[model.key] = model;
    }

    private _annotateImpl(from?: C.ILocation, mutation?: ICustomAction,
                cursor?: C.IVisualCursor, disableRecordings?: boolean):
            C.IAnnotationResult {
        from = from || { bar: 1, beat: 0 };

        this.disableRecordings = disableRecordings;
        if (!this.disableRecordings) {
            this._recordings = {};
        }
        var status: C.IterationStatus;
        var ops = 0;
        var initialLength = _.max(this._staves, s => s.body ? s.body.length : 0).body.length || 1;
        var verbose = false;
        var stopIn = NaN;

        for (var it = new PrivIterator(this, from, this._staves, mutation, cursor); !it.atEnd; it.next(status)) {
            if (++ops/initialLength >= 500 && isNaN(stopIn)) {
                verbose = true;
                stopIn = 20;
            }
            if (--stopIn === 0) {
                throw "because of timeout.";
            }
            status = it.annotate(verbose);
        }

        if (it.eofJustificationDirty) {
            this._semiJustify(this._staves);
        }

        var patch = _.map(this._recordings, (model: BarlineModel) => {
            var p = model.createPatch(model.idx, this.body /* XXX: BROKEN FOR MULTISTAVE */);
            if (p) {
                p += "\n";
            }
            return p;
        }).filter(p => !!p);

        return {
            cursor: null,
            operations: 5,
            resetY: false,
            skip: status === C.IterationStatus.EXIT_EARLY, // If skip is true, context is not updated.
            success: true,
            patch: patch
        };
    }

    private _semiJustify(staves: Array<C.IStave>) {
        var NewlineModel = require("./newline"); // Recursive dependency.
        for (var i = 0; i < staves.length; ++i) {
            if (staves[i].body) {
                this.idx = this.body.length - 1;
                this.body = staves[i].body;
                NewlineModel.semiJustify(this);
                this.idx = -1;
            }
        }
    }


    /**
     * Whether this context is being run by a beam group
     * @scope private
     */
    isBeam: boolean;

    /**
     * Whether the entry point is invalid. If so, retrying from entry
     * inefficiently starts from the beginning of the song.
     * @scope private
     */
    nullEntry: boolean = false;

    /**
     * The staves to be annotated.
     * @scope private
     */
    private _staves: Array<C.IStave>;

    /**
     * @scope private
     */
    lines: Array<ILineSnapshot> = [];
}

export interface ICustomAction {
    toolFn?: (obj: Model, ctx: Context) => C.IterationStatus;
    pointerData: C.IPointerData;
}

export interface ILayoutOpts {
    fontSize?: number;
    indent: number;
    isFirstLine?: boolean;
    leftMargin?: number;
    pageSize?: C.IPageSize;
    rightMargin?: number;
    snapshot?: ICompleteSnapshot;
    top?: number;
}

/**
 * A subset of a Context that is used as a snapshot so that modifying a line
 * does not involve a trace from the start of the document.
 */
export interface ILineSnapshot {
    accidentals: C.IAccidentals;
    bar: number;
    barKeys: Array<string>;
    barlineX: Array<number>;
    beat: number;
    keySignature: C.IKeySignature;
    line: number;
    pageLines: Array<number>;
    pageStarts: Array<number>;
    prevClef: string;
    prevKeySignature: C.IKeySignature;
    x: number;
    y: number;
}

/**
 * A subset of a Context that is used as a snapshot so that modifying a document
 * does not require a fresh context. Holds the layout scope of a context, in
 * contrast to ILineSnapshot which holds the line context.
 */
export interface IPartialSnapshot {
    fontSize: number;
    initialX: number;
    lineSpacing: number;
    maxX: number;
    maxY: number;
    pageSize: C.IPageSize;
    prevLine: ILineSnapshot;
    partialLine: ILineSnapshot;
    timeSignature: C.ITimeSignature;
}

export interface ICompleteSnapshot extends IPartialSnapshot {
    lines: Array<ILineSnapshot>;
}

export function recordMetreData(staves: Array<C.IStave>) {
    "use strict";

    var anyChange = false;
    var i: number;
    var j: number;
    for (i = 0; i < staves.length; ++i) {
        var body = staves[i].body;
        if (!body) { continue; }
        var mctx1 = new C.MetreContext;
        for (j = 0; j < body.length; ++j) {
            var prevhash = body[j].ctxData && (body[j].ctxData.bar * 10000 +
                body[j].ctxData.beat * 2 + (body[j].ctxData.endMarker ? 1 : 0));
            body[j].recordMetreDataImpl(mctx1);
            var newhash = body[j].ctxData.bar * 10000 +
                body[j].ctxData.beat * 2 + (body[j].ctxData.endMarker ? 1 : 0);
            anyChange = anyChange || prevhash !== newhash;
        }
    }

    if (!anyChange) {
        return;
    }
}

///////////   END OF EXPORTS   ///////////






/**
 * Internal. Iterates over a set of bodies in staves and annotates them. Owned by an Annotator.
 */
class PrivIterator {
    constructor(parent: Context, from: C.ILocation, staves: Array<C.IStave>, mutation: ICustomAction, cursor: C.IVisualCursor) {
        this._parent = parent;
        this._staves = staves;
        this._cursor = cursor;
        this._from = from;
        this._parent.loc = JSON.parse(JSON.stringify(from));
        this._canExitAtNewline = !!mutation && !!mutation.toolFn;
        for (var i = 0; i < staves.length; ++i) {
            if (staves[i].body) {
                var isMutable = mutation && mutation.pointerData && mutation.pointerData.staveIdx === i;
                this._components.push(new PrivIteratorComponent(
                    /* starting location*/ from,
                    /* stave */ staves[i],
                    /* stave index */ i,
                    /* custom action */ isMutable ? mutation : null,
                    /* visual cursor */ cursor));
            }
        }
    }

    annotate(verbose: boolean): C.IterationStatus {
        var allComponentsAreDone = true;

        for (var i = 0; i < this._components.length; ++i) {
            ///
            var result = this._components[i].annotate(this._parent, this._canExitAtNewline);
            ///

            if (verbose) {
                console.log(this._components[i].curr, C.IterationStatus[result]);
            }

            if (result === C.IterationStatus.EXIT_EARLY) {
                // EXIT_EARLY implies success.
                // Note that here we do not set allComponentsAreDone to false.
                result = C.IterationStatus.SUCCESS;
            } else {
                allComponentsAreDone = false;
            }

            if (result === C.IterationStatus.LINE_CREATED) {
                this._clearCursor();
                this._markLineDirty();
            } else if (result === C.IterationStatus.RETRY_PREVIOUS_LINE) {
                this._markLineDirty();
            }

            if (result === C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS) {
                this._canExitAtNewline = false;
            }

            if (result !== C.IterationStatus.SUCCESS) {
                return result;
            }
        }

        return allComponentsAreDone ? C.IterationStatus.EXIT_EARLY : C.IterationStatus.SUCCESS;
    }

    next(status: C.IterationStatus) {
        switch (status) {
            case C.IterationStatus.SUCCESS:
                this._increment();
                break;
            case C.IterationStatus.EXIT_EARLY:
                for (var i = 0; i < this._components.length; ++i) {
                    this._components[i].markDone();
                }
                this.eofJustificationDirty = false;
                break;
            case C.IterationStatus.RETRY_FROM_ENTRY:
                this._reset();
                break;
            case C.IterationStatus.LINE_CREATED:
                this._rollbackLine(this._parent.line);
                this._rewindTwoNewlines();
                this._increment();
                break;
            case C.IterationStatus.RETRY_PREVIOUS_LINE:
                this._rollbackLine(this._parent.line - 1);
                this._rewindTwoNewlines();
                this._increment();
                break;
            case C.IterationStatus.RETRY_LINE:
                this._rollbackLine(this._parent.line);
                this._rewind(C.Type.NEWLINE);
                this._increment();
                break;
            case C.IterationStatus.LINE_REMOVED:
                this._rollbackLine(this._parent.line - 1);
                break;
            case C.IterationStatus.RETRY_BEAM:
                var SongEditorStore = require("./songEditor"); // Recursive dependency.
                this._parent.loc.beat = SongEditorStore.getBeamCount();
                this._rewind(C.Type.BEAM_GROUP);
                this._parent.x = this._componentWithType(C.Type.BEAM_GROUP).x;
                break;
            case C.IterationStatus.RETRY_CURRENT:
            case C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS:
                break;
            default:
                assert(false, "Invalid status");
        }

        if (status !== C.IterationStatus.SUCCESS) {
            recordMetreData(this._staves);
        }
    }

    get atEnd(): boolean {
        return _.every(this._components, PrivIteratorComponent.isAtEndFn);
    }

    // This is kind of ugly. Another (probably better) option would be to have a
    // EndOfFileModel which handles the semi-justification for the end of the song.
    eofJustificationDirty: boolean = true;

    private _componentWithType(type: C.Type): Model {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._components[i].curr.type === type) {
                return this._components[i].curr;
            }
        }
        assert(false, "Not reached");
        return null;
    }

    private _rewindTwoNewlines() {
        for (var i = 0; i < this._components.length; ++i) {
            this._components[i].rewind(C.Type.NEWLINE);
            this._components[i].rewind();
            this._components[i].rewind(C.Type.NEWLINE);
        }
    }

    private _rewind(type: C.Type) {
        var nextLoc = new C.Location(MIN_LOCATION);
        var i: number;

        for (i = 0; i < this._components.length; ++i) {
            this._components[i].rewind();
            var loc = this._components[i].lastOf(type);
            if (nextLoc.le(loc)) {
                nextLoc = loc;
            }
        }
        for (i = 0; i < this._components.length; ++i) {
            this._components[i].rewindSeek(nextLoc, type);
        }
    }

    private _rollbackLine(i: number) {
        this._parent.line = i;
        _cpyline(this._parent, this._parent.lines[this._parent.line]);
    }

    private _increment() {
        var nextLoc = new C.Location(MAX_LOCATION);
        var nextPriority = C.MAX_NUM;

        for (var i = 0; i < this._components.length; ++i) {
            var pri = this._components[i].nextPriority;
            var loc = this._components[i].nextLocation;
            if (nextLoc.ge(loc) && nextPriority > pri) {
                nextLoc = new C.Location(loc);
                nextPriority = pri;
            }
        }

        for (var j = 0; j < this._components.length; ++j) {
            this._components[j].trySeek(nextLoc, nextPriority);
        }

        // this._parent.loc = nextLoc;
        // Q: Why don't we do this?
        // A: Durations and barlines themselves will set the location, annotating things as
        //    required.
    }

    private _clearCursor() {
        if (this._parent.line === this._cursor.annotatedLine) {
            this._cursor.annotatedLine = null;
            this._cursor.annotatedObj = null;
            this._cursor.annotatedPage = null;
        }
    }

    private _markLineDirty() {
        var SongEditorStore = require("./songEditor"); // recursive dependency.
        SongEditorStore.markRendererLineDirty(this._parent.line);
        this._canExitAtNewline = false;
    }

    private _reset() {
        for (var i = 0; i < this._components.length; ++i) {
            if (this._parent.nullEntry) {
                this._from = {
                    bar: 1,
                    beat: 0
                };
            }
            this._components[i].reset(this._from);
        }
    }

    private _canExitAtNewline: boolean = false;
    private _components: Array<PrivIteratorComponent> = [];
    private _cursor: C.IVisualCursor;
    private _from: C.ILocation;
    private _parent: Context;
    private _staves: Array<C.IStave>;
}






/**
 * Internal. Tracks the position of a body in an PrivIterator. Owned by an PrivIterator.
 */
class PrivIteratorComponent {
    constructor(from: C.ILocation, stave: C.IStave, idx: number, mutation: ICustomAction,
            cursor: C.IVisualCursor) {
        this._stave = stave;
        this._body = stave.body;
        this._sidx = idx;
        this._cursor = cursor;
        this.reset(from);

        if (!this._location.eq(from)) {
            var PlaceholderModel = require("./placeholder");
            this._body.splice(this._idx, 0, new PlaceholderModel({ _priority: C.Type[this.nextPriority] }));
        }
        this._mutation = mutation;
    }

    annotate(ctx: Context, canExitAtNewline: boolean): C.IterationStatus {
        ctx.body = this._body;
        ctx.currStave = this._stave;
        ctx.currStaveIdx = this._sidx;
        ctx.idx = this._idx;

        var doCustomAction = this._shouldDoCustomAction(ctx);
        var shouldUpdateVC = this._shouldUpdateVC(ctx);

        /// {
        var status = doCustomAction ? this._doCustomAction(ctx) : this._body[this._idx].annotate(ctx);
        /// }

        var isClean = status === C.IterationStatus.SUCCESS && !this._mutation && this._cursor.annotatedObj;
        var isNewline = this.curr && this.curr.type === C.Type.NEWLINE;

        if (status === C.IterationStatus.SUCCESS && shouldUpdateVC) {
		    this._cursor.annotatedObj = this.curr;
            this._cursor.annotatedLine = ctx.line;
		    this._cursor.annotatedPage = ctx.pageStarts.length - 1;
		}

        if (canExitAtNewline && isNewline && isClean) {
            return C.IterationStatus.EXIT_EARLY;
        }

        return status;
    }

    reset(from: C.ILocation) {
        this._idx = -1;
        // Important: If bar === 1, this function resets it to the first element.
        // Otherwise, it resets it to the beginning of a line.
        do {
            this._location = new C.Location(this._body[++this._idx].ctxData);
        } while ((from.bar !== 1 || from.beat !== 0) &&
            (this._location.lt(from) || this._location.eq(from) && (!this.curr ||
            this.curr.type <= C.Type.BEGIN || this.curr.type === C.Type.BARLINE)));
    }

    rewind(type?: C.Type) {
        if (!type) {
            --this._idx;
        } else {
            while (this._idx >= 0 && this._body[this._idx].type !== type) {
                --this._idx;
            }
        }
    }

    /**
     * Seek to the location at 'loc' with priority <= 'priority', or if none exists,
     * the location just before 'loc'.
     */
    rewindSeek(loc: C.Location, priority: number) {
        while (this._idx >= 0 && (loc.lt(this._body[this._idx].ctxData) ||
                loc.eq(this._body[this._idx].ctxData) && this._body[this._idx].type > priority)) {
            --this._idx;
        }
    }

    trySeek(loc: C.Location, priority: number) {
        if (!loc.eq(this.nextLocation) || this.nextPriority !== priority) {
            var PlaceholderModel = require("./placeholder");
            this._body.splice(this._idx, 0, new PlaceholderModel({ _priority: C.Type[this.nextPriority] }));
        }
    }

    /**
     * Returns the position of the last item with type 'type'.
     */
    lastOf(type: C.Type): C.Location {
        var i = this._idx;
        while (i > 0 && this._body[i].type !== type) {
            --i;
        }
        return new C.Location(this._body[i].ctxData);
    }

    /**
     * Hack to make this.atEnd true.
     */
    markDone(): void {
        this._idx = this._body.length;
    }

    get nextLocation(): C.ILocation {
        var next = this._next;
        return next ? next.ctxData : MAX_LOCATION;
    }

    get nextPriority(): number {
        var next = this._next;
        return next ? next.type : C.MAX_NUM;
    }

    get atEnd(): boolean {
        return !this._body[this._idx];
    }

    get curr(): Model {
        return this._body[this._idx];

    }

    static isAtEndFn = function (component: PrivIteratorComponent) {
        return component.atEnd;
    };

    private get _next() {
        return this._body[this._idx + 1];
    }

    private _shouldDoCustomAction(ctx: Context): boolean {
        if (!this._mutation) { return false; }

        var target = this._mutation.pointerData.obj;
        return target === this.curr || (target.placeholder && target.idx === this._idx);
    }

    private _shouldUpdateVC(ctx: Context): boolean {
        if (!this._cursor) { return false; }

        var target = this._cursor;
        var barMatches = ctx.bar === target.bar;
        var beatMatches = (!target.beat && !target.annotatedObj) || ctx.beat === target.beat;
        var typeMatches = (ctx.curr.isNote && !target.endMarker) || (target.endMarker && ctx.curr.type === C.Type.END_MARKER);

        return !this._mutation && // Wait until mutation has occurred & _mutation is unset.
            barMatches && beatMatches && typeMatches && !target.annotatedObj;
    }


    private _doCustomAction(ctx: Context): C.IterationStatus {
        if (this.curr.type === C.Type.TIME_SIGNATURE) {
            // HACK HACK HACK -- we don't want to annotate before the custom action, but
            // some actions expect a valid time signature.
            ctx.timeSignature = (<any>this.curr).timeSignature;
        }

        //
        var exitCode = this._mutation.toolFn(this.curr, ctx);
        //

        this._mutation = null;  // If we have to backtrack, don't repeat this action

        return exitCode;
    }

    private _body: C.IBody;
    private _idx: number;
    private _location: C.Location;
    private _mutation: ICustomAction;
    private _sidx: number;
    private _cursor: C.IVisualCursor;
    private _stave: C.IStave;
}





function _cpyline(ctx: Context, line: ILineSnapshot) {
    "use strict";

    ctx.clef = null;
    ctx.defaultCount = 4;

    _.each(line, (v, attrib) => {
        if ((<any>line)[attrib] === null) {
            return;
        }
        switch (attrib) {
            case "accidentals": ctx.accidentals = line.accidentals; break;
            case "bar": ctx.bar = line.bar; break;
            case "barlineX": ctx.barlineX = line.barlineX; break;
            case "barKeys": ctx.barKeys = line.barKeys; break;
            case "beat": ctx.beat = line.beat; break;
            case "keySignature": ctx.keySignature = line.keySignature; break;
            case "line": ctx.line = line.line; break;
            case "pageLines": ctx.pageLines = line.pageLines; break;
            case "pageStarts": ctx.pageStarts = line.pageStarts; break;
            case "prevClef": ctx.prevClef = line.prevClef; break;
            case "prevKeySignature": ctx.prevKeySignature = line.prevKeySignature;
            case "x": ctx.x = line.x; break;
            case "y": ctx.y = line.y; break;
            default: assert(false, "Not reached");
        }
    });
    if (ctx.bar !== 1) {
        assert(ctx.prevClef);
    }
}

function _cpylayout(ctx: Context, layout: ILayoutOpts) {
    "use strict";

    ctx.fontSize = layout.fontSize;
    ctx.initialX = renderUtil.mm(layout.leftMargin, layout.fontSize);
    ctx.maxX = renderUtil.mm(layout.pageSize.width - layout.rightMargin, layout.fontSize);
    ctx.maxY = renderUtil.mm(layout.pageSize.height - 15, layout.fontSize);
    ctx.pageSize = layout.pageSize;
    ctx.x = ctx.initialX + renderUtil.mm(layout.isFirstLine ? layout.indent : 0, layout.fontSize);
    ctx.y = renderUtil.mm(15, layout.fontSize) + layout.top;
    ctx.lines = [ctx.captureLine()];
}

function _cpysnapshot(ctx: Context, layout: ICompleteSnapshot) {
    "use strict";

    _.each(layout, (v, attrib) => {
        if ((<any>layout)[attrib] === null) {
            return;
        }
        switch (attrib) {
            case "fontSize": ctx.fontSize = layout.fontSize; break;
            case "initialX": ctx.initialX = layout.initialX; break;
            case "lines":
                ctx.lines = layout.lines;
                ctx.line = layout.lines.length - 1;
                _cpyline(ctx, ctx.lines[ctx.line]);
                break;
            case "lineSpacing": ctx.lineSpacing = layout.lineSpacing; break;
            case "maxX": ctx.maxX = layout.maxX; break;
            case "maxY": ctx.maxY = layout.maxY; break;
            case "pageSize": ctx.pageSize = layout.pageSize; break;
            case "partialLine": break; // skipped
            case "prevLine": break; // skipped
            case "timeSignature": ctx.timeSignature = layout.timeSignature; break;
            default: assert(false, "Not reached");
        }
    });
}

function _fillLayoutDefaults(opts: ILayoutOpts) {
    "use strict";

    opts.fontSize = opts.fontSize || 7;
    opts.pageSize = opts.pageSize || {
        height: 297,
        lilypondName: "a4",
        unit: "mm",
        width: 210
    };
    opts.leftMargin = opts.leftMargin || 15.25;
    opts.rightMargin = opts.rightMargin || 15.25;
    opts.top = opts.top || 2.75;
}

var MAX_LOCATION = new C.Location({
    bar: C.MAX_NUM,
    beat: C.MAX_NUM
});

var MIN_LOCATION = new C.Location({
    bar: -1,
    beat: -1
});
