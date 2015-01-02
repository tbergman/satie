/**
 * @file Appears at the very beginning of a staff.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model        = require("./model");

import _            = require("lodash");

import C            = require("./contracts");
import Annotator    = require("./annotator");
import PrintModel   = require("./print");

class BeginModel extends Model {

    ///////////////
    // I.1 Model //
    ///////////////

    get type()      { return C.Type.Begin; }
    get xPolicy()   { return C.RectifyXPolicy.Min; }
    startOfSystem: boolean;

    ////////////////////
    // I.2 BeginModel //
    ////////////////////

    voice:          C.IVoice;
    noMargin:       boolean;
    braceY:         number;
    braceY2:        number;
    staveW:         number;

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData            = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        if (!ctx.print) {
            return ctx.insertPast(new PrintModel({}, true));
        }

        // BeginModel must only appear at the beginning of a song.
        if (ctx.idx !== 1) {
            return ctx.eraseCurrent();
        }

        /////////////////////////////////////////////////////////////

        var print               = ctx.print;

        var systemMargins       = print.systemLayout.systemMargins;
        var pageMargins         = print.pageMarginsFor(ctx.page);
        var pageLayout          = print.pageLayout;

        ctx.fontSize            = ctx.calcFontSize();
        ctx.maxX                = pageLayout.pageWidth - systemMargins.rightMargin - pageMargins.rightMargin;
        ctx.maxY                = pageLayout.pageHeight - pageMargins.topMargin;
        ctx.x                   = systemMargins.leftMargin + pageMargins.leftMargin;
        ctx.y                   = pageMargins.topMargin + print.systemLayout.topSystemDistance;
        ctx.lines[ctx.line].y   = ctx.y;
        ctx.lines[ctx.line].x   = ctx.x;
        ctx.minBottomPaddings   = _.times(ctx._voices.length + 1, () => 0); // this is overkill. should be number of staves
        ctx.minTopPaddings      = _.times(ctx._voices.length + 1, () => 0); // but that's hard to calculate here.

        /////////////////////////////////////////////////////////////

        this.x                  = ctx.x;
        this.y              	= ctx.y;
        this.staveW          	= ctx.maxX - ctx.x;
        this.startOfSystem      = !ctx.idxInPart && ctx.part.voices.length > 1;

        /*
         * Padding between beginning of part and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x                   += 8;

        ctx.barKeys             = [];

        // Copy information from the context needed for the view
        // this.pianoSystemContinues = ctx.currStave.pianoSystemContinues; MXFIX
        this.voice = ctx.voice;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            this.noMargin       = true;
        } else {
            this.noMargin       = false;
        }
        this.braceY             = this.y;
        this.braceY2            = this.y; // Newline.explode deals with the rest.

        /////////////////////////////////////////////////////////////

        return C.IterationStatus.Success;
    }


    ////////////////
    // IV. Static //
    ////////////////

    static createBegin = (ctx: Annotator.Context) => {
        return ctx.insertPast(new BeginModel({source: true}, true));
    };
}

export = BeginModel;
