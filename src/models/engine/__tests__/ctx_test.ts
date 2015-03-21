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
 * @file part of Satie test suite
 */

"use strict";

import Ctx              = require("../ctx");

import chai             = require("chai");
var expect              = chai.expect;

import Engine           = require("../../engine");

describe("[engine/ctx.ts]", function() {
    describe("Ctx.IStaff.detach", function() {
        it("produces object independent of parent", function() {
            var orig: Ctx.IStaff = {
                previous: null,
                attributes: {
                },
                totalDivisions: NaN,
                accidentals$: {},
                division: 10,
                idx: 0
            };
            var orig2 = Engine.Util.cloneObject(orig);
            var copy = Engine.Ctx.IStaff.detach(orig);
            orig2.totalDivisions = NaN; // HACK: cloneObject makes NaN -> null

            copy.previous = orig;
            copy.accidentals$["a"] = 1;
            expect(function() {
                copy.attributes.instruments = "piano";
            }).to.throw(); // Frozen.

            expect(copy.attributes.instruments).to.not.equal("piano"); // Frozen
            copy.accidentals$["a"] = 1;

            expect(orig).to.deep.equal(orig2);
        });

        it("does not freeze attributes or parent of owner", function() {
            var parent: Ctx.IStaff = {
                previous: null,
                attributes: {
                },
                totalDivisions: NaN,
                accidentals$: {},
                division: 10,
                idx: 0
            };

            var orig: Ctx.IStaff = {
                previous: parent,
                attributes: {
                },
                totalDivisions: NaN,
                accidentals$: {},
                division: 10,
                idx: 0
            };
            var copy = Ctx.IStaff.detach(orig);
            orig.attributes.instruments = "piano";
            orig.previous.accidentals$["a"] = 1;
            expect(orig.attributes.instruments).to.equal("piano");
            expect(copy.attributes.instruments).to.equal("piano");
            expect(function() {
                copy.attributes.instruments = "cello";
            }).to.throw(); // Frozen.
            expect(function() {
                copy.previous.accidentals$["a"] = 4;
            }).to.not.throw();
            expect(copy.previous.accidentals$["a"]).to.equal(4);
        });
    });
});
