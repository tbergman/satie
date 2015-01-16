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
        var spec                        = deepAssign<C.MusicXML.Print>(this, defaultPrint);
        ctx.print                       = new C.Print(spec);

        return C.IterationStatus.Success;
    }
}

function deepAssign<T>(a: T, b: T):T {
    "use strict";
    if (a instanceof Array || b instanceof Array) {
        var retArr: any[] = [];
        var aArr:   any[] = (<any>a);
        var bArr:   any[] = (<any>b);
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        var ret: T = a ? C.JSONx.clone(a) : (<T>{});
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                (<any>ret)[key] = deepAssign((<any>ret)[key], (<any>b)[key]);
            }
        }
        return ret;
    } else {
        return (a === undefined) ? b : a;
    }
}

export = PrintModel;
