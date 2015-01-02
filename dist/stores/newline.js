var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var AttributesModel = require("./attributes");
var C = require("./contracts");
var NewPageModel = require("./newpage");
var PrintModel = require("./print");
var NewlineModel = (function (_super) {
    __extends(NewlineModel, _super);
    function NewlineModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(NewlineModel.prototype, "type", {
        get: function () {
            return 130 /* NewLine */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NewlineModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    NewlineModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    NewlineModel.prototype.annotateImpl = function (ctx) {
        if (ctx.prev().priority !== 50 /* Print */) {
            return ctx.insertPast(new PrintModel({}, true));
        }
        if (ctx.maxX - ctx.x > 0.001) {
            this._justify(ctx);
            for (var i = 0; i < ctx._voices.length; ++i) {
                var body = ctx._voices[i].body;
                if (body !== ctx.body) {
                    var len = Math.min(ctx.body.length, body.length);
                    for (var j = 0; j < len; ++j) {
                        ctx.body[j].x = body[j].x = Math.min(body[j].x, ctx.body[j].x);
                    }
                }
                else {
                    break;
                }
            }
        }
        var visibleStaveCount = 0;
        for (var i = 0; i < ctx._voices.length; ++i) {
            if (ctx._voices[i].body) {
                ++visibleStaveCount;
            }
        }
        this.braceY = this.y;
        this.braceY2 = this.y;
        NewlineModel.explode(ctx);
        ctx.lines[ctx.line].y = ctx.y;
        ctx.lines[ctx.line].x = ctx.x;
        var print = ctx.print;
        var systemMargins = print.systemLayout.systemMargins;
        var pageMargins = print.pageMarginsFor(ctx.page);
        var pageLayout = print.pageLayout;
        ctx.fontSize = ctx.calcFontSize();
        ctx.maxX = pageLayout.pageWidth - systemMargins.rightMargin - pageMargins.rightMargin;
        ctx.maxY = pageLayout.pageHeight - pageMargins.topMargin;
        ctx.x = systemMargins.leftMargin + pageMargins.leftMargin;
        if (ctx.y > ctx.maxY) {
            return NewPageModel.createNewPage(ctx);
        }
        ctx.lines[ctx.line].attributes.time = ctx.attributes.time;
        ctx.line = ctx.line + 1;
        ctx.smallest = 10000;
        ctx.minBottomPaddings = _.times(ctx._voices.length + 1, function () { return 0; });
        ctx.minTopPaddings = _.times(ctx._voices.length + 1, function () { return 0; });
        this.x = ctx.x;
        this.staveW = ctx.maxX - ctx.x;
        ctx.x = ctx.x + 8;
        var lattributes = new AttributesModel({
            time: ctx.attributes.time
        }, true);
        ctx.attributes = null;
        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                accidentalsByStaff: C.JSONx.clone(ctx.accidentalsByStaff),
                attributes: {},
                bar: null,
                barKeys: null,
                barlineX: null,
                beat: null,
                invisibleForBars: null,
                line: ctx.line,
                pageLines: null,
                pageStarts: null,
                prevClefByStave: {},
                partIdx: ctx.voiceIdx,
                x: null,
                y: null
            };
        }
        ctx.lines[ctx.line].accidentalsByStaff = [];
        ctx.lines[ctx.line].attributes = {};
        ctx.lines[ctx.line].bar = ctx.bar;
        ctx.lines[ctx.line].barlineX = [];
        ctx.lines[ctx.line].barKeys = C.JSONx.clone(ctx.barKeys);
        ctx.lines[ctx.line].beat = 0;
        ctx.lines[ctx.line].x = ctx.x;
        ctx.lines[ctx.line].y = ctx.y;
        ctx.lines[ctx.line].pageLines = ctx.pageLines;
        ctx.lines[ctx.line].pageStarts = ctx.pageStarts;
        if (ctx.songEditor) {
            ctx.songEditor.dangerouslyTakeSnapshot(ctx);
        }
        return 10 /* Success */;
    };
    NewlineModel.prototype._justify = function (ctx) {
        var diff = ctx.maxX - ctx.x;
        var i;
        var l = 0;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].isNote && !ctx.body[i].soundOnly) {
                ++l;
            }
            if (i + 1 !== ctx.body.length) {
                ctx.body[i].w = ctx.body[i + 1].x - ctx.body[i].x;
            }
            if (ctx.body[i].priority === 130 /* NewLine */) {
                break;
            }
        }
        diff -= 0.0001;
        var xOffset = diff;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].priority === 130 /* NewLine */) {
                break;
            }
            if (ctx.body[i].isNote && !ctx.body[i].soundOnly) {
                ctx.body[i].extraWidth = (ctx.body[i].extraWidth || 0) + diff / l;
                xOffset -= diff / l;
            }
            var newX = ctx.body[i].x + xOffset;
            if (ctx.body[i].priority === 300 /* Barline */ && (!ctx.body[i + 1] || ctx.body[i + 1].priority !== 130 /* NewLine */)) {
                if (ctx.lines[ctx.line - 1] && _.any(ctx.lines[ctx.line - 1].barlineX, function (x) { return Math.abs(x - newX) < 0.15; })) {
                    var offset = -0.2;
                    newX += offset;
                    var j;
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== 300 /* Barline */; --j) {
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== 300 /* Barline */; --j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            remaining -= offset / noteCount;
                        }
                    }
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !== 300 /* Barline */; ++j) {
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !== 300 /* Barline */; ++j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            remaining -= offset / noteCount;
                        }
                    }
                }
                ctx.barlineX.push(newX);
            }
            ctx.body[i].x = newX;
        }
        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== 130 /* NewLine */; --i) {
            if (ctx.body[i].type === 300 /* Barline */ && ctx.body[i].visible) {
                NewlineModel.centerWholeBarRests(ctx.body, i);
            }
        }
        return 10 /* Success */;
    };
    NewlineModel.centerWholeBarRests = function (body, idx) {
        var toCenter = [];
        for (var i = idx - 2; i >= 0 && (body[i].priority > 300 /* Barline */ && body[i].priority !== 140 /* Begin */ || body[i].soundOnly); --i) {
            if (body[i].isRest && body[i].note.isWholebar && !body[i].soundOnly) {
                toCenter.push(body[i]);
            }
        }
        if (!toCenter.length) {
            return;
        }
        var offsetX = 0;
        for (var j = i; body[j] && body[j].priority > 100 /* START_OF_ATTRIBUTES */ && body[j].priority !== 300 /* Barline */ && body[j].priority !== 140 /* Begin */; --j) {
            if (body[j].type === 170 /* TimeSignature */) {
                offsetX -= body[j]._annotatedSpacing - 6.5;
            }
        }
        if (body[i].type !== 300 /* Barline */) {
            ++i;
        }
        for (var j = 0; j < toCenter.length; ++j) {
            var bbox = C.SMuFL.bravuraBBoxes[toCenter[j].restHead];
            var offset = 0;
            if (body[i].isNote && body[i].note.temporary) {
                continue;
            }
            toCenter[j].spacing = (body[idx].x + body[i].x) / 2 - toCenter[j].x - 10 * (bbox[0] - bbox[2]) / 2 + offsetX - 6.5;
        }
    };
    NewlineModel.explode = function (ctx) {
        var veryBottomPadding = 0;
        var braces = [];
        _.forEach(ctx.songEditor.parts, function (part) {
            _.times(part.staves, function (staff) {
                staff += 1;
                var extraTopPadding = (staff - 1) * 50;
                extraTopPadding += ctx.minTopPaddings[staff];
                _.chain(part.voices).map(function (voiceIdx) { return ctx._voices[voiceIdx].body; }).map(function (body) {
                    var line = ctx.line;
                    return _.filter(body, function (model) {
                        if (model.type === 130 /* NewLine */) {
                            --line;
                            return !line || !~line;
                        }
                        return !line;
                    });
                }).map(function (body, sidx) { return _.filter(body, function (model) { return model.staff === staff || model.staff === -1 && staff === sidx + 1; }); }).flatten(true).forEach(function (model) {
                    model.y += extraTopPadding;
                    var brace = model;
                    if (brace.braceY) {
                        brace.braceY = model.y;
                        braces.push(brace);
                        _.forEach(braces, function (brace) {
                            brace.braceY2 = model.y;
                        });
                    }
                }).value();
                extraTopPadding += ctx.minBottomPaddings[staff];
                veryBottomPadding = ctx.minBottomPaddings[staff];
            });
        });
        veryBottomPadding = Math.max(C.getPrint(ctx._layout.header).systemLayout.systemDistance, veryBottomPadding);
        ctx.curr.braceY2 += veryBottomPadding;
        ctx.y = ctx.curr.y + veryBottomPadding;
        ctx.curr.y = ctx.y;
    };
    NewlineModel.createNewline = function (ctx) {
        if (ctx.songEditor) {
            ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line + 1);
        }
        var l = 0;
        var fidx;
        for (fidx = ctx.idx; fidx >= 0; --fidx) {
            ctx.body[fidx].extraWidth = 0;
            if (ctx.body[fidx].type === 300 /* Barline */) {
                break;
            }
        }
        if (ctx.body[fidx + 1].type === 120 /* NewPage */) {
            return 10 /* Success */;
        }
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (!ctx.body[i].annotated) {
                if (ctx.body[i].type === 130 /* NewLine */ || ctx.body[i].type === 150 /* Clef */ || ctx.body[i].type === 170 /* TimeSignature */ || ctx.body[i].type === 160 /* KeySignature */) {
                    ctx.eraseFuture(i);
                    --i;
                }
            }
        }
        ctx.insertPast(new NewlineModel({
            newline: true
        }, true), fidx + 1);
        return 70 /* LineCreated */;
    };
    NewlineModel.semiJustify = function (ctx) {
        var fullJustify = false;
        var i;
        if (ctx._voices.isScale) {
            fullJustify = true;
        }
        var n = 0;
        for (i = ctx.idx; i >= 0 && (ctx.body[i].type !== 130 /* NewLine */); --i) {
            if (ctx.body[i].priority === 600 /* Duration */ && !ctx.body[i].soundOnly) {
                ++n;
            }
            if (i + 1 !== ctx.body.length) {
                ctx.body[i].w = ctx.body[i + 1].x - ctx.body[i].x;
            }
        }
        if (n) {
            var lw = ctx.maxX - 3 - ctx.curr.x;
            var nw = lw / n;
            if (fullJustify) {
                lw = ctx.maxX - ctx.curr.x;
                nw = lw / n;
            }
            else {
                var weight = C.renderUtil.sigmoid((nw - ctx.maxX / 80) / 20) * 2 / 3;
                nw = (1 - weight) * nw;
                lw = nw * n;
            }
            for (i = ctx.idx; i >= 0 && ctx.body[i].type !== 130 /* NewLine */; --i) {
                if (ctx.body[i].priority === 600 /* Duration */ && !ctx.body[i].soundOnly) {
                    lw -= nw;
                }
                ctx.body[i].x = ctx.body[i].x + lw;
            }
            for (i = ctx.idx; i >= 0 && ctx.body[i].type !== 130 /* NewLine */; --i) {
                if (ctx.body[i].type === 300 /* Barline */) {
                    NewlineModel.centerWholeBarRests(ctx.body, i);
                }
            }
        }
    };
    return NewlineModel;
})(Model);
module.exports = NewlineModel;
