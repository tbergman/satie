/**
 * @jsx React.DOM
 */

var assert = require("assert");

var util = require("./util.jsx");

describe("PitchBridge", function() {
    describe("rules:", function() {
        util.parseAnnotateTest(
            "a single note",
            "{c4}",
            [[
                "should create one 4/4 time signature",
                function(parsed, ctx) {
                    var ts = ctx.next(obj => obj.timeSignature);
                    assert(ts, "TS must exist");
                    assert(ts.timeSignature.beats === 4, "must have 4 beats");
                    assert(ts.timeSignature.beatType === 4, "must be quarter notes");

                    assert(!ctx.next(obj => obj.timeSignature && obj !== ts),
                        "must only be one time signature");
                }
            ], [
                "should create a C major key signature",
                function(parsed, ctx) {
                    var ks = ctx.next(obj => obj.keySignature);
                    assert(ks, "KS must exist");
                    assert(ks.keySignature.pitch.pitch === 'c', "C");
                    assert(!ks.keySignature.acc, "No accidentals");
                    assert(ks.keySignature.mode === "\\major", "Major");
                }
            ]]);
        util.parseAnnotateTest(
            "notes with implied durations",
            "{c8 d. e}",
            [[
                "should have correct durations",
                function(parsed, ctx) {
                    var barline = ctx.next(obj => obj.barline);
                    var note1 = ctx.next(obj => obj.pitch);
                    var note2 = ctx.next(obj => obj.pitch && obj !== note1);
                    var note3 = ctx.next(obj => obj.pitch && obj !== note1 && obj !== note2);
                    var note4 = ctx.next(obj => obj.pitch && obj !== note1 && obj !== note2 &&
                        obj !== note3);
                    assert(note1 && note2 && note3, "there are 3 notes");
                    assert(!note4, "and not 4");
                    assert(barline.barline === "double", "double barline only");
                    assert(note1.dots === note3.dots && note3.dots === undefined, "dots");
                    assert(note1.count === note2.count && note2.count === note3.count &&
                        parseInt(note3.count) === 8, "durations");
                }
            ]]);
        util.parseAnnotateTest(
            "notes overflowing bar",
            "{c4. d8 e f g a b}",
            [[
                "should create a barline",
                function(parsed, ctx) {
                    var barline = ctx.next(obj => obj.barline);
                    assert(barline.barline !== "double", "there is a barline that " +
                        "isn't the end barline");

                    var noteAfterBarline = ctx.next(obj => obj.ctxData.bar === 2);
                    assert(noteAfterBarline, "There is a note after the barline");
                    assert(noteAfterBarline.pitch === "b", "It's the correct note");

                    var endBarline = ctx.next(obj => obj.barline && obj !== barline);
                    assert(endBarline, "There's a second barline");
                    assert(endBarline.barline === "double", "It's the end barline");
                }
            ]]);

        util.parseAnnotateTest(
            "rebeaming notes",
            "{c8 d e f g a a}",
            [[
                "prepending a note rebeams correctly",
                function(parsed, ctx) {
                    var beam = ctx.next(obj => obj.beam, null, true);
                    var f = ctx.next(obj => obj.pitch === 'f');
                    ctx.annotate({
                        pointerData: {
                            obj: {
                                idx: f.idx,
                                placeholder: true
                            }
                        },
                        toolFn: function(item, ctx) {
                            var PitchBridge = require("../pitchBridge.jsx");
                            return ctx.insertFuture(new PitchBridge({
                                pitch: 'b',
                                count: '8'
                            }));
                        }
                    });
                    assert(ctx.next(obj => obj.beam, null, true) === beam,
                            "First beam is maintained");
                    var beam2 = ctx.next(obj => obj.beam && obj !== beam, null, true);
                    assert(beam2.beam.length === 4, "Second beam is now of length 4");
                    assert(beam2.beam[0].pitch === 'b', "b is prepended to beam");
                }
            ]]);
    });
});
