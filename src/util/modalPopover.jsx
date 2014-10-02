/**
 * @jsx React.DOM
 */

var Bootstrap = require("react-bootstrap");
var React = require("react");
var renderUtil = require("./renderUtil");

var Popover = Bootstrap.Popover;

var ModalPopover = React.createClass({
    render: function() {
        return React.DOM.div({
            className: "modalPopover zHACK",
            onClick: this.props.close},
            this.transferPropsTo(Popover(null, this.props.children))
        );
    }
});

module.exports = ModalPopover;
