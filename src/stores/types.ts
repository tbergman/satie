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

/**
 * @file Ties the enum, Model, and View or a type together.
 */

import C                    = require("./contracts");
import React                = require("react");

import Model                = require("./model");

import AttributesModel      = require("./attributes");
import BarlineModel         = require("./barline");
import BarlineView          = require("../views/barline");
import BeamGroupModel       = require("./beamGroup");
import BeamGroupView        = require("../views/beamGroup");
import BeginModel           = require("./begin");
import BeginView            = require("../views/begin");
import ClefModel            = require("./clef");
import ClefView             = require("../views/clef");
import DirectionModel       = require("./direction");
import DirectionView        = require("../views/direction");
import DurationModel        = require("./duration");
import DurationView         = require("../views/duration");
import EndMarkerModel       = require("./endMarker");
import KeySignatureModel    = require("./keySignature");
import KeySignatureView     = require("../views/keySignature");
import NewlineModel         = require("./newline");
import NewlineView          = require("../views/newline");
import NewpageModel         = require("./newpage");
import PlaceholderModel     = require("./placeholder");
import PrintModel           = require("./print");
import SlurModel            = require("./slur");
import SlurView             = require("../views/slur");
import TimeSignatureModel   = require("./timeSignature");
import TimeSignatureView    = require("../views/timeSignature");
import WedgeModel           = require("./wedge");
import WedgeView            = require("../views/wedge");

var registered = false;

export function ensureRegistered() {
    "use strict";
    if (registered) { return; }
    registered = true;
    registerType(C.Type.Attributes, AttributesModel, null);
    registerType(C.Type.Barline, BarlineModel, BarlineView.Component);
    registerType(C.Type.BeamGroup, BeamGroupModel, BeamGroupView.Component);
    registerType(C.Type.Begin, BeginModel, BeginView.Component);
    registerType(C.Type.Clef, ClefModel, ClefView.Component);
    registerType(C.Type.Direction, DirectionModel, DirectionView.Component);
    registerType(C.Type.Duration, DurationModel, DurationView.Component);
    registerType(C.Type.EndMarker, EndMarkerModel, null);
    registerType(C.Type.KeySignature, KeySignatureModel, KeySignatureView.Component);
    registerType(C.Type.NewLine, NewlineModel, NewlineView.Component);
    registerType(C.Type.NewPage, NewpageModel, null);
    registerType(C.Type.Placeholder, PlaceholderModel, null);
    registerType(C.Type.Print, PrintModel, null);
    registerType(C.Type.Slur, SlurModel, SlurView.Component);
    registerType(C.Type.TimeSignature, TimeSignatureModel, TimeSignatureView.Component);
    registerType(C.Type.Wedge, WedgeModel, WedgeView.Component);

    function registerType(type: C.Type, model: any, view: React.ComponentClass<any>) {
        Model.constructorsByType[type] = function (spec: any) { return new model(spec); };
        model.setView(view);
    }
};
