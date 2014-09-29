/**
 * @file Sets the React renderer as the active view for all Models.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import C = require("./stores/contracts");
import Model = require("./stores/model");

import BarlineModel = require("./stores/barline");
import BarlineView = require("./views/barline");
import BeamGroupModel = require("./stores/beamGroup");
import BeamGroupView = require("./views/beamGroup");
import BeginModel = require("./stores/begin");
import BeginView = require("./views/begin");
import ClefModel = require("./stores/clef");
import ClefView = require("./views/clef");
import DurationModel = require("./stores/duration");
import DurationView = require("./views/duration");
import EndMarkerModel = require("./stores/endMarker");
import KeySignatureModel = require("./stores/keySignature");
import KeySignatureView = require("./views/keySignature");
import NewlineModel = require("./stores/newline");
import NewlineView = require("./views/newline");
import PlaceholderModel = require("./stores/placeholder");
import SlurModel = require("./stores/slur");
import SlurView = require("./views/slur");
import TimeSignatureModel = require("./stores/timeSignature");
import TimeSignatureView = require("./views/timeSignature");

export function initWebViews() { "use strict";
    defineType(C.Type.BARLINE, BarlineModel, BarlineView.Component);
    defineType(C.Type.BEAM_GROUP, BeamGroupModel, BeamGroupView.Component);
    defineType(C.Type.BEGIN, BeginModel, BeginView.Component);
    defineType(C.Type.CLEF, ClefModel, ClefView.Component);
    defineType(C.Type.DURATION, DurationModel, DurationView.Component);
    defineType(C.Type.END_MARKER, EndMarkerModel, null);
    defineType(C.Type.KEY_SIGNATURE, KeySignatureModel, KeySignatureView.Component);
    defineType(C.Type.NEWLINE, NewlineModel, NewlineView.Component);
    defineType(C.Type.PLACEHOLDER, PlaceholderModel, null);
    defineType(C.Type.SLUR, SlurModel, SlurView.Component);
    defineType(C.Type.TIME_SIGNATURE, TimeSignatureModel, TimeSignatureView.Component);

    function defineType(type: C.Type, model: any, view: C.IViewComponent) {
        Model.constructorsByType[C.Type[type]] = function (spec: any) { return new model(spec); };
        model.setView(view);
    }
};
