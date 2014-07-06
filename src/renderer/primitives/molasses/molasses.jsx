/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("lodash");
var assert = require("assert");

var Header = require("../header.jsx");
var StaveLines = require("../staveLines.jsx");

var Molasses = React.createClass({
    render: function() {
        return <svg
                    data-page={this.props.page.idx}
                    ref={"svg" + this.props.page.idx}
                    height={this.props.height}
                    onClick={this.props.onClick}
                    onMouseDown={this.props.onMouseDown}
                    onMouseUp={this.props.onMouseUp}
                    onMouseLeave={this.props.onMouseLeave}
                    onMouseMove={this.props.onMouseMove}
                    viewBox={this.props.viewbox}
                    width={this.props.width}>
                {this.props.children}
        </svg>;
    },
});

module.exports = Molasses;
