var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureModelViewMixin = require("./pureModelViewMixin");
var Direction = (function (_super) {
    __extends(Direction, _super);
    function Direction() {
        _super.apply(this, arguments);
    }
    Direction.prototype.render = function () {
        return React.createElement("g", null);
    };
    return Direction;
})(TypedReact.Component);
;
var Direction;
(function (Direction) {
    "use strict";
    Direction.Component = TypedReact.createClass(Direction, [PureModelViewMixin]);
})(Direction || (Direction = {}));
module.exports = Direction;
