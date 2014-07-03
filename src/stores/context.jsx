/**
 * The state of the SongEditor pipeline.
 *
 * If you think of annotation as a 'reduce' on all the elements across staves,
 * Context is the memo.
 */

var _ = require("underscore");
var assert = require("assert");

var renderUtil = require("../renderer/util.jsx");

class Context {
    constructor(opts) {
        //start, fontSize, first, pageSize, stave) {
        //
        if (opts.snapshot) {
            var s = JSON.parse(opts.snapshot);
            _.forEach(s, (val, key) => {
                this[key] = val;
            });
        } else {
            var noMargin = false;
            if (typeof window !== "undefined" &&
                    window.location.href.indexOf("/scales/") !== -1) {
                // XXX: HACK!!!
                noMargin = true;
            }
            var initialX = renderUtil.mm(15, opts.fontSize) + 1/4;
            var firstX = renderUtil.mm(opts.first && !noMargin ? 30 : 15, opts.fontSize) + 1/4;

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
            this.y = renderUtil.mm(15, opts.fontSize) + opts.start;
            this.lines = [
                {
                    all: [],
                    accidentals: [],
                    bar: 1,
                    barlineX: [],
                    beats: 0,
                    line: 0,
                    x: firstX,
                    y: renderUtil.mm(15, opts.fontSize) + opts.start
                }
            ];
        }

        this.stave = opts.stave;
        this.body = this.stave.body;
        this.idx = -1;
    }

    get snapshot() {
        var stave = this.stave;
        this.stave = null;
        this.body = null;
        var ret = JSON.stringify(this);
        this.stave = stave;
        this.body = stave.body;
        return ret;
    }

    begin() {
        this.idx = this.start;
    }
    atEnd() {
        return this.idx >= this.body.length;
    }
    nextIndex(exitCode) {
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
            _(line).each((v, attrib) => {
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
            _(line).each((v, attrib) => {
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

    get curr() {
        return this.body[this.idx];
    }
    next(cond) {
        var i;
        for (i = 1; this.body[this.idx + i] && (
            this.body[this.idx + i].beam || (cond && !cond(this.body[this.idx + i]))); ++i) {
        }
        return this.body[this.idx + i];
    }
    beamFollows() {
        // Must return .beam
        return this.body[this.idx + 1] && this.body[this.idx + 1].beam;
    }
    get prev() {
        return this.body[this.idx - 1];
    }
}

module.exports = Context;
