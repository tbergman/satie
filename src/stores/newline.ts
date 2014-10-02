/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import C = require("./contracts");
import Annotator = require("./annotator");
import NewPageModel = require("./newpage");
import renderUtil = require("../util/renderUtil");

import _ = require("lodash");
import assert = require("assert");

/**
 * A manual or automatic hint that a new line should be created. This file
 * modifies the context on each new line. It's also used to render the staff and
 * piano stave for everything but the first line of each page. See also begin.ts.
 */
class NewlineModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Pages should not overflow.
        if (ctx.y + ctx.lineSpacing > ctx.maxY) {
            return NewPageModel.createNewPage(ctx);
        }

        // Notes should be full justified within a line.
        // This requirement should be last so that it only happens once
        // per line. We take the min of each justification to fix rounding
        // errors.
        if (ctx.maxX - ctx.x > 0.001) {
            this._justify(ctx);
            for (var i = 0; i < ctx._staves.length; ++i) {
                var body = ctx._staves[i].body;
                if (!body) { continue; }
                if (body !== ctx.body) {
                    var len = Math.min(ctx.body.length, body.length);
                    for (var j = 0; j < len; ++j) {
                        ctx.body[j].x = body[j].x = Math.min(body[j].x, ctx.body[j].x);
                    }
                } else {
                    break;
                }
            }
        }

        var visibleStaveCount = 0;
        for (var i = 0; i < ctx._staves.length; ++i) {
            if (ctx._staves[i].body) {
                ++visibleStaveCount;
            }
        }

        // Copy information from the context that the view needs.
        this.lineSpacing = ctx.lineSpacing + renderUtil.staveSeperation*(visibleStaveCount - 1);
        this.pianoStaff = ctx.currStave.pianoStaff;
        this.braceY = this.y;
        this.braceY2 = this.y + renderUtil.staveSeperation;
        this.pageSize = ctx.pageSize;

        ctx.x = ctx.initialX;
        ctx.y += ctx.lineSpacing;
        ctx.prevClefByStave[ctx.currStaveIdx] = ctx.clef;
        ctx.prevKeySignature = ctx.keySignature;
        ctx.smallest = 10000;
        ctx.clef = null;
        ctx.keySignature = null;

        this.begin = ctx.initialX;
        this.width = ctx.maxX - ctx.x;

        /*
         * 0.2 is the padding between beginning of stave and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x += 0.2;

        ////////////////////////////////////////
        ++ctx.line;
        ////////////////////////////////////////

        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                accidentals: null,
                bar: null,
                barKeys: null,
                barlineX: null,
                beat: null,
                clef: null,
                keySignature: null,
                line: ctx.line,
                pageLines: null,
                pageStarts: null,
                prevClefByStave: {},
                prevKeySignature: null,
                x: null,
                y: null
            };
        }

        ctx.lines[ctx.line].accidentals = {};
        ctx.lines[ctx.line].bar = ctx.bar;
        ctx.lines[ctx.line].barlineX = [];
        ctx.lines[ctx.line].barKeys = JSON.parse(JSON.stringify(ctx.barKeys));
        ctx.lines[ctx.line].beat = 0;
        ctx.lines[ctx.line].x = ctx.x;
        ctx.lines[ctx.line].y = ctx.y;
        ctx.lines[ctx.line].pageLines = ctx.pageLines;
        ctx.lines[ctx.line].pageStarts = ctx.pageStarts;
        ctx.lines[ctx.line].prevClefByStave = JSON.parse(JSON.stringify(ctx.prevClefByStave));
        ctx.lines[ctx.line].keySignature = ctx.prevKeySignature;

        assert(ctx.lines[ctx.line].prevClefByStave);
        this.DEBUG_line = ctx.line;

        ctx.songEditor.dangerouslyTakeSnapshot(ctx);

        return C.IterationStatus.SUCCESS;
    }

    toLylite(lylite: Array<string>) {
        lylite.push("\n");
    }

    get type() {
        return C.Type.NEWLINE;
    }

    /**
     * Spaces things out to fill the entire page width, while maintaining
     * proportional widths.
     */
    private _justify(ctx: Annotator.Context): C.IterationStatus {
        var diff = ctx.maxX - ctx.x;
        var i: number;
        var l = 0;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].isNote) {
                ++l;
            }
            if (ctx.body[i].priority === C.Type.NEWLINE) {
                break;
            }
        }
        diff -= 0.0001; // adjust for bad floating point arithmetic
        var xOffset = diff;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].priority === C.Type.NEWLINE) {
                break;
            }
            if (ctx.body[i].isNote) {
                ctx.body[i].annotatedExtraWidth =
                    (ctx.body[i].annotatedExtraWidth || 0) +
                    diff/l;
                xOffset -= diff/l;
            }
            var newX = ctx.body[i].x + xOffset;
            if (ctx.body[i].priority === C.Type.BARLINE &&
                    (!ctx.body[i + 1] || ctx.body[i + 1].priority !== C.Type.NEWLINE)) {
                if (ctx.lines[ctx.line - 1] &&
                        _.any((<any>ctx.lines[ctx.line - 1]).barlineX, // TSFIX
                            (x:number) => Math.abs(x - newX) < 0.15)) {
                    // ADJUST BARLINE
                    var offset = -0.2;
                    newX += offset;
                    var j: number;

                    // ADJUST PRECEEDING BAR
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== C.Type.BARLINE; --j) {
                        if (ctx.body[j].isNote) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== C.Type.BARLINE; --j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (ctx.body[j].isNote) {
                            remaining -= offset/noteCount;
                        }
                    }


                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !==
                            C.Type.BARLINE; ++j) {
                        if (ctx.body[j].isNote) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !==
                            C.Type.BARLINE; ++j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (ctx.body[j].isNote) {
                            remaining -= offset/noteCount;
                        }
                    }
                }

                ctx.barlineX.push(newX);
            }
            ctx.body[i].x = newX;
        }
        return C.IterationStatus.SUCCESS;
    }

    static createNewline = (ctx: Annotator.Context): C.IterationStatus => {
        ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line + 1);
        var l = 0;
        var fidx = ctx.idx;
        for (; fidx >=0; --fidx) {
            ctx.body[fidx].annotatedExtraWidth = 0;
            if (ctx.body[fidx].type === C.Type.BARLINE) {
                break;
            }
        }
        if (ctx.body[fidx + 1].type === C.Type.NEWPAGE) {
            return C.IterationStatus.SUCCESS;
        }
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i].source) {
                if (ctx.body[i].type === C.Type.NEWLINE ||
                        ctx.body[i].type === C.Type.CLEF ||
                        ctx.body[i].type === C.Type.TIME_SIGNATURE ||
                        ctx.body[i].type === C.Type.KEY_SIGNATURE) {
                    ctx.eraseFuture(i);
                    --i;
                }
            }
        }

        ctx.insertPast(new NewlineModel({
            newline: true,
            source: C.Source.ANNOTATOR
        }), fidx + 1);

        return C.IterationStatus.LINE_CREATED;
    };

    /**
     * Given an incomplete line ending at current index, spreads out the line
     * comfortably.
     */
    static semiJustify = (ctx: Annotator.Context) => {
        var fullJustify = false;
        var i: number;

        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            fullJustify = true;
        }
        var n = 0;
        for (i = ctx.idx; i >= 0 && (ctx.body[i].type !==
                    C.Type.NEWLINE); --i) {
            if (ctx.body[i].priority === C.Type.DURATION) {
                ++n;
            }
        }
        if (n) {
            var lw = ctx.maxX - 3 - ctx.curr.x;
            var nw = lw/n;
            if (fullJustify) {
                lw = ctx.maxX - ctx.curr.x;
                nw = lw/n;
            } else {
                var weight = renderUtil.sigmoid((nw - ctx.maxX/2)/20)*2/3;
                nw = (1 - weight)*nw;
                lw = nw * n;
            }
            for (i = ctx.idx; i >= 0 && ctx.body[i].type !==
                    C.Type.NEWLINE; --i) {
                if (ctx.body[i].priority === C.Type.DURATION) {
                    lw -= nw;
                }
                ctx.body[i].x = ctx.body[i].x + lw;
            }
        }
    };

    toJSON(): {} {
        return _.extend(super.toJSON(), {
        });
    }

    DEBUG_line: number;
    annotatedExtraWidth: number;
    begin: number;
    braceY: number;
    braceY2: number;
    lineSpacing: number;
    pageSize: C.IPageSize;
    pianoStaff: boolean;
    width: number;
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = NewlineModel;
