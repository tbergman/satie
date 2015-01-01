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
var ClefModel = require("./clef");
var KeySignatureModel = require("./keySignature");
var TimeSignatureModel = (function (_super) {
    __extends(TimeSignatureModel, _super);
    function TimeSignatureModel(spec, annotated) {
        _super.call(this, spec, annotated);
        assert(!spec.timeSignature, "Deprecated");
        assert(!spec.ts, "Not supported in constructor");
    }
    Object.defineProperty(TimeSignatureModel.prototype, "type", {
        get: function () {
            return 170 /* TimeSignature */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSignatureModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSignatureModel.prototype, "fields", {
        get: function () {
            return ["interchangeables", "beats", "beatTypes", "senzaMisura", "symbol", "separator", "voice", "footnote", "level", "defaultX", "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle", "fontSize", "color", "halign", "valign", "printObject"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSignatureModel.prototype, "ts", {
        get: function () {
            return {
                beats: this.beats[0],
                beatType: this.beatTypes[0],
                commonRepresentation: this.symbol !== 5 /* Normal */
            };
        },
        set: function (c) {
            this.beats = [c.beats];
            this.beatTypes = [c.beatType];
            switch (true) {
                case c.commonRepresentation && c.beats === 4 && c.beatType === 4:
                    this.symbol = 0 /* Common */;
                    break;
                case c.commonRepresentation && c.beats === 2 && c.beatType === 2:
                    this.symbol = 1 /* Cut */;
                    break;
                case !c.commonRepresentation:
                    this.symbol = 5 /* Normal */;
                    break;
                default:
                    console.warn("Unknown common TS");
                    this.symbol = 5 /* Normal */;
                    break;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSignatureModel.prototype, "displayTimeSignature", {
        get: function () {
            return this._displayTimeSignature || this.ts;
        },
        set: function (ts) {
            this._displayTimeSignature = ts;
        },
        enumerable: true,
        configurable: true
    });
    TimeSignatureModel.prototype.recordMetreDataImpl = function (mctx) {
        mctx.ts = this.ts;
        this.ctxData = new C.MetreContext(mctx);
    };
    TimeSignatureModel.prototype.annotateImpl = function (ctx) {
        if (!ctx.attributes.clefs[ctx.voiceIdx]) {
            return ClefModel.createClef(ctx);
        }
        if (!ctx.attributes.clefs[ctx.voiceIdx]) {
            return KeySignatureModel.createKeySignature(ctx);
        }
        var prevPotentialTime = ctx.prev(function (c) { return c.type === 170 /* TimeSignature */ || c.type === 130 /* NewLine */; });
        if (prevPotentialTime && prevPotentialTime.type === 170 /* TimeSignature */ && TimeSignatureModel.isEqual(this.ts, prevPotentialTime.ts)) {
            ctx.attributes.time = null;
            ctx.eraseCurrent();
            return 20 /* RetryCurrent */;
        }
        var intersectingNotes = _.filter(ctx.intersects(600 /* Duration */), function (l) { return l.isNote; });
        if (intersectingNotes.length) {
            if (_.any(intersectingNotes, function (n) { return !!n.getAccWidthAfterBar(ctx); })) {
                this._annotatedSpacing = 15;
            }
            else {
                this._annotatedSpacing = 25;
            }
        }
        else {
            this._annotatedSpacing = 12.5;
        }
        ctx.x += 28 + this._annotatedSpacing;
        ctx.attributes.time = this;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return 10 /* Success */;
    };
    TimeSignatureModel.prototype.toMXMLObject = function () {
        return {
            beats: this.beats,
            beatTypes: this.beatTypes,
            color: this.color,
            defaultX: this.defaultX,
            defaultY: this.defaultY,
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontStyle: this.fontStyle,
            fontWeight: this.fontWeight,
            halign: this.halign,
            interchangeables: this.interchangeables,
            printObject: this.printObject,
            relativeX: this.relativeX,
            relativeY: this.relativeY,
            senzaMisura: this.senzaMisura,
            separator: this.separator,
            symbol: this.symbol,
            valign: this.valign
        };
    };
    TimeSignatureModel.isEqual = function (ts1, ts2) {
        return (!!ts1 === !!ts2) && (!ts1 || ts1.beats === ts2.beats && ts1.beatType === ts2.beatType && ts1.commonRepresentation === ts2.commonRepresentation);
    };
    TimeSignatureModel.createTS = function (ctx) {
        ctx.insertPast(new TimeSignatureModel({
            beats: [4],
            beatTypes: [4],
            senzaMisura: false
        }, true));
        return 60 /* RetryLine */;
    };
    return TimeSignatureModel;
})(Model.SubAttributeModel);
TimeSignatureModel.prototype._displayTimeSignature = null;
module.exports = TimeSignatureModel;
