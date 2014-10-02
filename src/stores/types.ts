/**
 * @file Ties together the enum, model, and view.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import C = require("./contracts");
import Model = require("./model");

import BarlineModel = require("./barline");
import BarlineView = require("../views/barline");
import BeamGroupModel = require("./beamGroup");
import BeamGroupView = require("../views/beamGroup");
import BeginModel = require("./begin");
import BeginView = require("../views/begin");
import ClefModel = require("./clef");
import ClefView = require("../views/clef");
import DurationModel = require("./duration");
import DurationView = require("../views/duration");
import EndMarkerModel = require("./endMarker");
import KeySignatureModel = require("./keySignature");
import KeySignatureView = require("../views/keySignature");
import NewlineModel = require("./newline");
import NewlineView = require("../views/newline");
import PlaceholderModel = require("./placeholder");
import SlurModel = require("./slur");
import SlurView = require("../views/slur");
import TimeSignatureModel = require("./timeSignature");
import TimeSignatureView = require("../views/timeSignature");

export function registerTypes() {
    "use strict";
    registerType(C.Type.BARLINE, BarlineModel, BarlineView.Component);
    registerType(C.Type.BEAM_GROUP, BeamGroupModel, BeamGroupView.Component);
    registerType(C.Type.BEGIN, BeginModel, BeginView.Component);
    registerType(C.Type.CLEF, ClefModel, ClefView.Component);
    registerType(C.Type.DURATION, DurationModel, DurationView.Component);
    registerType(C.Type.END_MARKER, EndMarkerModel, null);
    registerType(C.Type.KEY_SIGNATURE, KeySignatureModel, KeySignatureView.Component);
    registerType(C.Type.NEWLINE, NewlineModel, NewlineView.Component);
    registerType(C.Type.PLACEHOLDER, PlaceholderModel, null);
    registerType(C.Type.SLUR, SlurModel, SlurView.Component);
    registerType(C.Type.TIME_SIGNATURE, TimeSignatureModel, TimeSignatureView.Component);

    function registerType(type: C.Type, model: any, view: C.IViewComponent) {
        Model.constructorsByType[C.Type[type]] = function (spec: any) { return new model(spec); };
        model.setView(view);
    }
};
