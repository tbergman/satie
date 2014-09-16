/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import Model = require("./model");
import SongEditorStore = require("./songEditor");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

global.spliceTime = 0;

/**
 * Contexts are iterators in the annotation pipeline that hold information
 * such as the current beat, what accidentals have been set, and what
 * accidentals are present on other staffs.
 *
 * If you think of annotation as a 'reduce' on all the elements across staffs,
 * Context is the memo.
 */
class Context implements C.MetreContext {
    annotate(opts: C.IAnnotationOpts): C.IAnnotationResult {
        assert(!_ANNOTATING);
        _ANNOTATING = true;

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

        if (SongEditorStore.PROFILER_ENABLED) {
            var performanceStats = new PerformanceStats;
            for (var type in C.Type) {
                if (!isNaN(type)) {
                    performanceStats[type] = new AStats(type);
                }
            }
        }

        for (this._begin(); !this._atEnd(); this.idx = this._nextIndex(exitCode)) {

            /*
             * Debugging: Avoid infinite loops by aborting when we do 500x + 20
             * as many operations as we originally had items. Print the last 20
             * items.
             */
            ++operations;
            if (operations/initialLength > 500 && !stopping) {
                console.warn("Detected loop or severe inefficiency.");
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
             * custom actions have occurred.
             *
             * I'm sure this can be simplified, and a more sober Joshua should do so.
             */
            var shouldUpdateVC =
                (!pointerData && this.bar === cursor.bar &&
                    ((!cursor.beat && !cursor.annotatedObj) ||
                    this.beat === cursor.beat) &&
                    ((this.curr.isNote && !cursor.endMarker) || (cursor.endMarker &&
                    this.curr.type === C.Type.END_MARKER))) &&
                (cursorStave === sidx || this.bar > cursorBar || (cursorBar === this.bar &&
                        this.beat > cursorBeat)) &&
                (!cursor.annotatedObj);

            /*
             * THIS IS THE PART OF THE FUNCTION YOU CARE ABOUT!
             *
             * We usually call annotate() on the Model at this.curr. We can also
             * run a custom action (passed in as 'toolFn') to add a note, edit a note,
             * etc.
             */
            if (SongEditorStore.PROFILER_ENABLED) {
                var start = +(new Date());
                var causerType = this.curr.type;
            }

            if (doCustomAction) {
                // HACK HACK HACK -- we don't want to call annotate before the custom action,
                // but some actions expect a valid time signature.
                if (this.curr.type === C.Type.TIME_SIGNATURE) {
                    this.timeSignature = (<any>this.curr).timeSignature;
                }

                exitCode = toolFn(this.curr, this);
                pointerData = null;

                // Assume that the staves have been changed.
                Context.recordMetreData(this.staves);

                // All current operations can make changes that require slow mode for
                // up to 2 bars.
                enableFastModeAtBar = this.bar + 2;
            } else {
                if (stopping) {
                    console.log("Annotating @" + this.idx + " which is ", this.curr);
                }
                exitCode = this.curr.annotate(this, stopping);
                if (stopping) {
                    console.log("  => exit code:", C.IterationStatus[exitCode]);
                    if (!--stopping) {
                        assert(false, "Aborting.");
                    }
                }
            }

            if (SongEditorStore.PROFILER_ENABLED) {
                var time = +(new Date()) - start;
                var stats = performanceStats[causerType];
                stats.count++;
                stats.time += time;
                if (causerType !== this.curr.type) {
                    performanceStats[causerType].wasted += time;
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
                cursorBeat = this.beat;
                cursor.annotatedObj = this.curr;
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
            } else if (exitCode === C.IterationStatus.RETRY_PREVIOUS_LINE) {
                SongEditorStore.markRendererLineDirty(this.line, this.staveIdx);
                canExitAtNewline = false;
            } else if (exitCode === C.IterationStatus.RETRY_CURRENT_THEN_STOP) {
                // Force positions to stay the same, then enable this for a performance
                // boost.
                // canExitOnNextSuccess = true;
            }

            if (exitCode === C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS) {
                canExitAtNewline = false;
            }

            if (enableFastModeAtBar !== null && enableFastModeAtBar <= this.bar) {
                this.fast = true;
                enableFastModeAtBar = null;
            }

            if ((canExitAtNewline && !pointerData && this.curr && this.curr.type === C.Type.NEWLINE && cursor.annotatedObj) ||
                    (canExitOnNextSuccess && exitCode === C.IterationStatus.SUCCESS)) {
                _ANNOTATING = false;
                if (SongEditorStore.PROFILER_ENABLED) {
                    performanceStats.print();
                }
                return {
                    cursor: cursor,
                    operations: operations,
                    resetY: true,
                    semiJustificationDirty: false,
                    skip: true,
                    success: true
                };
            }

            if (exitCode !== C.IterationStatus.SUCCESS) {
                // Assume that the staves have been changed.
                // TODO: Optimize
                Context.recordMetreData(this.staves);
            }
        }

        _ANNOTATING = false;

        if (this.bar === 1 && !this.beat && !cursor.endMarker) {
            cursor.endMarker = true;
            this.idx = -1;
            if (SongEditorStore.PROFILER_ENABLED) {
                performanceStats.print();
            }
            return {
                cursor: cursor,
                operations: operations,
                resetY: true,
                semiJustificationDirty: true,
                skip: true,
                success: false
            };
        }

        if (SongEditorStore.PROFILER_ENABLED) {
            performanceStats.print();
        }
        return {
            cursor: cursor,
            operations: operations,
            resetY: false,
            semiJustificationDirty: true,
            skip: false,
            success: true
        };
    }

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
            indent: number;
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

        for (var i = 0; i < opts.staves.length; ++i) {
            if (opts.staves[i].body) {
                ++this.bodyCount;
            }
        }

        if (opts.snapshot) {
            var s = opts.snapshot;
            _.each(s, (val: any, key: string) => {
                self[key] = val;
            });
        } else {
            var initialX = renderUtil.mm(opts.leftMargin, opts.fontSize);
            var firstX = initialX +
                renderUtil.mm(opts.isFirstLine ? opts.indent : 0, opts.fontSize);

            this.accidentals = {};
            this.bar = 1;
            this.barlineX = [];
            this.beat = 0;
            this.count = 4;
            this.fontSize = opts.fontSize;
            this.initialX = initialX;
            this.line = 0;
            this.lineSpacing = 3.3*this.bodyCount;
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
                    beat: 0,
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
        // In particular, we do not want to stringify staffs, which are cyclic
        // and huge.
        var stave = this.stave;
        var staves = this.staves;
        var lines = this.lines;
        this.stave = null;
        this.staves = null;
        this.body = null;
        this.lines = [lines[this.line - 1], lines[this.line]];
        var ret = JSON.stringify(this);
        this.stave = stave;
        this.staves = staves;
        this.body = stave.body;
        this.lines = lines;
        return ret;
    }

    /*
     * ITEMS ON THE CURRENT STAVE
     */

    /**
     * Element at current index.
     */
    get curr(): Model {
        return this.body[this.idx];
    }

    /**
     * Returns the next element in the stave, skipping over beams by default.
     *
     * @param condition: Optional delegate accepting a Model. Returns false
     *     when it should be skipped.
     * @param skip: Start looking at Models <skip> after current.
     *     1 if unspecified.
     * @param allowBeams: True if beams should not be skipped.
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
        return C.IterationStatus.RETRY_FROM_ENTRY;
    }
    /**
     * Inserts an element somewhere BEFORE the current element.
     *
     * @param index The absolute position to insert an element at.
     *     By default, just before current position.
     */
    insertPast(obj: Model, index?: number): any {
        index = (index === null || index === undefined) ? this.idx : index;
        assert(index <= this.idx, "Otherwise, use 'insertFuture'");
        var t = +(new Date());
        this.body.splice(index, 0, obj);
        global.spliceTime += +(new Date()) - t;
        return this.idx === index ? C.IterationStatus.RETRY_CURRENT :
            C.IterationStatus.RETRY_FROM_ENTRY;
    }

    /**
     * Inserts an element somewhere AFTER the current element.
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

    /**
     * Iteration condition (for annotating)
     */
    private _atEnd() {
        return this.idx >= this.body.length;
    }

    /**
     * Start iterating through the stave (for annotating)
     */
    private _begin() {
        this.idx = this.start;
    }

    static recordMetreData(staves: Array<C.IStave>) {
        var anyChange = false;
        for (var i = 0; i < staves.length; ++i) {
            var body = staves[i].body;
            if (!body) { continue; }
            var mctx = new C.MetreContext;
            for (var j = 0; j < body.length; ++j) {
                var prevhash = body[j].ctxData && (body[j].ctxData.bar * 10000 +
                    body[j].ctxData.beat * 2 + (body[j].ctxData.endMarker ? 1 : 0));
                body[j].recordMetreDataImpl(mctx);
                var newhash = body[j].ctxData.bar * 10000 +
                    body[j].ctxData.beat * 2 + (body[j].ctxData.endMarker ? 1 : 0);
                anyChange = anyChange || prevhash !== newhash;
            }
        }

        if (!anyChange) {
            return;
        }

        console.log("Recalculating intersections");

        var activeModels: Array<Model> = [];
        var activeBodies: Array<C.IBody> = staves.filter(s => !!s.body).map(s => s.body);
        var activeIdxs = activeBodies.map(b => -1);
        var mctx = new C.MetreContext;
        var LARGE_NUM = 1000000;
        while (_.any(activeBodies, (b, idx) => (activeIdxs[idx] < b.length))) {
            mctx.bar = LARGE_NUM;
            mctx.beat = LARGE_NUM;
            for (var i = 0; i < activeBodies.length; ++i) {
                var item = activeBodies[i][activeIdxs[i] + 1];
                if (!item) { continue; }
                if (item.ctxData.bar < mctx.bar || item.ctxData.bar === mctx.bar && item.ctxData.beat <= mctx.beat) {
                    mctx.bar = item.ctxData.bar;
                    mctx.beat = item.ctxData.beat;
                }
            }

            activeModels = activeModels.filter(stillActive);
            var l = activeModels.length;

            for (var i = 0; i < activeBodies.length; ++i) {
                var item = activeBodies[i][activeIdxs[i] + 1];
                if (!item) {
                    activeIdxs[i] = activeBodies[i].length;
                    continue;
                }
                if (item.ctxData.bar === mctx.bar && item.ctxData.beat === mctx.beat || mctx.bar === LARGE_NUM) {
                    ++activeIdxs[i];
                    item.intersects = [];
                    activeModels.push(activeBodies[i][activeIdxs[i]]);
                }
            }

            for (var i = l; i < activeModels.length; ++i) {
                for (var j = 0; j < activeModels.length; ++j) {
                    activeModels[j].intersects.push(activeModels[i]);
                    activeModels[i].intersects.push(activeModels[j]);
                }
            }
        }

        function stillActive(obj: Model) {
            var fbeat = obj.ctxData.beat + obj.getBeats(obj.ctxData);
            var fbar = obj.ctxData.bar + Math.floor(fbeat / obj.ctxData.timeSignature.beats);
            fbeat %= obj.ctxData.timeSignature.beats;
            return mctx.bar < fbar || (fbar === mctx.bar && mctx.beat <= fbeat);
        }
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
            case C.IterationStatus.RETRY_FROM_ENTRY:
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
            case C.IterationStatus.RETRY_PREVIOUS_LINE:
                line = this.lines[this.line - 1];
                cpyline(this, line);
                while (i >= 0 && this.body[i].type !== C.Type.NEWLINE) {
                    --i;
                }
                --i;
                while (i >= 0 && this.body[i].type !== C.Type.NEWLINE) {
                    --i;
                }
                assert(i >= -1, "Is there really a previous line?");
                this.clef = null;
                break;
            case C.IterationStatus.LINE_REMOVED:
                line = this.lines[this.line - 1];
                cpyline(this, line);
                --i;
                this.clef = null;
                break;
            case C.IterationStatus.RETRY_BEAM:
                var SongEditorStore = require("./songEditor"); // Recursive dependency.
                this.beat = SongEditorStore.getBeamCount();
                --i;
                while (i >= 0 && this.body[i].type !== C.Type.BEAM_GROUP) {
                    --i;
                }
                this.x = this.body[i].x;
                --i;
                break;
            case C.IterationStatus.RETRY_CURRENT:
            case C.IterationStatus.RETRY_CURRENT_THEN_STOP:
            case C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS:
                i -= 1;
                break;
            default:
                assert(false, "Invalid exitCode");
        }

        return i + 1;
    }

    static semiJustify(contexts: Array<Context>) {
        return false;
        var NewlineModel = require("./newline"); // Recursive dependency.
        for (var i = 0; i < contexts.length; ++i) {
            var ctx = contexts[i];
            ctx.idx = ctx.body.length - 1;
            NewlineModel.semiJustify(ctx);
            ctx.idx = -1;
        }
    }

    get endMarker() {
        return this.curr.endMarker;
    }

    accidentals: C.IAccidentals;
    bar: number;
    barlineX: Array<number>;
    beat: number;
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
    bodyCount: number = 0;
    idx: number;
    renderKey_eInBar: { [key: string]: string };
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
            case "beat":
                ctx.beat = line.beat;
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

class AStats {
    constructor(type: C.Type) {
        this.type = type;
    }

    print() {
        console.log("stats for " + C.Type[this.type] + "\n\tcall: " + this.count + "\ttime: " + this.time +
            "\tpotentially wasted: " + this.wasted +
            "\n\tavgt: " + (this.count ? "" + Math.round(this.time / this.count * 1000) / 1000 : "not tested"));
    }

    count: number = 0;
    time: number = 0;
    wasted: number = 0;
    type: C.Type;
};

class PerformanceStats {
    [type: number]: AStats;

    print() {
        for (var n in this) {
            if (!isNaN(n)) {
                this[n].print();
            }
        }
    }
}

export = Context;
