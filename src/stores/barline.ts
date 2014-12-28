/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model                = require("./model");

import _                    = require("lodash");

import Annotator            = require("./annotator");
import C                    = require("./contracts");
import DurationModelType    = require("./duration");        // Cyclic.
import EndMarkerModel       = require("./endMarker");
import Metre                = require("./metre");
import TimeSignatureModel   = require("./timeSignature");

/**
 * The model for single and double barlines.
 */
class BarlineModel extends Model implements C.MusicXML.BarlineComplete {

    ///////////////
    // I.1 Model //
    ///////////////

    get type()                                      { return C.Type.Barline; }
    get xPolicy()                                   { return C.RectifyXPolicy.Max; }

    get fields() {
        return [
            "segno",
            "coda",
            "location",
            "codaAttrib",
            "wavyLine",
            "fermatas",
            "segnoAttrib",
            "divisions",
            "barStyle",
            "ending",
            "repeat",
            "footnote",
            "level"
        ];
    }

    ////////////////////////////////////////
    // I.3 Ripieno Internal and annotated //
    ////////////////////////////////////////

    annotatedAccidentalSpacing: number;
    height:                     number;
    newlineNext:                boolean;
    selected:                   boolean;
    temporary:                  boolean;
    yOffset:                    number;

    ////////////////////////////
    // I.4 C.MusicXML.Barline //
    ////////////////////////////

    segno:                      C.MusicXML.Segno;
    coda:                       C.MusicXML.Coda;
    /**
     * Ignored for Ripieno since barlines are always at the end
     * of a measure in Ripieno. We preserve the value for third-party
     * programs though.
     */
    location:                   C.MusicXML.BarlineLocation  = C.MusicXML.BarlineLocation.Right;
    codaAttrib:                 string;
    wavyLine:                   C.MusicXML.WavyLine;
    fermatas:                   C.MusicXML.Fermata[];
    segnoAttrib:                string;
    divisions:                  string;
    barStyle:                   C.MusicXML.BarStyle         // See also BarlineModel.prototype.barStyle
    ending:                     C.MusicXML.Ending;
    repeat:                     C.MusicXML.Repeat;

    //////////////////////////////
    // I.5 C.MusicXML.Editorial //
    //////////////////////////////

    footnote:                   C.MusicXML.Footnote;
    level:                      C.MusicXML.Level;

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    constructor(spec: { barStyle: { data: C.MusicXML.BarStyleType }}, annotated: boolean) {
        super(spec, annotated);
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
        // If we have an overfilled note in the previous bar, it will at some point turn
        // into a tied note. So the barline should still be at beat 0.
        this.ctxData.beat = 0;
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // A barline must be preceded by an endline marker.
        if (!ctx.prev().endMarker) {
            return ctx.insertPast(new EndMarkerModel({ endMarker: true }, true));
        }

        if (!ctx.next()) {
            ctx.insertFuture(new EndMarkerModel({endMarker: true}, true));
        }

        var i: number;
        var okay: boolean;

        // A time signature must exist on the first line of every page.
        if (!ctx.ts) { return TimeSignatureModel.createTS(ctx); }

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
                    .map(spec => <C.IDuration> _.extend({isRest: true}, spec))
                    .map(spec => new DurationModel(spec, true));
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
                var whole = Metre.wholeNote(ctx).map(w => new DurationModel(w, true));
                for (i = 0; i < whole.length; ++i) {
                    whole[i].chord = [{ step: "R", alter: null, octave: null }];
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
        var intersectingNotes = ctx.intersects(C.Type.Duration, ctx.idx, true, false);
        var nextNonPlaceholderIdx = ctx.nextIdx(c => !c.placeholder);
        var nextNonPlaceholder = ctx.body[nextNonPlaceholderIdx];
        if (nextNonPlaceholder.isNote) {
            this.annotatedAccidentalSpacing = 10 * (_.any(intersectingNotes,
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
        ctx.accidentalsByStave[ctx.currStaveIdx] = C.NoteUtil.getAccidentals(ctx.attributes.keySignature);

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

    /////////////////
    // IV. Statics //
    /////////////////

    /**
     * Creates a barline directly before the current element (i.e., at ctx.idx).
     */
    static createBarline = (ctx: Annotator.Context, type = C.MusicXML.BarStyleType.Regular): C.IterationStatus => {
        if (ctx.curr.type === C.Type.BeamGroup) {
            ctx.eraseCurrent();
            for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
                ctx.body[j].inBeam = false;
                if (ctx.body[j] === ctx.curr) {
                    var newBarline = new BarlineModel({ barStyle: {data: type }}, true);
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
            ctx.body[jdx] = new BarlineModel({ barStyle: {data: (<BarlineModel>inTwo).barStyle.data }}, true);
            (<BarlineModel>inTwo).barStyle.data = type;
            ctx.insertPast(inTwo, null, true);
            return;
        }

        ctx.insertPast(new BarlineModel({ barStyle: {data: type }}, true), null, true);
    };
}

BarlineModel.prototype.barStyle = {
    color:                                                  "#000000",
    data:                                                   C.MusicXML.BarStyleType.Regular
};

if ("production" !== process.env.NODE_ENV) {
    Object.freeze(BarlineModel.prototype.barStyle);
}

export = BarlineModel;
