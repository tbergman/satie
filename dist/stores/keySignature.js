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
var KeySignatureModel = (function (_super) {
    __extends(KeySignatureModel, _super);
    function KeySignatureModel(spec, annotated) {
        _super.call(this, spec, annotated);
        if (spec.clef) {
            this.clef = spec.clef;
        }
        this.locked = spec.locked === true;
    }
    Object.defineProperty(KeySignatureModel.prototype, "type", {
        get: function () {
            return 160 /* KeySignature */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(KeySignatureModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(KeySignatureModel.prototype, "fields", {
        get: function () {
            return [
                "cancel",
                "keySteps",
                "keyOctaves",
                "number_",
                "fifths",
                "keyAlters",
                "keyAccidentals",
                "mode",
                "defaultX",
                "relativeY",
                "defaultY",
                "relativeX",
                "fontFamily",
                "fontWeight",
                "fontStyle",
                "fontSize",
                "color",
                "printObject"
            ];
        },
        enumerable: true,
        configurable: true
    });
    KeySignatureModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    KeySignatureModel.prototype.annotateImpl = function (ctx) {
        if (!ctx.attributes.clefs || !ctx.attributes.clefs[ctx.currStaveIdx]) {
            return ClefModel.createClef(ctx);
        }
        this.clef = ctx.attributes.clefs[ctx.currStaveIdx];
        assert(this.clef instanceof Object);
        var intersectingNotes = _.filter(ctx.intersects(600 /* Duration */), function (l) { return l.isNote; });
        ctx.attributes.keySignature = this;
        ctx.accidentalsByStave[ctx.currStaveIdx] = C.NoteUtil.getAccidentals(this);
        if (intersectingNotes.length) {
            if (_.any(intersectingNotes, function (n) { return !!n.getAccWidthAfterBar(ctx); })) {
                this._annotatedSpacing = 25;
            }
            else {
                this._annotatedSpacing = 15;
            }
        }
        else {
            this._annotatedSpacing = 10;
        }
        var c = Math.abs(this.fifths);
        if (c) {
            ctx.x += this._annotatedSpacing + 10.4 * c;
        }
        else {
            ctx.x += this._annotatedSpacing - 5;
        }
        switch (true) {
            case this.temporary:
                this.color = "#A5A5A5";
                break;
            case this.selected:
                this.color = "#75A1D0";
                break;
            default:
                this.color = "#000000";
                break;
        }
        return 10 /* Success */;
    };
    KeySignatureModel.createKeySignature = function (ctx) {
        var keySignature = ctx.prev(function (c) { return c.type === 160 /* KeySignature */; });
        return ctx.insertPast(new KeySignatureModel(keySignature || {}, true));
    };
    return KeySignatureModel;
})(Model.StateChangeModel);
module.exports = KeySignatureModel;
