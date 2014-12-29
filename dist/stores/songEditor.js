var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _ = require("lodash");
var assert = require("assert");
var TSEE = require("./tsee");
var Annotator = require("./annotator");
var BeginModel = require("./begin");
var C = require("./contracts");
var Instruments = require("./instruments");
var Model = require("./model");
var isBrowser = typeof window !== "undefined";
var SongEditorStore = (function (_super) {
    __extends(SongEditorStore, _super);
    function SongEditorStore(dispatcher) {
        var _this = this;
        _super.call(this);
        this.dangerouslyMarkRendererLineClean = this["DELETE /webapp/song/lineDirty"].bind(this);
        this.dangerouslySetVisualCursor = this._visualCursorIs.bind(this);
        this.ensureSoundfontLoaded = function (s, e) { return false; };
        this._handleAction = function (action) {
            assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
            var fn = _this[action.description];
            if (fn) {
                fn.call(_this, action);
            }
            return true;
        };
        this._activeStaveIdx = NaN;
        this._ctx = null;
        this._dirty = false;
        this._dispatcher = null;
        this._linesToUpdate = {};
        this._parts = null;
        this._header = null;
        this._snapshots = {};
        this._visualCursor = defaultCursor;
        dispatcher.register(this._handleAction);
        this._dispatcher = dispatcher;
        global.SongEditor = this;
        this._clear();
    }
    SongEditorStore.prototype.destructor = function () {
        this._dispatcher.unregister(this._handleAction);
        this._clear();
    };
    Object.defineProperty(SongEditorStore.prototype, "dirty", {
        get: function () {
            return this._dirty;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SongEditorStore.prototype, "finalCtx", {
        get: function () {
            return this._ctx;
        },
        enumerable: true,
        configurable: true
    });
    SongEditorStore.prototype.getLineDirty = function (idx, h) {
        return this._linesToUpdate[h + "_" + idx];
    };
    Object.defineProperty(SongEditorStore.prototype, "parts", {
        get: function () {
            return this._parts;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SongEditorStore.prototype, "header", {
        get: function () {
            return this._header;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SongEditorStore.prototype, "src", {
        get: function () {
            return "RIPMUS0," + JSON.stringify({
                parts: this._parts,
                header: this._header
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SongEditorStore.prototype, "visualCursor", {
        get: function () {
            return this._visualCursor;
        },
        enumerable: true,
        configurable: true
    });
    SongEditorStore.prototype.ctxFromSnapshot = function (pointerData, parts, assertionPolicy) {
        var i;
        if (!pointerData) {
            return null;
        }
        if (pointerData && this._snapshots[pointerData.musicLine]) {
            var ctx = new Annotator.Context(parts, {
                header: this.header,
                snapshot: this._recreateSnapshot(pointerData.musicLine)
            }, this, assertionPolicy);
            for (i = 0; i < parts.length; ++i) {
                this._linesToUpdate[i + "_" + ctx.line] = true;
            }
            return ctx;
        }
        else {
            for (i = 0; i < parts.length; ++i) {
                this._linesToUpdate[i + "_0"] = true;
            }
        }
    };
    SongEditorStore.prototype.dangerouslyMarkRenderDone = function () {
        var _this = this;
        _.defer(function () {
            _this._dirty = false;
        });
    };
    SongEditorStore.prototype.dangerouslyMarkRendererDirty = function () {
        this._dirty = true;
    };
    SongEditorStore.prototype.dangerouslyMarkRendererLineDirty = function (line) {
        if (!this._parts) {
            return;
        }
        for (var i = 0; i < this._parts.length; ++i) {
            this._linesToUpdate[i + "_" + line] = true;
        }
    };
    SongEditorStore.prototype.dangerouslyTakeSnapshot = function (ctx) {
        this._snapshots[ctx.line] = JSON.stringify(ctx.captureSnapshot());
    };
    SongEditorStore.parse = function (src) {
        var song = null;
        if (src.length && src.substr(0, 8) === "RIPMUS0,") {
            var songJson = JSON.parse(src.substring(8));
            song = {
                parts: [],
                header: new C.ScoreHeader(songJson.header)
            };
            for (var i = 0; i < songJson.parts.length; ++i) {
                song.parts.push({
                    body: [],
                    instrument: songJson.parts[i].instrument || Instruments.List[0]
                });
                var body = songJson.parts[i].body;
                if (body) {
                    for (var j = 0; j < body.length; ++j) {
                        song.parts[i].body[j] = Model.fromJSON(body[j]);
                    }
                    for (var j = 0; j < body.length; ++j) {
                        song.parts[i].body[j].modelDidLoad(song.parts[i].body, j);
                    }
                }
            }
        }
        else {
            assert(false, "Unknown format");
        }
        return song;
    };
    SongEditorStore.extractMXMLHeader = function (m) {
        var header = new C.ScoreHeader({
            work: m.work,
            movementNumber: m.movementNumber,
            movementTitle: m.movementTitle,
            identification: m.identification,
            defaults: m.defaults,
            credits: m.credits,
            partList: m.partList
        });
        if ((!header.credits || !header.credits.length) && header.movementTitle) {
            header.title = header.movementTitle;
        }
        return header;
    };
    SongEditorStore.extractMXMLParts = function (m) {
        var idxToPart = {};
        var partCount = 0;
        _.forEach(m.partList.scoreParts, function (part, idx) {
            idxToPart[partCount++] = part.id;
        });
        var partToIdx = _.invert(idxToPart);
        assert(partCount, "At least one part is needed.");
        var parts = _.times(partCount, function () { return new Object({
            instrument: Instruments.List[0],
            body: [new BeginModel({}, true)]
        }); });
        var mxmlClassToType = {
            "Note": 600 /* Duration */,
            "Attributes": 145 /* Attributes */,
            "Barline": 300 /* Barline */
        };
        _.forEach(m.measures, function (measure) {
            var minPriority;
            var idxPerPart = _.map(parts, function (part) { return 0; });
            do {
                var elements = _.map(measure.parts, function (p, partID) { return p[idxPerPart[partToIdx[partID]]] || {}; });
                var priorities = _.map(elements, function (element) { return mxmlClassToType[element._class] || C.MAX_NUM; });
                minPriority = _.min(priorities);
                _.forEach(elements, function (element, partIdx) {
                    if (mxmlClassToType[element._class] === minPriority) {
                        if (minPriority === 600 /* Duration */) {
                            var note = element;
                            element = {
                                _notes: [note],
                                _class: element._class,
                                dots: note.dots ? note.dots.length : 0
                            };
                            if (note.chord) {
                                assert(false, "TODO");
                            }
                        }
                        var _class = element._class;
                        delete element._class;
                        element._ = [Model.newKey(), minPriority, 0];
                        parts[partIdx].body.push(Model.fromJSON(element));
                        element._class = _class;
                        delete element._;
                        ++idxPerPart[partIdx];
                    }
                    else {
                    }
                });
            } while (minPriority !== C.MAX_NUM);
        });
        _.forEach(parts, function (part) {
            _.forEach(part.body, function (model, j) {
                model.modelDidLoad(part.body, j);
            });
        });
        return parts;
    };
    SongEditorStore.prototype["DELETE /webapp/song/lineDirty"] = function (action) {
        this._linesToUpdate[action.postData] = false;
    };
    SongEditorStore.prototype["PUT /webapp/song/src"] = function (action) {
        this._reparse(action.postData);
        this.dangerouslyMarkRendererDirty();
        this.emit(0 /* Change */);
        this.emit(1 /* Annotate */);
    };
    SongEditorStore.prototype["PUT /webapp/song/mxmlJSON"] = function (action) {
        var mxml = C.JSONx.clone(action.postData);
        this._header = SongEditorStore.extractMXMLHeader(mxml);
        this._parts = SongEditorStore.extractMXMLParts(mxml);
        Annotator.recordMetreData(this._parts);
        this._annotate(null, null, null, null, true, null, 1 /* NoAssertions */);
        this.dangerouslyMarkRendererDirty();
        this.emit(0 /* Change */);
        this.emit(1 /* Annotate */);
    };
    SongEditorStore.prototype["PUT /webapp/visualCursor"] = function (action) {
        this._visualCursorIs(action.postData);
        if (!this._visualCursor.annotatedObj) {
            this._annotate(null, null, null, null, true);
        }
        this.emit(1 /* Annotate */);
    };
    SongEditorStore.prototype["PUT /webapp/visualCursor/step"] = function (action) {
        this._stepCursor({
            step: action.postData.step,
            loopThroughEnd: action.postData.loopThroughEnd,
            skipDurationlessContent: action.postData.skipDurationlessContent
        });
        if (!this._visualCursor.annotatedObj) {
            this._annotate(null, null, null, null, true);
        }
        this.emit(1 /* Annotate */);
    };
    SongEditorStore.prototype["DELETE /webapp/visualCursor"] = function (action) {
        this._visualCursor = null;
        this.emit(0 /* Change */);
        this._annotate(null, null, null, null, true);
    };
    SongEditorStore.prototype["PUT /webapp/instrument"] = function (action) {
        var instrument = action.postData.instrument;
        var part = action.postData.part;
        this.ensureSoundfontLoaded(instrument.soundfont);
        this.emit(2 /* History */);
        part.instrument = instrument;
        this.emit(0 /* Change */);
    };
    SongEditorStore.prototype.midiOutHint = function (out) {
        this.emit(4 /* MidiOut */, out);
    };
    SongEditorStore.prototype._annotate = function (pointerData, toolFn, parts, profile, disableRecording, godAction, assertionPolicy) {
        assertionPolicy = isNaN(assertionPolicy) ? 0 /* Strict */ : assertionPolicy;
        parts = parts || this._parts;
        if (SongEditorStore.PROFILER_ENABLED) {
            console.time("annotate");
        }
        var aBody;
        for (var i = 0; i < parts.length; ++i) {
            if (parts[i].body) {
                aBody = parts[i].body;
                break;
            }
        }
        var cursor = this._visualCursor;
        if (!pointerData) {
            cursor.annotatedObj = null;
            cursor.annotatedLine = null;
            cursor.annotatedStave = null;
        }
        var layout = {
            header: this.header,
            isFirstLine: true
        };
        if (godAction) {
            godAction();
        }
        var context = this.ctxFromSnapshot(pointerData, parts, assertionPolicy) || new Annotator.Context(parts, layout, this, assertionPolicy);
        var location = {
            bar: context.lines ? context.lines[context.line].bar : 1,
            beat: context.lines ? context.lines[context.line].beat : 0
        };
        var result = context.annotate(location, cursor, disableRecording, this._dispatcher);
        if (SongEditorStore.PROFILER_ENABLED) {
            console.log("I broke the profiler");
        }
        if (!result.skip) {
            this._ctx = context;
        }
        if (SongEditorStore.PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }
        return result;
    };
    SongEditorStore.prototype._clear = function () {
        this._activeStaveIdx = null;
        this._parts = null;
        this._header = null;
        this._visualCursorIs({
            bar: 1,
            beat: 0
        });
    };
    SongEditorStore.prototype._recreateSnapshot = function (line) {
        var lines = [];
        for (var i = 1; i <= line; ++i) {
            var sn = JSON.parse(this._snapshots[i]);
            lines.push(sn.prevLine);
            if (i === line) {
                lines.push(sn.partialLine);
                sn.lines = lines;
                return sn;
            }
        }
    };
    SongEditorStore.prototype._reparse = function (src, profile) {
        if (profile) {
            console.time("Parse source");
        }
        var song = SongEditorStore.parse(src);
        this._header = song.header;
        this._parts = song.parts;
        for (var i = 0; i < this._parts.length; ++i) {
            if (this._parts[i].body) {
                this._activeStaveIdx = i;
            }
        }
        var origPE = SongEditorStore.PROFILER_ENABLED;
        if (profile) {
            console.timeEnd("Parse source");
            SongEditorStore.PROFILER_ENABLED = true;
        }
        var res = this._annotate(null, null, null, null, true, null, 1 /* NoAssertions */);
        if (profile) {
            SongEditorStore.PROFILER_ENABLED = origPE;
        }
        return res;
    };
    SongEditorStore.prototype._stepCursor = function (spec) {
        if (!this._visualCursor || !this._visualCursor.annotatedObj) {
            return;
        }
        var sign = spec.step > 0 ? 1 : -1;
        var steps = spec.step;
        var idx = this._visualCursor.annotatedObj.idx;
        var parts = this._parts;
        var iterations = 0;
        var page = this._visualCursor.annotatedPage;
        var part = 0;
        var line = this._visualCursor.annotatedLine;
        while (steps && parts[part].body[idx += sign]) {
            var priority = parts[part].body[idx].priority;
            var visible = false;
            for (var i = 0; !visible && i < parts.length; ++i) {
                visible = visible || !!parts[i].body[idx].visible;
            }
            if (!visible) {
            }
            else if (priority === 600 /* Duration */) {
                steps -= sign;
            }
            else if (!spec.skipDurationlessContent) {
                while (parts[part].body[idx] && parts[part].body[idx].priority !== 600 /* Duration */ && parts[part].body[idx].priority !== 110 /* EndMarker */) {
                    if (parts[part].body[idx].type === 120 /* NewPage */) {
                        page += sign;
                    }
                    if (parts[part].body[idx].type === 130 /* NewLine */) {
                        line += sign;
                    }
                    idx += sign;
                    ++iterations;
                }
                break;
            }
            ++iterations;
        }
        var obj = parts[part].body[idx];
        if (!obj) {
            if (sign === 1 && spec.loopThroughEnd) {
                this._visualCursor = {
                    bar: 0,
                    beat: 0,
                    endMarker: false,
                    annotatedObj: parts[part].body[0],
                    annotatedLine: line,
                    annotatedPage: page,
                    annotatedStave: part
                };
                this._stepCursor({ step: 1 });
            }
            return;
        }
        for (var i = 1; obj.placeholder && i < parts.length; ++i) {
            obj = parts[i].body[idx];
        }
        this._visualCursor = {
            bar: obj.ctxData.bar,
            beat: obj.ctxData.beat,
            endMarker: obj.priority <= 110 /* EndMarker */,
            annotatedObj: obj,
            annotatedLine: 0,
            annotatedPage: page,
            annotatedStave: part
        };
    };
    SongEditorStore.prototype._visualCursorIs = function (visualCursor) {
        this._visualCursor.bar = visualCursor.bar;
        this._visualCursor.beat = visualCursor.beat;
        this._visualCursor.endMarker = visualCursor.endMarker;
        this._visualCursor.annotatedObj = null;
        this._visualCursor.annotatedLine = null;
        this._visualCursor.annotatedPage = null;
        this._visualCursor.annotatedStave = null;
    };
    SongEditorStore.PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;
    return SongEditorStore;
})(TSEE);
var defaultCursor = {
    bar: 1,
    beat: 0,
    endMarker: null,
    annotatedObj: null,
    annotatedLine: null,
    annotatedPage: null
};
var SongEditorStore;
(function (SongEditorStore) {
    "use strict";
})(SongEditorStore || (SongEditorStore = {}));
module.exports = SongEditorStore;
