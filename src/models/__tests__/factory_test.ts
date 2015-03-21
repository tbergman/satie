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

import Engine       = require("../engine");
import Factory      = require("../factory");

import chai         = require("chai");

var expect          = chai.expect;

class TestClass1 {
}

class TestClass2 {
}

describe("[factory.ts]", function() {
    describe("Factory", function() {
        var types = [
            function(types: {[key: number]: any}) {
                types[<any>Engine.IModel.Type.Attributes] = TestClass1;
            },
            function(types: {[key: number]: any}) {
                types[<any>Engine.IModel.Type.Chord] = TestClass2;
            }
        ];

        var factory = new Factory(types);

        it("can create multiple types", function() {
            expect(factory.create(Engine.IModel.Type.Attributes)).to.be.an.instanceof(TestClass1);
            expect(factory.create(Engine.IModel.Type.Chord)).to.be.an.instanceof(TestClass2);
        });

        it("can discern multiple types", function() {
            expect(factory.modelHasType(<any> new TestClass1,
                    Engine.IModel.Type.Attributes)).to.equal(true);
            expect(factory.modelHasType(<any> new TestClass1,
                    Engine.IModel.Type.Chord)).to.equal(false);
            expect(factory.modelHasType(<any> new TestClass2,
                    Engine.IModel.Type.Chord)).to.equal(true);
            expect(factory.modelHasType(<any> new TestClass2,
                    Engine.IModel.Type.Attributes)).to.equal(false);
        });

        it("throws on creating invalid type", function() {
            expect(function() {
                factory.create(Engine.IModel.Type.Print);
            }).to.throw();
        });

        it("throws on discerning invalid type", function() {
            expect(function() {
                factory.modelHasType(<any> new TestClass1, Engine.IModel.Type.Print);
            }).to.throw();
        });
    });
});
