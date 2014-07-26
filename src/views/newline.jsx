/**
 * Appears at the very begining of a line, except the first line.
 * See also begin.jsx.
 *
 * @jsx React.DOM
 */

var React = require("react");
var SMuFL = require("ripienoUtil/SMuFL.js");
var _ = require("lodash");

var NewlineModel = require("../stores/newline.jsx");
var Group = require("./_group.jsx");
var StaveLines = require("./_staveLines.jsx");
var hash = require("ripienoUtil/hash.jsx");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var NewlineView = React.createClass({
    render: function () {
        var spec = this.props.spec;

        return <StaveLines
                key={spec.key()}
                width={renderUtil.mm(spec.pageSize.width - 30, spec.fontSize())}
                x={renderUtil.mm(15, spec.fontSize())}
                y={spec.y() + spec.lineSpacing} />;
    },
    propTypes: {
        spec: React.PropTypes.instanceOf(NewlineModel)
    }
});

module.exports = NewlineView;
