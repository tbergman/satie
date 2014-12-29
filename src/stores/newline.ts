/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model            = require("./model");

import _                = require("lodash");

import Annotator        = require("./annotator");
import AttributesModel  = require("./attributes")
import C                = require("./contracts");
import NewPageModel     = require("./newpage");
import PrintModel       = require("./print");

/**
 * A manual or automatic hint that a new line should be created. This file
 * modifies the context on each new line. It's also used to render the staff and
 * piano part for everything but the first line of each page. See also begin.ts.
 */
class NewlineModel extends Model {

    ///////////////
    // I.1 Model //
    ///////////////

    get type()          { return C.Type.NewLine; }
    get xPolicy()       { return C.RectifyXPolicy.Max; }

    //////////////////////
    // I.2 NewlineModel //
    //////////////////////

    extraWidth:         number;
    braceY:             number;
    braceY2:            number;
    lineSpacing:        number;
    staveW:             number;

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        if (ctx.prev().priority !== C.Type.Print) {
            return ctx.insertPast(new PrintModel({}, true));
        }

        // Pages should not overflow.
        if (ctx.y + ctx.calcLineSpacing() > ctx.maxY) {
            return NewPageModel.createNewPage(ctx);
        }

        // Notes should be full justified within a line.
        // This requirement should be last so that it only happens once
        // per line. We take the min of each justification to fix rounding
        // errors.
        if (ctx.maxX - ctx.x > 0.001) {
            this._justify(ctx);
            for (var i = 0; i < ctx._parts.length; ++i) {
                var body = ctx._parts[i].body;
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
        for (var i = 0; i < ctx._parts.length; ++i) {
            if (ctx._parts[i].body) {
                ++visibleStaveCount;
            }
        }

        NewlineModel.pushDownIfNeeded(ctx);

        // Copy information from the context that the view needs.
        this.lineSpacing        = ctx.calcLineSpacing(print);
        this.braceY             = this.y;
        this.braceY2            = this.y + C.renderUtil.staveSeperation;

        ctx.lines[ctx.line].y   = ctx.y;
        ctx.lines[ctx.line].x   = ctx.x;

        /////////////////////////////////////////////////////////////
        var print               = ctx.print;

        var systemMargins       = print.systemLayout.systemMargins;
        var pageMargins         = print.pageMarginsFor(ctx.page);
        var pageLayout          = print.pageLayout;

        ctx.fontSize            = ctx.calcFontSize();
        ctx.maxX                = pageLayout.pageWidth - systemMargins.rightMargin - pageMargins.rightMargin;
        ctx.maxY                = pageLayout.pageHeight - pageMargins.topMargin;
        ctx.x                   = systemMargins.leftMargin + pageMargins.leftMargin;
        ctx.y                   = ctx.y + this.lineSpacing;
        ctx.lines[ctx.line].attributes.time = ctx.attributes.time;

        ctx.line                = ctx.line + 1;
        /////////////////////////////////////////////////////////////

        ctx.smallest            = 10000;
        ctx.minBottomPaddings   = _.times(ctx._parts.length, () => 0);
        ctx.minTopPaddings      = _.times(ctx._parts.length, () => 0);

        this.x                  = ctx.x;
        this.staveW             = ctx.maxX - ctx.x;

        /*
         * 8 is the padding between beginning of part and the clef.
         * This value should also be changed in BeginModel.
         */
        ctx.x                   = ctx.x + 8;

        var lattributes: C.MusicXML.Attributes = new AttributesModel({
            time:               ctx.attributes.time
        }, true);
        ctx.attributes = null;

        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                accidentalsByStave:     C.JSONx.clone(ctx.accidentalsByStave),
                attributes:             {},
                bar:                    null,
                barKeys:                null,
                barlineX:               null,
                beat:                   null,
                invisibleForBars:       null,
                line:                   ctx.line,
                pageLines:              null,
                pageStarts:             null,
                prevClefByStave:        {},
                partIdx:                ctx.currStaveIdx,
                x:                      null,
                y:						null
            };
        }

        ctx.lines[ctx.line].accidentalsByStave  = [];
        ctx.lines[ctx.line].attributes          = {};
        ctx.lines[ctx.line].bar                 = ctx.bar;
        ctx.lines[ctx.line].barlineX            = [];
        ctx.lines[ctx.line].barKeys             = C.JSONx.clone(ctx.barKeys);
        ctx.lines[ctx.line].beat                = 0;
        ctx.lines[ctx.line].x                   = ctx.x;
        ctx.lines[ctx.line].y					= ctx.y;
        ctx.lines[ctx.line].pageLines           = ctx.pageLines;
        ctx.lines[ctx.line].pageStarts          = ctx.pageStarts;

        if (ctx.songEditor) {
            ctx.songEditor.dangerouslyTakeSnapshot(ctx);
        }

        return C.IterationStatus.Success;
    }

    //////////////////////
    // III. Convenience //
    //////////////////////

    /**
     * Spaces things out to fill the entire page width, while maintaining
     * proportional widths.
     */
    private _justify(ctx: Annotator.Context): C.IterationStatus {
        var diff = ctx.maxX - ctx.x;
        var i: number;
        var l = 0;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].isNote && !ctx.body[i].soundOnly) {
                ++l;
            }
            // Calculate width BEFORE centering whole bars.
            if (i + 1 !== ctx.body.length) {
                ctx.body[i].w = ctx.body[i + 1].x - ctx.body[i].x;
            }
            if (ctx.body[i].priority === C.Type.NewLine) {
                break;
            }
        }
        diff -= 0.0001; // adjust for bad floating point arithmetic
        var xOffset = diff;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (ctx.body[i].priority === C.Type.NewLine) {
                break;
            }
            if (ctx.body[i].isNote && !ctx.body[i].soundOnly) {
                ctx.body[i].extraWidth =
                    (ctx.body[i].extraWidth || 0) +
                    diff/l;
                xOffset -= diff/l;
            }
            var newX = ctx.body[i].x + xOffset;
            if (ctx.body[i].priority === C.Type.Barline &&
                    (!ctx.body[i + 1] || ctx.body[i + 1].priority !== C.Type.NewLine)) {
                if (ctx.lines[ctx.line - 1] &&
                        _.any((<any>ctx.lines[ctx.line - 1]).barlineX, // TSFIX
                            (x:number) => Math.abs(x - newX) < 0.15)) {
                    // ADJUST BARLINE
                    var offset = -0.2;
                    newX += offset;
                    var j: number;

                    // ADJUST PRECEEDING BAR
                    var noteCount = 0;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== C.Type.Barline; --j) {
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== C.Type.Barline; --j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            remaining -= offset/noteCount;
                        }
                    }


                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !==
                            C.Type.Barline; ++j) {
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !==
                            C.Type.Barline; ++j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (ctx.body[j].isNote && !ctx.body[i].soundOnly) {
                            remaining -= offset/noteCount;
                        }
                    }
                }

                ctx.barlineX.push(newX);
            }
            ctx.body[i].x = newX;
        }

        for (i = ctx.idx - 1; i >= 0 && ctx.body[i].type !== C.Type.NewLine; --i) {
            if (ctx.body[i].type === C.Type.Barline && ctx.body[i].visible) {
                NewlineModel.centerWholeBarRests(ctx.body, i);
            }
        }
        return C.IterationStatus.Success;
    }

    ////////////////
    // IV. Static //
    ////////////////

    static createNewline = (ctx: Annotator.Context): C.IterationStatus => {
        if (ctx.songEditor) {
            ctx.songEditor.dangerouslyMarkRendererLineDirty(ctx.line + 1);
        }
        var l = 0;
        var fidx: number;
        for (fidx = ctx.idx; fidx >= 0; --fidx) {
            ctx.body[fidx].extraWidth = 0;
            if (ctx.body[fidx].type === C.Type.Barline) {
                break;
            }
        }
        if (ctx.body[fidx + 1].type === C.Type.NewPage) {
            return C.IterationStatus.Success;
        }
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (!ctx.body[i].annotated) {
                if (ctx.body[i].type === C.Type.NewLine ||
                        ctx.body[i].type === C.Type.Clef ||
                        ctx.body[i].type === C.Type.TimeSignature ||
                        ctx.body[i].type === C.Type.KeySignature) {
                    ctx.eraseFuture(i);
                    --i;
                }
            }
        }

        ctx.insertPast(new NewlineModel({
            newline: true
        }, true), fidx + 1);

        return C.IterationStatus.LineCreated;
    };

    /**
     * Given an incomplete line ending at current index, spreads out the line
     * comfortably.
     */
    static semiJustify = (ctx: Annotator.Context) => {
        var fullJustify = false;
        var i: number;

        if ((<any>ctx._parts).isScale) {
            // XXX: HACK!!!
            fullJustify = true;
        }
        var n = 0;
        for (i = ctx.idx; i >= 0 && (ctx.body[i].type !==
                    C.Type.NewLine); --i) {
            if (ctx.body[i].priority === C.Type.Duration && !ctx.body[i].soundOnly) {
                ++n;
            }

            // Calculate width BEFORE justifying.
            if (i + 1 !== ctx.body.length) {
                ctx.body[i].w = ctx.body[i + 1].x - ctx.body[i].x;
            }
        }
        if (n) {
            var lw = ctx.maxX - 3 - ctx.curr.x;
            var nw = lw/n;
            if (fullJustify) {
                lw = ctx.maxX - ctx.curr.x;
                nw = lw/n;
            } else {
                var weight = C.renderUtil.sigmoid((nw - ctx.maxX/80)/20)*2/3;
                nw = (1 - weight)*nw;
                lw = nw * n;
            }
            for (i = ctx.idx; i >= 0 && ctx.body[i].type !== C.Type.NewLine; --i) {
                if (ctx.body[i].priority === C.Type.Duration && !ctx.body[i].soundOnly) {
                    lw -= nw;
                }
                ctx.body[i].x = ctx.body[i].x + lw;
            }

            for (i = ctx.idx; i >= 0 && ctx.body[i].type !== C.Type.NewLine; --i) {
                if (ctx.body[i].type === C.Type.Barline) {
                    NewlineModel.centerWholeBarRests(ctx.body, i);
                }
            }
        }
    };

    static centerWholeBarRests(body: Array<Model>, idx: number) {
        // Whole-bar rests are centered.
        var toCenter: Array<Model> = [];
        // -2 because we want to avoid BARLINE and END_MARKER
        for (var i = idx - 2; i >= 0 && (body[i].type > C.Type.Barline || body[i].soundOnly); --i) {
            if (body[i].isRest && body[i].note.isWholebar && !body[i].soundOnly) {
                toCenter.push(body[i]);
            }
        }
        for (var j = 0; j < toCenter.length; ++j) {
            var bbox = C.SMuFL.bravuraBBoxes[(<any>toCenter[j]).restHead];
            var offset = 0;
            if (body[i].type === C.Type.TimeSignature) {
                offset += 0.7/4;
            }
            if (body[i].isNote && body[i].note.temporary) {
                continue;
            }
            toCenter[j].spacing = offset + (body[i].x + body[idx].x) / 2 -
                (bbox[0] + bbox[3]) / 2 - toCenter[j].x;
        }
    }

    static pushDownIfNeeded(ctx: Annotator.Context) {
        for (var i = 0; i < ctx._parts.length; ++i) {
            var body = ctx._parts[i].body;

            for (var l = ctx.idx; l + 1 === ctx.idx || !body[l + 1] ||
                    body[l] && body[l + 1].priority !== C.Type.NewLine; --l) {
                body[l].y += ctx.minTopPaddings[i];
                var bodyl: any = body[l];
                // Hack: Fix brace.
                if (bodyl.braceY) {
                    bodyl.braceY += ctx.minTopPaddings[i];
                    bodyl.braceY2 += ctx.minTopPaddings[i];
                }
            }
        }
        ctx.y = ctx.curr.y;
    }
}

export = NewlineModel;
