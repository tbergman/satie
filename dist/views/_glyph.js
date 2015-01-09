var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var assert = require("assert");
var C = require("../stores/contracts");
var Glyph = (function (_super) {
    __extends(Glyph, _super);
    function Glyph() {
        _super.apply(this, arguments);
    }
    Glyph.prototype.render = function () {
        var px = this.props.x;
        var py = this.props.y;
        if (this.props.glyphName.substr(0, 2) === "fa") {
            assert(this.props.code);
            return React.DOM.text({
                x: px,
                y: py,
                fill: this.props.fill,
                fillOpacity: this.props.opacity,
                strokeOpacity: this.props.opacity,
                transform: this.props.transform,
                style: { fontSize: this.props.scale ? this.props.scale + "em" : undefined },
                className: "fa"
            }, this.props.code);
        }
        else {
            assert(!this.props.code);
        }
        var text = React.DOM.text({
            x: px,
            y: py,
            fill: this.props.fill,
            fillOpacity: this.props.opacity,
            strokeOpacity: this.props.opacity,
            transform: this.props.transform,
            fontSize: 40 * (this.props.scale || 1),
            className: "mn_"
        }, C.SMuFL.getGlyphCode(this.props.glyphName));
        if (!this.props["selection-info"] || global.isChoreServer) {
            return text;
        }
        else {
            return React.DOM.g(null, text, React.DOM.rect({
                "data-selection-info": this.props["selection-info"],
                width: 4,
                height: 5,
                x: (this.props.x - 1.2),
                y: (this.props.y - 2.5),
                fill: "transparent",
                className: "mn_handle"
            }));
        }
    };
    return Glyph;
})(TypedReact.Component);
var Glyph;
(function (Glyph) {
    "use strict";
    Glyph.Component = TypedReact.createClass(Glyph, [PureRenderMixin]);
})(Glyph || (Glyph = {}));
module.exports = Glyph;
