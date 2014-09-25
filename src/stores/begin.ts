/**
 * @file Appears at the very beginning of a staff.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import C = require("./contracts");
import Annotator = require("./annotator");

import _ = require("lodash");

class BeginModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // BeginModel must only appear at the beginning of a song.
        if (ctx.idx !== 0) {
            return ctx.eraseCurrent();
        }

        this.width = ctx.maxX - ctx.x;

        /*
         * Padding between beginning of stave and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x += 0.2;

        ctx.barKeys = [];

        // Copy information from the context needed for the view
        this.pianoStaff = ctx.currStave.pianoStaff;
        this.stave = ctx.currStave;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            this.noMargin = true;
        } else {
            this.noMargin = false;
        }
        this.braceY = this.y;
        // We're cheating here! y() won't be annotated yet, but it will
        // be at render time!. HACK
        this.getBraceY2 = () => this.y + 2;
        this.pageSize = ctx.pageSize;

        return C.IterationStatus.SUCCESS;
    }
    toLylite() {
        // pass
    }
    visible() {
        return true;
    }

    static createBegin = (ctx: Annotator.Context) => {
        return ctx.insertPast(new BeginModel(
            {source: C.Source.ANNOTATOR}));
    };

    get type() {
        return C.Type.BEGIN;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
        });
    }

    pianoStaff: boolean;
    stave: C.IStave;
    noMargin : boolean;
    braceY : number;
    getBraceY2: () => number;
    pageSize: C.IPageSize;
    width: number;
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = BeginModel;
