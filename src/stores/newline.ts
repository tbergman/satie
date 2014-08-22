import Model = require("./model");

import C = require("./contracts");
import Context = require("./context");
import NewPageModel = require("./newpage");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

import _ = require("lodash");

class NewlineModel extends Model {
    annotatedExtraWidth: number;
    lineSpacing: number;
    pageSize: C.IPageSize;
    width: number;
    begin: number;
    DEBUG_line: number;

    annotateImpl(ctx: Context): C.IterationStatus {
        // Pages should not overflow.
        if (ctx.y + ctx.lineSpacing > ctx.maxY) {
            return NewPageModel.createNewPage(ctx);
        }

        // Notes should be full justfied within a line.
        // This requirement should be last so that it only happens once
        // per line.
        if (ctx.maxX - ctx.x > 0.001) {
            this.justify(ctx);
        }

        // Copy information from the context that the view needs.
        this.lineSpacing = ctx.lineSpacing;
        this.pageSize = ctx.pageSize;

        ctx.x = ctx.initialX;
        ctx.y += ctx.lineSpacing;
        ctx.prevClef = ctx.clef;
        ctx.prevKeySignature = ctx.keySignature;
        ctx.smallest = 10000;
        delete ctx.clef;
        delete ctx.keySignature;

        this.begin = ctx.initialX;
        this.width = ctx.maxX - ctx.x;


        /**
         * Padding between begining of stave and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x += 0.2;

        ////////////////////////////////////////
        ++ctx.line;
        ////////////////////////////////////////

        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                accidentals: null,
                all: null,
                bar: null,
                barlineX: null,
                beats: null,
                keySignature: null,
                line: ctx.line,
                pageLines: null,
                pageStarts: null,
                x: null,
                y: null
            };
        }

        ctx.lines[ctx.line].accidentals = {};
        ctx.lines[ctx.line].all = [];
        ctx.lines[ctx.line].bar = ctx.bar;
        ctx.lines[ctx.line].barlineX = [];
        ctx.lines[ctx.line].beats = 0;
        ctx.lines[ctx.line].x = ctx.x;
        ctx.lines[ctx.line].y = ctx.y;
        ctx.lines[ctx.line].pageLines = ctx.pageLines;
        ctx.lines[ctx.line].pageStarts = ctx.pageStarts;
        ctx.lines[ctx.line].keySignature = ctx.prevKeySignature;
        this.DEBUG_line = ctx.line;

        var SongEditorStore = require("./songEditor"); // Recursive dependency.
        SongEditorStore.snapshot(ctx);

        return C.IterationStatus.SUCCESS;
    }
    justify(ctx: Context): C.IterationStatus {
        var diff = ctx.maxX - ctx.x;
        var i: number;
        var l = 0;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].isNote) {
                ++l;
            }
            if (ctx.body[i].type === C.Type.NEWLINE) {
                break;
            }
        }
        diff -= 0.0001; // adjust for bad floating point arithmetic
        var xOffset = diff;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].type === C.Type.NEWLINE) {
                break;
            }
            if (ctx.body[i].isNote) {
                // TSFIX
                (<any>ctx.body[i]).annotatedExtraWidth =
                    ((<any>ctx.body[i]).annotatedExtraWidth || 0) +
                    diff/l;
                xOffset -= diff/l;
            }
            var newX = ctx.body[i].x() + xOffset;
            if (ctx.body[i].type === C.Type.BARLINE &&
                    (!ctx.body[i + 1] || ctx.body[i + 1].type !== C.Type.NEWLINE)) {
                if (ctx.lines[ctx.line - 1] &&
                        _.any((<any>ctx.lines[ctx.line - 1]).barlineX, // TSFIX
                            (x:number) => Math.abs(x - newX) < 0.15)) {
                    // ADJUST BARLINE
                    var offset = -0.2;
                    newX += offset;
                    var j: number;

                    // ADJUST PRECEEDING BAR
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && ctx.body[j].type !== C.Type.BARLINE; --j) {
                        if (ctx.body[j].isNote) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && ctx.body[j].type !== C.Type.BARLINE; --j) {
                        ctx.body[j].setX(ctx.body[j].x() + remaining);
                        if (ctx.body[j].isNote) {
                            remaining -= offset/noteCount;
                        }
                    }

                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].type !==
                            C.Type.BARLINE; ++j) {
                        if (ctx.body[j].isNote) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].type !==
                            C.Type.BARLINE; ++j) {
                        ctx.body[j].setX(ctx.body[j].x() + remaining);
                        if (ctx.body[j].isNote) {
                            remaining -= offset/noteCount;
                        }
                    }
                }

                ctx.barlineX.push(newX);
            }
            ctx.body[i].setX(newX);
        }
        return C.IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        lylite.push("\n");
    }
    static createNewline = (ctx: Context): C.IterationStatus => {
        var l = 0;
        var fidx = ctx.idx;
        for (; fidx >=0; --fidx) {
            (<any>ctx.body[fidx]).annotatedExtraWidth = undefined; // TSFIX
            if (ctx.body[fidx].type === C.Type.BARLINE) {
                break;
            }
        }
        if (ctx.body[fidx + 1].type === C.Type.NEWPAGE) {
            return C.IterationStatus.SUCCESS;
        }
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i]._annotated) {
                if (ctx.body[i].type === C.Type.NEWLINE ||
                        ctx.body[i].type === C.Type.CLEF ||
                        ctx.body[i].type === C.Type.TIME_SIGNATURE ||
                        ctx.body[i].type === C.Type.KEY_SIGNATURE) {
                    ctx.eraseFuture(i);
                    --i;
                }
            }
        }
        ctx.insertPast(new NewlineModel({ newline: true, _annotated: "createNewline" }), fidx + 1);
        return C.IterationStatus.LINE_CREATED;
    };

    /**
     * Given an incomplete line ending at idx, spreads out the line
     * comfortably.
     */
    static semiJustify = (ctx: Context) => {
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
            if (ctx.body[i].isNote) {
                ++n;
            }
        }
        if (n) {
            var lw = ctx.maxX - 3 - ctx.curr().x();
            var nw = lw/n;
            if (fullJustify) {
                lw = ctx.maxX - ctx.curr().x();
                nw = lw/n;
            } else {
                var weight = renderUtil.sigmoid((nw - ctx.maxX/2)/20)*2/3;
                nw = (1 - weight)*nw;
                lw = nw * n;
            }
            for (i = ctx.idx; i >= 0 && ctx.body[i].type !==
                    C.Type.NEWLINE; --i) {
                if (ctx.body[i].isNote) {
                    lw -= nw;
                }
                ctx.body[i].setX(ctx.body[i].x() + lw);
            }
        }
    };

    get type() {
        return C.Type.NEWLINE;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = NewlineModel;
