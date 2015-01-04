/**
 * Renders a simple, compound, or common time signature.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");
import _                    = require("lodash");
var    PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

import C                    = require("../stores/contracts");
import Glyph                = require("./_glyph");
import PureModelViewMixin   = require("./pureModelViewMixin");
import TimeSignatureModel   = require("../stores/timeSignature");

class TimeSignature extends TypedReact.Component<TimeSignature.IProps, {}> {
    render(): any {
        var spec = this.props.spec;
        var ts = spec.displayTimeSignature;

        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;

            if (beats === 4 && beatType === 4) {
                return <!Glyph.Component
                    x={spec.x}
                    y={spec.y}
                    fill={spec.color}
                    glyphName="timeSigCommon" />
            } else if (beats === 2 && beatType === 2) {
                return <!Glyph.Component
                    x={spec.x}
                    y={spec.y}
                    fill={spec.color}
                    glyphName="timeSigCutCommon" />;
            }
            // Cannot be represented in common representation. Pass through.
        }
        return <!g>
            <!TimeSignatureNumber.Component
                    key="-5"
                    stroke={spec.color}
                    x={spec.x + this.numOffset()}
                    y={spec.y - 10}>
                {ts.beats}
            </TimeSignatureNumber.Component>
            <!TimeSignatureNumber.Component
                    key="-6"
                    stroke={spec.color}
                    x={spec.x + this.denOffset()}
                    y={spec.y + 10}>
                {ts.beatType}
            </TimeSignatureNumber.Component>
        </g>;
    }

    numOffset() {
        // XXX: crazy hack. fix.
        var ts = this.props.spec.displayTimeSignature;
        if (ts.beats < 10 && ts.beatType >= 10) {
            return 5;
        }
        return 0;
    }
    denOffset() {
        // crazy hack. fix.
        var ts = this.props.spec.displayTimeSignature;
        if (ts.beatType < 10 && ts.beats >= 10) {
            return 5;
        }
        return 0;
    }
};

module TimeSignature {
    "use strict";
    export var Component = TypedReact.createClass(TimeSignature, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: TimeSignatureModel;
    }
}

/* private */
class TimeSignatureNumber extends TypedReact.Component<TimeSignatureNumber.IProps, {}> {
    render() {
        return <!g>
            {_.map((this.props.children + "").split(""), (c, i) => <!Glyph.Component
                key={"ts-" + i}
                x={this.props.x + i*12}
                y={this.props.y}
                fill={this.props.stroke}
                glyphName={"timeSig" + c} />)}
        </g>;
    }
}

/* private */
module TimeSignatureNumber {
    export var Component = TypedReact.createClass(TimeSignatureNumber, [PureRenderMixin]);
    export interface IProps {
        key: string;
        x: number;
        y: number;
        stroke: string;
        children?: any;
    }
}

export = TimeSignature;
