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

import _                    = require("lodash");
import assert               = require("assert");

import C                    = require("./contracts");
import Annotator            = require("./annotator");
import ClefModel            = require("./clef");
import DurationModelType    = require("./duration"); // Potentially cyclic. For types only.

/**
 * Represents a key signature as an array of accidentals, and a tonality (major/minor).
 */
class KeySignatureModel extends Model.SubAttributeModel implements C.MusicXML.KeyComplete {
    /* Model */
    get type()                              { return C.Type.KeySignature; }
    get xPolicy()                           { return C.RectifyXPolicy.Max; }

    get fields() {
        return [
            "cancel", "keySteps", "keyOctaves", "number_", "fifths", "keyAlters", "keyAccidentals", "mode",
            "defaultX", "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle",
            "fontSize", "color", "printObject"
        ];
    }

    /* KeySignatureModel */
    clef:               C.MusicXML.Clef;
    _annotatedSpacing:  number;
    temporary:          boolean;
    selected:           boolean;
    locked:             boolean;

    /* C.MusicXML.KeySignature */
    cancel:             C.MusicXML.Cancel;
    keySteps:           string[];
    keyOctaves:         C.MusicXML.KeyOctave[];
    number_:            number;
    fifths:             number;
    keyAlters:          string[];
    keyAccidentals:     string[];
    mode:               string;

    /* C.MusicXML.PrintStyle */

    /* C.MusicXML.PrintStyle >> Position */
    defaultX:           number;
    relativeY:          number;
    defaultY:           number;
    relativeX:          number;

    /* C.MusicXML.PrintStyle >> Font */
    fontFamily:         string;
    fontWeight:         C.MusicXML.NormalBold;
    fontStyle:          C.MusicXML.NormalItalic;
    fontSize:           string;

    /* C.MusicXML.PrintStyle >> Color */
    color:              string;

    /* C.MusicXML.PrintObject */
    printObject:        boolean;

    /* Life-cycle */
    constructor(spec: {clef?: C.MusicXML.Clef; x?: number; y?: number; locked?: boolean;}, annotated: boolean) {
        super(spec, annotated);
        if (spec.clef) {
            this.clef                               = spec.clef;
        }
        this.locked                                 = spec.locked === true;
    }
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        if (!ctx.attributes.clefs || !ctx.attributes.clefs[ctx.idxInPart]) {
            return ClefModel.createClef(ctx);
        }

        // Copy information from the context that the view needs.
        this.clef                                   = ctx.attributes.clefs[ctx.idxInPart];
        assert(this.clef instanceof Object);
        var intersectingNotes                       = _.filter(ctx.intersects(C.Type.Duration), l => l.isNote);
        ctx.attributes.keySignature                 = this;
        ctx.accidentalsByStaff[ctx.idxInPart + 1]    = C.NoteUtil.getAccidentals(this);
        if (intersectingNotes.length) {
            if (_.any(intersectingNotes, n => !!(<DurationModelType>n).getAccWidthAfterBar(ctx))) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing              = 25;
            } else {
                this._annotatedSpacing              = 15;
            }
        } else {
            this._annotatedSpacing                  = 10;
        }

        var c: number                               = Math.min(7, Math.abs(this.fifths));
        if (c) {
            ctx.x                                   += this._annotatedSpacing + 10.4*c;
        } else {
            ctx.x                                   += this._annotatedSpacing - 5;
        }
        switch (true) {
            case this.temporary:
                this.color                          = "#A5A5A5";
                break;
            case this.selected:
                this.color                          = "#75A1D0";
                break;
            default:
                this.color                          = "#000000";
                break;
        }
        return C.IterationStatus.Success;
    }
}

module KeySignatureModel {
    "use strict";

    export function createKeySignature(ctx: Annotator.Context): C.IterationStatus {
        var keySignature = ctx.prev(c => c.type === C.Type.KeySignature);
        return ctx.insertPast(new KeySignatureModel(keySignature || {}, true));
    };
}

export = KeySignatureModel;
