/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");
var assert = require("assert");

var Header = require("../header.jsx");
var StaveLines = require("../staveLines.jsx");

var Molasses = React.createClass({
    render: function() {
        return <svg
                    data-page={this.props.page.idx}
                    ref={"svg" + this.props.page.idx}
                    height="100%"
                    onClick={this.props.onClick}
                    onMouseDown={this.props.onMouseDown}
                    onMouseUp={this.props.onMouseUp}
                    onMouseLeave={this.props.onMouseLeave}
                    onMouseMove={this.props.onMouseMove}
                    viewBox={this.props.viewbox}
                    width="100%">
                {this.props.children}
        </svg>;
    },
});

module.exports = Molasses;
