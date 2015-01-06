var C = require("./contracts");
var Model = require("./model");
var AttributesModel = require("./attributes");
var BarlineModel = require("./barline");
var BarlineView = require("../views/barline");
var BeamGroupModel = require("./beamGroup");
var BeamGroupView = require("../views/beamGroup");
var BeginModel = require("./begin");
var BeginView = require("../views/begin");
var ClefModel = require("./clef");
var ClefView = require("../views/clef");
var DirectionModel = require("./direction");
var DirectionView = require("../views/direction");
var DurationModel = require("./duration");
var DurationView = require("../views/duration");
var EndMarkerModel = require("./endMarker");
var KeySignatureModel = require("./keySignature");
var KeySignatureView = require("../views/keySignature");
var NewlineModel = require("./newline");
var NewlineView = require("../views/newline");
var NewpageModel = require("./newpage");
var PlaceholderModel = require("./placeholder");
var PrintModel = require("./print");
var SlurModel = require("./slur");
var SlurView = require("../views/slur");
var TimeSignatureModel = require("./timeSignature");
var TimeSignatureView = require("../views/timeSignature");
var WedgeModel = require("./wedge");
var WedgeView = require("../views/wedge");
var registered = false;
function ensureRegistered() {
    "use strict";
    if (registered) {
        return;
    }
    registered = true;
    registerType(145 /* Attributes */, AttributesModel, null);
    registerType(300 /* Barline */, BarlineModel, BarlineView.Component);
    registerType(450 /* BeamGroup */, BeamGroupModel, BeamGroupView.Component);
    registerType(140 /* Begin */, BeginModel, BeginView.Component);
    registerType(150 /* Clef */, ClefModel, ClefView.Component);
    registerType(410 /* Direction */, DirectionModel, DirectionView.Component);
    registerType(600 /* Duration */, DurationModel, DurationView.Component);
    registerType(110 /* EndMarker */, EndMarkerModel, null);
    registerType(160 /* KeySignature */, KeySignatureModel, KeySignatureView.Component);
    registerType(130 /* NewLine */, NewlineModel, NewlineView.Component);
    registerType(120 /* NewPage */, NewpageModel, null);
    registerType(999 /* Placeholder */, PlaceholderModel, null);
    registerType(50 /* Print */, PrintModel, null);
    registerType(425 /* Slur */, SlurModel, SlurView.Component);
    registerType(170 /* TimeSignature */, TimeSignatureModel, TimeSignatureView.Component);
    registerType(475 /* Wedge */, WedgeModel, WedgeView.Component);
    function registerType(type, model, view) {
        Model.constructorsByType[type] = function (spec) {
            return new model(spec);
        };
        model.setView(view);
    }
}
exports.ensureRegistered = ensureRegistered;
;
