var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var assert = require("assert");
var Annotator = require("./annotator");
var BarlineModel = require("./barline");
var BeginModel = require("./begin");
var C = require("./contracts");
var ClefModel = require("./clef");
var DurationModel = require("./duration");
var EndMarkerModel = require("./endMarker");
var KeySignatureModel = require("./keySignature");
var Metre = require("./metre");
var NewlineModel = require("./newline");
var NewpageModel = require("./newpage");
var TimeSignatureModel = require("./timeSignature");
var PlaceholderModel = (function (_super) {
    __extends(PlaceholderModel, _super);
    function PlaceholderModel(spec, annotated) {
        _super.call(this, spec, annotated);
        this.annotated = annotated;
    }
    Object.defineProperty(PlaceholderModel.prototype, "visible", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaceholderModel.prototype, "xPolicy", {
        get: function () {
            return 0 /* Invalid */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaceholderModel.prototype, "fields", {
        get: function () {
            return ["priority", "item", "musicLine"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaceholderModel.prototype, "type", {
        get: function () {
            return 999 /* Placeholder */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaceholderModel.prototype, "placeholder", {
        get: function () {
            return true;
        },
        set: function (b) {
            assert(false, "A PlaceholderModel cannot help but be a placeholder, however much it tries...");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaceholderModel.prototype, "priority", {
        get: function () {
            return this._priority;
        },
        set: function (c) {
            this._priority = c;
        },
        enumerable: true,
        configurable: true
    });
    PlaceholderModel.prototype.recordMetreDataImpl = function (mctx) {
        if (this.priority === 600 /* Duration */ && mctx.beat === 0) {
            this.ctxData = new C.MetreContext({
                attributes: mctx.attributes,
                beat: mctx.ts.beats,
                bar: mctx.bar - 1,
                endMarker: false,
                ts: mctx.ts
            });
        }
        else {
            this.ctxData = new C.MetreContext(mctx);
        }
    };
    PlaceholderModel.prototype.annotateImpl = function (ctx) {
        var loc = new C.Location(ctx.loc);
        var usefulItems = ctx.findVertical(function (obj) { return obj.type !== 999 /* Placeholder */ || !obj.ctxData || !loc.eq(obj.ctxData); });
        if (!usefulItems.length) {
            return ctx.eraseCurrent();
        }
        var realItems = ctx.findVertical(function (obj) { return obj.type !== 999 /* Placeholder */; });
        while (ctx.next() && !ctx.findVertical(function (obj) { return obj.type !== 999 /* Placeholder */; }, ctx.idx + 1).length) {
            ctx.eraseFuture(ctx.idx + 1);
        }
        if (this.priority !== realItems[0].type) {
            console.warn("Dangerously correcting a mismatched type.");
            this.priority = realItems[0].type;
        }
        if (ctx.ts && ctx.__globalBeat__ < ctx.ts.beats) {
            if (ctx.beat < ctx.__globalBeat__) {
                return PlaceholderModel.fillMissingBeats(ctx);
            }
            if (ctx.beat === ctx.__globalBeat__ && this.priority === 600 /* Duration */) {
                assert(realItems[0], "We can't have an entire column of fake durations,");
                return PlaceholderModel.fillMissingBeats(ctx, realItems[0].calcBeats(ctx));
            }
        }
        switch (this.priority) {
            case 300 /* Barline */:
                ctx.body.splice(ctx.idx, 1, new BarlineModel({ barStyle: { data: 0 /* Regular */ } }, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
            case 140 /* Begin */:
                ctx.body.splice(ctx.idx, 1, new BeginModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
            case 150 /* Clef */:
                if (!ctx.attributes.clef) {
                    ctx.body.splice(ctx.idx, 1, new ClefModel(null, true));
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed = this.proposed;
                    return 20 /* RetryCurrent */;
                }
                break;
            case 600 /* Duration */:
                assert(!ctx.findVertical(function (c) { return c.priority !== 600 /* Duration */; }).length);
                if (ctx.next(null, 1, true).type === 450 /* BeamGroup */) {
                    var bodies = ctx.findVertical(function () { return true; }, this.idx + 1);
                    ctx.eraseFuture(this.idx + 1);
                    ctx.insertPastVertical(bodies);
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed = this.proposed;
                    return 20 /* RetryCurrent */;
                }
                break;
            case 110 /* EndMarker */:
                ctx.body.splice(ctx.idx, 1, new EndMarkerModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
            case 160 /* KeySignature */:
                var ks = C.JSONx.clone(realItems[0]);
                assert(ks, "Undefined prevKeySignature!!");
                ctx.body.splice(ctx.idx, 1, new KeySignatureModel({ keySignature: ks }, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
            case 130 /* NewLine */:
                ctx.body.splice(ctx.idx, 1, new NewlineModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
            case 120 /* NewPage */:
                ctx.body.splice(ctx.idx, 1, new NewpageModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
            case 170 /* TimeSignature */:
                var tses = ctx.findVertical(function (obj) { return obj.type === 170 /* TimeSignature */; });
                assert(tses.length, "Staves cannot all be placeholders!");
                ctx.body.splice(ctx.idx, 1, new TimeSignatureModel(tses[0], true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed = this.proposed;
                return 20 /* RetryCurrent */;
        }
        this.recordMetreDataImpl(ctx);
        return 10 /* Success */;
    };
    PlaceholderModel.fillMissingBeats = function (ctx, extraBeats) {
        extraBeats = extraBeats || 0;
        var rest = { chord: [{ step: "R", octave: null, acc: null }] };
        var missingBeats = Metre.subtract(ctx.__globalBeat__ + extraBeats, ctx.beat, ctx).map(function (spec) { return new DurationModel(_.extend(spec, rest), true); });
        ctx.splice(ctx.idx, 1, missingBeats, 3 /* Masked */);
        return 60 /* RetryLine */;
    };
    return PlaceholderModel;
})(Model);
PlaceholderModel.prototype._priority = 1111 /* Unknown */;
module.exports = PlaceholderModel;
