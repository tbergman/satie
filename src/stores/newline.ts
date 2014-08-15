import Model = require("./model");

import Context = require("./context");
import Contracts = require("./contracts");
import IterationStatus = require("./iterationStatus");
import NewPageModel = require("./newpage");
import SmartCondition = require("./smartCondition");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

import _ = require("lodash");

class NewlineModel extends Model {
    annotatedExtraWidth: number;
    lineSpacing: number;
    pageSize: Contracts.PageSize;
    DEBUG_line: number;

    annotateImpl(ctx: Context): IterationStatus {
        this.lineSpacing = ctx.lineSpacing;
        this.pageSize = ctx.pageSize;

        ctx.x = ctx.initialX;
        ctx.y += ctx.lineSpacing;
        ctx.prevClef = ctx.clef;
        ctx.prevKeySignature = ctx.keySignature;
        ctx.smallest = 10000;
        delete ctx.clef;
        delete ctx.keySignature;

        ////////////////////////////////////////
        ++ctx.line;
        ////////////////////////////////////////
        
        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                line: ctx.line,
            };
        }

        ctx.lines[ctx.line]["accidentals"] = [];
        ctx.lines[ctx.line]["all"] = [];
        ctx.lines[ctx.line]["bar"] = ctx.bar;
        ctx.lines[ctx.line]["barlineX"] = [];
        ctx.lines[ctx.line]["beats"] = 0;
        ctx.lines[ctx.line]["x"] = ctx.x;
        ctx.lines[ctx.line]["y"] = ctx.y;
        ctx.lines[ctx.line]["pageLines"] = ctx.pageLines;
        ctx.lines[ctx.line]["pageStarts"] = ctx.pageStarts;
        ctx.lines[ctx.line]["keySignature"] = ctx.prevKeySignature;
        this.DEBUG_line = ctx.line;

        var SongEditorStore = require("./songEditor"); // Recursive dependency.
        SongEditorStore.snapshot(ctx);

        return IterationStatus.SUCCESS;
    }
    justify(ctx: Context): IterationStatus {
        var diff = ctx.maxX - ctx.x;
        var l = 0;
        for (var i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].isNote) {
                ++l;
            }
            if (ctx.body[i].type === Contracts.ModelType.NEWLINE) {
                break;
            }
        }
        diff -= 0.001; // adjust for bad floating point arithmetic
        var xOffset = diff;
        for (var i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].type === Contracts.ModelType.NEWLINE) {
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
            if (ctx.body[i].type === Contracts.ModelType.BARLINE &&
                    (!ctx.body[i + 1] || ctx.body[i + 1].type !== Contracts.ModelType.NEWLINE)) {
                if (ctx.lines[ctx.line - 1] &&
                        _.any((<any>ctx.lines[ctx.line - 1]).barlineX, // TSFIX
                            (x:number) => Math.abs(x - newX) < 0.15)) {
                    // ADJUST BARLINE
                    var offset = -0.2;
                    newX += offset;
                    var j: number;

                    // ADJUST PRECEEDING BAR
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && ctx.body[j].type !== Contracts.ModelType.BARLINE; --j) {
                        if (ctx.body[j].isNote) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && ctx.body[j].type !== Contracts.ModelType.BARLINE; --j) {
                        ctx.body[j].setX(ctx.body[j].x() + remaining);
                        if (ctx.body[j].isNote) {
                            remaining -= offset/noteCount;
                        }
                    }

                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].type !==
                            Contracts.ModelType.BARLINE; ++j) {
                        if (ctx.body[j].isNote) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].type !==
                            Contracts.ModelType.BARLINE; ++j) {
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
        return IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        lylite.push("\n");
    }
    static createNewline = (ctx: Context): IterationStatus => {
        var l = 0;
        var fidx = ctx.idx;
        for (; fidx >=0; --fidx) {
            (<any>ctx.body[fidx]).annotatedExtraWidth = undefined; // TSFIX
            if (ctx.body[fidx].type === Contracts.ModelType.BARLINE) {
                break;
            }
        }
        if (ctx.body[fidx + 1].type === Contracts.ModelType.NEWPAGE) {
            return IterationStatus.SUCCESS;
        }
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i]._annotated) {
                if (ctx.body[i].type === Contracts.ModelType.NEWLINE ||
                        ctx.body[i].type === Contracts.ModelType.CLEF ||
                        ctx.body[i].type === Contracts.ModelType.TIME_SIGNATURE ||
                        ctx.body[i].type === Contracts.ModelType.KEY_SIGNATURE) {
                    ctx.eraseFuture(i);
                    --i;
                }
            }
        }
        ctx.insertPast(new NewlineModel({ newline: true, _annotated: "createNewline" }), fidx + 1);
        NewlineModel.removeNextNewline(ctx, fidx + 2);
        return IterationStatus.LINE_CREATED;
    };

    static removeNextNewline = (ctx: Context, start?: number) => {
        start = start || ctx.idx;
        for (var i = start; i < ctx.body.length; ++i) {
            if (ctx.body[i].type === Contracts.ModelType.NEWLINE) {
                ctx.body.splice(i, 1);
                for (var j = i; j < ctx.body.length &&
                        ctx.body[j].type !== Contracts.ModelType.BEAM_GROUP &&
                        !ctx.body[j].isNote; ++j) {
                    if (ctx.body[j]._annotated) {
                        ctx.eraseFuture(j);
                        --j;
                    }
                }
                return;
            }
        }
        return;
    };

    /**
     * Given an incomplete line ending at idx, spreads out the line
     * comfortably.
     */
    static semiJustify = (ctx: Context) => {
        var fullJustify = false;
        if (typeof window === "undefined" ||
                global.location.href.indexOf("/scales/") !== -1) {
            // XXX: HACK!!!
            fullJustify = true;
        }
        var n = 0;
        for (var i = ctx.idx; i >= 0 && (ctx.body[i].type !==
                    Contracts.ModelType.NEWLINE); --i) {
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
            for (var i = ctx.idx; i >= 0 && ctx.body[i].type !==
                    Contracts.ModelType.NEWLINE; --i) {
                if (ctx.body[i].isNote) {
                    lw -= nw;
                }
                ctx.body[i].setX(ctx.body[i].x() + lw);
            }
        }
    };

    prereqs = NewlineModel.prereqs;
    static prereqs: Array<SmartCondition> = [
        {
            condition: function (ctx) {
                return ctx.y + ctx.lineSpacing < ctx.maxY;
            },
            correction: NewPageModel.createNewPage,
            description: "Pages should not overflow"
        },
        {
            // This requirement should be last so that it only happens once
            // per line.
            condition: function(ctx) {
                return ctx.maxX - ctx.x <= 0.01; },
            correction: function(ctx: Context): IterationStatus {
                return (<NewlineModel>this).justify(ctx); },
            description: "Notes should be full justfied within a line."
        }
    ];

    get type() {
        return Contracts.ModelType.NEWLINE;
    }
}

Model.length; // BUG in typescriptifier!

export = NewlineModel;
