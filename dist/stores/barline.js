var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var C = require("./contracts");
var EndMarkerModel = require("./endMarker");
var Metre = require("./metre");
var NewlineModel = require("./newline");
var TimeSignatureModel = require("./timeSignature");
var BarlineModel = (function (_super) {
    __extends(BarlineModel, _super);
    function BarlineModel(spec, annotated, engraved) {
        _super.call(this, spec, annotated, engraved);
        this.location = 1 /* Right */;
        if (!this.barStyle) {
            this.barStyle = {
                color: "#000000",
                data: 0 /* Regular */
            };
        }
    }
    Object.defineProperty(BarlineModel.prototype, "type", {
        get: function () {
            return 300 /* Barline */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BarlineModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BarlineModel.prototype, "fields", {
        get: function () {
            return [
                "segno",
                "coda",
                "location",
                "codaAttrib",
                "wavyLine",
                "fermatas",
                "segnoAttrib",
                "divisions",
                "barStyle",
                "ending",
                "repeat",
                "footnote",
                "level"
            ];
        },
        enumerable: true,
        configurable: true
    });
    BarlineModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
        this.ctxData.division = 0;
        if (mctx.division !== 0) {
            ++mctx.bar;
        }
        mctx.division = 0;
    };
    BarlineModel.prototype.annotateImpl = function (ctx) {
        if (!ctx.prev().endMarker) {
            return ctx.insertPast(new EndMarkerModel({ endMarker: true }, true, this.engraved));
        }
        if (!ctx.next()) {
            ctx.insertFuture(new EndMarkerModel({ endMarker: true }, true, this.engraved));
        }
        var i;
        var okay;
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }
        okay = false;
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== 130 /* NewLine */; --i) {
            if (ctx.body[i].isNote) {
                okay = true;
                break;
            }
        }
        if (!okay) {
            if (i === -1) {
                var DurationModel = require("./duration");
                var fullRest = Metre.wholeNote(ctx).map(function (spec) { return _.extend({ isRest: true }, spec); }).map(function (spec) { return new DurationModel(spec, true); });
                _.each(fullRest, function (r) {
                    r.isRest = true;
                    ctx.insertPast(r);
                });
                return 20 /* RetryCurrent */;
            }
            else {
                ctx.splice(i, ctx.idx - i);
                ctx.markEntireSongDirty();
                ctx.score.dangerouslyMarkRendererLineDirty(ctx.line - 1);
                ctx.score.dangerouslyMarkRendererLineDirty(ctx.line);
                ctx.idx = i;
                return 50 /* LineRemoved */;
            }
        }
        okay = false;
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== 300 /* Barline */; --i) {
            if (ctx.body[i].isNote || ctx.body[i].type === 130 /* NewLine */) {
                okay = true;
                break;
            }
        }
        if (!okay) {
            return ctx.eraseCurrent();
        }
        if ((ctx.x > ctx.maxX) && ctx.lines[ctx.line].bar !== ctx.bar) {
            ctx.idx--;
            return NewlineModel.createNewline(ctx);
        }
        if (this.barStyle.data === 5 /* LightHeavy */) {
            okay = false;
            for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== 130 /* NewLine */; --i) {
                if (ctx.body[i].isNote) {
                    okay = true;
                    break;
                }
            }
            if (!okay) {
                var DurationModel = require("./duration");
                var whole = Metre.wholeNote(ctx).map(function (w) { return new DurationModel(w, true); });
                for (i = 0; i < whole.length; ++i) {
                    whole[i].chord = [{ step: "R", alter: null, octave: null }];
                    whole[i].tieds = [null];
                }
                Array.prototype.splice.apply(ctx.body, [ctx.idx + 1, 0].concat(whole));
                return 60 /* RetryLine */;
            }
        }
        var next = ctx.next(function (c) { return c.type !== 50 /* Print */; });
        this.newlineNext = (ctx.body.length > ctx.idx + 1) && (next.type === 130 /* NewLine */ || next.type === 120 /* NewPage */);
        ctx.division = 0;
        ++ctx.bar;
        var intersectingNotes = ctx.intersects(600 /* Duration */, ctx.idx, true, false);
        var nextNonPlaceholderIdx = ctx.nextIdx(function (c) { return !c.placeholder; });
        var nextNonPlaceholder = ctx.body[nextNonPlaceholderIdx];
        if (nextNonPlaceholder && nextNonPlaceholder.isNote) {
            this.annotatedAccidentalSpacing = _.chain(intersectingNotes).map(function (n) { return n.getAccWidthAfterBar(ctx); }).max().value();
        }
        else {
            this.annotatedAccidentalSpacing = 0;
        }
        if (this.barStyle.data === 5 /* LightHeavy */ && ctx.next(null, 2)) {
            this.barStyle.data = 0 /* Regular */;
            return 20 /* RetryCurrent */;
        }
        ctx.barKeys = ctx.barKeys;
        ctx.barKeys.push(this.key);
        ctx.x += (this.newlineNext ? 0 : 12) + this.annotatedAccidentalSpacing;
        if (ctx.idxInPart < ctx.part.staveCount) {
            ctx.accidentalsByStaff[ctx.idxInPart + 1] = C.NoteUtil.getAccidentals(ctx.attributes.keySignature);
        }
        this.height = 20;
        this.yOffset = 0;
        this.barStyle.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#2A2A2A");
        if (!ctx.disableRecordings) {
            ctx.record(this);
        }
        if (ctx.invisibleForBars) {
            --ctx.invisibleForBars;
        }
        else if (ctx.invisibleForBars === 0) {
            delete ctx.invisibleForBars;
        }
        return 10 /* Success */;
    };
    return BarlineModel;
})(Model);
var BarlineModel;
(function (BarlineModel) {
    "use strict";
    function createBarline(ctx, type, engraved) {
        if (type === void 0) { type = 0 /* Regular */; }
        if (engraved === void 0) { engraved = false; }
        if (ctx.curr.type === 450 /* BeamGroup */) {
            ctx.eraseCurrent();
            for (var j = ctx.idx; j < ctx.body.length && ctx.body[j].inBeam; ++j) {
                ctx.body[j].inBeam = false;
                if (ctx.body[j] === ctx.curr) {
                    var newBarline = new BarlineModel({ barStyle: { data: type } }, true, engraved);
                    if (j === ctx.idx) {
                        ctx.insertPast(newBarline);
                    }
                    else {
                        ctx.insertFuture(newBarline, j);
                    }
                    ++j;
                }
            }
            return 60 /* RetryLine */;
        }
        _seperate(ctx, type, engraved);
        return 30 /* RetryCurrentNoOptimizations */;
    }
    BarlineModel.createBarline = createBarline;
    ;
    function _seperate(ctx, type, engraved) {
        var jdx = ctx.nextIdx(null, 2);
        var inTwo = ctx.body[jdx];
        if (inTwo && inTwo.type === 300 /* Barline */) {
            ctx.body[jdx] = new BarlineModel({ barStyle: { data: inTwo.barStyle.data } }, true, engraved);
            inTwo.barStyle.data = type;
            ctx.insertPast(inTwo, null, true);
            return;
        }
        ctx.insertPast(new BarlineModel({ barStyle: { data: type } }, true, engraved), null, true);
    }
    ;
})(BarlineModel || (BarlineModel = {}));
module.exports = BarlineModel;
