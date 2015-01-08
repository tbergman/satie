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

import Annotator            = require("./annotator");
import C                    = require("./contracts");
import DurationModelType    = require("./duration");        // Cyclic.
import EndMarkerModel       = require("./endMarker");
import Metre                = require("./metre");
import TimeSignatureModel   = require("./timeSignature");

/**
 * The model for MusicXML directions.
 */
class DirectionModel extends Model implements C.MusicXML.Direction {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get type()                                      { return C.Type.Direction; }
    get xPolicy()                                   { return C.RectifyXPolicy.Min; }

    get fields() {
        return [
            "directionTypes", "staff", "offset", "sound",
            "voice", "footnote", "level",
            "placement",
            "data",
            "relativeY", "relativeX",
            "fontFamily", "fontWeight", "fontStyle", "fontSize",
            "color"
        ];
    }

    /*---- I.2 DirectionModel -------------------------------------------------------------------*/

    /*---- I.3 C.MusicXML.Direction -------------------------------------------------------------*/

    directionTypes:             C.MusicXML.DirectionType[];
    staff:              		number;
    offset:             		C.MusicXML.Offset;
    sound:              		C.MusicXML.Sound;

    /*---- I.4 C.MusicXML.EditorialVoice --------------------------------------------------------*/

    voice:                      number;
    footnote:                   C.MusicXML.Footnote;
    level:                      C.MusicXML.Level;

    /*---- I.5 C.MusicXML.Placement -------------------------------------------------------------*/

    placement:                  C.MusicXML.AboveBelow;

    /*---- I.6 C.MusicXML.Directive -------------------------------------------------------------*/

    data:                       string;

    /*---- I.7 C.MusicXML.Directive >> PrintStyle >> Position -----------------------------------*/

    get defaultX():             number { return this.x; }
    get defaultY():             number { return this.y; }
    relativeY: number;
    relativeX: number;

    /*---- I.8 C.MusicXML.Directive >> PrintStyle >> Font ---------------------------------------*/

    fontFamily: string;
    fontWeight: C.MusicXML.NormalBold;
    fontStyle: C.MusicXML.NormalItalic;
    fontSize: string;

    /*---- I.9 C.MusicXML.Directive >> PrintStyle >> Color --------------------------------------*/

    color: string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: { barStyle: { data: C.MusicXML.BarStyleType }}, annotated: boolean) {
        super(spec, annotated);
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        return C.IterationStatus.Success;
    }
}

export = DirectionModel;
