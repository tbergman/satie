jest.dontMock("../model");
jest.dontMock("../barline");
var C = require("../contracts");
var Annotator = require("../annotator");
describe("BarlineModel", function () {
    var Barline = require("../barline");
    describe("recordMetreDataImpl", function () {
        it("increments bar", function () {
            var barline = new Barline(regularBarSpec, false, false);
            var mctx = {
                attributes: null,
                bar: 0,
                division: 0,
                endMarker: false,
                ts: commonTS
            };
            barline.recordMetreDataImpl(mctx);
            expect(mctx.bar).toBe(1);
        });
        it("resets divisions", function () {
            var barline = new Barline(regularBarSpec, false, false);
            var mctx = {
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
    describe("annotateImpl", function () {
        it("ensures previous element is an EndMarker", function () {
            var fakeContext = new Annotator.Context(null, null, null, 0 /* Strict */);
            var barline = new Barline(regularBarSpec, false, false);
            fakeContext.prev.mockReturnValue({
                endMarker: false
            });
            fakeContext.next.mockReturnValue({});
            fakeContext.insertPast.mockReturnValueOnce(1000);
            fakeContext.ts = commonTS;
            fakeContext.idx = 1;
            fakeContext.body = [{ isNote: true }, {}];
            fakeContext.barKeys = [];
            fakeContext.part = {};
            var status = barline.annotate(fakeContext);
            expect(fakeContext.insertPast).toBeCalled();
            expect(status).toBe(1000);
        });
        it("ensures song ends with an EndMarker", function () {
            var fakeContext = new Annotator.Context(null, null, null, 0 /* Strict */);
            var barline = new Barline(regularBarSpec, false, false);
            fakeContext.prev.mockReturnValue({
                endMarker: true
            });
            fakeContext.next.mockReturnValue(null);
            fakeContext.insertFuture.mockReturnValueOnce(1000);
            fakeContext.ts = commonTS;
            fakeContext.idx = 1;
            fakeContext.body = [{ isNote: true }, {}];
            fakeContext.barKeys = [];
            fakeContext.part = {};
            var status = barline.annotate(fakeContext);
            expect(fakeContext.insertFuture).toBeCalled();
            expect(status).toBe(10 /* Success */);
        });
    });
});
var regularBarSpec = {
    barStyle: {
        data: 0 /* Regular */
    }
};
var commonTS = {
    beats: 4,
    beatType: 4,
    commonRepresentation: true
};
