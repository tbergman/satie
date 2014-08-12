/**
 * Appears at the very begining of a stave.
 *
 * @jsx React.DOM
 */

var React = require("react");
var SMuFL = require("ripienoUtil/SMuFL.ts");
var _ = require("lodash");

var BeginModel = require("../stores/begin.ts");
var Brace = require("./_brace.jsx");
var Group = require("./_group.jsx");
var StaveLines = require("./_staveLines.jsx");
var hash = require("ripienoUtil/hash.ts");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var BeginView = React.createClass({
    render: function () {
        var spec = this.props.spec;

        return <Group>
            {spec.pianoStaff && <Brace
                x={renderUtil.mm(spec.noMargin ? 15 : 30, spec.fontSize())}
                fontSize={spec.fontSize()}
                y={spec.braceY}
                y2={spec.getBraceY2()} />}
            <StaveLines
                key={"StaveLines"}
                width={renderUtil.mm(spec.pageSize.width -
                        (spec.noMargin ? 30 : 45), spec.fontSize())}
                x={renderUtil.mm(spec.noMargin ? 15 : 30, spec.fontSize())}
                y={spec.braceY} />
        </Group>;
    },
    propTypes: {
        spec: React.PropTypes.instanceOf(BeginModel)
    }
});

module.exports = BeginView;
