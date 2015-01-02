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
var BarlineModel = require("./barline");
var BeginModel = require("./begin");
var C = require("./contracts");
var Instruments = require("./instruments");
var Model = require("./model");
var PlaceholderModel = require("./placeholder");
var isBrowser = typeof window !== "undefined";
var ScoreStoreStore = (function (_super) {
    __extends(ScoreStoreStore, _super);
    function ScoreStoreStore(dispatcher) {
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
        this._voices = null;
        this._header = null;
        this._snapshots = {};
        this._visualCursor = defaultCursor;
        dispatcher.register(this._handleAction);
        this._dispatcher = dispatcher;
        global.ScoreStore = this;
        this._clear();
    }
    ScoreStoreStore.prototype.destructor = function () {
        this._dispatcher.unregister(this._handleAction);
        this._clear();
    };
    Object.defineProperty(ScoreStoreStore.prototype, "dirty", {
        get: function () {
            return this._dirty;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreStoreStore.prototype, "finalCtx", {
        get: function () {
            return this._ctx;
        },
        enumerable: true,
        configurable: true
    });
    ScoreStoreStore.prototype.getLineDirty = function (idx, h) {
        return this._linesToUpdate[h + "_" + idx];
    };
    Object.defineProperty(ScoreStoreStore.prototype, "parts", {
        get: function () {
            return this._parts;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreStoreStore.prototype, "voices", {
        get: function () {
            return this._voices;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreStoreStore.prototype, "header", {
        get: function () {
            return this._header;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreStoreStore.prototype, "src", {
        get: function () {
            return "Ripieno State Transfer (dev)," + JSON.stringify({
                voices: this._voices,
                header: this._header
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreStoreStore.prototype, "visualCursor", {
        get: function () {
            return this._visualCursor;
        },
        enumerable: true,
        configurable: true
    });
    ScoreStoreStore.prototype.ctxFromSnapshot = function (pointerData, voices, assertionPolicy) {
        var i;
        if (!pointerData) {
            return null;
        }
        if (pointerData && this._snapshots[pointerData.musicLine]) {
            var ctx = new Annotator.Context(voices, {
                header: this.header,
                snapshot: this._recreateSnapshot(pointerData.musicLine)
            }, this, assertionPolicy);
            for (i = 0; i < voices.length; ++i) {
                this._linesToUpdate[i + "_" + ctx.line] = true;
            }
            return ctx;
        }
        else {
            for (i = 0; i < voices.length; ++i) {
                this._linesToUpdate[i + "_0"] = true;
            }
        }
    };
    ScoreStoreStore.prototype.dangerouslyMarkRenderDone = function () {
        var _this = this;
        _.defer(function () {
            _this._dirty = false;
        });
    };
    ScoreStoreStore.prototype.dangerouslyMarkRendererDirty = function () {
        this._dirty = true;
    };
    ScoreStoreStore.prototype.dangerouslyMarkRendererLineDirty = function (line) {
        if (!this._voices) {
            return;
        }
        for (var i = 0; i < this._voices.length; ++i) {
            this._linesToUpdate[i + "_" + line] = true;
        }
    };
    ScoreStoreStore.prototype.dangerouslyTakeSnapshot = function (ctx) {
        this._snapshots[ctx.line] = JSON.stringify(ctx.captureSnapshot());
    };
    ScoreStoreStore.parse = function (src) {
        var song = null;
        if (src.length && src.substr(0, 8) === "Ripieno State Transfer (dev),") {
            var songJson = JSON.parse(src.substring(8));
            song = {
                voices: [],
                header: new C.ScoreHeader(songJson.header)
            };
            for (var i = 0; i < songJson.parts.length; ++i) {
                song.voices.push({
                    body: [],
                    instrument: songJson.parts[i].instrument || Instruments.List[0]
                });
                var body = songJson.parts[i].body;
                if (body) {
                    for (var j = 0; j < body.length; ++j) {
                        song.voices[i].body[j] = Model.fromJSON(body[j]);
                    }
                    for (var j = 0; j < body.length; ++j) {
                        song.voices[i].body[j].modelDidLoad(song.voices[i].body, j);
                    }
                }
            }
        }
        else {
            assert(false, "Unknown format");
        }
        return song;
    };
    ScoreStoreStore.extractMXMLHeader = function (m) {
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
    ScoreStoreStore.extractMXMLParts = function (mxmlJson) {
        var idxToPart = {};
        var parts = [];
        var partCount = 0;
        _.forEach(mxmlJson.partList.scoreParts, function (part, idx) {
            idxToPart[partCount++] = part.id;
            parts.push({
                id: part.id,
                staves: 0,
                voices: []
            });
        });
        var partToIdx = _.invert(idxToPart);
        assert(partCount, "At least one part is needed.");
        var voices = [];
        function mxmlClassToType(type) {
            switch (type) {
                case "Note":
                    return 600 /* Duration */;
                case "Attributes":
                    return 145 /* Attributes */;
                case "Barline":
                    return 300 /* Barline */;
                default:
                    throw type + " is not implemented";
            }
        }
        ;
        var divisionsPerPart = [];
        var timeSignaturePerPart = [];
        var _voiceHash = {};
        var partToVoices = _.times(partCount, function () { return []; });
        var _maxVoice = -1;
        function getVoiceIdx(mPartIdx, voice) {
            var key = (mPartIdx || 0) + "_" + (voice || 1);
            if (_voiceHash[key] === undefined) {
                ++_maxVoice;
                partToVoices[mPartIdx].push(_maxVoice);
                parts[mPartIdx].voices.push(_maxVoice);
                return _voiceHash[key] = _maxVoice;
            }
            return _voiceHash[key];
        }
        var outputIdx = 1;
        _.forEach(mxmlJson.measures, function (measure, measureIdx) {
            var minPriority;
            var currBeat = 0;
            var idxPerPart = _.times(partCount, function (part) { return 0; });
            do {
                var elements = _.map(measure.parts, function (p, partID) { return p[idxPerPart[partToIdx[partID]]] || {}; });
                var splits = getSplits(elements);
                if (splits.length) {
                    _.forEach(splits, function (split) {
                        var partIdx = split.idx;
                        ++idxPerPart[partIdx];
                        if (split.el._class === "Backup") {
                            var beats = split.el.duration / divisionsPerPart[partIdx];
                            currBeat = currBeat - beats;
                            --outputIdx;
                            while (getCurrBeat() > currBeat) {
                                --outputIdx;
                            }
                            function getCurrBeat() {
                                return _.chain(voices).map(function (voice) { return (voice.body[outputIdx].ctxData || { beat: 0 }).beat; }).max().value();
                            }
                        }
                    });
                    continue;
                }
                var priorities = _.map(elements, function (element) { return !element || typeof element === "string" ? C.MAX_NUM : mxmlClassToType(element._class); });
                minPriority = _.min(priorities);
                if (minPriority !== C.MAX_NUM) {
                    var newBeat = 1000;
                    _.forEach(elements, function (element, mPartIdx) {
                        var voiceIdx = getVoiceIdx(mPartIdx, element.voice);
                        parts[mPartIdx].staves = Math.max(parts[mPartIdx].staves, element.staff || 1);
                        if (!voices[voiceIdx]) {
                            voices[voiceIdx] = {
                                instrument: Instruments.List[0],
                                body: [new BeginModel({}, true)]
                            };
                            if (voiceIdx) {
                                for (var i = 1; i < voices[0].body.length; ++i) {
                                    voices[voiceIdx].body.push(new PlaceholderModel({ priority: voices[0].body[i].priority }, true));
                                }
                            }
                        }
                        Annotator.recordMetreData(voices);
                        if (mxmlClassToType(element._class) === minPriority) {
                            var beatsInEl = 0;
                            if (minPriority === 145 /* Attributes */) {
                                assert(element.voice === undefined, "Attributes are voiceless");
                                assert(element.staff === undefined, "Attributes are staffless");
                                divisionsPerPart[mPartIdx] = element.divisions || divisionsPerPart[mPartIdx];
                                timeSignaturePerPart[mPartIdx] = element.time || timeSignaturePerPart[mPartIdx];
                            }
                            else if (minPriority === 600 /* Duration */) {
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
                            var curr = voices[voiceIdx].body[outputIdx];
                            var model = Model.fromJSON(element);
                            if (curr && curr.placeholder && curr.priority === minPriority && curr.ctxData.beat === currBeat) {
                                voices[voiceIdx].body[outputIdx] = model;
                            }
                            else {
                                voices[voiceIdx].body.splice(outputIdx, 0, model);
                                _.chain(partToVoices[mPartIdx]).filter(function (vidx) { return vidx !== voiceIdx; }).map(function (vidx) { return voices[vidx]; }).forEach(function (voice) { return voice.body.splice(outputIdx, 0, new PlaceholderModel({ priority: minPriority }, true)); }).value();
                            }
                            element._class = _class;
                            delete element._;
                            Annotator.recordMetreData(voices);
                            if (minPriority === 600 /* Duration */) {
                                beatsInEl = model._beats;
                            }
                            ++idxPerPart[mPartIdx];
                            newBeat = Math.min(newBeat, currBeat + beatsInEl);
                        }
                        else {
                            assert(false, "Not implemented");
                        }
                    });
                    currBeat = newBeat;
                    ++outputIdx;
                }
            } while (minPriority !== C.MAX_NUM);
            if (measureIdx !== mxmlJson.measures.length - 1) {
                for (var i = 0; i < voices.length; ++i) {
                    voices[i].body.push(new BarlineModel({
                        barStyle: {
                            data: 0 /* Regular */
                        }
                    }, true));
                    outputIdx = voices[i].body.length;
                }
            }
        });
        _.forEach(voices, function (part) {
            _.forEach(part.body, function (model, j) {
                model.modelDidLoad(part.body, j);
            });
        });
        function getSplits(elements) {
            return _.map(elements, function (element, idx) { return element._class === "Forward" || element._class === "Backup" ? { el: element, idx: idx } : null; }).filter(function (a) { return !!a; });
        }
        return {
            voices: voices,
            parts: parts
        };
    };
    ScoreStoreStore.prototype["DELETE /webapp/song/lineDirty"] = function (action) {
        this._linesToUpdate[action.postData] = false;
    };
    ScoreStoreStore.prototype["PUT /webapp/song/src"] = function (action) {
        this._reparse(action.postData);
        this.dangerouslyMarkRendererDirty();
        this.emit(0 /* Change */);
        this.emit(1 /* Annotate */);
    };
    ScoreStoreStore.prototype["PUT /webapp/song/mxmlJSON"] = function (action) {
        var mxml = C.JSONx.clone(action.postData);
        this._header = ScoreStoreStore.extractMXMLHeader(mxml);
        var partData = ScoreStoreStore.extractMXMLParts(mxml);
        this._parts = partData.parts;
        this._voices = partData.voices;
        Annotator.recordMetreData(this._voices);
        this._annotate(null, null, null, null, true, null, 1 /* NoAssertions */);
        this.dangerouslyMarkRendererDirty();
        this.emit(0 /* Change */);
        this.emit(1 /* Annotate */);
    };
    ScoreStoreStore.prototype["PUT /webapp/visualCursor"] = function (action) {
        this._visualCursorIs(action.postData);
        if (!this._visualCursor.annotatedObj) {
            this._annotate(null, null, null, null, true);
        }
        this.emit(1 /* Annotate */);
    };
    ScoreStoreStore.prototype["PUT /webapp/visualCursor/step"] = function (action) {
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
    ScoreStoreStore.prototype["DELETE /webapp/visualCursor"] = function (action) {
        this._visualCursor = null;
        this.emit(0 /* Change */);
        this._annotate(null, null, null, null, true);
    };
    ScoreStoreStore.prototype["PUT /webapp/instrument"] = function (action) {
        var instrument = action.postData.instrument;
        var part = action.postData.part;
        this.ensureSoundfontLoaded(instrument.soundfont);
        this.emit(2 /* History */);
        part.instrument = instrument;
        this.emit(0 /* Change */);
    };
    ScoreStoreStore.prototype.midiOutHint = function (out) {
        this.emit(4 /* MidiOut */, out);
    };
    ScoreStoreStore.prototype._annotate = function (pointerData, toolFn, parts, profile, disableRecording, godAction, assertionPolicy) {
        assertionPolicy = isNaN(assertionPolicy) ? 0 /* Strict */ : assertionPolicy;
        parts = parts || this._voices;
        if (ScoreStoreStore.PROFILER_ENABLED) {
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
        if (ScoreStoreStore.PROFILER_ENABLED) {
            console.log("I broke the profiler");
        }
        if (!result.skip) {
            this._ctx = context;
        }
        if (ScoreStoreStore.PROFILER_ENABLED) {
            console.timeEnd("annotate");
        }
        return result;
    };
    ScoreStoreStore.prototype._clear = function () {
        this._activeStaveIdx = null;
        this._voices = null;
        this._header = null;
        this._visualCursorIs({
            bar: 1,
            beat: 0
        });
    };
    ScoreStoreStore.prototype._recreateSnapshot = function (line) {
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
    ScoreStoreStore.prototype._reparse = function (src, profile) {
        if (profile) {
            console.time("Parse source");
        }
        assert(false, "Fix voice & parts");
        var song = ScoreStoreStore.parse(src);
        this._header = song.header;
        this._voices = song.voices;
        for (var i = 0; i < this._voices.length; ++i) {
            if (this._voices[i].body) {
                this._activeStaveIdx = i;
            }
        }
        var origPE = ScoreStoreStore.PROFILER_ENABLED;
        if (profile) {
            console.timeEnd("Parse source");
            ScoreStoreStore.PROFILER_ENABLED = true;
        }
        var res = this._annotate(null, null, null, null, true, null, 1 /* NoAssertions */);
        if (profile) {
            ScoreStoreStore.PROFILER_ENABLED = origPE;
        }
        return res;
    };
    ScoreStoreStore.prototype._stepCursor = function (spec) {
        if (!this._visualCursor || !this._visualCursor.annotatedObj) {
            return;
        }
        var sign = spec.step > 0 ? 1 : -1;
        var steps = spec.step;
        var idx = this._visualCursor.annotatedObj.idx;
        var voices = this._voices;
        var iterations = 0;
        var page = this._visualCursor.annotatedPage;
        var voice = 0;
        var line = this._visualCursor.annotatedLine;
        while (steps && voices[voice].body[idx += sign]) {
            var priority = voices[voice].body[idx].priority;
            var visible = false;
            for (var i = 0; !visible && i < voices.length; ++i) {
                visible = visible || !!voices[i].body[idx].visible;
            }
            if (!visible) {
            }
            else if (priority === 600 /* Duration */) {
                steps -= sign;
            }
            else if (!spec.skipDurationlessContent) {
                while (voices[voice].body[idx] && voices[voice].body[idx].priority !== 600 /* Duration */ && voices[voice].body[idx].priority !== 110 /* EndMarker */) {
                    if (voices[voice].body[idx].type === 120 /* NewPage */) {
                        page += sign;
                    }
                    if (voices[voice].body[idx].type === 130 /* NewLine */) {
                        line += sign;
                    }
                    idx += sign;
                    ++iterations;
                }
                break;
            }
            ++iterations;
        }
        var obj = voices[voice].body[idx];
        if (!obj) {
            if (sign === 1 && spec.loopThroughEnd) {
                this._visualCursor = {
                    bar: 0,
                    beat: 0,
                    endMarker: false,
                    annotatedObj: voices[voice].body[0],
                    annotatedLine: line,
                    annotatedPage: page,
                    annotatedStave: voice
                };
                this._stepCursor({ step: 1 });
            }
            return;
        }
        for (var i = 1; obj.placeholder && i < voices.length; ++i) {
            obj = voices[i].body[idx];
        }
        this._visualCursor = {
            bar: obj.ctxData.bar,
            beat: obj.ctxData.beat,
            endMarker: obj.priority <= 110 /* EndMarker */,
            annotatedObj: obj,
            annotatedLine: 0,
            annotatedPage: page,
            annotatedStave: voice
        };
    };
    ScoreStoreStore.prototype._visualCursorIs = function (visualCursor) {
        this._visualCursor.bar = visualCursor.bar;
        this._visualCursor.beat = visualCursor.beat;
        this._visualCursor.endMarker = visualCursor.endMarker;
        this._visualCursor.annotatedObj = null;
        this._visualCursor.annotatedLine = null;
        this._visualCursor.annotatedPage = null;
        this._visualCursor.annotatedStave = null;
    };
    ScoreStoreStore.PROFILER_ENABLED = isBrowser && global.location.search.indexOf("profile=1") !== -1;
    return ScoreStoreStore;
})(TSEE);
var defaultCursor = {
    bar: 1,
    beat: 0,
    endMarker: null,
    annotatedObj: null,
    annotatedLine: null,
    annotatedPage: null
};
var ScoreStoreStore;
(function (ScoreStoreStore) {
    "use strict";
})(ScoreStoreStore || (ScoreStoreStore = {}));
module.exports = ScoreStoreStore;
