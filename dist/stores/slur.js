var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var BeamGroupModel = require("./beamGroup");
var C = require("./contracts");
var ClefModel = require("./clef");
var KeySignatureModel = require("./keySignature");
var DurationModel = require("./duration");
var TimeSignatureModel = require("./timeSignature");
var SlurGroupModel = (function (_super) {
    __extends(SlurGroupModel, _super);
    function SlurGroupModel() {
        _super.apply(this, arguments);
        this._beam = null;
        this._notes = null;
    }
    Object.defineProperty(SlurGroupModel.prototype, "type", {
        get: function () {
            return 425 /* Slur */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SlurGroupModel.prototype, "fields", {
        get: function () {
            return ["slur"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SlurGroupModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    SlurGroupModel.prototype.annotateImpl = function (ctx) {
        if (ctx.prev().type === 999 /* Placeholder */) {
            this.x = ctx.prev().x;
            ctx.x = this.x;
        }
        if (!ctx.attributes.clef) {
            return ClefModel.createClef(ctx);
        }
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }
        var n = [];
        this._beam = undefined;
        for (var i = ctx.idx; i < ctx.body.length && n.length < this.slur; ++i) {
            if (ctx.body[i].type === 450 /* BeamGroup */) {
                this._beam = ctx.body[i];
            }
            if (ctx.body[i].isNote) {
                n.push(ctx.body[i]);
            }
        }
        this._notes = n;
        this.isEmpty = !n.length;
        if (!this.isEmpty) {
            var first = this._notes[0];
            var last = this._notes[this._notes.length - 1];
            var firstLines = DurationModel.getLines(first, ctx);
            var lastLines = DurationModel.getLines(last, ctx);
            this.direction = -BeamGroupModel.decideDirection(firstLines, lastLines);
            this.m_x = first.x;
            this.m_y = first.y;
            this.lines1 = DurationModel.getLines(first, ctx);
            this.lines2 = DurationModel.getLines(last, ctx);
            this.width = last.x - first.x;
        }
        return 10 /* Success */;
    };
    return SlurGroupModel;
})(Model);
SlurGroupModel.prototype.slur = null;
SlurGroupModel.prototype.isEmpty = true;
SlurGroupModel.prototype.direction = NaN;
SlurGroupModel.prototype.lines1 = null;
SlurGroupModel.prototype.lines2 = null;
SlurGroupModel.prototype.width = NaN;
SlurGroupModel.prototype.m_x = NaN;
SlurGroupModel.prototype.m_y = NaN;
module.exports = SlurGroupModel;
