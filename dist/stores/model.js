var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var assert = require("assert");
var _ = require("lodash");
var assign = require("react/lib/Object.assign");
var C = require("./contracts");
var Model = (function () {
    function Model(spec, annotated, engraved) {
        if (engraved === void 0) { engraved = false; }
        this.key = Model.newKey();
        this.idx = NaN;
        this.x = NaN;
        this.y = NaN;
        this.w = NaN;
        this.spacing = 0;
        this.ctxData = null;
        this._flags = 0;
        var _this = this;
        var allFields = this.fields.concat(this.mxmlJsonOnlyFields);
        for (var i = 0; i < allFields.length; ++i) {
            if (spec.hasOwnProperty(allFields[i])) {
                var key = allFields[i];
                _this[key] = spec[key];
            }
        }
        if (spec.key && !(spec instanceof Model)) {
            this.key = spec.key;
            this._flags = spec._flags;
        }
        if (spec.x) {
            this.x = spec.x;
            this.y = spec.y;
        }
        this.engraved = engraved;
        this.annotated = annotated;
    }
    Object.defineProperty(Model.prototype, "isModifier", {
        get: function () {
            return this.priority > 400 /* START_OF_MODIFIERS */ && this.priority < 499 /* END_OF_MODIFIERS */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "staff", {
        get: function () {
            return -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "inBeam", {
        get: function () {
            return this._getFlag(Flags.InBeam);
        },
        set: function (b) {
            this._setFlag(Flags.InBeam, b);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "placeholder", {
        get: function () {
            return this._getFlag(Flags.Placeholder);
        },
        set: function (b) {
            this._setFlag(Flags.Placeholder, b);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "selected", {
        get: function () {
            return this._getFlag(Flags.Selected);
        },
        set: function (b) {
            this._setFlag(Flags.Selected, b);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "annotated", {
        get: function () {
            return this._getFlag(Flags.Annotator);
        },
        set: function (b) {
            this._setFlag(Flags.Annotator, b);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "proposed", {
        get: function () {
            return this._getFlag(Flags.Proposed);
        },
        set: function (b) {
            this._setFlag(Flags.Proposed, b);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "engraved", {
        get: function () {
            return this._getFlag(Flags.Engraved);
        },
        set: function (b) {
            this._setFlag(Flags.Engraved, b);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "note", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "isNote", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "isRest", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "visible", {
        get: function () {
            return !this.soundOnly;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "xPolicy", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "type", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "fields", {
        get: function () {
            return [];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "mxmlJsonOnlyFields", {
        get: function () {
            return [];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "extraWidth", {
        get: function () {
            return 0;
        },
        set: function (w) {
            if (w !== 0) {
                assert(false, "This element does not support annotatedExtraWidth.");
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "isAttribute", {
        get: function () {
            return this.priority > 100 /* START_OF_ATTRIBUTES */ && this.priority < 199 /* END_OF_ATTRIBUTES */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "revision", {
        get: function () {
            return null;
        },
        set: function (n) {
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Model.prototype, "priority", {
        get: function () {
            return this.type;
        },
        set: function (p) {
        },
        enumerable: true,
        configurable: true
    });
    Model.prototype.calcDivisions = function (ctx) {
        return 0;
    };
    Model.prototype.modelDidLoad = function (body, idx) {
    };
    Model.prototype.annotate = function (ctx) {
        if (!this.inBeam) {
            this.x = ctx.x;
            this.y = ctx.y;
            if (!this.isNote || !this.note.temporary) {
                this.spacing = 0;
            }
        }
        var invisible = ctx.invisibleForBars && (ctx.invisibleForBars !== 1 || this.type !== 300 /* Barline */);
        if (invisible) {
            this.soundOnly = true;
        }
        else if (this.soundOnly) {
            delete this.soundOnly;
        }
        this.idx = ctx.idx;
        var status = this.annotateImpl(ctx);
        this.proposed = false;
        if (invisible) {
            ctx.x = this.x;
        }
        assert(status !== undefined);
        return status;
    };
    Model.prototype.annotateImpl = function (ctx) {
        throw C.Type[this.type] + " does not implement annotateImpl.";
    };
    Model.prototype.recordMetreDataImpl = function (mctx) {
        assert(false, "Not implemented");
    };
    Model.prototype.render = function (options) {
        throw "No view has been set for " + C.Type[this.type] + ". See Model.setView(...)";
    };
    Model.prototype.toJSON = function () {
        var _this = this;
        var json = {
            _: [this.key, this.type, this._flags]
        };
        _.forEach(this.fields, function (value) {
            if (!!_this[value]) {
                json[value] = _this[value];
            }
        });
        return json;
    };
    Model.prototype.assign = function (obj) {
        var _this = this;
        _.forEach(obj, function (value, key) {
            _this[key] = C.JSONx.clone(value);
        });
    };
    Model.prototype._getFlag = function (f) {
        return !!(this._flags & f);
    };
    Model.prototype._setFlag = function (f, v) {
        this._flags = v ? (this._flags | f) : (this._flags & ~f);
    };
    Model.fromJSON = function (json, existingObjects) {
        var spec;
        if (json instanceof Model) {
            json = C.JSONx.clone(json);
        }
        else if (typeof json === "string" || json instanceof String) {
            spec = JSON.parse(json);
        }
        else {
            spec = json;
        }
        var _data = spec._;
        delete spec._;
        spec.key = _data[0];
        var type = _data[1];
        spec._flags = _data[2];
        var model = (existingObjects && existingObjects[spec.key]) || Model.constructorsByType[type](spec);
        assert(model);
        var modelObj = model;
        assert(model);
        _.each(spec, function (value, key) {
            if (modelObj[key] !== value) {
                console.warn("Not loading saved key \"" + key + "\" in type " + C.Type[model.type] + ":", value);
            }
        });
        return model;
    };
    Model.newKey = function () {
        return Model._sessionId + "-" + ++Model._lastKey;
    };
    Model._sessionId = C.generateUUID();
    Model._lastKey = 0;
    Model.setView = function (View) {
        this.prototype.render = function (options) {
            var props = assign({}, options, { key: this.key, spec: this });
            return React.createElement(View, props);
        };
    };
    Model.removeAnnotations = function (voices) {
        for (var i = 0; i < voices.length; ++i) {
            for (var j = 0; voices[i].body && j < voices[i].body.length; ++j) {
                var item = voices[i].body[j];
                if (item.annotated && !item.placeholder) {
                    for (var k = 0; k < voices.length; ++k) {
                        if (voices[k].body) {
                            voices[k].body.splice(j, 1);
                        }
                    }
                    --j;
                }
                else if (item.inBeam) {
                    item.inBeam = false;
                }
            }
        }
    };
    return Model;
})();
Model.prototype.soundOnly = false;
var Model;
(function (Model) {
    "use strict";
    Model.constructorsByType = {};
    var SubAttributeModel = (function (_super) {
        __extends(SubAttributeModel, _super);
        function SubAttributeModel() {
            _super.apply(this, arguments);
        }
        SubAttributeModel.prototype.annotate = function (ctx) {
            var next = ctx.next(null, 1, true);
            if (next.priority === this.type) {
                var here = ctx.findVertical(null, this.idx);
                var nextV = ctx.findVertical(null, this.idx + 1);
                var combined = new Array(here.length);
                for (var i = 0; i < combined.length; ++i) {
                    if (!nextV[i].placeholder) {
                        combined[i] = nextV[i];
                    }
                    else {
                        combined[i] = here[i];
                    }
                }
                for (var i = 0; i < ctx._voices.length; ++i) {
                    ctx._voices[i].body.splice(ctx.idx, 1);
                    ctx._voices[i].body[ctx.idx] = combined[i];
                }
                return this.retryStatus;
            }
            else if (next.isAttribute && next.priority < this.priority) {
                for (var i = 0; i < ctx._voices.length; ++i) {
                    var memo = ctx._voices[i].body[ctx.idx + 1];
                    ctx._voices[i].body[ctx.idx + 1] = ctx._voices[i].body[ctx.idx];
                    ctx._voices[i].body[ctx.idx] = memo;
                }
                return this.retryStatus;
            }
            return _super.prototype.annotate.call(this, ctx);
        };
        Object.defineProperty(SubAttributeModel.prototype, "retryStatus", {
            get: function () {
                return 20 /* RetryCurrent */;
            },
            enumerable: true,
            configurable: true
        });
        return SubAttributeModel;
    })(Model);
    Model.SubAttributeModel = SubAttributeModel;
})(Model || (Model = {}));
var Flags;
(function (Flags) {
    Flags[Flags["InBeam"] = 2 << 0] = "InBeam";
    Flags[Flags["Placeholder"] = 2 << 1] = "Placeholder";
    Flags[Flags["Selected"] = 2 << 2] = "Selected";
    Flags[Flags["Annotator"] = 2 << 3] = "Annotator";
    Flags[Flags["Proposed"] = 2 << 4] = "Proposed";
    Flags[Flags["Engraved"] = 2 << 5] = "Engraved";
})(Flags || (Flags = {}));
module.exports = Model;
