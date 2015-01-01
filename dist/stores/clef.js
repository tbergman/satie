var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var Annotator = require("./annotator");
var C = require("./contracts");
var ClefModel = (function (_super) {
    __extends(ClefModel, _super);
    function ClefModel(spec, annotated) {
        _super.call(this, spec, annotated);
        this.sign = this.sign.toUpperCase();
    }
    Object.defineProperty(ClefModel.prototype, "type", {
        get: function () {
            return 150 /* Clef */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefModel.prototype, "visible", {
        get: function () {
            return this.isVisible !== false && !this.soundOnly;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefModel.prototype, "fields", {
        get: function () {
            return [
                "isLocked",
                "clefOctaveChange",
                "sign",
                "number_",
                "size",
                "line",
                "afterBarline",
                "additional",
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
    Object.defineProperty(ClefModel.prototype, "displayedClef", {
        get: function () {
            return this._displayedClef || this;
        },
        set: function (clef) {
            this._displayedClef = clef;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefModel.prototype, "retryStatus", {
        get: function () {
            return 60 /* RetryLine */;
        },
        enumerable: true,
        configurable: true
    });
    ClefModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    ClefModel.prototype.annotateImpl = function (ctx) {
        var AttributesModel = require("./attributes");
        if (!(ctx.attributes instanceof AttributesModel)) {
            return ctx.insertPast(new AttributesModel({}, true));
        }
        if (this._clefIsRedundant(ctx)) {
            ctx.eraseCurrent(3 /* Masked */);
            return 60 /* RetryLine */;
        }
        this.sign = this.sign.toUpperCase();
        if (isNaN(this.line)) {
            for (var i = 0; i < ClefModel.standardClefs.length; ++i) {
                if (ClefModel.standardClefs[i].sign === this.sign) {
                    this.line = ClefModel.standardClefs[i].line;
                }
            }
        }
        for (var i = ctx.idx + 1; ctx.body[i] && !ctx.body[i].isNote; ++i) {
            if (ctx.body[i].type === 150 /* Clef */) {
                return ctx.eraseCurrent(1 /* MatchedOnly */);
            }
        }
        this.isChange = ctx.attributes.clefs[ctx.voiceIdx] !== this;
        if (this.isChange) {
        }
        else {
            if (ctx.ts && ctx.beat >= ctx.ts.beats) {
                var BarlineModel = require("./barline");
                return BarlineModel.createBarline(ctx, 0 /* Regular */);
            }
        }
        ctx.attributes.clefs = ctx.attributes.clefs || [];
        ctx.attributes.clefs[ctx.voiceIdx] = this;
        var next = ctx.next();
        if (next.isNote) {
            var note = next;
            if (note.alter) {
                this._annotatedSpacing = 15;
            }
            else {
                this._annotatedSpacing = 25;
            }
        }
        else {
            this._annotatedSpacing = 12.5;
        }
        if (this.isChange) {
            ctx.x += 4.2 + this._annotatedSpacing;
        }
        else {
            ctx.x += 24 + this._annotatedSpacing;
        }
        this.color = this.displayedClef !== this ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return 10 /* Success */;
    };
    ClefModel.prototype._clefIsRedundant = function (ctx) {
        var possiblePrevClef = ctx.prev(function (c) { return c.priority === 150 /* Clef */ || c.priority === 130 /* NewLine */; });
        var prevClef = possiblePrevClef && possiblePrevClef.type === 150 /* Clef */ ? possiblePrevClef : null;
        if (!prevClef || prevClef === this) {
            return false;
        }
        if (_.isEqual(JSON.parse(ClefModel.serializeClef(prevClef)), JSON.parse(ClefModel.serializeClef(this)))) {
            return true;
        }
        return false;
    };
    ClefModel.createClef = function (ctx) {
        var clef = ctx.prev(function (c) { return c.type === 150 /* Clef */; }) || {
            sign: "G",
            line: 2
        };
        return ctx.insertPast(new ClefModel(clef, true));
    };
    ClefModel.standardClefs = [
        {
            line: 2,
            sign: "G",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 16,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number_: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        },
        {
            line: 4,
            sign: "F",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 4,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number_: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        },
        {
            line: 3,
            sign: "C",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 0,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number_: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        },
        {
            line: 4,
            sign: "C",
            additional: false,
            afterBarline: false,
            clefOctaveChange: null,
            color: "#000000",
            defaultX: -16,
            defaultY: 8,
            fontFamily: "",
            fontSize: "small",
            fontStyle: 0,
            fontWeight: 0,
            number_: 1,
            printObject: true,
            relativeX: 0,
            relativeY: 0,
            size: 1
        }
    ];
    return ClefModel;
})(Model.SubAttributeModel);
var ClefModel;
(function (ClefModel) {
    "use strict";
    function serializeClef(c) {
        return JSON.stringify({
            additional: c.additional || false,
            size: c.sign,
            number_: c.number_,
            line: c.line
        });
    }
    ClefModel.serializeClef = serializeClef;
})(ClefModel || (ClefModel = {}));
module.exports = ClefModel;
