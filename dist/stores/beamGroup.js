var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var assert = require("assert");
var C = require("./contracts");
var Annotator = require("./annotator");
var ClefModel = require("./clef");
var KeySignatureModel = require("./keySignature");
var TimeSignatureModel = require("./timeSignature");
var BeamGroupModel = (function (_super) {
    __extends(BeamGroupModel, _super);
    function BeamGroupModel(spec, placeholder) {
        _super.call(this, spec, placeholder);
        if (spec.beam) {
            this.beam = spec.beam;
        }
    }
    Object.defineProperty(BeamGroupModel.prototype, "type", {
        get: function () {
            return 450 /* BeamGroup */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BeamGroupModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BeamGroupModel.prototype, "fields", {
        get: function () {
            return ["beamCount", "variableBeams"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BeamGroupModel.prototype, "beamCount", {
        get: function () {
            return this.beam ? this.beam.length : 0;
        },
        set: function (l) {
            if (!this.beam) {
                this.beam = [];
            }
            this.beam.length = l;
        },
        enumerable: true,
        configurable: true
    });
    BeamGroupModel.prototype.modelDidLoad = function (body, idx) {
        var beamCount = this.beamCount;
        var toMark = beamCount;
        var gotTuplet = false;
        for (var i = idx; toMark; ++i) {
            assert(body[i]);
            if (body[i].isNote) {
                this.tuplet = gotTuplet ? C.JSONx.clone(body[i].note.tuplet) : this.tuplet;
                gotTuplet = true;
                --toMark;
            }
        }
        this.beam = [];
        for (var i = idx; i < body.length && this.beam.length < beamCount; ++i) {
            if (body[i].isNote) {
                this.beam.push(body[i]);
            }
        }
    };
    BeamGroupModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    BeamGroupModel.prototype.annotateImpl = function (ctx) {
        var _this = this;
        if (!ctx.attributes.clef) {
            return ClefModel.createClef(ctx);
        }
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }
        var beats = 0;
        for (var i = 0; i < this.beam.length; ++i) {
            beats += this.beam[i].calcBeats(ctx);
        }
        if (ctx.beat + beats > ctx.ts.beats) {
            _.each(this.beam, function (o) {
                o.inBeam = false;
            });
            ctx.eraseCurrent();
            return 20 /* RetryCurrent */;
        }
        if (this.beam.length < 2) {
            _.each(this.beam, function (o) {
                o.inBeam = false;
            });
            ctx.eraseCurrent();
            return 20 /* RetryCurrent */;
        }
        for (var i = 0; i < this.beam.length; ++i) {
            if (!this.beam[i].temporary && !this.beam[i].isRest && !this.beam[i].hasFlagOrBeam) {
                _.each(this.beam, function (o) {
                    o.inBeam = false;
                });
                ctx.eraseCurrent();
                return 20 /* RetryCurrent */;
            }
        }
        var mret = 90 /* RetryFromEntry */;
        var next = ctx.next(function (obj) { return obj.isNote; }).note;
        this.tuplet = next ? next.displayTuplet : null;
        ctx.startOfBeamBeat = ctx.beat;
        var b1 = this.beam[0].count;
        if (_.all(this.beam, function (b) { return b.count === b1; })) {
            this.beams = Math.round(Math.log(this.beam[0].count) / Math.log(2)) - 2;
        }
        else {
            this.beams = -1 /* Variable */;
            this.variableBeams = _.map(this.beam, toBeamCount);
            function toBeamCount(b) {
                return Math.round(Math.log(b.count) / Math.log(2)) - 2;
            }
        }
        if (!this.beam.every(function (b) {
            b.x = ctx.x;
            b.y = ctx.y;
            var cidx = _this.idx;
            while (ctx.body[cidx] !== b) {
                cidx = cidx + 1;
            }
            var oldIdx = ctx.idx;
            ctx.isBeam = true;
            ctx.idx = cidx;
            var ret = b.annotate(ctx);
            ctx.idx = oldIdx;
            ctx.isBeam = undefined;
            mret = ret;
            return (mret === 10 /* Success */);
        })) {
            return mret;
        }
        ctx.x = this.x;
        return 10 /* Success */;
    };
    BeamGroupModel.prototype.generate = function (options) {
        return _.map(this.beam, function (b, idx) { return b.render(options[idx]); });
    };
    BeamGroupModel.prototype.calcBeats = function (ctx, inheritedCount, force) {
        var sum = 0;
        for (var i = 0; i < this.beam.length; ++i) {
            sum += this.beam[i].calcBeats(ctx, inheritedCount, force);
        }
        return sum;
    };
    BeamGroupModel.createBeam = function (ctx, beam) {
        var replaceMode = ctx.body[ctx.idx - 1].placeholder && ctx.body[ctx.idx - 1].priority === 450 /* BeamGroup */;
        var model = new BeamGroupModel({ beam: beam }, true);
        var offset = replaceMode ? 1 : 0;
        var idx = ctx.idx - offset;
        var spliceMode = replaceMode ? 3 /* Masked */ : 1 /* MatchedOnly */;
        model.tuplet = model.beam[0].tuplet;
        ctx.splice(idx, offset, [model], spliceMode);
        return 90 /* RetryFromEntry */;
    };
    BeamGroupModel.decideDirection = function (firstLines, lastLines) {
        var firstAvgLine;
        var lastAvgLine;
        firstAvgLine = _.reduce(firstLines, function (m, s) { return m + s; }, 0) / firstLines.length;
        lastAvgLine = _.reduce(lastLines, function (m, s) { return m + s; }, 0) / lastLines.length;
        var avgLine = (firstAvgLine + lastAvgLine) / 2;
        return avgLine >= 3 ? -1 : 1;
    };
    return BeamGroupModel;
})(Model);
BeamGroupModel.prototype.tuplet = null;
module.exports = BeamGroupModel;
