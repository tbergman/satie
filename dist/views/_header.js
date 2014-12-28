var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var C = require("../stores/contracts");
var Header = (function (_super) {
    __extends(Header, _super);
    function Header() {
        _super.apply(this, arguments);
        this._uuid = C.generateUUID();
        this._listeners = [];
    }
    Header.prototype.render = function () {
        var _this = this;
        this._editNodes = [];
        var model = this.props.model;
        var editMode = this.getEditMode();
        var style = {
            fontSize: this.props.fontSize + "px"
        };
        return React.DOM.g({ style: style }, model.credits.map(function (credit, idx) { return React.DOM.g({ key: "w_" + idx }, credit.creditWords.map((editMode ? _this.getEditNode : getViewNode).bind(_this, _this._editNodes, credit))); }));
        function toCSS(justification) {
            switch (justification) {
                case 0 /* Left */:
                    return "start";
                case 2 /* Center */:
                    return "middle";
                case 1 /* Right */:
                    return "end";
            }
        }
        function getViewNode(editNodes, credit, words, idx) {
            editNodes[idx] = null;
            return React.DOM.text({
                key: "credit_" + idx,
                className: "tn_",
                "data-selection-info": "header_" + credit.creditTypes.join("_") + "_" + idx,
                style: {
                    textAnchor: toCSS(words.justify)
                },
                x: (words.defaultX + (words.relativeX || 0)),
                y: (words.defaultY + (words.relativeY || 0)),
                fontSize: C.renderUtil.cssSizeToTenths(this.props.fontSize, words.fontSize)
            }, words.words);
        }
    };
    Header.prototype.getEditMode = function () {
        return null;
    };
    Header.prototype.getEditNode = function (editNodes, credit, words, idx) {
        return null;
    };
    Header.prototype.componentDidMount = function () {
        this._renderForeigns();
    };
    Header.prototype.componentDidUpdate = function () {
        this._renderForeigns();
    };
    Header.prototype.componentWillReceiveProps = function (nextProps) {
        this._removeOldForeigns(nextProps.model.credits.length);
    };
    Header.prototype.componentWillUnmount = function () {
        this._removeOldForeigns(0);
    };
    Header.prototype._renderForeigns = function () {
        var _this = this;
        for (var i = 0; i < this._editNodes.length; ++i) {
            var node = this._editNodes[i];
            if (node) {
                var words = node.words;
                React.render(React.DOM.input({
                    type: "text",
                    className: "form-control",
                    id: "newsong_title",
                    placeholder: "",
                    onChange: function (event) { return _this.setState({
                        composer: event.target.value
                    }); },
                    value: words.words
                }), this.refs[node.ref].getDOMNode().firstElementChild.firstElementChild);
            }
        }
    };
    Header.prototype._removeOldForeigns = function (i) {
        for (; i < this._editNodes.length; ++i) {
            var node = this._editNodes[i];
            if (node) {
                React.unmountComponentAtNode(this.refs[node.ref].getDOMNode().firstElementChild.firstElementChild);
            }
        }
    };
    Header.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps);
        return oldHash !== this._hash;
    };
    return Header;
})(TypedReact.Component);
var Header;
(function (Header) {
    "use strict";
    Header.Component = TypedReact.createClass(Header);
})(Header || (Header = {}));
module.exports = Header;
