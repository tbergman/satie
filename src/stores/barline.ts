/**
 * The model for single and double barlines.
 */

import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Context = require("./context");
import DurationModel = require("./duration");
import EndMarkerModel = require("./endMarker");
import KeySignatureModel = require("./keySignature");

class BarlineModel extends Model {
    constructor(spec: { barline: C.Barline }) {
        super(spec);
        this._barline = spec.barline;
    }
    annotateImpl(ctx: Context): C.IterationStatus {
        var i: number;
        var okay: boolean;
        if (this.barline !== C.Barline.Double) {
            // At least one note must exist before a barline on every line.
            okay = false;
            for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.NEWLINE; --i) {
                if (ctx.body[i].isNote) {
                    okay = true;
                    break;
                }
            }
            if (!okay) { return ctx.eraseCurrent(); }

            // At least one note must exist between barlines.
            okay = false;
            for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.BARLINE; --i) {
                if (ctx.body[i].isNote || ctx.body[i].type === C.Type.NEWLINE) {
                    okay = true;
                    break;
                }
            }
            if (!okay) { return ctx.eraseCurrent(); }
        }

        // Barlines followed by newlines do not have any right padding
        var next = ctx.next();
        this.newlineNext = (ctx.body.length > ctx.idx + 1) && (
            next.type === C.Type.NEWLINE || next.type === C.Type.NEWPAGE);

        // Barlines followed by accidentals have additional padding
        if (ctx.next().isNote) {
            // XXX: Also check that notes are on the same beat!
            // e.g., | C/////
            //       | C/C#// will add spacing, but it shouldn't!
            this.annotatedAccidentalSpacing = 0.2*
                (_.any(_.filter(ctx.next().intersects, (l: DurationModel) => l.isNote),
                    n => n.containsAccidental(ctx)) ? 1 : 0);
        } else {
            this.annotatedAccidentalSpacing = 0;
        }

        // A barline must be preceeded by an endline marker.
        if (!ctx.prev().endMarker) {
            return ctx.insertPast(new EndMarkerModel({ endMarker: true }));
        }

        // Double barlines only exist at the end of a piece.
        if (this.barline === C.Barline.Double && ctx.next(null, 2)) {
            this.barline = C.Barline.Standard;
            return C.IterationStatus.RETRY_CURRENT;
        }

        // Set information from context that the view needs
        if (ctx.stave.pianoStaff) {
            this.onPianoStaff = true;
        };
        ctx.x += (this.newlineNext ? 0 : 0.3) + this.annotatedAccidentalSpacing;
        ctx.beats = 0;
        ++ctx.bar;
        ctx.renderKey_eInBar = {};
        ctx.accidentals = KeySignatureModel.getAccidentals(ctx.keySignature);

        this.height = this.onPianoStaff ? 1.15 : 2/4;
        this.yOffset = this.onPianoStaff ? (2/4 - 1.15): 0;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#2A2A2A");
        return C.IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        lylite.push("|");
    }

    static createBarline = (ctx: Context, mode: C.Barline): C.IterationStatus => {
        mode = mode || C.Barline.Standard;

        if (ctx.curr().type === C.Type.BEAM_GROUP) {
            ctx.eraseCurrent();
            for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
                delete ctx.body[j].inBeam;
                if (ctx.body[j] === ctx.curr()) {
                    ctx.insertFuture(new BarlineModel({ barline: mode }), j);
                    ++j;
                }
            }
            return C.IterationStatus.RETRY_LINE;
        }
        return ctx.insertPast(new BarlineModel({ barline: mode }));
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

    annotatedAccidentalSpacing: number;
    private _barline: C.Barline;
    color: string;
    height: number;
    newlineNext: boolean;
    onPianoStaff: boolean;
    selected: boolean;
    temporary: boolean;
    yOffset: number;
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = BarlineModel;