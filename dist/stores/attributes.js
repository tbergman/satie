var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var C = require("./contracts");
var ClefModel = require("./clef");
var KeySignatureModel = require("./keySignature");
var TimeSignatureModel = require("./timeSignature");
var AttributesModel = (function (_super) {
    __extends(AttributesModel, _super);
    function AttributesModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(AttributesModel.prototype, "type", {
        get: function () {
            return 145 /* Attributes */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "visible", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "fields", {
        get: function () {
            return [
                "divisions",
                "partSymbol",
                "measureStyle",
                "staffDetails",
                "transpose",
                "staves",
                "instruments",
                "directive",
                "footnote",
                "level"
            ];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "mxmlJsonOnlyFields", {
        get: function () {
            return [
                "clef",
                "time",
                "keySignature"
            ];
        },
        enumerable: true,
        configurable: true
    });
    AttributesModel.prototype.recordMetreDataImpl = function (mctx) {
        mctx.attributes = this;
        this.divisions = this.divisions || 60;
        this.ctxData = new C.MetreContext(mctx);
    };
    AttributesModel.prototype.annotateImpl = function (ctx) {
        ctx.attributes = this;
        if (!this.time && ctx.lines[ctx.line - 1] && ctx.lines[ctx.line - 1].attributes) {
            this.time = ctx.lines[ctx.line - 1].attributes.time;
        }
        if (this.time && !(this.time instanceof Model)) {
            ctx.insertFuture(new TimeSignatureModel(this.time, false));
            ctx.next().ctxData = this.ctxData;
            this.time = null;
        }
        if (this.keySignature && !(this.keySignature instanceof Model)) {
            ctx.insertFuture(new KeySignatureModel(this.keySignature, false));
            ctx.next().ctxData = this.ctxData;
            this.keySignature = null;
        }
        if (this.clef && !(this.clef instanceof Model)) {
            ctx.insertFuture(new ClefModel(this.clef, false));
            ctx.next().ctxData = this.ctxData;
            this.clef = null;
        }
        this.updateAttached(ctx);
        return 10 /* Success */;
    };
    AttributesModel.prototype.toMXMLObject = function () {
        return C.JSONx.clone({
            clef: this.clef,
            directive: this.directive,
            divisions: this.divisions,
            footnote: this.footnote,
            instruments: this.instruments,
            keySignature: this.keySignature,
            level: this.level,
            measureStyle: this.measureStyle,
            partSymbol: this.partSymbol,
            staffDetails: this.staffDetails,
            staves: this.staves,
            time: this.time,
            transpose: this.transpose
        });
    };
    AttributesModel.prototype.updateAttached = function (ctx) {
        this.clef = ifAttribute(ctx.next(function (c) { return c.type === 150 /* Clef */ || c.type > 199 /* END_OF_ATTRIBUTES */; }));
        this.time = ifAttribute(ctx.next(function (c) { return c.type === 170 /* TimeSignature */ || c.type > 199 /* END_OF_ATTRIBUTES */; })) || this.time;
        this.keySignature = ifAttribute(ctx.next(function (c) { return c.type === 160 /* KeySignature */ || c.type > 199 /* END_OF_ATTRIBUTES */; }));
        function ifAttribute(m) {
            return m && m.priority < 199 /* END_OF_ATTRIBUTES */ ? m : null;
        }
    };
    return AttributesModel;
})(Model);
var AttributesModel;
(function (AttributesModel) {
    "use strict";
    var AttributesUndefinedException = (function () {
        function AttributesUndefinedException() {
        }
        return AttributesUndefinedException;
    })();
    AttributesModel.AttributesUndefinedException = AttributesUndefinedException;
})(AttributesModel || (AttributesModel = {}));
module.exports = AttributesModel;
