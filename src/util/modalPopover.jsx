/**
 * Utility which renders a popover.
 */

var Bootstrap = require("react-bootstrap");
var React = require("react");
var renderUtil = require("./renderUtil");

var ModalPopover = React.createClass({
    render: function() {
        return React.DOM.div({
            className: "modalPopover zHACK",
            onClick: this.props.close},
            this.transferPropsTo(Bootstrap.Popover(null, this.props.children))
        );
    }
});

module.exports = ModalPopover;
