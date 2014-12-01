/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import _ = require("lodash");
import diff = require("diff");

import Annotator = require("./annotator");
import C = require("./contracts");
import DurationModelType = require("./duration"); // Cyclic dependency. For types only.
import EndMarkerModel = require("./endMarker");
import Metre = require("./metre");
import TimeSignatureModel = require("./timeSignature");

/**
 * The model for single and double barlines.
 */
class BarlineModel extends Model implements C.MusicXML.BarlineComplete {
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
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.NewLine; --i) {
            if (ctx.body[i].isNote) {
                okay = true;
                break;
            }
        }
        if (!okay) {
            if (i === -1) { // Beginning of document.
                var DurationModel: typeof DurationModelType = require("./duration");
                var fullRest = Metre.wholeNote(ctx)
                    .map(spec => new DurationModel(spec, C.Source.Annotator));
                _.each(fullRest, (r) => {
                    r.isRest = true;
                    ctx.insertPast(r);
                });
                return C.IterationStatus.RetryCurrent;
            } else {
                ctx.splice(i, ctx.idx - i);
                ctx.markEntireSongDirty();
                ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line - 1);
                ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line);
                ctx.idx = i;
                return C.IterationStatus.LineRemoved;
            }
        }

        // At least one note must exist between barlines.
        okay = false;
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.Barline; --i) {
            if (ctx.body[i].isNote || ctx.body[i].type === C.Type.NewLine) {
                okay = true;
                break;
            }
        }
        if (!okay) {
            return ctx.eraseCurrent();
        }

        if (this.barStyle.data === C.MusicXML.BarStyleType.LightHeavy) {
            // The document cannot be entirely empty.
            okay = false;
            for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.NewLine; --i) {
                if (ctx.body[i].isNote) {
                    okay = true;
                    break;
                }
            }
            if (!okay) {
                var DurationModel: typeof DurationModelType = require("./duration");
                var whole = Metre.wholeNote(ctx).map(w => new DurationModel(w, C.Source.Annotator));
                for (i = 0; i < whole.length; ++i) {
                    whole[i].chord = [{ pitch: "r", acc: null, octave: null }];
                    whole[i].tie = false;
                }
                // This is dangerous, and probably wrong.
                Array.prototype.splice.apply(ctx.body, [ctx.idx + 1, 0].concat(<any>whole));
                return C.IterationStatus.RetryLine;
            }
        }

        // Barlines followed by newlines do not have any right padding
        var next = ctx.next(c => c.type !== C.Type.Print);
        this.newlineNext = (ctx.body.length > ctx.idx + 1) && (
            next.type === C.Type.NewLine || next.type === C.Type.NewPage);

        // Barlines followed by accidentals have additional padding. We check all
        // parts for following accidentals.
        var intersectingNotes = _.filter(ctx.intersects(C.Type.Duration), l => l.isNote);
        var nextNonPlaceholderIdx = ctx.nextIdx(c => !c.placeholder);
        var nextNonPlaceholder = ctx.body[nextNonPlaceholderIdx];
        if (nextNonPlaceholder.isNote) {
            this.annotatedAccidentalSpacing = 2 * (_.any(intersectingNotes,
                n => (<DurationModelType>n).containsAccidentalAfterBarline(ctx)) ? 1 : 0);
        } else {
            this.annotatedAccidentalSpacing = 0;
        }

        // Double barlines only exist at the end of a piece.
        if (this.barStyle.data === C.MusicXML.BarStyleType.LightHeavy && ctx.next(null, 2)) {
            this.barStyle.data = C.MusicXML.BarStyleType.Regular;
            return C.IterationStatus.RetryCurrent;
        }

        ctx.barKeys.push(this.key);

        // Set information from context that the view needs
        // this.onPianoStaff = true; MXFIX
        ctx.x += (this.newlineNext ? 0 : 12) + this.annotatedAccidentalSpacing;
        ctx.beat = 0;
        ++ctx.bar;
        ctx.accidentalsByStave[ctx.currStaveIdx] = C.NoteUtil.getAccidentals(ctx.keySignature);

        // MXFIX
        // this.height = this.onPianoStaff ? ctx.staveSeperation/2 : 20;
        this.height = 20;
        // this.yOffset = this.onPianoStaff ? (20 - (ctx.staveSeperation/2)): 0;
        this.yOffset = 0;
        this.barStyle.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#2A2A2A");

        if (!ctx.disableRecordings) {
            ctx.record(this);
        }
        return C.IterationStatus.Success;
    }

    constructor(spec: { barStyle: { data: C.MusicXML.BarStyleType }}) {
        super(spec);
    }

    toLylite(lylite: Array<string>) {
        lylite.push("|\n");
    }

    /**
     * Creates a barline directly before the current element (i.e., at ctx.idx).
     */
    static createBarline = (ctx: Annotator.Context, type = C.MusicXML.BarStyleType.Regular): C.IterationStatus => {
        if (ctx.curr.type === C.Type.BeamGroup) {
            ctx.eraseCurrent();
            for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
                ctx.body[j].inBeam = false;
                if (ctx.body[j] === ctx.curr) {
                    var newBarline = new BarlineModel({ barStyle: {data: type }});
                    if (j === ctx.idx) {
                        ctx.insertPast(newBarline);
                    } else {
                        ctx.insertFuture(newBarline, j);
                    }
                    ++j;
                }
            }
            return C.IterationStatus.RetryLine;
        }

        BarlineModel._seperate(ctx, type);
        return C.IterationStatus.RetryCurrentNoOptimizations;
    };

    private static _seperate = (ctx: Annotator.Context, type: C.MusicXML.BarStyleType) => {
        var jdx = ctx.nextIdx(null, 2);
        var inTwo = ctx.body[jdx];
        if (inTwo && inTwo.type === C.Type.Barline) {
            // We want to keep this barline where it is!
            ctx.body[jdx] = new BarlineModel({ barStyle: {data: (<BarlineModel>inTwo).barStyle.data }});
            (<BarlineModel>inTwo).barStyle.data = type;
            ctx.insertPast(inTwo, null, true);
            return;
        }

        ctx.insertPast(new BarlineModel({ barStyle: {data: type }}), null, true);
    };


    get type() {
        return C.Type.Barline;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            _revision: this.revision,
            segno: this.segno,
            coda: this.coda,
            location: this.location,
            codaAttrib: this.codaAttrib,
            wavyLine: this.wavyLine,
            fermatas: this.fermatas,
            segnoAttrib: this.segnoAttrib,
            divisions: this.divisions,
            barStyle: this.barStyle,
            ending: this.ending,
            repeat: this.repeat,
            footnote: this.footnote,
            level: this.level
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
        for (var i = currIdx - 1; i >= 0 && body[i].type !== C.Type.Barline; --i) {
            history.push(JSON.stringify(body[i]).replace("\n", "")); // the spec does not specify whether there are \ns
        }
        return history.reverse().join("\n") + "\n";
    }

    /* Collab and undo/redo */
    __history__: string = "";
    __lkg__: string = "";
    _revision: string = BarlineModel._sessionId + "-0";

    /* Ripieno Internal and annotated */
    annotatedAccidentalSpacing: number;
    height: number;
    newlineNext: boolean;
    selected: boolean;
    temporary: boolean;
    yOffset: number;

    /* C.MusicXML.Barline */
    segno: C.MusicXML.Segno;
    coda: C.MusicXML.Coda;
    /**
     * Ignored for Ripieno since barlines are always at the end
     * of a measure in Ripieno. We preserve the value for third-party
     * programs though.
     */
    location: C.MusicXML.BarlineLocation = C.MusicXML.BarlineLocation.Right;
    codaAttrib: string;
    wavyLine: C.MusicXML.WavyLine;
    fermatas: C.MusicXML.Fermata[];
    segnoAttrib: string;
    divisions: string;
    barStyle: C.MusicXML.BarStyle = {
        color: "#000000",
        data: C.MusicXML.BarStyleType.Regular
    }
    ending: C.MusicXML.Ending;
    repeat: C.MusicXML.Repeat;

    /* C.MusicXML.Editorial */
    footnote: C.MusicXML.Footnote;
    level: C.MusicXML.Level;
}

export = BarlineModel;
