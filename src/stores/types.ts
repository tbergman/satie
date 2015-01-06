/**
 * @file Ties together the enum, model, and view.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
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
