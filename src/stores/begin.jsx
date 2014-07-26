/**
 * Appears at the very begining of a stave.
 *
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

class BeginModel extends Model {
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
    visible() {
        return true;
    }
}
BeginModel.prototype.prereqs = [
    [
        function(ctx) {
            return ctx.idx === 0; },
        function(ctx) {
            return ctx.eraseCurrent();
        },
        "BeginModel must only appear at the begining of a song."
    ]
];

var createBegin = (ctx) => {
    return ctx.insertPast(new BeginModel(
        {_annotated: "createBegin"}));
};

module.exports = BeginModel;
module.exports.createBegin = createBegin;
