var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var assert = require("assert");
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
                "clefs",
                "time",
                "keySignature"
            ];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "divisions", {
        get: function () {
            return this._divisions === undefined && this._parent ? this._parent.divisions : this._divisions;
        },
        set: function (m) {
            this._divisions = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "partSymbol", {
        get: function () {
            return this._partSymbol === undefined && this._parent ? this._parent.partSymbol : this._partSymbol;
        },
        set: function (m) {
            this._partSymbol = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "measureStyle", {
        get: function () {
            return this._measureStyle === undefined && this._parent ? this._parent.measureStyle : this._measureStyle;
        },
        set: function (m) {
            this._measureStyle = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "staffDetails", {
        get: function () {
            return this._staffDetails === undefined && this._parent ? this._parent.staffDetails : this._staffDetails;
        },
        set: function (m) {
            this._staffDetails = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "transpose", {
        get: function () {
            return this._transpose === undefined && this._parent ? this._parent.transpose : this._transpose;
        },
        set: function (m) {
            this._transpose = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "staves", {
        get: function () {
            return this._staves === undefined && this._parent ? this._parent.staves : this._staves;
        },
        set: function (m) {
            this._staves = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "instruments", {
        get: function () {
            return this._instruments === undefined && this._parent ? this._parent.instruments : this._instruments;
        },
        set: function (m) {
            this._instruments = m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttributesModel.prototype, "directive", {
        get: function () {
            return this._directive === undefined && this._parent ? this._parent.directive : this._directive;
        },
        set: function (m) {
            this._directive = m;
        },
        enumerable: true,
        configurable: true
    });
    AttributesModel.prototype.recordMetreDataImpl = function (mctx) {
        this._parent = mctx.attributes;
        this.divisions = this.divisions || (mctx.attributes && mctx.attributes.divisions) || 60;
        mctx.attributes = this;
        this.ctxData = new C.MetreContext(mctx);
        if (this.time) {
            mctx.ts = C.tsToSimpleTS(this.time);
        }
        else if (!mctx.ts) {
            mctx.ts = {
                beats: 4,
                beatType: 4
            };
        }
    };
    AttributesModel.prototype.annotateImpl = function (ctx) {
        assert(this._parent !== this);
        ctx.attributes = this;
        var potentialParent = ctx.prev(function (c) { return c.type === 145 /* Attributes */ || c.type === 130 /* NewLine */; });
        var sameLineAsParent = this._parent && potentialParent === this._parent;
        if (this._parent && !sameLineAsParent) {
            this.time = this.time || this._parent.time;
            this.keySignature = null;
            this.clefs = [];
            this.updateAttached(ctx);
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
        this.clefs = this.clefs || [];
        var clef = this.clefs[ctx.idxInPart];
        if (clef && !(clef instanceof Model)) {
            ctx.insertFuture(new ClefModel(clef, false));
            ctx.next().ctxData = this.ctxData;
            clef = null;
        }
        if (this._parent && sameLineAsParent) {
            this.updateAttached(ctx);
            this.time = this.time || this._parent.time;
            this.keySignature = this.keySignature || this._parent.keySignature;
            var clefs = [];
            for (var i = 0; i < Math.max(this.clefs.length, this._parent.clefs.length); ++i) {
                clefs[i] = this.clefs[i] || this._parent.clefs[i];
            }
            this.clefs = clefs;
        }
        if (!this._parent) {
            this.updateAttached(ctx);
        }
        return 10 /* Success */;
    };
    AttributesModel.prototype.toMXMLObject = function () {
        return C.JSONx.clone({
            clefs: this.clefs,
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
        this.clefs = this.clefs || [];
        this.clefs[ctx.idxInPart] = ifAttribute(ctx.next(function (c) { return c.type === 150 /* Clef */ || c.type > 199 /* END_OF_ATTRIBUTES */; })) || this.clefs[ctx.idxInPart];
        this.time = ifAttribute(ctx.next(function (c) { return c.priority === 170 /* TimeSignature */ || c.priority > 199 /* END_OF_ATTRIBUTES */; })) || this.time;
        this.keySignature = ifAttribute(ctx.next(function (c) { return c.priority === 160 /* KeySignature */ || c.priority > 199 /* END_OF_ATTRIBUTES */; }));
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
