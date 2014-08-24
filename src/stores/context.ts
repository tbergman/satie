/**
 * Contexts are iterators in the annotation pipeline that hold information
 * such as the current beat, what accidentals have been set, and what
 * accidentals are present on other staves.
 *
 * If you think of annotation as a 'reduce' on all the elements across staves,
 * Context is the memo.
 */

/// <reference path="../../references/lodash.d.ts" />

import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import Model = require("./model");
import SongEditorStore = require("./songEditor");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

class Context {
    accidentals: C.IAccidentals;
    bar: number;
    barlineX: Array<number>;
    beats: number;
    clef: string;
    count: number;
    fast: boolean;
    fontSize: number;
    initialX: number;
    isBeam: boolean;
    keySignature: C.IKeySignature;
    line: number;
    lineSpacing: number;
    maxX: number;
    maxY: number;
    pageLines: Array<number>;
    pageSize: C.IPageSize;
    pageStarts: Array<number>;
    prevClef: string;
    prevKeySignature: C.IKeySignature;
    smallest: number;
    start: number;
    timeSignature: C.ITimeSignature;
    x: number;
    y: number;
    lines: Array<C.ILineSnapshot>;
    stave: C.IStave;
    staveIdx: number;
    staves: Array<C.IStave>;
    body: Array<Model>;
    idx: number;
    renderKey_eInBar: { [key: string]: string };

    constructor(
        opts: {
            fontSize?: number;
            pageSize?: {
                height: number;
                lilypondName: string;
                unit: string;
                width: number;
            };
            leftMargin?: number;
            rightMargin?: number;
            isFirstLine?: boolean;
            staveIdx: number;
            snapshot?: string;
            top?: number;
            stave?: C.IStave;
            staves: Array<C.IStave>;
        }) {

        assert(opts instanceof Object, "opts is a required field");

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

        var self: { [index: string]: any } = <any> this;

        if (opts.snapshot) {
            var s = JSON.parse(opts.snapshot);
            _.each(s, (val: any, key: string) => {
                self[key] = val;
            });
        } else {
            var noMargin = false;
            if (typeof window === "undefined" ||
                    global.location.href.indexOf("/scales/") !== -1) {
                // XXX: HACK!!!
                noMargin = true;
            }
            var initialX = renderUtil.mm(opts.leftMargin, opts.fontSize);
            var firstX = initialX +
                renderUtil.mm(opts.isFirstLine && !noMargin ? 15 : 0, opts.fontSize);

            this.accidentals = {};
            this.bar = 1;
            this.barlineX = [];
            this.beats = 0;
            this.count = 4;
            this.fontSize = opts.fontSize;
            this.initialX = initialX;
            this.line = 0;
            this.lineSpacing = 3.3;
            this.maxX = renderUtil.mm(opts.pageSize.width - opts.rightMargin, opts.fontSize);
            this.maxY = renderUtil.mm(opts.pageSize.height - 15, opts.fontSize);
            this.pageLines = [0];
            this.pageSize = opts.pageSize;
            this.pageStarts = [0];
            this.smallest = 10000;
            this.start = 0;
            this.x = firstX;
            this.y = renderUtil.mm(15, opts.fontSize) + opts.top;
            this.lines = [
                <C.ILineSnapshot> {
                    accidentals: {},
                    all: [],
                    bar: 1,
                    barlineX: [],
                    beats: 0,
                    keySignature: null,
                    line: 0,
                    pageLines: null,
                    pageStarts: null,
                    x: firstX,
                    y: renderUtil.mm(15, opts.fontSize) + opts.top
                }
            ];
        }

        this.stave = opts.stave || opts.staves[opts.staveIdx];
        assert(this.stave instanceof Object, "either opts.stave or opts.staveIdx&stave are required");
        this.staveIdx = opts.staveIdx;
        this.staves = opts.staves;
        this.body = this.stave.body;
        this.idx = -1;
    }

    /**
     * Return a string identifying the current state of the cursor.
     * Used to avoid re-annotating everything when only a line or a set
     * of lines have changed.
     */
    snapshot() {
        // In particular, we do not want to stringify staves, which are cyclic
        // and huge.
        var stave = this.stave;
        var staves = this.staves;
        this.stave = null;
        this.staves = null;
        this.body = null;
        var ret = JSON.stringify(this);
        this.stave = stave;
        this.staves = staves;
        this.body = stave.body;
        return ret;
    }

    private _calculateIntersections() {
        var genIterators =
            () => _(this.staves)
                .filter(s => s.body)
                .map((s: C.IStave) => {
                    return <IPart> {
                        idx: 0,
                        body: s.body,
                        beat: 0,
                        doIf: (act, cond) => { if (cond()) { return act(); }; }
                    };
                })
                .value();

        var iterators: Array<IPart>;

        for (iterators = genIterators(); _.any(iterators, s => s.idx < s.body.length);) {
            _.each(iterators, s => s.doIf(
                () => {
                    s.body[s.idx].intersects = [];
                    ++s.idx;
                },
                () => s.idx < s.body.length));
        }

        var actives: Array<C.IActiveIntersection> = [];
        var beat = 0;
        var impliedCount = 4;

        // The bars might not have been annotated yet, so it's possible we don't have
        // a time signature. We need an implied time signature to calculate bars.
        var tsBackup = this.timeSignature;
        this.timeSignature = { beatType: 4, beats: 4 };

        for(iterators = genIterators(); _.any(iterators, s => s.idx < s.body.length);) {
            var allNewActives: Array<Model> = [];
            _(iterators)
                .map((s, sidx) => s.doIf(
                    () => {
                        if (beat === s.beat) {
                            var newActives: Array<Model> = [];
                            do {
                                ++s.idx;
                                if (!s.body[s.idx]) {
                                    break;
                                }
                                if (s.body[s.idx].type === C.Type.TIME_SIGNATURE) {
                                    this.timeSignature = s.body[s.idx].timeSignature;
                                }
                                newActives.push(s.body[s.idx]);
                                allNewActives.push(s.body[s.idx]);
                                if (s.body[s.idx].type === C.Type.BEAM_GROUP) {
                                    ++s.idx;
                                    continue;
                                }
                            } while (s.body[s.idx] && !s.body[s.idx].isNote);

                            actives = actives.concat(_.map(newActives, a => {
                                return {obj: a, expires: s.beat};
                            }));

                            if (s.body[s.idx]) {
                                assert(s.body[s.idx].isNote);
                                var pitch: C.IPitchDuration = <any> s.body[s.idx];
                                impliedCount = pitch.count || impliedCount;
                                s.beat = s.beat + pitch.getBeats(this, impliedCount);
                            } else {
                                s.beat = undefined;
                            }
                        }
                    },
                    () => s.idx < s.body.length))
                .filter(s => s)
                .value();

            var increment = _(iterators)
                .map(s => s.beat)
                .filter(s => s !== null && !isNaN(s))
                .sort((a, b) => a - b)
                .value();

            beat = increment[0]; // lowest

            _.each(actives, a => a.obj.intersects = a.obj.intersects.concat(allNewActives));

            actives = _.filter(actives, a => a.expires > beat);
        }

        this.timeSignature = tsBackup; // The context can be reused.
    }

    /**
     * Start iterating through the stave (for annotating)
     */
    private _begin() {
        this.idx = this.start;
    }
    /**
     * Iteration condition (for annotating)
     */
    private _atEnd() {
        return this.idx >= this.body.length;
    }
    /**
     * Based on a return code, continue iterating through the stave.
     * For use in the SongEditor store.
     */
    private _nextIndex(exitCode: C.IterationStatus) {
        var i = this.idx;
        var line: C.ILineSnapshot;

        switch (exitCode) {
            case C.IterationStatus.SUCCESS:
                return i + 1;
            case C.IterationStatus.RETRY_ENTIRE_DOCUMENT:
                return this.start;
            case C.IterationStatus.LINE_CREATED:
                line = this.lines[this.line];
                cpyline(this, line);
                if ((<any>line).DEBUG_line) {
                    assert(this.line === (<any>line).DEBUG_line);
                }
                while (i >= 0 && this.body[i].type !== C.Type.NEWLINE) {
                    --i;
                }
                --i;
                while (i >= 0 && this.body[i].type !== C.Type.NEWLINE) {
                    --i;
                }
                assert(i >= -1, "Was a new line really created?");
                this.clef = null;
                break;
            case C.IterationStatus.RETRY_LINE:
                line = this.lines[this.line];
                cpyline(this, line);
                --i;
                while (i >= 0 && this.body[i].type !== C.Type.NEWLINE) {
                    --i;
                }
                this.clef = null;
                break;
            case C.IterationStatus.RETRY_BEAM:
                var SongEditorStore = require("./songEditor"); // Recursive dependency.
                this.beats = SongEditorStore.getBeamCount();
                --i;
                while (i >= 0 && this.body[i].type !== C.Type.BEAM_GROUP) {
                    --i;
                }
                this.x = this.body[i].x();
                --i;
                break;
            case C.IterationStatus.RETRY_CURRENT:
            case C.IterationStatus.RETRY_CURRENT_THEN_STOP:
                i -= 1;
                break;
            default:
                assert(false, "Invalid exitCode");
        }

        return i + 1;
    }

    annotate(opts: C.IAnnotationOpts): any /* TSFIX */ {
        assert(!_ANNOTATING);
        _ANNOTATING = true;

        this._calculateIntersections();
        var NewlineModel = require("./newline");

        opts = opts || <any> {}; // TSFIX
        var cursor: C.IVisualCursor = opts.cursor || <any> {}; // TSFIX
        var cursorBar = opts.cursorBar === undefined ? NaN : opts.cursorBar;
        var cursorBeat = opts.cursorBeat === undefined ? NaN : opts.cursorBeat;
        var cursorStave = opts.cursorStave === undefined ? NaN : opts.cursorStave;
        var exitCode: C.IterationStatus;
        var operations = 0;
        var pointerData = opts.pointerData || null;
        var sidx = opts.staveIdx || 0;
        var toolFn = opts.toolFn || null;
        var stopping = 0;
        var initialLength = this.body.length;
        var enableFastModeAtBar: number = null;
        var canExitAtNewline = !!opts.toolFn;
        var canExitOnNextSuccess = false;

        for (this._begin(); !this._atEnd(); this.idx = this._nextIndex(exitCode)) {

            /*
             * Debugging: Avoid infinite loops by aborting when we do 500x + 20
             * as many operations as we originally had items. Print the last 20
             * items.
             */
            ++operations;
            if (operations/initialLength > 500 && !stopping) {
                console.warn("Detected loop or severe inefficency.");
                console.warn("Going into verbose mode for 20 elements, then stopping.");
                stopping = 20;
            }

            /*
             * Custom actions are things such as inserting a note.
             */
            var doCustomAction = pointerData &&
                pointerData.staveIdx === sidx &&
                (this.body[this.idx] === pointerData.obj ||
                    (pointerData.obj && pointerData.obj.placeholder &&
                        pointerData.obj.idx === this.idx));

            /*
             * The visual cursor requires the current object, the current index, and
             * the current page. We need to check if we should update the visual cursor
             * before doing the action as doing an action removes information.
             *
             * The visual cursor needs to be updated on (a) initial page load and (b) when
             * custom actions have occured.
             *
             * I'm sure this can be simplied, and a more sober Joshua should do so.
             */
            var shouldUpdateVC =
                (!pointerData && this.bar === cursor.bar &&
                    ((!cursor.beat && !cursor.annotatedObj) ||
                    this.beats === cursor.beat) &&
                    ((this.curr().isNote && !cursor.endMarker) || (cursor.endMarker &&
                    this.curr().type === C.Type.END_MARKER))) &&
                (cursorStave === sidx || this.bar > cursorBar || (cursorBar === this.bar &&
                        this.beats > cursorBeat)) &&
                (!cursor.annotatedObj);

            /*
             * Context data is used throughout Ripieno to avoid the need to reannotate
             * (or duplicate a similar procedure) to calculate what beat/bar a note is
             * in.
             */
            this.curr().ctxData = {
                bar: this.bar,
                beat: this.beats,
                    // TODO: Move into the bridge layer
                endMarker: this.curr().endMarker
            };

            /*
             * THIS IS THE PART OF THE FUNCTION YOU CARE ABOUT!
             *
             * We usually call annotate() on the Model at this.curr(). We can also
             * run a custom action (passed in as 'toolFn') to add a note, edit a note,
             * etc.
             */
            if (doCustomAction) {
                // HACK HACK HACK -- we don't want to call annotate, because we can't
                // process the exit code, but the note tools needs to have a valid timeSignature
                if (this.curr().type === C.Type.TIME_SIGNATURE) {
                    this.timeSignature = (<any>this.curr()).timeSignature;
                }
                exitCode = toolFn(this.curr(), this);
                pointerData = null;

                // All current operations can make changes that require slow mode for
                // up to 2 bars.
                enableFastModeAtBar = this.bar + 2;
            } else {
                if (stopping) {
                    console.log("Annotating @" + this.idx + " which is ", this.curr());
                }
                exitCode = this.curr().annotate(this, stopping);
                if (stopping) {
                    console.log("  => exit code:", C.IterationStatus[exitCode]);
                    if (!--stopping) {
                        assert(false, "Aborting.");
                    }
                }
            }

            /*
             * We have to actually run annotate() before we can safely update the
             * annotated visual cursor information. We just called annotate(), so
             * this is the earliest we can do that.
             */
            shouldUpdateVC = shouldUpdateVC && exitCode === C.IterationStatus.SUCCESS;

            if (shouldUpdateVC) {
                cursorStave = sidx;
                cursorBar = this.bar;
                cursorBeat = this.beats;
                cursor.annotatedObj = this.curr();
                cursor.annotatedLine = this.line;
                cursor.annotatedPage = this.pageStarts.length - 1;
            }

            if (exitCode === C.IterationStatus.LINE_CREATED) {
                if (this.line === cursor.annotatedLine) {
                    cursor.annotatedLine = null;
                    cursor.annotatedObj = null;
                    cursor.annotatedPage = null;
                }
                SongEditorStore.markRendererLineDirty(this.line, this.staveIdx);
                canExitAtNewline = false;
            } else if (exitCode === C.IterationStatus.RETRY_CURRENT_THEN_STOP) {
                // Force positions to stay the same, then enable this for a performance
                // boost.
                // canExitOnNextSuccess = true;
            }

            if (enableFastModeAtBar !== null && enableFastModeAtBar <= this.bar) {
                this.fast = true;
                enableFastModeAtBar = null;
            }

            if ((canExitAtNewline && !pointerData && this.curr().type === C.Type.NEWLINE) ||
                (canExitOnNextSuccess && exitCode === C.IterationStatus.SUCCESS)) {
                _ANNOTATING = false;
                return {
                    cursor: cursor,
                    operations: operations,
                    resetY: true,
                    skip: true,
                    success: true
                };
            }
        }

        _ANNOTATING = false;

        if (this.bar === 1 && !this.beats && !cursor.endMarker) {
            cursor.endMarker = true;
            this.idx = -1;
            return {
                cursor: cursor,
                resetY: true,
                skip: true,
                success: false
            };
        }

        this.idx = this.body.length - 1;

        NewlineModel.semiJustify(this);

        this.idx = -1;

        return {
            cursor: cursor,
            operations: operations,
            success: true
        };
    }

    /**
     * ITEMS ON THE CURRENT STAVE
     */
    curr() {
        return this.body[this.idx];
    }
    /**
     * Returns the next element in the stave, skipping over beams by default.
     *
     * @param{fn} cond: Optional delegate accepting a Model. Returns false
     *     when it should be skipped.
     * @param{num} skip: Start looking at Models <skip> after current.
     *     1 if unspecified.
     * @param{bool} allowBeams: True if beams should not be skipped.
     */
    next(cond?: (model: Model) => boolean, skip?: number, allowBeams?: boolean) {
        // Don't ask me why, but doing this.body[nextIdx...] is 10x slower!
        var i: number;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        i = skip;
        while (this.body[this.idx + i] && (
                (this.body[this.idx + i].type === C.Type.BEAM_GROUP && !allowBeams) ||
                (cond && !cond(this.body[this.idx + i])))) {
            ++i;
        }
        return this.body[this.idx + i];
    }
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
    beamFollows(idx?: number): Array<{ inBeam: boolean; }> {
        // Must return .beam
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        return (this.body[idx + 1].type === C.Type.BEAM_GROUP) ?
            (<any>this.body[idx + 1]).beam : null;
    }
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

    eraseCurrent(): C.IterationStatus {
        this.body.splice(this.idx, 1);
        return C.IterationStatus.RETRY_CURRENT;
    }
    eraseFuture(idx: number): C.IterationStatus {
        assert(idx > this.idx, "Invalid use of eraseFuture");
        this.body.splice(idx, 1);
        return C.IterationStatus.SUCCESS;
    }
    erasePast(idx: number): C.IterationStatus {
        assert(idx <= this.idx, "Invalid use of erasePast");
        this.body.splice(idx, 1);
        return C.IterationStatus.RETRY_ENTIRE_DOCUMENT;
    }
    /**
     * Inserts an element somewhere BEFORE the current element.
     *
     * @param{num} idx: The absolute position to insert an element at.
     *     By default, just before current position.
     */
    insertPast(obj: Model, idx?: number): any {
        idx = (idx === null || idx === undefined) ? this.idx : idx;
        assert(idx <= this.idx, "Otherwise, use 'insertFuture'");
        this.body.splice(idx, 0, obj);
        return this.idx === idx ? C.IterationStatus.RETRY_CURRENT :
            C.IterationStatus.RETRY_ENTIRE_DOCUMENT;
    }
    /**
     * Inserts an element somewhere AFTER the current element.
     *
     * @param{num} idx: The absolute position to insert an element at.
     *     By default, one after current position.
     */
    insertFuture(obj: Model, idx?: number): C.IterationStatus {
        idx = (idx === null || idx === undefined) ? (this.idx + 1) : idx;
        assert(idx > this.idx, "Otherwise, use 'insertPast'");
        this.body.splice(idx, 0, obj);
        return C.IterationStatus.SUCCESS;
    }

    /**
     * STAVES
     */
    currStave(): C.IStave {
        return this.stave;
    }
    nextStave(): C.IStave {
        return this.staves[this.staveIdx + 1];
    }
    prevStave(): C.IStave {
        return this.staves[this.staveIdx - 1];
    }
}

var _ANNOTATING = false; // To prevent annotate from being called recursively.

interface IPart {
    idx: number;
    body: Array<Model>;
    beat: number;
    doIf: (action: () => any, condition: () => boolean) => any;
};

function cpyline(ctx: Context, line: C.ILineSnapshot) {
    "use strict";

    _.each(line, (v, attrib) => {
        if ((<any>line)[attrib] === null) {
            return;
        }
        switch (attrib) {
            case "accidentals":
                ctx.accidentals = line.accidentals;
                break;
            case "all":
                (<any>ctx).all = (<any>line).all;
                break;
            case "bar":
                ctx.bar = line.bar;
                break;
            case "barlineX":
                ctx.barlineX = line.barlineX;
                break;
            case "beats":
                ctx.beats = line.beats;
                break;
            case "keySignature":
                ctx.keySignature = line.keySignature;
                break;
            case "line":
                ctx.line = line.line;
                break;
            case "pageLines":
                ctx.pageLines = line.pageLines;
                break;
            case "pageStarts":
                ctx.pageStarts = line.pageStarts;
                break;
            case "x":
                ctx.x = line.x;
                break;
            case "y":
                ctx.y = line.y;
                break;
            default:
                assert(false, "Not reached");
        }
    });
}

export = Context;
