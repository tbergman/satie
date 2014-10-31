/**
 * @file Utilities to be used for writing tests.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import _ = require("lodash");
import assert = require("assert");

import Annotator = require("./annotator");
import C = require("./contracts");
import Dispatcher = require("./dispatcher");
import SessionStore = require("./session");
import SongEditorStore = require("./songEditor");
import lylite = require("./lylite");

export function parseAnnotateTest(desc: string, ly: string, tests: Array<any[]>) {
    "use strict";

    describe(desc, function() {
        var parsed: Array<C.IStave>;
        var context: Annotator.Context;
        var dispatcher = new Dispatcher;
        var session = new SessionStore(dispatcher);
        var songEditor = new SongEditorStore(dispatcher, session);
        it("should parse", function () {
            parsed = lylite.parse(ly);
            assert(parsed, "Did it parse?");
        });
        it("should be annotatable", function () {
            if (!parsed) {
                return;
            }
            var opts = {
                indent: 15,
                parts: parsed,
                partIdx: 0
            };
            context = new Annotator.Context(parsed, opts, songEditor, Annotator.AssertionPolicy.NoAssertions);
            context.annotate({ bar: 1, beat: 0 }, null, null, true);
        });
        _.each(tests, test => it(
            test[0],
            () => parsed && test[1](parsed, context)));
    });
}

export function multiPart(a: string, b: string, key?: string) {
    "use strict";
    if (key === void 0) {
        key = "\\key g";
    }
    return "\\new PianoStaff <<" +
        "   \\new Staff { \\clef treble " + key + " \\major " + a + "}\n" +
        "   \\new Staff { \\clef bass " + key + " \\major " + b + "}\n" +
        ">>";
}

export function calledExactly(target: number, description?: string) {
    "use strict";
    var called = 0;
    return {
        verify: function () {
            assert.equal(called, target, description);
        },
        listener: function () {
            ++called;
            assert(called <= target, description);
        }
    };
}

export function singleChange(verb: string, command: string, data: any,
        before: (songEditor: SongEditorStore) => void,
        after: (songEditor: SongEditorStore) => void) {
    "use strict";
    var dispatcher = new Dispatcher;
    var session = new SessionStore(dispatcher);
    var songEditor = new SongEditorStore(dispatcher, session);
    var listener = calledExactly(1, "Dispatcher emits a single update");
    var annotationListener = calledExactly(0, "No annotation update");

    before(songEditor);
    songEditor.addAnnotationListener(annotationListener.listener);
    songEditor.addChangeListener(listener.listener);
    (<any>dispatcher)[verb](command, data);
    after(songEditor);
    annotationListener.verify();
    listener.verify();
}