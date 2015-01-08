/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _                = require("lodash");
import assert           = require("assert");

import Annotator        = require("./annotator");
import BeginModel       = require("./begin");
import BarlineModel     = require("./barline");
import C                = require("./contracts");
import DurationModel    = require("./duration");
import Instruments      = require("./instruments");
import Model            = require("./model");
import PlaceholderModel = require("./placeholder");


/*---- Exports ----------------------------------------------------------------------------------*/

/**
 * Converts a timewise MXMLJSON score to a Satie score.
 *
 * @param score Score produced by github.com/ripieno/musicxml-interfaces
 * @returns A structure that can be consumed by a ScoreStore. If an error occurred
 *          error will be set, and all other properties will be null.
 */
export function toScore(score: C.MusicXML.ScoreTimewise): ISatieImport {
    try {
        var header      = extractMXMLHeader(score);
        var partData    = extractMXMLPartsAndVoices(score);

        return {
            header:     header,
            parts:      partData.parts,
            voices:     partData.voices
        };
    } catch(err) {
        return {
            header:     null,
            parts:      null,
            voices:     null,
            error:      err
        };
    }
}

/**
 * Contains data that a ScoreStore can consume.
 */
export interface ISatieImport {
    header:     C.ScoreHeader;
    voices:     C.IVoice[];
    parts:      C.IPart[];
    error?:     any;
}



/*---- Private ----------------------------------------------------------------------------------*/

function extractMXMLHeader(m: C.MusicXML.ScoreTimewise): C.ScoreHeader {
    var header = new C.ScoreHeader({
        work:           m.work,
        movementNumber: m.movementNumber,
        movementTitle:  m.movementTitle,
        identification: m.identification,
        defaults:       m.defaults,
        credits:        m.credits,
        partList:       m.partList
    });

    // Some systems, especially small open source projects, don't record credits,
    // but do record movementTitle. So add credits for them.
    if ((!header.credits || !header.credits.length) && header.movementTitle) {
        header.title = header.movementTitle;
    }

    return header;
}

function extractMXMLPartsAndVoices(mxmlJson: C.MusicXML.ScoreTimewise): {voices: C.IVoice[]; parts: C.IPart[]} {
    if (!mxmlJson || !mxmlJson.partList || !mxmlJson.partList.scoreParts ||
            !mxmlJson.partList.scoreParts.length) {
        throw new C.InvalidMXMLException("At least one part is required", 0, 0, "Header");
    }

    var idxToPart: {[key: number]: string}  = {};
    var parts: C.IPart[]                    = [];
    var voices: C.IVoice[]                  = [];
    _.forEach(mxmlJson.partList.scoreParts, (part, idx) => {
        idxToPart[parts.length]             = part.id;
        parts.push({
            id:                             part.id,
            staveCount:                         0,
            containsVoice:                  {}
        });
    });
    var partToIdx                           = _.invert(idxToPart);

    var _voiceHash: {[key: string]: number} = {};
    var partToVoices: number[][]            = _.times(parts.length, () => <number[]> []);
    var _maxVoice                           = -1;

    var divisionsPerPart: number[]          = [];
    var timeSignaturePerPart                = <C.MusicXML.Time[]> [];
    var outputIdx: number                   = 1; // BeginModel is __always__ output.

    // Fill the voice object. This is the bulk of this call.
    _.forEach(mxmlJson.measures, processMeasure);

    // Call model hooks
    _.forEach(voices, part => {
        _.forEach(part.body, (model, j) => {
            model.engraved = true; // We trust the source material.
            model.modelDidLoad(part.body, j);
        });
    });

    return {
        voices: voices,
        parts:  parts
    }


    ////
    function processMeasure(measure: C.MusicXML.Measure, measureIdx: number) {
        // DIFIX: Different divisions in different parts!
        var currDivision: number            = 0;
        var currDivisionPerPart: number[]   = _.times(parts.length, part => 0);
        var idxPerPart: number[]            = _.times(parts.length, part => 0);
        var chords: DurationModel[]         = []; // by voices.
        do {
            var elements: any[]             = _.map(measure.parts, extractElement);

            // Check for backups/forwards
            var splits                      = getSplits(elements);
            if (splits.length) {
                _.forEach(splits, applySplit);
                continue;
            }

            var chordContinuations          = getChordContinuations(elements);
            if (chordContinuations.length) {
                _.forEach(chordContinuations, applyChordContinuation);
                continue;
            }

            var priorities                  = _.map(elements, extractPriority);
            var minPriority                 = _.min(priorities);

            // Constraint: all parts at a given index have the same type. We add placeholders
            // so that this is true. See PlaceholderModel for details.
            if (minPriority !== C.MAX_NUM) {
                var newDivision = C.MAX_NUM;
                _.forEach(elements, (element, mPartIdx) => {
                    var voiceIdx = element ? getVoiceIdx(mPartIdx, element.voice) : -1;
                    parts[mPartIdx].staveCount = Math.max(parts[mPartIdx].staveCount, element ? element.staff||1 : -1);
                    if (!!~voiceIdx && !voices[voiceIdx]) {
                        voices[voiceIdx] = {
                            instrument: Instruments.List[0],
                            body: <Model[]> [new BeginModel({}, true)]
                        };
                        if (voiceIdx) {
                            for (var i = 1; i < voices[0].body.length; ++i) {
                                voices[voiceIdx].body.push(new PlaceholderModel(
                                    {priority: voices[0].body[i].priority}, true));
                            }
                        }
                    }

                    Annotator.recordMetreData(parts, voices); // XXX: O(n^2) for no reason.

                    var thisPriority = element ? mxmlClassToType(element._class, measureIdx + 1, currDivision, parts[mPartIdx].id) :
                        C.Type.Unknown;

                    if (minPriority === thisPriority && currDivision === currDivisionPerPart[mPartIdx]) {
                        var divisionsInEl = 0;
                        var isChord = false;
                        if (minPriority === C.Type.Attributes) {
                            assert(element.voice === undefined, "Attributes are voiceless");
                            assert(element.staff === undefined, "Attributes are staffless");
                            divisionsPerPart[mPartIdx] = element.divisions || divisionsPerPart[mPartIdx];
                            timeSignaturePerPart[mPartIdx] = element.time || timeSignaturePerPart[mPartIdx];
                        } else if (minPriority === C.Type.Duration) {
                            var note = <C.MusicXML.Note> element;
                            element = {
                                _notes:     [note],
                                _class:     element._class,
                                dots:       note.dots ? note.dots.length : 0 // FIXME
                            };
                            isChord = !!note.chord;
                        }

                        var _class = element._class;
                        delete element._class;
                        element._ = [Model.newKey(), minPriority, 0];

                        var curr = voices[voiceIdx].body[outputIdx];
                        var model = Model.fromJSON(element);
                        if (curr && curr.placeholder && curr.priority === minPriority && curr.ctxData.division === currDivision) {
                            voices[voiceIdx].body[outputIdx] = model;
                        } else {
                            voices[voiceIdx].body.splice(outputIdx, 0, model);

                            _.chain(partToVoices[mPartIdx])
                                .filter(vidx => vidx !== voiceIdx)
                                .map(vidx => voices[vidx])
                                .forEach(voice => voice.body.splice(outputIdx, 0,
                                    new PlaceholderModel({priority: minPriority}, true)))
                                .value();
                        }


                        element._class = _class;
                        delete element._;

                        Annotator.recordMetreData(parts, voices); // XXX: O(n^2) for no reason.

                        if (minPriority === C.Type.Duration) {
                            // needs recordMetreData to be called.
                            divisionsInEl = (<DurationModel>model)._divisions;

                            chords[voiceIdx] = <DurationModel> model;
                        }

                        ++idxPerPart[mPartIdx];
                        currDivisionPerPart[mPartIdx] = currDivision + divisionsInEl;
                        newDivision = Math.min(newDivision, currDivisionPerPart[mPartIdx]);
                    } else {
                        // Most likely, we put in a placeholder.
                        currDivisionPerPart[mPartIdx] = -1;
                        _.chain(partToVoices[mPartIdx])
                            .map(vidx => voices[vidx])
                            .forEach(voice => voice.body.splice(outputIdx, 0,
                                new PlaceholderModel({priority: minPriority}, true)))
                            .value();
                    }
                });
                currDivision = newDivision;
                currDivisionPerPart = _.map(currDivisionPerPart, m => !~m ? currDivision : m)
                ++outputIdx;
            }
        } while(minPriority !== C.MAX_NUM);
        
        if (measureIdx !== mxmlJson.measures.length - 1) { 
            for (var i = 0; i < voices.length; ++i) {
                voices[i].body.push(new BarlineModel({
                    barStyle: {
                        data: C.MusicXML.BarStyleType.Regular
                    }
                }, true, true));
                outputIdx = voices[i].body.length;
            }
        }

        ////
        function applySplit(split: {el: any; idx: number}) {
            var partIdx                 = split.idx;
            idxPerPart[partIdx]         = idxPerPart[partIdx] + 1;
            if (split.el._class === "Backup") {
                var beats               = split.el.duration / divisionsPerPart[partIdx]; // Does this work in /8?

                currDivision                = currDivision - beats;
                currDivisionPerPart[partIdx]    = currDivision;
                outputIdx               = outputIdx - 1;
                while (getCurrBeat() > currDivision) {
                    outputIdx           = outputIdx - 1;
                }

                function getCurrBeat() {
                    return _.chain(voices)
                        .map(voice => (voice.body[outputIdx].ctxData||{division:0}).division)
                        .max() // _should_ be all the same, but we're not quite that awesome yet.
                        .value();
                }
            } else {
                assert(false, "Forward not implemented yet.");
            }
        }

        ////
        function extractPriority(element: any, pIdx: number) {
            return !element ?  C.MAX_NUM : mxmlClassToType(element._class, measureIdx + 1, currDivision, parts[pIdx].id);
        }

        ////
        function extractElement(p: any, partID: string) {
            return p[idxPerPart[partToIdx[partID]]] || <any> null;
        }

        ////
        function getChordContinuations(elements: any[]) {
            return _.map(elements, (element, idx) => {
                    if (!element) {
                        return null;
                    }
                    var voiceIdx = getVoiceIdx(idx, element.voice, false);
                    return (element._class === "Note") && element.chord && !!chords[voiceIdx] ? {el: element, partIdx: idx, voiceIdx: voiceIdx} : null;
                })
                .filter(a => !!a);
        }

        ////
        function applyChordContinuation(continuation: {el: C.MusicXML.Note; partIdx: number; voiceIdx: number}) {
            chords[continuation.voiceIdx]._notes = chords[continuation.voiceIdx]._notes.concat(continuation.el);
            if (continuation.el) {
                ++idxPerPart[continuation.partIdx];
            }

            if (!continuation.el || !continuation.el.chord) {
                chords[continuation.voiceIdx] = null;
            }
        }
    }

    ////
    function getSplits(elements: any[]) {
        return _.map(elements, (element, idx) =>
                element && (element._class === "Forward" || element._class === "Backup") ? {el: element, idx: idx} : null)
            .filter(a => !!a);
    }

    ////
    function getVoiceIdx(mPartIdx: number, voice: number, canUpdate: boolean = true) {
        assert(!!~voice)
        var key = (mPartIdx || 0) + "_" + (voice||1);
        if (_voiceHash[key] === undefined && canUpdate) {
            ++_maxVoice;
            partToVoices[mPartIdx].push(_maxVoice);
            parts[mPartIdx].containsVoice[_maxVoice] = true;
            return _voiceHash[key] = _maxVoice;
        }
        return _voiceHash[key];
    }

    ////
    function mxmlClassToType(type: string, bar: number, beat: number, part: string) {
        switch(type) {
            case "Attributes":
                return C.Type.Attributes;
            case "Barline":
                return C.Type.Barline;
            case "Direction":
                return C.Type.Direction;
            case "Note":
                return C.Type.Duration;
            default:
                throw new C.InvalidMXMLException(type + " is not a known type", bar, beat, part);
        }
    };
}