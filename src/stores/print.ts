/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, December 2014
 */

import Model        = require("./model");

import Annotator    = require("./annotator");
import C            = require("./contracts");

/**
 * Model representing a MusicXML print element.
 * http://www.musicxml.com/for-developers/musicxml-dtd/direction-elements/
 */
class PrintModel extends Model implements C.MusicXML.PrintComplete {

    ///////////////
    // I.1 Model //
    ///////////////

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

    /////////////////////////////////////////////
    // I.2 C.MusicXML.PrintComplete properties //
    /////////////////////////////////////////////

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


    ////////////////////
    // II. Life-cycle //
    ////////////////////

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