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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");
var $                       = React.createFactory;

import Credit               = require("./credit");
import Engine               = require("../models/engine");
import StaveLines           = require("./staveLines");
import ModelView            = require("./modelView");

class Page extends React.Component<Page.IProps, Page.IState> {
    render() {

        /*--- General ---------------------------------------------*/

        const print         = this.props.print;
        const page          = print.pageNumber;
        const pageNum       = parseInt(page, 10);
        invariant(!!page, "Page isn't valid!");
        const defaults      = this.props.scoreHeader.defaults;
        const credits       = _.filter(this.props.scoreHeader.credits, cr =>
                                (cr.page === parseInt(page, 10)));
        const scale40       = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        const widthMM       = this.props.renderTarget === Page.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageWidth) + "mm" :
                                "100%";
        const heightMM      = this.props.renderTarget === Page.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageHeight) + "mm" :
                                "100%";

        const lineLayouts   = this.props.lineLayouts;

        const pageMarginsAll    = print.pageLayout.pageMargins;
        const pageMargins       = Engine.IPrint.getPageMargins(pageMarginsAll, pageNum);
        let systemMargins       = print.systemLayout.systemMargins;

        let y                   = print.pageLayout.pageHeight - (
                                    print.systemLayout.topSystemDistance +
                                    pageMargins.topMargin);
        let nextPaddingBottom   = 0;
        let staveTops           = _.map(lineLayouts, (measureLayouts, idx) => {
            let paddingTop      = _.max(measureLayouts, mre => mre.paddingTop).paddingTop;
            y                   = y + nextPaddingBottom + paddingTop;
            let top             = y;
            nextPaddingBottom   = _.max(measureLayouts, mre => mre.paddingBottom).paddingBottom;
            return top;
        });

        /*--- Staves ----------------------------------------------*/

        // TODO: Move to Engine & IModel, generalize
        let staveLefts          = _.map(lineLayouts, () => {
            return systemMargins.leftMargin + pageMargins.leftMargin;
        });

        let staveRights         = _.map(lineLayouts, () => {
            return systemMargins.rightMargin + pageMargins.rightMargin;
        });

        let staveLineProps      = _.map(_.zip(staveTops, staveLefts, staveRights), (d, i) => {
            return {
                key:    "stave_" + i,

                lines:  5,
                width:  print.pageLayout.pageWidth - d[2 /* right */] - d[1 /* left */],
                x:      d[1 /* left */],
                y:      d[0 /* top */]
            };
        });

        /*--- Credits ---------------------------------------------*/

        // Make sure our credits are keyed.
        _.forEach(credits, credit => Engine.key$(credit));

        /*--- Models ----------------------------------------------*/

        let layouts = <Engine.IModel.ILayout[]>
            _.flatten(_.map(lineLayouts, (measureLayouts, lineIdx) =>
                _.flatten(_.flatten(
                    _.map(measureLayouts, measure =>
                        _.map(_.flatten(measure.elements), (layout: Engine.IModel.ILayout) => {
                            Engine.key$(layout);
                            layout.y$ = staveLineProps[lineIdx].y; // TODO Move to Engine.
                            return layout;
                        })
                    )
                ))
            ));

        layouts = layouts.filter(l => !!l.model);   // Remove helpers.

        /*--- Render ----------------------------------------------*/

        return React.DOM.svg(
            {
                "data-page":    this.props.renderTarget === Page.RenderTarget.SvgExport ? undefined : print.pageNumber,
                ref:            "svg" + print.pageNumber,

                height:         heightMM,
                width:          widthMM,
                viewBox:        `0 0 ${print.pageLayout.pageWidth} ${print.pageLayout.pageHeight}`,

                onClick:        this.props.onClick,
                onMouseDown:    this.props.onMouseDown,
                onMouseLeave:   this.props.onMouseLeave,
                onMouseMove:    this.props.onMouseMove,
                onMouseUp:      this.props.onMouseUp
            },
            _.map(credits, (credit, idx) => $(Credit)(credit)),
            _.map(staveLineProps, staveLineProps => $(StaveLines)(staveLineProps)),
            _.map(layouts, layout => $(ModelView)({layout: layout, key: (<any>layout).key}))
            /* TODO: lyric boxes */
            /* TODO: free boxes */
            /* TODO: slurs and ties */
        );
    }

    getChildContext() {
        const defaults      = this.props.scoreHeader.defaults;
        const print         = this.props.print;
        const scale40       = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        return {
            scale40:        scale40,
            pageHeight:     print.pageLayout.pageHeight
        };
    }
}

module Page {
    export var childContextTypes = <any> {
        scale40:            React.PropTypes.number.isRequired,
        pageHeight:         React.PropTypes.number.isRequired
    };

    export interface IProps {
        scoreHeader:    MusicXML.ScoreHeader;
        print:          MusicXML.Print;
        lineLayouts:    Engine.Options.ILineLayoutResult[];
        renderTarget:   RenderTarget;

        onClick?:       (evt: React.MouseEvent) => void;
        onMouseDown?:   (evt: React.MouseEvent) => void;
        onMouseLeave?:  (evt: React.MouseEvent) => void;
        onMouseMove?:   (evt: React.MouseEvent) => void;
        onMouseUp?:     (evt: React.MouseEvent) => void;
    }
    export interface IState {
    }
    export enum RenderTarget {
        SvgWeb = 0,
        SvgExport = 1
    }
}

export = Page;