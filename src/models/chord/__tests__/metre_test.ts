/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file models/chord/__tests__/metre_test.ts part of Satie test suite
 */

"use strict";

import MusicXML         = require("musicxml-interfaces");
import chai             = require("chai");

import Attributes       = require("../../attributes");
import Chord            = require("../../chord");
import Engine           = require("../../engine");
import Factory          = require("../../factory");
import Metre            = require("../metre");

var ModelType           = Engine.IModel.Type;
var expect              = chai.expect;

function genCursor(factory: Factory, models: Engine.IModel[]): Engine.ICursor {
    return {
        segment: <any> models,
        print$: null,
        header: null,
        idx$: 0,
        prev$: null,
        division$: 0,
        x$: 0,
        maxPaddingTop$: 0,
        maxPaddingBottom$: 0,
        voice: {
        },
        staff: {
            previous: null,
            attributes: {
                divisions: 60,
                clefs: [{
                    sign: "G",
                    clefOctaveChange: "0",
                    line: 2
                }],
                times: [{
                    beats: ["4"],
                    beatTypes: [4],
                    senzaMisura: null
                }]
            },
            totalDivisions: 240,
            accidentals$: {},
            idx: 0
        },
        measure: {
            idx: 1,
            number: "1",
            implicit: false,
            nonControlling: false,
            x: 0,
            attributes$: [],
            uuid: -1
        },
        line: {
            shortestCount: Number.MAX_VALUE,
            barOnLine: 1
        },
        prev: null,
        x: 0,
        approximate: true,
        detached: true,
        factory: factory
    };
}

describe("[metre.ts]", function() {
    describe("rhythmicSpellcheck$", function() {
        it("merges two tied eighth notes", function() {
            var factory = new Factory([Attributes, Chord]);
            var cursor$ = genCursor(factory, [
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "E",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30,
                    ties: [{}]
                }]),
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }])
            ]);
            var retcode = Metre.rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(true, "A change should have occured.");

            expect(cursor$.segment.length).to.equal(1);
            var chord = Engine.IChord.fromModel(cursor$.segment[0]);
            expect(Metre.calcDivisions(chord, cursor$)).to.equal(60);
            expect(chord.length).to.equal(1);
            expect(chord[0].noteType.duration).to.equal(MusicXML.Count.Quarter);
        });
        it("merges two eighth rests", function() {
            var factory = new Factory([Attributes, Chord]);
            var cursor$ = genCursor(factory, [
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    rest: {},
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }]),
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    rest: {},
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }])
            ]);
            var retcode = Metre.rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(true, "A change should have occured.");

            expect(cursor$.segment.length).to.equal(1);
            var chord = Engine.IChord.fromModel(cursor$.segment[0]);
            expect(Metre.calcDivisions(chord, cursor$)).to.equal(60);
            expect(chord.length).to.equal(1);
            expect(chord[0].noteType.duration).to.equal(MusicXML.Count.Quarter);
        });
        it("does not merge two eighth notes that are not tied", function() {
            var factory = new Factory([Attributes, Chord]);
            var cursor$ = genCursor(factory, [
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "E",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }]),
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }])
            ]);
            var retcode = Metre.rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(false, "A change should not have occured.");

            expect(cursor$.segment.length).to.equal(2);
            var chord = Engine.IChord.fromModel(cursor$.segment[0]);
            expect(Metre.calcDivisions(chord, cursor$)).to.equal(30);
            expect(chord.length).to.equal(1);
            expect(chord[0].noteType.duration).to.equal(MusicXML.Count.Eighth);
        });
        it("does not merge accross boundries", function() {
            var factory = new Factory([Attributes, Chord]);
            var cursor$ = genCursor(factory, [
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "E",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Quarter
                    },
                    dots: [{}],
                    divCount: 30
                }]),
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }]),
                factory.create(ModelType.Chord, <Engine.IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: MusicXML.Count.Eighth
                    },
                    divCount: 30
                }])
            ]);
            var retcode = Metre.rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(false, "A change should not have occured.");

            expect(cursor$.segment.length).to.equal(3);
        });
    });
});
