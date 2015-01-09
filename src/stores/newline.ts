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

import Model            = require("./model");

import _                = require("lodash");

import Annotator        = require("./annotator");
import AttributesModel  = require("./attributes")
import C                = require("./contracts");
import DurationModel    = require("./duration");
import NewPageModel     = require("./newpage");
import TimeSignatureMT  = require("./timeSignature");   // Cyclic
import PrintModel       = require("./print");

/**
 * A manual or automatic hint that a new line should be created. This file
 * modifies the context on each new line. It's also used to render the staff and
 * braces for everything but the first line of each page. See also begin.ts.
 */
class NewlineModel extends Model {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get type()          { return C.Type.NewLine; }
    get xPolicy()       { return C.RectifyXPolicy.Max; }

    /*---- I.2 NewlineModel ---------------------------------------------------------------------*/

    extraWidth:         number;
    braceY:             number;
    braceY2:            number;
    staveW:             number;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        /*---- Check State ------------------------------------------------------------*/
        if (ctx.prev().priority !== C.Type.Print) {
            return ctx.insertPast(new PrintModel({}, true));
        }

        // Notes should be full justified within a line.
        // This requirement should be last so that it only happens once
        // per line. We take the min of each justification to fix rounding
        // errors.
        if (ctx.maxX - ctx.x > 0.001) {
            this._justify(ctx);
            for (var i = 0; i < ctx._voices.length; ++i) {
                var body = ctx._voices[i].body;
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
        for (var i = 0; i < ctx._voices.length; ++i) {
            if (ctx._voices[i].body) {
                ++visibleStaveCount;
            }
        }

        this.braceY             = this.y;
        this.braceY2            = this.y;
        NewlineModel.explode(ctx);

        /*---- Update state -----------------------------------------------------------*/

        ctx.lines[ctx.line].y   = ctx.y;
        ctx.lines[ctx.line].x   = ctx.x;

        var print               = ctx.print;

        var systemMargins       = print.systemLayout.systemMargins;
        var pageMargins         = print.pageMarginsFor(ctx.page);
        var pageLayout          = print.pageLayout;

        ctx.fontSize            = ctx.calcFontSize();
        ctx.maxX                = pageLayout.pageWidth - systemMargins.rightMargin - pageMargins.rightMargin;
        ctx.maxY                = pageLayout.pageHeight - pageMargins.topMargin;
        ctx.x                   = systemMargins.leftMargin + pageMargins.leftMargin;

        // Pages should not overflow.
        if (ctx.y > ctx.maxY) {
            return NewPageModel.createNewPage(ctx);
        }

        ctx.lines[ctx.line]._attributes[ctx.part.id].time = ctx.attributes.time;

        ctx.line                = ctx.line + 1;

        ctx.smallest            = C.MAX_NUM;
        ctx.minBottomPaddings   = _.times(ctx._voices.length + 1, () => 0);
        ctx.minTopPaddings      = _.times(ctx._voices.length + 1, () => 0);

        this.x                  = ctx.x;
        this.staveW             = ctx.maxX - ctx.x;

        /*---- Record information for view --------------------------------------------*/

        /*
         * 8 is the padding between BeginModel and ClefModel.
         * This value should also be changed in BeginModel.
         */
        ctx.x                   = ctx.x + 8;

        var lattributes: C.MusicXML.Attributes = new AttributesModel({
            time:               ctx.attributes.time
        }, true);
        ctx.attributes = null;

        if (!ctx.lines[ctx.line]) {
            ctx.lines[ctx.line] = {
                accidentalsByStaff:     C.JSONx.clone(ctx.accidentalsByStaff),
                _attributes:            {},
                bar:                    null,
                barKeys:                null,
                barlineX:               null,
                division:               null,
                invisibleForBars:       null,
                line:                   ctx.line,
                pageLines:              null,
                pageStarts:             null,
                prevClefByStave:        {},
                voiceIdx:               ctx.voiceIdx,
                x:                      null,
                y:						null
            };
        }

        ctx.lines[ctx.line].accidentalsByStaff  = [];
        ctx.lines[ctx.line]._attributes[ctx.part.id] = {};
        ctx.lines[ctx.line].bar                 = ctx.bar;
        ctx.lines[ctx.line].barlineX            = [];
        ctx.lines[ctx.line].barKeys             = C.JSONx.clone(ctx.barKeys);
        ctx.lines[ctx.line].division            = 0;
        ctx.lines[ctx.line].x                   = ctx.x;
        ctx.lines[ctx.line].y					= ctx.y;
        ctx.lines[ctx.line].pageLines           = ctx.pageLines;
        ctx.lines[ctx.line].pageStarts          = ctx.pageStarts;

        if (ctx.score) {
            ctx.score.dangerouslyTakeSnapshot(ctx);
        }

        return C.IterationStatus.Success;
    }

    /*---- III. Util ----------------------------------------------------------------------------*/

    /**
     * Spaces things out to fill the entire page width, while maintaining
     * proportional widths.
     */
    private _justify(ctx: Annotator.Context): C.IterationStatus {
        var diff = ctx.maxX - ctx.x;
        var i: number;
        var l = 0;
        for (i = ctx.idx - 1; i >= 0; --i) {
            if (expandable(ctx.body[i])) {
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
            if (expandable(ctx.body[i])) {
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
                        if (expandable(ctx.body[i])) {
                            ++noteCount;
                        }
                    }
                    var remaining = offset;
                    for (j = i - 1; j >= 0 && ctx.body[j].priority !== C.Type.Barline; --j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (expandable(ctx.body[i])) {
                            remaining -= offset/noteCount;
                        }
                    }


                    // ADJUST SUCCEEDING BAR
                    noteCount = 0;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !==
                            C.Type.Barline; ++j) {
                        if (expandable(ctx.body[i])) {
                            ++noteCount;
                        }
                    }
                    remaining = offset;
                    for (j = i + 1; j < ctx.body.length && ctx.body[j].priority !==
                            C.Type.Barline; ++j) {
                        ctx.body[j].x = ctx.body[j].x + remaining;
                        if (expandable(ctx.body[j])) {
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

        function expandable(c: Model) {
            return c.priority === C.Type.Duration && !c.soundOnly && !(<DurationModel>c)._notes[0].grace;
        }
    }

    /*---- IV. Statics --------------------------------------------------------------------------*/

    static createNewline = (ctx: Annotator.Context): C.IterationStatus => {
        if (ctx.score) {
            ctx.score.dangerouslyMarkRendererLineDirty(ctx.line + 1);
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
    static semiJustify = (ctx: Annotator.Context, fullJustify = ctx.curr.x > ctx.maxX) => {
        var i: number;

        var n = 0;
        for (i = ctx.idx; i >= 0 && (ctx.body[i].type !==
                    C.Type.NewLine); --i) {
            if (expandable(ctx.body[i])) {
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
                if (expandable(ctx.body[i])) {
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

        function expandable(c: Model) {
            return c.priority === C.Type.Duration && !c.soundOnly && !(<DurationModel>c)._notes[0].grace;
        }
    };

    static centerWholeBarRests(body: Array<Model>, idx: number) {
        // Whole-bar rests are centered.
        var toCenter: Array<Model> = [];
        // -2 because we want to avoid BARLINE and END_MARKER
        for (var i = idx - 2; i >= 0 && (body[i].priority > C.Type.Barline && body[i].priority !== C.Type.Begin || body[i].soundOnly); --i) {
            if (body[i].isRest && body[i].note.isWholebar && !body[i].soundOnly) {
                toCenter.push(body[i]);
            }
        }
        if (!toCenter.length) {
            return;
        }
        var offsetX = 0;
        for (var j = i; body[j] && body[j].priority > C.Type.START_OF_ATTRIBUTES &&
                    body[j].priority !== C.Type.Barline &&
                    body[j].priority !== C.Type.Begin; --j) {
            if (body[j].type === C.Type.TimeSignature) {
                offsetX -= (<TimeSignatureMT>body[j])._annotatedSpacing - 6.5;
            }
        }
        if (body[i].type !== C.Type.Barline) {
            ++i;
        }
        for (var j = 0; j < toCenter.length; ++j) {
            var bbox = C.SMuFL.bravuraBBoxes[(<any>toCenter[j]).restHead];
            var offset = 0;
            if (body[i].isNote && body[i].note.temporary) {
                continue;
            }
            toCenter[j].spacing = (body[idx].x + body[i].x) / 2 - toCenter[j].x - 10*(bbox[0] - bbox[2])/2 + offsetX - 6.5;
        }
    }

    /**
     * Adjusts the vertical positions of all staves & voices.
     */
    static explode(ctx: Annotator.Context) {
        var veryBottomPadding = 0;
        var braces: {braceY2: number}[] = [];
        _.forEach(ctx.score.parts, part => {
            _.times(part.staveCount, staff => {
                staff += 1;
                var extraTopPadding = (staff - 1)*50;
                extraTopPadding += ctx.minTopPaddings[staff];
                _.chain(part.containsVoice)
                    .keys()
                    .map(k => parseInt(k, 10))
                    .sort()
                    .map(voiceIdx => ctx._voices[voiceIdx].body)
                    .map(body => {
                        // Remove everything that's not in the current line.
                        var line = ctx.line;
                        return _.filter(body, model => {
                            if (model.type === C.Type.NewLine) {
                                --line;
                                return !line || !~line;
                            }
                            return !line;
                        });
                    })
                    .map((body, sidx) =>
                        _.filter(body, model => model.staff === staff ||
                            model.staff === -1 && staff === sidx + 1))
                    .flatten(true)
                    .forEach((model: Model) => {
                            model.y += extraTopPadding;
                            var brace = <any> model
                            if (brace.braceY) {
                                brace.braceY = model.y;
                                braces.push(brace);
                                _.forEach(braces, brace => {
                                    brace.braceY2 = model.y;
                                });
                            }
                        })
                    .value();
                extraTopPadding += ctx.minBottomPaddings[staff];
                veryBottomPadding = ctx.minBottomPaddings[staff];
            });
        });

        veryBottomPadding = Math.max(C.getPrint(ctx._layout.header).systemLayout.systemDistance, veryBottomPadding);
        (<NewlineModel>ctx.curr).braceY2 += veryBottomPadding;
        ctx.y = ctx.curr.y + veryBottomPadding;
        (<NewlineModel>ctx.curr).y = ctx.y;
    }
}

export = NewlineModel;
