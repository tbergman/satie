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
        this.pianoSystemContinues = ctx.currStave.pianoSystemContinues;
        this.stave = ctx.currStave;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            this.noMargin = true;
        } else {
            this.noMargin = false;
        }
        this.braceY = this.y;
        this.braceY2 = this.y + ctx.staveSeperation;
        this.pageSize = ctx.pageSize;

        return C.IterationStatus.Success;
    }
    toLylite() {
        // pass
    }
    visible() {
        return true;
    }

    static createBegin = (ctx: Annotator.Context) => {
        return ctx.insertPast(new BeginModel(
            {source: C.Source.Annotator}));
    };

    get type() {
        return C.Type.Begin;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
        });
    }

    pianoSystemContinues: boolean;
    stave: C.IStave;
    noMargin : boolean;
    braceY : number;
    braceY2: number;
    pageSize: C.IPageSize;
    width: number;
}

export = BeginModel;
