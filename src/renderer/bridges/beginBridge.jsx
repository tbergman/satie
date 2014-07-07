/**
 * Appears at the very begining of a stave.
 *
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var Brace = require("../primitives/brace.jsx");
var Group = require("../primitives/group.jsx");
var StaveLines = require("../primitives/staveLines.jsx");
var renderUtil = require("../util.jsx");

class BeginBridge extends Bridge {
    annotateImpl(ctx) {
        this.pianoStaff = ctx.stave.pianoStaff;
        this.stave = ctx.stave;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            this.noMargin = true;
        } else {
            this.noMargin = false;
        }
        this.braceY = this.y();
        // We're cheating here! y() won't be annotated yet, but it will
        // be at render time!.
        this.getBraceY2 = () => ctx.nextStave().body[0].y();
        this.pageSize = ctx.pageSize;
        return true;
    }
    toLylite() {
    }
    render() {
        var Renderer = require("../renderer.jsx");
        return <Group key={this.key()}>
            {this.stave.pianoStaff && <Brace
                x={renderUtil.mm(this.noMargin ? 15 : 30, this.fontSize())}
                fontSize={this.fontSize()*Renderer.FONT_SIZE_FACTOR}
                y={this.braceY}
                y2={this.getBraceY2()} />}
            <StaveLines
                key={"StaveLines"}
                width={renderUtil.mm(this.pageSize.width -
                        (this.noMargin ? 30 : 45), this.fontSize())}
                x={renderUtil.mm(this.noMargin ? 15 : 30, this.fontSize())}
                y={this.braceY} />
        </Group>;
    }
    visible() {
        return true;
    }
}
BeginBridge.prototype.prereqs = [
    [
        function(ctx) {
            return ctx.idx === 0; },
        function(ctx) {
            return ctx.eraseCurrent();
        },
        "BeginBridge must only appear at the begining of a song."
    ]
];

var createBegin = (ctx) => {
    return ctx.insertPast(new BeginBridge(
        {_annotated: "createBegin"}));
};

module.exports = BeginBridge;
module.exports.createBegin = createBegin;
