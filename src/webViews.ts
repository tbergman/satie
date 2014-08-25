/**
 * @file Sets the React renderer as the active view for all Models.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import BarlineModel = require("./stores/barline");
import BarlineView = require("./views/barline");
import BeginModel = require("./stores/begin");
import BeginView = require("./views/begin");
import BeamGroupModel = require("./stores/beamGroup");
import BeamGroupView = require("./views/beamGroup");
import ClefModel = require("./stores/clef");
import ClefView = require("./views/clef");
import DurationModel = require("./stores/duration");
import DurationView = require("./views/duration");
import KeySignatureModel = require("./stores/keySignature");
import KeySignatureView = require("./views/keySignature");
import NewlineModel = require("./stores/newline");
import NewlineView = require("./views/newline");
import SlurModel = require("./stores/slur");
import SlurView = require("./views/slur");
import TimeSignatureModel = require("./stores/timeSignature");
import TimeSignatureView = require("./views/timeSignature");

(function () {
    "use strict";

    BarlineModel.setView(BarlineView.Component);
    BeginModel.setView(BeginView.Component);
    BeamGroupModel.setView(BeamGroupView.Component);
    ClefModel.setView(ClefView.Component);
    DurationModel.setView(DurationView.Component);
    KeySignatureModel.setView(KeySignatureView.Component);
    NewlineModel.setView(NewlineView.Component);
    SlurModel.setView(SlurView.Component);
    TimeSignatureModel.setView(TimeSignatureView.Component);
} ());
