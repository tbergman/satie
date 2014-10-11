/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import _ = require("lodash");
import diff = require("diff");

import C = require("./contracts");
import Annotator = require("./annotator");
import EndMarkerModel = require("./endMarker");
import Metre = require("./metre");
import KeySignatureModel = require("./keySignature");
import TimeSignatureModel = require("./timeSignature");

/**
 * The model for single and double barlines.
 */
class BarlineModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
        // If we have an overfilled note in the previous bar, it will at some point turn
        // into a tied note. So the barline should still be at beat 0.
        this.ctxData.beat = 0;
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // A barline must be preceded by an endline marker.
        if (!ctx.prev().endMarker) {
            return ctx.insertPast(new EndMarkerModel({ endMarker: true }));
        }

        var i: number;
        var okay: boolean;

        // A time signature must exist on the first line of every page.
        if (!ctx.timeSignature) { return TimeSignatureModel.createTS(ctx); }

        // At least one note must exist before a barline on every line.
        okay = false;
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.NEWLINE; --i) {
            if (ctx.body[i].isNote) {
                okay = true;
                break;
            }
        }
        if (!okay) {
            if (i === -1) { // Beginning of document.
                var DurationModel_r = require("./duration"); // Recursive.
                var fullRest = Metre.wholeNote(ctx)
                    .map(spec => new DurationModel_r(spec, C.Source.ANNOTATOR));
                _.each(fullRest, (r) => {
                    r.isRest = true;
                    ctx.insertPast(r);
                });
                return C.IterationStatus.RETRY_CURRENT;
            } else {
                ctx.splice(i, ctx.idx - i);
                ctx.markEntireSongDirty();
                ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line - 1);
                ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line);
                ctx.idx = i;
                return C.IterationStatus.LINE_REMOVED;
            }
        }

        // At least one note must exist between barlines.
        okay = false;
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.BARLINE; --i) {
            if (ctx.body[i].isNote || ctx.body[i].type === C.Type.NEWLINE) {
                okay = true;
                break;
            }
        }
        if (!okay) {
            return ctx.eraseCurrent();
        }

        if (this.barline === C.Barline.DOUBLE) {
            // The document cannot be entirely empty.
            okay = false;
            for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.NEWLINE; --i) {
                if (ctx.body[i].isNote) {
                    okay = true;
                    break;
                }
            }
            if (!okay) {
                var DurationModel = require("./duration"); // Recursive.
                var whole = Metre.wholeNote(ctx).map(w => new DurationModel(w, C.Source.ANNOTATOR));
                for (i = 0; i < whole.length; ++i) {
                    whole[i].chord = [{ pitch: "r"}];
                    whole[i].tie = false;
                }
                Array.prototype.splice.apply(ctx.body, [ctx.idx + 1, 0].concat(whole));
                return C.IterationStatus.RETRY_LINE;
            }
        }

        // Barlines followed by newlines do not have any right padding
        var next = ctx.next();
        this.newlineNext = (ctx.body.length > ctx.idx + 1) && (
            next.type === C.Type.NEWLINE || next.type === C.Type.NEWPAGE);

        // Barlines followed by accidentals have additional padding. We check all
        // staves for following accidentals.
        var intersectingNotes = _.filter(ctx.intersects(C.Type.DURATION), l => l.isNote);
        if (ctx.next().isNote) {
            this.annotatedAccidentalSpacing = 0.2*(_.any(intersectingNotes, n => n.containsAccidental(ctx)) ? 1 : 0);
        } else {
            this.annotatedAccidentalSpacing = 0;
        }

        // Double barlines only exist at the end of a piece.
        if (this.barline === C.Barline.DOUBLE && ctx.next(null, 2)) {
            this.barline = C.Barline.STANDARD;
            return C.IterationStatus.RETRY_CURRENT;
        }

        ctx.barKeys.push(this.key);

        // Set information from context that the view needs
        if (ctx.currStave.pianoStaff) {
            this.onPianoStaff = true;
        };
        ctx.x += (this.newlineNext ? 0 : 0.3) + this.annotatedAccidentalSpacing;
        ctx.beat = 0;
        ++ctx.bar;
        ctx.accidentals = KeySignatureModel.getAccidentals(ctx.keySignature);

        this.height = this.onPianoStaff ? 1.15 : 2/4;
        this.yOffset = this.onPianoStaff ? (2/4 - 1.15): 0;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#2A2A2A");

        if (!ctx.disableRecordings) {
            ctx.record(this);
        }
        return C.IterationStatus.SUCCESS;
    }

    constructor(spec: { barline: C.Barline }) {
        super(spec);
        this._barline = spec.barline;
    }

    toLylite(lylite: Array<string>) {
        lylite.push("|\n");
    }

    /**
     * Creates a barline directly before the current element (i.e., at ctx.idx).
     */
    static createBarline = (ctx: Annotator.Context, mode: C.Barline): C.IterationStatus => {
        mode = mode || C.Barline.STANDARD;

        if (ctx.curr.type === C.Type.BEAM_GROUP) {
            ctx.eraseCurrent();
            for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
                ctx.body[j].inBeam = false;
                if (ctx.body[j] === ctx.curr) {
                    var newBarline = new BarlineModel({ barline: mode });
                    if (j === ctx.idx) {
                        ctx.insertPast(newBarline);
                    } else {
                        ctx.insertFuture(newBarline, j);
                    }
                    ++j;
                }
            }
            return C.IterationStatus.RETRY_LINE;
        }

        BarlineModel._seperate(ctx, mode);
        return C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS;
    };

    private static _seperate = (ctx: Annotator.Context, mode: C.Barline) => {
        var jdx = ctx.nextIdx(null, 2);
        var inTwo = ctx.body[jdx];
        if (inTwo && inTwo.type === C.Type.BARLINE) {
            // We want to keep this barline where it is!
            ctx.body[jdx] = new BarlineModel({ barline: inTwo.barline });
            inTwo.barline = mode;
            ctx.insertPast(inTwo, null, true);
            return;
        }

        ctx.insertPast(new BarlineModel({ barline: mode }), null, true);
    };


    get type() {
        return C.Type.BARLINE;
    }
    get barline() {
        return this._barline;
    }
    set barline(barline: C.Barline) {
        this._barline = barline;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            _revision: this.revision
        });
    }

    get revision() {
        return this._revision;
    }

    /**
     * To be used ONLY in collab.ts
     */
    set revision(n: string) {
        this._revision = n;
    }

    markLKG(currIdx: number, body: C.IBody) {
        // See songEditor.ts
        this.__history__ = this.__lkg__ = this._state(currIdx, body);
    }

    private static _lastRev = 0;
    incrRevision() {
        return this._revision = Model._sessionId + "-" + ++BarlineModel._lastRev;
    }

    createPatch(currIdx: number, body: C.IBody) {
        var lastHistory = this.__history__;

        this.__history__ = this._state(currIdx, body);
        if (lastHistory === this.__history__) {
            return;
        }
        return diff.createPatch(this.key, lastHistory, this.__history__, this.revision, this.incrRevision());
    }

    private _state(currIdx: number, body: C.IBody) {
        var history: string[] = [];
        for (var i = currIdx - 1; i >= 0 && body[i].type !== C.Type.BARLINE; --i) {
            history.push(JSON.stringify(body[i]).replace("\n", "")); // the spec does not specify whether there are \ns
        }
        return history.reverse().join("\n") + "\n";
    }

    private __history__: string = "";
    private __lkg__: string = "";

    private _barline: C.Barline;
    annotatedAccidentalSpacing: number;
    color: string;
    height: number;
    newlineNext: boolean;
    onPianoStaff: boolean;
    selected: boolean;
    temporary: boolean;
    _revision: string = BarlineModel._sessionId + "-0";
    yOffset: number;
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = BarlineModel;
