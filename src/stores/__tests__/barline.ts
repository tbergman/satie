jest.dontMock("../model");
jest.dontMock("../barline");
import BarlineType = require("../barline");
import C = require("../contracts");
import Annotator = require("../annotator");

describe("BarlineModel", function () {
    var Barline: typeof BarlineType = require("../barline");

    describe("recordMetreDataImpl", function() {
        it("increments bar", function() {
            var barline = new Barline(regularBarSpec, false, false);
            var mctx: C.MetreContext = {
                attributes: null,
                bar: 0,
                division: 0,
                endMarker: false,
                ts: commonTS
            };
            barline.recordMetreDataImpl(mctx);
            expect(mctx.bar).toBe(1);
        });

        it("resets divisions", function() {
            var barline = new Barline(regularBarSpec, false, false);
            var mctx: C.MetreContext = {
                attributes: null,
                bar: 0,
                division: 200,
                endMarker: false,
                ts: commonTS
            };
            barline.recordMetreDataImpl(mctx);
            expect(mctx.division).toBe(0);
        });
    });

    describe("annotateImpl", function() {
        it("ensures previous element is an EndMarker", function () {
            var fakeContext = new Annotator.Context(
                null, null, null, Annotator.AssertionPolicy.Strict);
            var barline = new Barline(regularBarSpec, false, false);
            (<jest.Mock<any>>fakeContext.prev).mockReturnValue({
                 endMarker: false
            });
            (<jest.Mock<any>>fakeContext.next).mockReturnValue({});
            (<jest.Mock<any>>fakeContext.insertPast).mockReturnValueOnce(1000);
            fakeContext.ts = commonTS;
            fakeContext.idx = 1;
            fakeContext.body = <any> [{isNote: true}, {}];
            fakeContext.barKeys = [];
            fakeContext.part = <any> {};

            var status = barline.annotate(fakeContext);
            expect(fakeContext.insertPast).toBeCalled();
            expect(status).toBe(1000);
        });

        it("ensures song ends with an EndMarker", function () {
            var fakeContext = new Annotator.Context(
                null, null, null, Annotator.AssertionPolicy.Strict);
            var barline = new Barline(regularBarSpec, false, false);

            (<jest.Mock<any>>fakeContext.prev).mockReturnValue({
                 endMarker: true
            });
            (<jest.Mock<any>>fakeContext.next).mockReturnValue(null);
            (<jest.Mock<any>>fakeContext.insertFuture).mockReturnValueOnce(1000);
            fakeContext.ts = commonTS;
            fakeContext.idx = 1;
            fakeContext.body = <any> [{isNote: true}, {}];
            fakeContext.barKeys = [];
            fakeContext.part = <any> {};

            var status = barline.annotate(fakeContext);

            expect(fakeContext.insertFuture).toBeCalled();
            expect(status).toBe(C.IterationStatus.Success);
        });
    });
});

var regularBarSpec = {
    barStyle: {
        data: C.MusicXML.BarStyleType.Regular
    }
};

var commonTS = {
    beats: 4,
    beatType: 4,
    commonRepresentation: true
};