/**
 * Contexts are iterators in the annotation pipeline that hold information
 * such as the current beat, what accidentals have been set, and what
 * accidentals are present on other staves.
 *
 * If you think of annotation as a 'reduce' on all the elements across staves,
 * Context is the memo.
 */

/// <reference path="lodash.d.ts" />
/// <reference path="timeSignature.ts" />

import _ = require("lodash");
import assert = require("assert");

import Contracts = require("./contracts");
import Model = require("./model");
import IterationStatus = require("./iterationStatus");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var _ANNOTATING = false; // To prevent annotate from being called recursively.

interface Part {
    idx: number;
    body: Array<Model>;
    beat: number;
    doIf: (action: () => any, condition: () => boolean) => any;
};

class Context {
    accidentals: Contracts.Accidentals;
    bar: number;
    barlineX: Array<number>
    beats: number;
    clef: string;
    count: number;
    fontSize: number;
    initialX: number;
    isBeam: boolean;
    keySignature: Contracts.KeySignature;
    line: number;
    lineSpacing: number;
    maxX: number;
    maxY: number;
    pageLines: Array<number>;
    pageSize: Contracts.PageSize;
    pageStarts: Array<number>
    prevClef: string;
    prevKeySignature: {};
    smallest: number;
    start: number;
    timeSignature: Contracts.TimeSignature;
    x: number;
    y: number;
    lines: Array<{ [keys: string]: any }>; // TSFIX
    stave: Contracts.Stave;
    staveIdx: number;
    staves: Array<Contracts.Stave>;
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
            isFirstLine?: boolean;
            staveIdx: number;
            snapshot?: string;
            top?: number;
            stave?: Contracts.Stave;
            staves: Array<Contracts.Stave>;
        }) {

        assert(opts instanceof Object, "opts is a required field");

        opts.fontSize = opts.fontSize || 7;
        opts.pageSize = opts.pageSize || {
            height: 297,
            lilypondName: "a4",
            unit: "mm",
            width: 210
        };
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
            var initialX = renderUtil.mm(15, opts.fontSize) + 1/4;
            var firstX = renderUtil.mm(opts.isFirstLine && !noMargin ? 30 : 15, opts.fontSize) + 1/4;

            this.accidentals = {};
            this.bar = 1;
            this.barlineX = [];
            this.beats = 0;
            this.count = 4;
            this.fontSize = opts.fontSize;
            this.initialX = initialX;
            this.line = 0;
            this.lineSpacing = 3.3;
            this.maxX = renderUtil.mm(opts.pageSize.width - 15, opts.fontSize);
            this.maxY = renderUtil.mm(opts.pageSize.height - 15, opts.fontSize);
            this.pageLines = [0];
            this.pageSize = opts.pageSize;
            this.pageStarts = [0];
            this.smallest = 10000;
            this.start = 0;
            this.x = firstX;
            this.y = renderUtil.mm(15, opts.fontSize) + opts.top;
            this.lines = [
                {
                    all: [],
                    accidentals: [],
                    bar: 1,
                    barlineX: [],
                    beats: 0,
                    line: 0,
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
        var stave = this.stave;
        var staves = this.staves;
        this.stave = null;
        this.staves = null;
        this.body = null;
        var ret = JSON.stringify(this);
        this.stave = stave;
        this.staves = staves;
        this.body = stave["body"];
        return ret;
    }

    calculateIntersections() {
        var BeamModel = require("./beamGroup");
        var TimeSignatureModel = require("./timeSignature");

        // XXX FIXME: Intersections will be incorrect if an incomplete bar exists!
        var genIterators =
            () => _(this.staves)
                .filter(s => s.body)
                .map((s: Contracts.Stave) => {return <Part> {
                    idx: 0,
                    body: s.body,
                    beat: 0,
                    doIf: (act, cond) => { if (cond()) { return act() }; }
                }})
                .value();

        for (var iterators = genIterators(); _.any(iterators, s => s.idx < s.body.length);) {
            _.each(iterators, s => s.doIf(
                () => {
                    s.body[s.idx].intersects = [];
                    ++s.idx;
                },
                () => s.idx < s.body.length));
        }

        var actives: Array<Contracts.ActiveIntersection> = [];
        var beat = 0;
        var impliedCount = 4;

        // The bars might not have been annotated yet, so it's possible we don't have
        // a time signature. We need an implied time signature to calculate bars.
        var impliedTS: Contracts.TimeSignature = { beatType: 4, beats: 4 };

        for(var iterators = genIterators(); _.any(iterators, s => s.idx < s.body.length);) {
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
                                if (s.body[s.idx].type === Contracts.ModelType.TIME_SIGNATURE) {
                                    // TSFIX
                                    impliedTS = (<any> s.body[s.idx]).timeSignature;
                                }
                                newActives.push(s.body[s.idx]);
                                allNewActives.push(s.body[s.idx]);
                                if (s.body[s.idx].type === Contracts.ModelType.BEAM_GROUP) {
                                    ++s.idx;
                                    continue;
                                }
                            } while (s.body[s.idx] && !s.body[s.idx].isNote);
                            actives = actives.concat(_.map(newActives, a => {
                                return {obj: a, expires: s.beat};
                            }));
                            if (s.body[s.idx]) {
                                assert(s.body[s.idx].isNote);
                                var pitch: Contracts.PitchDuration = <any> s.body[s.idx];
                                impliedCount = pitch.count || impliedCount;
                                s.beat = s.beat + pitch.getBeats(impliedCount, impliedTS);
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
    }

    /**
     * Start iterating through the stave (for annotating)
     */
    _begin() {
        this.idx = this.start;
    }
    /**
     * Iteration condition (for annotating)
     */
    _atEnd() {
        return this.idx >= this.body.length;
    }
    /**
     * Based on a return code, continue iterating through the stave.
     * For use in the SongEditor store.
     */
    _nextIndex(exitCode: IterationStatus) {
        var i = this.idx;
        var self: { [key: string]: any } = <any> this;

        switch (exitCode) {
        case IterationStatus.SUCCESS:
            return i + 1;
        case IterationStatus.RETRY_ENTIRE_DOCUMENT:
            return this.start;
        case IterationStatus.LINE_CREATED:
            var line = this.lines[this.line];
            _.each(line, (v, attrib) => {
                self[attrib] = line[attrib];
            });
            while (i >= 0 && this.body[i].type !== Contracts.ModelType.NEWLINE) {
                --i;
            }
            --i;
            while (i >= 0 && this.body[i].type !== Contracts.ModelType.NEWLINE) {
                --i;
            }
            assert(i >= -1, "Was a new line really created?");
            this.clef = null;
            break;
        case IterationStatus.RETRY_LINE:
            var line = this.lines[this.line];
            _.each(line, (v, attrib) => {
                self[attrib] = line[attrib];
            });
            --i;
            while (i >= 0 && this.body[i].type !== Contracts.ModelType.NEWLINE) {
                --i;
            }
            //assert(i === -1 || this.body[i]["DEBUG_line"] === this.line);
            this.clef = null;
            break;
        case IterationStatus.RETRY_BEAM:
            var SongEditorStore = require("./songEditor"); // Recursive dependency.
            this.beats = SongEditorStore.getBeamCount();
            --i;
            while (i >= 0 && this.body[i].type !== Contracts.ModelType.NEWLINE) {
                --i;
            }
            this.x = this.body[i].x();
            --i;
            break;
        case IterationStatus.RETRY_CURRENT:
            i -= 1;
            break;
        default:
            assert(false, "Invalid exitCode");
        }

        return i + 1;
    }

    annotate(opts: Contracts.AnnotationOpts): any /* TSFIX */ {
        assert(!_ANNOTATING);
        _ANNOTATING = true;

        this.calculateIntersections();
        var EndMarkerModel = require("./endMarker");
        var TimeSignatureModel = require("./timeSignature");
        var NewlineModel = require("./newline");

        opts = opts || <any> {}; // TSFIX
        var cursor: Contracts.VisualCursor = opts.cursor || <any> {}; // TSFIX
        var cursorBar = opts.cursorBar === undefined ? NaN : opts.cursorBar;
        var cursorBeat = opts.cursorBeat === undefined ? NaN : opts.cursorBeat;
        var cursorStave = opts.cursorStave === undefined ? NaN : opts.cursorStave;
        var dirty = opts.dirty || false;
        var exitCode: IterationStatus;
        var operations = 0;
        var pointerData = opts.pointerData || null;
        var sidx = opts.staveIdx || 0;
        var toolFn = opts.toolFn || null;
        var stopping = 0;
        var initialLength = this.body.length;

        for (this._begin(); !this._atEnd(); this.idx = this._nextIndex(exitCode)) {

            /*
             * Debugging: Avoid infinite loops by aborting when we do 500x + 20
             * as many operations as we originally had items. Print the last 20
             * items.
             */
            ++operations;
            if (operations/initialLength > 500 && !stopping) {
                console.warn("Detected loop or severe inefficency.");
                console.warn("Here are some conditions that need to be satisfied:");
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
                    this.curr()["endMarker"]))) &&
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
             * We usually call annotatei() on the Model at this.curr(). We can also
             * run a custom action (passed in as 'toolFn') to add a note, edit a note,
             * etc.
             */
            if (doCustomAction) {
                // HACK HACK HACK -- we don't want to call annotate, because we can't
                // process the exit code, but the note tools needs to have a valid timeSignature
                if (this.curr().type === Contracts.ModelType.TIME_SIGNATURE) {
                    this["timeSignature"] = (<any>this.curr()).timeSignature; // TSFIX
                }
                exitCode = toolFn(this.curr(), this);
                pointerData = undefined;
            } else {
                exitCode = this.curr().annotate(this, stopping);
                if (stopping && !--stopping) {
                    assert(false, "Aborting.");
                }
            }

            /*
             * We have to actually run annotate() before we can safely update the
             * annotated visual cursor information. We just called annotate(), so
             * this is the earliest we can do that.
             */
            shouldUpdateVC = shouldUpdateVC && exitCode === IterationStatus.SUCCESS;

            if (shouldUpdateVC) {
                cursorStave = sidx;
                cursorBar = this.bar;
                cursorBeat = this.beats;
                cursor.annotatedObj = this.curr();
                cursor.annotatedLine = this.line;
                cursor.annotatedPage = this.pageStarts.length - 1;
            }

            /*
             * We've just added a line. So we can't quit early (see the next section)
             */
            if (exitCode === IterationStatus.LINE_CREATED &&
                    toolFn && !dirty /* Why? */) {
                dirty = true;
                cursor.annotatedObj = null;
            }

            /*
             * This is a performance hack.
             *
             * When we're confident a custom action has only modified one line, there
             * is no need to continue annotating!
             */
            if (!doCustomAction && toolFn && !pointerData &&
                        this.curr().type === Contracts.ModelType.NEWLINE && !dirty &&
                    exitCode !== IterationStatus.LINE_CREATED) {
                this.idx = -1;
                _ANNOTATING = false; // This is a debug flag. Set to false when quitting.
                return {
                    cursor: cursor,
                    operations: operations,
                    skip: true,
                    success: true
                }
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

        var NewlineModel = require("./newline"); // Recursive dependency.
        NewlineModel.semiJustify(this);

        this.idx = -1;

        return {
            cursor: cursor,
            operations: operations,
            dirty: dirty,
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
        return this.body[this.nextIdx(cond, skip, allowBeams)];
    }
    nextIdx(cond?: (model: Model) => boolean, skip?: number, allowBeams?: boolean) {
        var BeamGroupModel = require("./beamGroup");
        var i: number;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        for (i = skip; this.body[this.idx + i] && (
            (this.body[this.idx + i].type === Contracts.ModelType.BEAM_GROUP && !allowBeams) ||
            (cond && !cond(this.body[this.idx + i]))); ++i) {
        }
        return this.idx + i;
    }
    beamFollows(idx?: number): Array<{ inBeam: boolean; }> {
        var BeamModel = require("./beamGroup");

        // Must return .beam
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        return (this.body[idx + 1].type === Contracts.ModelType.BEAM_GROUP) ?
            (<any>this.body[idx + 1]).beam : null
    }
    removeFollowingBeam(idx?: number, past?: boolean): IterationStatus {
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
    prev() {
        return this.body[this.idx - 1];
    }

    eraseCurrent(): IterationStatus {
        this.body.splice(this.idx, 1);
        return IterationStatus.RETRY_CURRENT;
    }
    eraseFuture(idx: number): IterationStatus {
        assert(idx > this.idx, "Invalid use of eraseFuture");
        this.body.splice(idx, 1);
        return IterationStatus.SUCCESS;
    }
    erasePast(idx: number): IterationStatus {
        assert(idx <= this.idx, "Invalid use of erasePast");
        this.body.splice(idx, 1);
        return IterationStatus.RETRY_ENTIRE_DOCUMENT;
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
        return this.idx === idx ? IterationStatus.RETRY_CURRENT :
            IterationStatus.RETRY_ENTIRE_DOCUMENT;
    }
    /**
     * Inserts an element somewhere AFTER the current element.
     *
     * @param{num} idx: The absolute position to insert an element at.
     *     By default, one after current position.
     */
    insertFuture(obj: Model, idx?: number): IterationStatus {
        idx = (idx === null || idx === undefined) ? (this.idx + 1) : idx;
        assert(idx > this.idx, "Otherwise, use 'insertPast'");
        this.body.splice(idx, 0, obj);
        return IterationStatus.SUCCESS;
    }

    /**
     * STAVES
     */
    currStave(): Contracts.Stave {
        return this.stave;
    }
    nextStave(): Contracts.Stave {
        return this.staves[this.staveIdx + 1];
    }
    prevStave(): Contracts.Stave {
        return this.staves[this.staveIdx - 1];
    }
}

export = Context;
