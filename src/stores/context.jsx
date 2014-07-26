/**
 * Contexts are iterators in the annotation pipeline that hold information
 * such as the current beat, what accidentals have been set, and what
 * accidentals are present on other staves.
 *
 * If you think of annotation as a 'reduce' on all the elements across staves,
 * Context is the memo.
 */

var _ = require("lodash");
var assert = require("assert");

var renderUtil = require("ripienoUtil/renderUtil.jsx");

class Context {
    constructor(opts) {
        assert(opts instanceof Object, "opts is a required field");

        opts.firstLine = opts.firstLine || true;
        opts.fontSize = opts.fontSize || 7;
        opts.pageSize = opts.pageSize || {
            height: 297,
            lilypondName: "a4",
            unit: "mm",
            width: 210
        };
        opts.top = opts.top || 2.75;

        if (opts.snapshot) {
            var s = JSON.parse(opts.snapshot);
            _.each(s, (val, key) => {
                this[key] = val;
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

        if (this.stave.body && this.stave.body.length && !this.stave.body[0].intersects) {
            this.calculateIntersections();
        }
    }

    /**
     * Return a string identifying the current state of the cursor.
     * Used to avoid re-annotating everything when only a line or a set
     * of lines have changed.
     */
    get snapshot() {
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

    calculateIntersections() {
        // XXX FIXME: Intersections will be incorrect if an incomplete bar exists!
        var genIterators =
            () => _(this.staves)
                .filter(s => s.body)
                .map(s => {return {
                    idx: 0,
                    body: s.body,
                    beat: 0,
                    doIf: (act, cond) => {if (cond()) { return act() };}
                }})
                .value();

        for(var iterators = genIterators(); _.any(iterators, s => s.idx < s.body.length);) {
            _.each(iterators, s => s.doIf(
                () => {
                    s.body[s.idx].intersects = [];
                    ++s.idx;
                },
                () => s.idx < s.body.length));
        }
        
        var actives = [];
        var beat = 0;
        var impliedCount = 4;
        for(var iterators = genIterators(); _.any(iterators, s => s.idx < s.body.length);) {
            var allNewActives = [];
            _(iterators)
                .map((s, sidx) => s.doIf(
                    () => {
                        if (beat === s.beat) {
                            var newActives = [];
                            do {
                                ++s.idx;
                                if (!s.body[s.idx]) {
                                    break;
                                }
                                newActives.push(s.body[s.idx]);
                                allNewActives.push(s.body[s.idx]);
                                if (s.body[s.idx].beam) {
                                    ++s.idx;
                                    continue;
                                }
                            } while(s.body[s.idx] && !s.body[s.idx].getBeats);
                            actives = actives.concat(_.map(newActives, a => {
                                return {obj: a, expires: s.beat};
                            }));
                            if (s.body[s.idx]) {
                                impliedCount = s.body[s.idx].count || impliedCount;
                                s.beat = s.beat + s.body[s.idx].getBeats(impliedCount);
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
    _nextIndex(exitCode) {
        var i = this.idx;

        switch(exitCode) {
        case true:
            // All of the pre-conditions of the object were met, and
            // annotations have been added.
            return i + 1;
        case false:
            // At least one of the pre-conditions of the object were
            // not met and the entire document must be rerendered.
            return this.start;
        case "line_created":
            // A line break was added somewhere to the current line
            // The current line must be re-rendered...
            var line = this.lines[this.line];
            _.each(line, (v, attrib) => {
                this[attrib] = line[attrib];
            });
            while (i >= 0 && !this.body[i].newline) {
                --i;
            }
            --i;
            while (i >= 0 && !this.body[i].newline) {
                --i;
            }
            assert(i >= -1, "Was a new line really created?");
            this.clef = null;
            break;
        case "line":
            // At least one of the pre-conditions of the object were
            // not met and the entire line must be rerendered.
            var line = this.lines[this.line];
            _.each(line, (v, attrib) => {
                this[attrib] = line[attrib];
            });
            --i;
            while (i >= 0 && !this.body[i].newline) {
                --i;
            }
            this.clef = null;
            break;
        case "beam":
            // The beam needs to be re-rendered.
            this.beats = _beamBeatCount;
            --i;
            while(i >= 0 && !this.body[i].beam) {
                --i;
            }
            this.x = this.body[i].x();
            --i;
            break;
        case -1:
            // At least one of the pre-conditions of the object were
            // not met and an item has been inserted in place of the
            // current item.
            i += exitCode;
            break;
        default:
            assert(false, "Invalid exitCode");
        }

        return i + 1;
    }

    annotate(opts) {
        opts = opts || {};
        var cursor = opts.cursor || {};
        var cursorBar = opts.cursorBar === undefined ? NaN : opts.cursorBar;
        var cursorBeat = opts.cursorBeat === undefined ? NaN : opts.cursorBeat;
        var cursorStave = opts.cursorStave === undefined ? NaN : opts.cursorStave;
        var dirty = opts.dirty || false;
        var exitCode;
        var operations = 0;
        var pointerData = opts.pointerData || null;
        var sidx = opts.staveIdx || 0;
        var toolFn = opts.toolFn || null;
        var stopping = false;
        var initialLength = this.body.length;

        for (this._begin(); !this._atEnd(); this.idx = this._nextIndex(exitCode)) {

            ++operations;
            if (operations/initialLength > 500 && !stopping) {
                console.warn("Detected loop or severe inefficency.");
                console.warn("Here are some conditions that need to be satisfied:");
                stopping = 20;
            }

            var doCustomAction = pointerData && (this.body[this.idx] === pointerData.obj ||
                    (pointerData.obj && pointerData.obj.placeholder &&
                        pointerData.obj.idx === this.idx));

            if (!pointerData && this.bar === cursor.bar &&
                    ((!cursor.beat && !cursor.annotatedObj) ||
                        this.beats === cursor.beat) &&
                    (((this.body[this.idx].pitch || this.body[this.idx].chord) &&
                        !cursor.endMarker) || (cursor.endMarker &&
                        this.body[this.idx].endMarker))) {

                if (cursorStave === sidx || this.bar > cursorBar || (cursorBar === this.bar &&
                        this.beats > cursorBeat)) {
                    if (!cursor.annotatedObj) {
                        // XXX: ROBUSTNESS
                        cursorStave = sidx;
                        cursorBar = this.bar;
                        cursorBeat = this.beats;
                        cursor.annotatedObj = this.body[this.idx];
                        cursor.annotatedLine = this.line;
                    }
                }
            }

            this.body[this.idx].ctxData = {
                bar: this.bar,
                beat: this.beats,
                    // TODO: Move into the bridge layer
                endMarker: this.body[this.idx].endMarker
            };

            if (doCustomAction) {
                exitCode = toolFn(this.body[this.idx], this);
                pointerData = undefined;
            } else {
                exitCode = this.body[this.idx].annotate(this, stopping);
                if (stopping && !--stopping) {
                    assert(false, "Aborting.");
                }
            }

            if (!doCustomAction &&
                    toolFn &&
                    !pointerData &&
                    this.body[this.idx].newline &&
                    !dirty &&
                    exitCode !== "line_created") {
                this.idx = -1;
                return {
                    cursor: cursor,
                    operations: operations,
                    skip: true,
                    success: true
                }
            }

            if (exitCode === "line_created" && toolFn) {
                // ... and so must everything else
                dirty = true;
                toolFn = false;
            }
        }
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

        var NewlineModel = require("../stores/newline.jsx");
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
    get curr() {
        return this.body[this.idx];
    }
    /**
     * Returns the next element in the stave, skipping over beams.
     *
     * @param{fn} cond: Optional delegate accepting a Model. Returns false
     *     when it should be skipped.
     * @param{num} skip: Start looking at Models <skip> after current.
     *     1 if unspecified.
     */
    next(cond, skip, allowBeams) {
        var i;
        skip = (skip === undefined || skip === null) ? 1 : skip;
        for (i = skip; this.body[this.idx + i] && (
            (this.body[this.idx + i].beam && !allowBeams) ||
            (cond && !cond(this.body[this.idx + i]))); ++i) {
        }
        return this.body[this.idx + i];
    }
    beamFollows(idx) {
        // Must return .beam
        if (idx === null || idx === undefined) {
            idx = this.idx;
        }
        return this.body[idx + 1] && this.body[idx + 1].beam;
    }
    removeFollowingBeam(idx, past) {
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
    get prev() {
        return this.body[this.idx - 1];
    }

    eraseCurrent() {
        this.body.splice(this.idx, 1);
        return -1;
    }
    eraseFuture(idx) {
        assert(idx > this.idx, "Invalid use of eraseFuture");
        this.body.splice(idx, 1);
        return true;
    }
    erasePast(idx) {
        assert(idx <= this.idx, "Invalid use of erasePast");
        this.body.splice(idx, 1);
        return false;
    }
    /**
     * Inserts an element somewhere BEFORE the current element.
     *
     * @param{num} idx: The absolute position to insert an element at.
     *     By default, just before current position.
     */
    insertPast(obj, idx) {
        idx = (idx === null || idx === undefined) ? this.idx : idx;
        assert(idx <= this.idx, "Otherwise, use 'insertFuture'");
        this.body.splice(idx, 0, obj);
        return this.idx === idx ? -1 : false;
    }
    /**
     * Inserts an element somewhere AFTER the current element.
     *
     * @param{num} idx: The absolute position to insert an element at.
     *     By default, one after current position.
     */
    insertFuture(obj, idx) {
        idx = (idx === null || idx === undefined) ? (this.idx + 1) : idx;
        assert(idx > this.idx, "Otherwise, use 'insertPast'");
        this.body.splice(idx, 0, obj);
        return true;
    }

    /**
     * STAVES
     */
    get currStave() {
        return this.stave;
    }
    get nextStave() {
        return this.staves[this.staveIdx + 1];
    }
    get prevStave() {
        return this.staves[this.staveIdx - 1];
    }
}

module.exports = Context;
