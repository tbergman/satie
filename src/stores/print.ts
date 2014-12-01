/**
 * @file Model representing a MusicXML print element.
 * http://www.musicxml.com/for-developers/musicxml-dtd/direction-elements/
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, December 2014
 */

import Model = require("./model");

import _ = require("lodash");

import Annotator = require("./annotator");
import C = require("./contracts");

function deepAssign<T>(a: T, b: T):T {
    "use strict";
    if (a instanceof Array || b instanceof Array) {
        var retArr: any[] = [];
        var aArr: any[] = (<any>a);
        var bArr: any[] = (<any>b);
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        var ret: T = a ? JSON.parse(JSON.stringify(a)) : (<T>{});
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

class PrintModel extends Model implements C.MusicXML.PrintComplete {
    recordMetreDataImpl(mctx: C.MetreContext) {
        // Note: this is thrown away by BeginModel.
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        var defaultPrint = C.getPrint(ctx._layout.header);
        ctx.print = new C.Print(deepAssign<C.MusicXML.Print>(this, defaultPrint));

        return C.IterationStatus.Success;
    }
    get type() {
        return C.Type.Print;
    }
    visible() {
        return false;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            measureNumbering: this.measureNumbering,
            partNameDisplay: this.partNameDisplay,
            newSystem: this.newSystem,
            newPage: this.newPage,
            blankPage: this.blankPage,
            measureLayout: this.measureLayout,
            partAbbreviationDisplay: this.partAbbreviationDisplay,
            pageLayout: this.pageLayout,
            systemLayout: this.systemLayout,
            staffSpacing: this.staffSpacing,
            staffLayouts: this.staffLayouts,
            pageNumber: this.pageNumber
        });
    }

    /*
     * C.MusicXML.PrintComplete properties
     */
    measureNumbering: C.MusicXML.MeasureNumbering;
    partNameDisplay: C.MusicXML.PartNameDisplay;
    newSystem: boolean;
    newPage: boolean;
    blankPage: string;
    measureLayout: C.MusicXML.MeasureLayout;
    partAbbreviationDisplay: C.MusicXML.PartAbbreviationDisplay;
    pageLayout: C.MusicXML.PageLayout;
    systemLayout: C.MusicXML.SystemLayout;
    staffSpacing: number;
    staffLayouts: number[];
    pageNumber: string;
}

export = PrintModel;