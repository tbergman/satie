/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Model        = require("./model");

import _            = require("lodash");

import C            = require("./contracts");
import Annotator    = require("./annotator");
import PrintModel   = require("./print");

/**
 * Appears at the very beginning of a voice.
 */
class BeginModel extends Model {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get type()      { return C.Type.Begin; }
    get xPolicy()   { return C.RectifyXPolicy.Min; }
    startOfSystem: boolean;

    /*---- I.2 BeginModel -----------------------------------------------------------------------*/

    voice:          C.IVoice;
    noMargin:       boolean;
    braceY:         number;
    braceY2:        number;
    staveW:         number;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData            = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {

        /*---- Check context ------------------------------------------------*/

        if (!ctx.print) {
            return ctx.insertPast(new PrintModel({}, true));
        }

        // BeginModel must only appear at the beginning of a song.
        if (ctx.idx !== 1) {
            return ctx.eraseCurrent();
        }

        var print               = ctx.print;

        var systemMargins       = print.systemLayout.systemMargins;
        var pageMargins         = print.pageMarginsFor(ctx.page);
        var pageLayout          = print.pageLayout;

        /*---- Update context -----------------------------------------------*/

        ctx.fontSize            = ctx.calcFontSize();
        ctx.maxX                = pageLayout.pageWidth - systemMargins.rightMargin - pageMargins.rightMargin;
        ctx.maxY                = pageLayout.pageHeight - pageMargins.topMargin;
        ctx.x                   = systemMargins.leftMargin + pageMargins.leftMargin;
        ctx.y                   = pageMargins.topMargin + print.systemLayout.topSystemDistance;
        ctx.lines[ctx.line].y   = ctx.y;
        ctx.lines[ctx.line].x   = ctx.x;
        ctx.lines[ctx.line]._attributes[ctx.part.id] = {}; // Begin only
        ctx.minBottomPaddings   = _.times(ctx._voices.length + 1, () => 0); // this is overkill. should be number of staves
        ctx.minTopPaddings      = _.times(ctx._voices.length + 1, () => 0); // but that's hard to calculate here.

        this.x                  = ctx.x;
        this.y              	= ctx.y;
        this.staveW          	= ctx.maxX - ctx.x;
        this.startOfSystem      = !ctx.idxInPart && _.keys(ctx.part.containsVoice).length > 1;

        /*
         * Padding between beginning of part and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x                   += 8;

        ctx.barKeys             = [];

        /*---- Copy information to view -------------------------------------*/

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

        return C.IterationStatus.Success;
    }
}

export = BeginModel;
