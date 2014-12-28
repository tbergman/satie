var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var C = require("../stores/contracts");
var Rect = require("./_rect");
var Line = require("./_line");
var PureModelViewMixin = require("./pureModelViewMixin");
var SMuFL = require("../util/SMuFL");
var Barline = (function (_super) {
    __extends(Barline, _super);
    function Barline() {
        _super.apply(this, arguments);
    }
    Barline.prototype.render = function () {
        var spec = this.props.spec;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;
        var thickX = spec.x + defaults.barlineSeparation * 10 + defaults.thickBarlineThickness * 10;
        if (spec.barStyle.data === 5 /* LightHeavy */) {
            return React.createElement("g", null, React.createElement(Line.Component, { key: 1, x1: spec.x, x2: spec.x, y1: spec.y - spec.height - spec.yOffset, y2: spec.y + spec.height - spec.yOffset, stroke: spec.barStyle.color, victoriaYStrokeWidthFactor: 0, fill: spec.barStyle.color, strokeWidth: defaults.thinBarlineThickness * 10 }), React.createElement(Line.Component, { key: 2, x1: thickX, x2: thickX, y1: spec.y - spec.height - spec.yOffset, y2: spec.y + spec.height - spec.yOffset, victoriaYStrokeWidthFactor: 0, stroke: spec.barStyle.color, fill: spec.barStyle.color, strokeWidth: defaults.thickBarlineThickness * 10 }), React.createElement(Rect.Component, { key: 3, opacity: 1.0, x: spec.x + defaults.barlineSeparation * 10 + defaults.thickBarlineThickness * 10 + defaults.thinBarlineThickness * 10, y: spec.y - spec.height - 1 - spec.yOffset, stroke: "#FFFFFF", fill: "#FFFFFF", height: spec.height * 2 + 2, width: 4000 }));
        }
        return React.createElement(Line.Component, { x1: spec.x, x2: spec.x, y1: spec.y - spec.height - spec.yOffset, y2: spec.y + spec.height - spec.yOffset, stroke: spec.barStyle.color, fill: spec.barStyle.color, strokeWidth: defaults.thinBarlineThickness * 10 });
    };
    return Barline;
})(TypedReact.Component);
;
var Barline;
(function (Barline) {
    "use strict";
    Barline.Component = TypedReact.createClass(Barline, [PureModelViewMixin]);
})(Barline || (Barline = {}));
module.exports = Barline;
