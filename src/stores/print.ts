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

import Annotator    = require("./annotator");
import C            = require("./contracts");

/**
 * Model representing a MusicXML print element.
 * http://www.musicxml.com/for-developers/musicxml-dtd/direction-elements/
 */
class PrintModel extends Model implements C.MusicXML.PrintComplete {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get type()          { return C.Type.Print; }
    get visible()       { return false; }
    get xPolicy()       { return C.RectifyXPolicy.Max; }

    get fields() {
        return [
            "measureNumbering",
            "partNameDisplay",
            "newSystem",
            "newPage",
            "blankPage",
            "measureLayout",
            "partAbbreviationDisplay",
            "pageLayout",
            "systemLayout",
            "staffSpacing",
            "staffLayouts",
            "pageNumber"
        ];
    }

    /*---- I.2 C.MusicXML.PrintComplete ---------------------------------------------------------*/

    measureNumbering:           C.MusicXML.MeasureNumbering;
    partNameDisplay:            C.MusicXML.PartNameDisplay;
    newSystem:                  boolean;
    newPage:                    boolean;
    blankPage:                  string;
    measureLayout:              C.MusicXML.MeasureLayout;
    partAbbreviationDisplay:    C.MusicXML.PartAbbreviationDisplay;
    pageLayout:                 C.MusicXML.PageLayout;
    systemLayout:               C.MusicXML.SystemLayout;
    staffSpacing:               number;
    staffLayouts:               C.MusicXML.StaffLayout[];
    pageNumber:                 string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData                    = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        var defaultPrint                = C.getPrint(ctx._layout.header);
        var spec                        = C.deepAssign<C.MusicXML.Print>(this, defaultPrint);
        ctx.print                       = new C.Print(spec);

        return C.IterationStatus.Success;
    }
}

export = PrintModel;
