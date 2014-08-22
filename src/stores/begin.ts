/**
 * Appears at the very begining of a stave.
 *
 * @jsx React.DOM
 */

import Model = require("./model");

import C = require("./contracts");
import Context = require("./context");

class BeginModel extends Model {
    pianoStaff: boolean;
    stave: C.IStave;
    noMargin : boolean;
    braceY : number;
    getBraceY2: () => number;
    pageSize: C.IPageSize;
    width: number;

    annotateImpl(ctx: Context): C.IterationStatus {
        // BeginModel must only appear at the begining of a song.
        if (ctx.idx !== 0) {
            return ctx.eraseCurrent();
        }

        this.width = ctx.maxX - ctx.x;

        /*
         * Padding between begining of stave and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x += 0.2;

        // Copy information from the context needed for the view
        this.pianoStaff = ctx.stave.pianoStaff;
        this.stave = ctx.stave;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            this.noMargin = true;
        } else {
            this.noMargin = false;
        }
        this.braceY = this.y();
        // We're cheating here! y() won't be annotated yet, but it will
        // be at render time!.
        this.getBraceY2 = () => ctx.nextStave().body[0].y();
        this.pageSize = ctx.pageSize;

        return C.IterationStatus.SUCCESS;
    }
    toLylite() {
        // pass
    }
    visible() {
        return true;
    }

    static createBegin = (ctx: Context) => {
        return ctx.insertPast(new BeginModel(
            {_annotated: "createBegin"}));
    };

    get type() {
        return C.Type.BEGIN;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = BeginModel;
