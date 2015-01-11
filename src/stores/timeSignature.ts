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

import Model                = require("./model");

import _                	= require("lodash");
import assert           	= require("assert");

import C                	= require("./contracts");
import Annotator        	= require("./annotator");
import ClefModel        	= require("./clef");
import DurationModelType    = require("./duration");        // Cyclic.
import KeySignatureModel 	= require("./keySignature");

class TimeSignatureModel extends Model.SubAttributeModel implements C.MusicXML.TimeComplete {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get type()                                              { return C.Type.TimeSignature; }
    get xPolicy()                   						{ return C.RectifyXPolicy.Max; }

    get fields() {
        return ["interchangeables", "beats", "beatTypes", "senzaMisura", "symbol",
            "separator", "voice", "footnote", "level", "defaultX", "relativeY",
            "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle", "fontSize",
            "color", "halign", "valign", "printObject"];
    }

    /*---- I.2 TimeSignature --------------------------------------------------------------------*/

    _annotatedSpacing:              number;
    temporary:                      boolean;
    selected:                       boolean;
    _displayTimeSignature:          C.ISimpleTimeSignature; // See prototype.

    /*---- I.3 TimeSignature (simple) -----------------------------------------------------------*/

    get ts(): C.ISimpleTimeSignature {
        return C.tsToSimpleTS(this);
    }
    set ts(c: C.ISimpleTimeSignature) {
        // METREFIX broken
        this.beats                  = [c.beats + ""];
        this.beatTypes              = [c.beatType];
        switch(true) {
            case c.commonRepresentation && c.beats === 4 && c.beatType === 4:
                this.symbol         = C.MusicXML.TimeSymbolType.Common;
                break;
            case c.commonRepresentation && c.beats === 2 && c.beatType === 2:
                this.symbol         = C.MusicXML.TimeSymbolType.Cut;
                break;
            case !c.commonRepresentation:
                this.symbol         = C.MusicXML.TimeSymbolType.Normal;
                break;
            default:
                console.warn("Unknown common TS");
                this.symbol         = C.MusicXML.TimeSymbolType.Normal;
                break;
        }
    }
    get displayTimeSignature(): C.ISimpleTimeSignature {
        return this._displayTimeSignature || this.ts;
    }
    set displayTimeSignature(ts: C.ISimpleTimeSignature) {
        this._displayTimeSignature = ts;
    }

    addUpBeats() {
        return _.reduce(this.beats, (memo, time) => memo +
            _.reduce(time.split("+"), (memo, time) => memo + parseInt(time, 10), 0), 0);
    }

    /*---- I.3 C.MusicXML.Time ------------------------------------------------------------------*/

    interchangeables:               C.MusicXML.Interchangeable[];
    beats:                          string[];
    beatTypes:                      number[];
    senzaMisura:                    boolean;

    /*---- I.4 C.MusicXML.TimeSymbol ------------------------------------------------------------*/

    symbol:                         C.MusicXML.TimeSymbolType;

    /*---- I.5 C.MusicXML.Seperator -------------------------------------------------------------*/

    separator:                      C.MusicXML.SeparatorType;

    /*---- I.6 C.MusicXML.PrintStyleAlign >> PrintStyle >> EditoralVoice ------------------------*/

    voice:                          string;
    footnote:                       C.MusicXML.Footnote;
    level:                          C.MusicXML.Level;

    /*---- I.7 C.MusicXML.PrintStyleAlign >> PrintStyle >> Position -----------------------------*/

    defaultX:                       number;
    relativeY:                      number;
    defaultY:                       number;
    relativeX:                      number;

    /*---- I.8 C.MusicXML.PrintStyleAlign >> PrintStyle >> Font ---------------------------------*/

    fontFamily:                     string;
    fontWeight:                     C.MusicXML.NormalBold;
    fontStyle:                      C.MusicXML.NormalItalic;
    fontSize:                       string;

    /*---- I.9 C.MusicXML.PrintStyleAlign >> PrintStyle >> Color --------------------------------*/

    color:                          string;

    /*---- I.a C.MusicXML.PrintStyleAlign >> PrintStyle >> HAlign -------------------------------*/

    halign:                         C.MusicXML.LeftCenterRight;

    /*---- I.b C.MusicXML.PrintStyleAlign >> PrintStyle >> VAlign -------------------------------*/

    valign:                         C.MusicXML.TopMiddleBottomBaseline;

    /*---- I.c C.MusicXML.PrintStyleAlign >> PrintObject ----------------------------------------*/

    printObject:                    boolean;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: C.MusicXML.Time, annotated: boolean) {
        super(spec, annotated);
        assert(!(<any>spec).timeSignature, "Deprecated");
        assert(!(<any>spec).ts, "Not supported in constructor");
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        mctx.ts                     = this.ts;
        this.ctxData                = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // A clef must exist on each line.
        if (!ctx.attributes.clefs[ctx.idxInPart]) {
            return ClefModel.createClef(ctx);
        }

        // A key signature must exist on each line
        if (!ctx.attributes.clefs[ctx.idxInPart]) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // Time signatures must not be redundant
        var prevPotentialTime = ctx.prev(c => c.type === C.Type.TimeSignature || c.type === C.Type.NewLine);
        if (prevPotentialTime && prevPotentialTime.type === C.Type.TimeSignature &&
                TimeSignatureModel.isEqual(this.ts, (<TimeSignatureModel>prevPotentialTime).ts)) {
            ctx.attributes.time = null;
            ctx.eraseCurrent();
            return C.IterationStatus.RetryCurrent;
        }

        var intersectingNotes = _.filter(ctx.intersects(C.Type.Duration), l => l.isNote);
        if (intersectingNotes.length) {
            if (_.any(intersectingNotes, n => !!(<DurationModelType>n).getAccWidthAfterBar(ctx))) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing  = 15;
            } else {
                this._annotatedSpacing  = 25;
            }
        } else {
            this._annotatedSpacing      = 12.5;
        }

        ctx.x += 28 + this._annotatedSpacing;
        ctx.attributes.time = this;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return C.IterationStatus.Success;
    }

    toMXMLObject(): C.MusicXML.TimeComplete {
        return {
            beats: this.beats,
            beatTypes: this.beatTypes,
            color: this.color,
            defaultX: this.defaultX,
            defaultY: this.defaultY,
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontStyle: this.fontStyle,
            fontWeight: this.fontWeight,
            halign: this.halign,
            interchangeables: this.interchangeables,
            printObject: this.printObject,
            relativeX: this.relativeX,
            relativeY: this.relativeY,
            senzaMisura: this.senzaMisura,
            separator: this.separator,
            symbol: this.symbol,
            valign: this.valign
        };
    }

}

module TimeSignatureModel {
    "use strict";

    export function createTS(ctx: Annotator.Context): C.IterationStatus {
        ctx.insertPast(new TimeSignatureModel({
                beats:          ["4"],
                beatTypes:      [4],
                senzaMisura:    false
            }, true));
        return C.IterationStatus.RetryLine; // Cache bug
    };

    export function isEqual(ts1: C.ISimpleTimeSignature, ts2: C.ISimpleTimeSignature) {
        return (!!ts1 === !!ts2) &&
            (!ts1 || ts1.beats === ts2.beats && ts1.beatType === ts2.beatType &&
                ts1.commonRepresentation === ts2.commonRepresentation);
    }
}

TimeSignatureModel.prototype._displayTimeSignature = null;

export = TimeSignatureModel;
