var _ = require("lodash");
var assert = require("assert");
var Annotator = require("./annotator");
var BeginModel = require("./begin");
var BarlineModel = require("./barline");
var C = require("./contracts");
var Instruments = require("./instruments");
var Model = require("./model");
var PlaceholderModel = require("./placeholder");
function toScore(score) {
    var header = extractMXMLHeader(score);
    var partData = extractMXMLPartsAndVoices(score);
    return {
        header: header,
        parts: partData.parts,
        voices: partData.voices
    };
}
exports.toScore = toScore;
var InvalidMXML = (function () {
    function InvalidMXML(reason, bar, beat, part) {
        this.reason = reason;
        this.bar = bar;
        this.beat = beat;
        this.part = part;
    }
    InvalidMXML.prototype.toString = function () {
        return "Satie failed to import the requested MusicXML.\nA problem occurred in part " + this.part + "on bar " + this.bar + " beat " + this.beat + ".\nThe following error occured:\n\n" + this.reason;
    };
    return InvalidMXML;
})();
exports.InvalidMXML = InvalidMXML;
function extractMXMLHeader(m) {
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
}
function extractMXMLPartsAndVoices(mxmlJson) {
    if (!mxmlJson || !mxmlJson.partList || !mxmlJson.partList.scoreParts || !mxmlJson.partList.scoreParts.length) {
        throw new InvalidMXML("At least one part is required", 0, 0, "Header");
    }
    var idxToPart = {};
    var parts = [];
    var voices = [];
    _.forEach(mxmlJson.partList.scoreParts, function (part, idx) {
        idxToPart[parts.length] = part.id;
        parts.push({
            id: part.id,
            staveCount: 0,
            containsVoice: {}
        });
    });
    var partToIdx = _.invert(idxToPart);
    var _voiceHash = {};
    var partToVoices = _.times(parts.length, function () { return []; });
    var _maxVoice = -1;
    var divisionsPerPart = [];
    var timeSignaturePerPart = [];
    var outputIdx = 1;
    _.forEach(mxmlJson.measures, processMeasure);
    _.forEach(voices, function (part) {
        _.forEach(part.body, function (model, j) {
            model.modelDidLoad(part.body, j);
        });
    });
    return {
        voices: voices,
        parts: parts
    };
    function processMeasure(measure, measureIdx) {
        var currBeat = 0;
        var beatPerPart = _.times(parts.length, function (part) { return 0; });
        var idxPerPart = _.times(parts.length, function (part) { return 0; });
        var chords = [];
        do {
            var elements = _.map(measure.parts, extractElement);
            var splits = getSplits(elements);
            if (splits.length) {
                _.forEach(splits, applySplit);
                continue;
            }
            var chordContinuations = getChordContinuations(elements);
            if (chordContinuations.length) {
                _.forEach(chordContinuations, applyChordContinuation);
                continue;
            }
            var priorities = _.map(elements, extractPriority);
            var minPriority = _.min(priorities);
            if (minPriority !== C.MAX_NUM) {
                var newBeat = 1000;
                _.forEach(elements, function (element, mPartIdx) {
                    var voiceIdx = element ? getVoiceIdx(mPartIdx, element.voice) : -1;
                    parts[mPartIdx].staveCount = Math.max(parts[mPartIdx].staveCount, element ? element.staff || 1 : -1);
                    if (!!~voiceIdx && !voices[voiceIdx]) {
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
                    Annotator.recordMetreData(parts, voices);
                    var thisPriority = element ? mxmlClassToType(element._class, measureIdx + 1, currBeat, parts[mPartIdx].id) : 1111 /* Unknown */;
                    if (minPriority === thisPriority && currBeat === beatPerPart[mPartIdx]) {
                        var beatsInEl = 0;
                        var isChord = false;
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
                            isChord = !!note.chord;
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
                        Annotator.recordMetreData(parts, voices);
                        if (minPriority === 600 /* Duration */) {
                            beatsInEl = model._beats;
                            chords[voiceIdx] = model;
                        }
                        ++idxPerPart[mPartIdx];
                        beatPerPart[mPartIdx] = currBeat + beatsInEl;
                        newBeat = Math.min(newBeat, beatPerPart[mPartIdx]);
                    }
                    else {
                        beatPerPart[mPartIdx] = -1;
                        _.chain(partToVoices[mPartIdx]).map(function (vidx) { return voices[vidx]; }).forEach(function (voice) { return voice.body.splice(outputIdx, 0, new PlaceholderModel({ priority: minPriority }, true)); }).value();
                    }
                });
                currBeat = newBeat;
                beatPerPart = _.map(beatPerPart, function (m) { return !~m ? currBeat : m; });
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
        function applySplit(split) {
            var partIdx = split.idx;
            idxPerPart[partIdx] = idxPerPart[partIdx] + 1;
            if (split.el._class === "Backup") {
                var beats = split.el.duration / divisionsPerPart[partIdx];
                currBeat = currBeat - beats;
                beatPerPart[partIdx] = currBeat;
                outputIdx = outputIdx - 1;
                while (getCurrBeat() > currBeat) {
                    outputIdx = outputIdx - 1;
                }
                function getCurrBeat() {
                    return _.chain(voices).map(function (voice) { return (voice.body[outputIdx].ctxData || { beat: 0 }).beat; }).max().value();
                }
            }
            else {
                assert(false, "Forward not implemented yet.");
            }
        }
        function extractPriority(element, pIdx) {
            return !element ? C.MAX_NUM : mxmlClassToType(element._class, measureIdx + 1, currBeat, parts[pIdx].id);
        }
        function extractElement(p, partID) {
            return p[idxPerPart[partToIdx[partID]]] || null;
        }
        function getChordContinuations(elements) {
            return _.map(elements, function (element, idx) {
                if (!element) {
                    return null;
                }
                var voiceIdx = getVoiceIdx(idx, element.voice, false);
                return (element._class === "Note") && element.chord && !!chords[voiceIdx] ? { el: element, partIdx: idx, voiceIdx: voiceIdx } : null;
            }).filter(function (a) { return !!a; });
        }
        function applyChordContinuation(continuation) {
            chords[continuation.voiceIdx]._notes = chords[continuation.voiceIdx]._notes.concat(continuation.el);
            if (continuation.el) {
                ++idxPerPart[continuation.partIdx];
            }
            if (!continuation.el || !continuation.el.chord) {
                chords[continuation.voiceIdx] = null;
            }
        }
    }
    function getSplits(elements) {
        return _.map(elements, function (element, idx) { return element && (element._class === "Forward" || element._class === "Backup") ? { el: element, idx: idx } : null; }).filter(function (a) { return !!a; });
    }
    function getVoiceIdx(mPartIdx, voice, canUpdate) {
        if (canUpdate === void 0) { canUpdate = true; }
        assert(!!~voice);
        var key = (mPartIdx || 0) + "_" + (voice || 1);
        if (_voiceHash[key] === undefined && canUpdate) {
            ++_maxVoice;
            partToVoices[mPartIdx].push(_maxVoice);
            parts[mPartIdx].containsVoice[_maxVoice] = true;
            return _voiceHash[key] = _maxVoice;
        }
        return _voiceHash[key];
    }
    function mxmlClassToType(type, bar, beat, part) {
        switch (type) {
            case "Note":
                return 600 /* Duration */;
            case "Attributes":
                return 145 /* Attributes */;
            case "Barline":
                return 300 /* Barline */;
            default:
                throw new InvalidMXML(type + " is not a known type", bar, beat, part);
        }
    }
    ;
}
