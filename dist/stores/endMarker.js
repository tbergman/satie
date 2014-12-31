var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var assert = require("assert");
var C = require("./contracts");
var Metre = require("./metre");
var NewlineModel = require("./newline");
var EndMarkerModel = (function (_super) {
    __extends(EndMarkerModel, _super);
    function EndMarkerModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(EndMarkerModel.prototype, "visible", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EndMarkerModel.prototype, "type", {
        get: function () {
            return 110 /* EndMarker */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EndMarkerModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    EndMarkerModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext({
            attributes: mctx.attributes,
            ts: mctx.ts,
            beat: mctx.ts.beats,
            bar: mctx.bar - 1,
            endMarker: true
        });
    };
    EndMarkerModel.prototype.annotateImpl = function (ctx) {
        var next = ctx.next();
        var prev = ctx.prev();
        if (next && next.type === 110 /* EndMarker */ || prev && prev.type === 110 /* EndMarker */) {
            for (var i = ctx.idx; i >= 0; --i) {
                if (ctx.body[i].type === 130 /* NewLine */) {
                    ctx.splice(i, 1);
                    ctx.markEntireSongDirty();
                    if (ctx.songEditor) {
                        ctx.songEditor.dangerouslyMarkRendererDirty();
                    }
                    return 90 /* RetryFromEntry */;
                }
            }
            ctx.eraseCurrent();
            return 60 /* RetryLine */;
        }
        if (next && next.priority !== 300 /* Barline */ && (!ctx.body[ctx.idx + 2] || (ctx.body[ctx.idx + 2].priority !== 130 /* NewLine */ && ctx.body[ctx.idx + 2].priority !== 120 /* NewPage */))) {
            ctx.eraseCurrent();
            return 20 /* RetryCurrent */;
        }
        if (prev.type !== 300 /* Barline */ && ctx.beat && ctx.beat < ctx.ts.beats) {
            var beatsRemaining = ctx.ts.beats - ctx.beat;
            assert(beatsRemaining < ctx.ts.beats, "Don't run this on entirely blank bars!");
            var DurationModel = require("./duration");
            var toAdd = Metre.subtract(ctx.ts.beats, ctx.beat, ctx).map(function (beat) {
                beat.chord = [{ step: "R", octave: 0, alter: null }];
                beat.tie = false;
                return new DurationModel(beat, true);
            });
            assert(toAdd.length);
            ctx.splice(this.idx, 0, toAdd);
            return 60 /* RetryLine */;
        }
        if (!ctx.next() && (prev.type !== 300 /* Barline */ || prev.barStyle.data !== 5 /* LightHeavy */)) {
            if (prev.type === 300 /* Barline */) {
                prev.barStyle.data = 5 /* LightHeavy */;
                return 60 /* RetryLine */;
            }
            else {
                var BarlineModel = require("./barline");
                return BarlineModel.createBarline(ctx, 5 /* LightHeavy */);
            }
        }
        if (!ctx.next()) {
            NewlineModel.explode(ctx);
        }
        this.endMarker = true;
        return 10 /* Success */;
    };
    return EndMarkerModel;
})(Model);
module.exports = EndMarkerModel;
