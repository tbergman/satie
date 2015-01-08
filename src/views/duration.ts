/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");
import _                    = require("lodash");
import assert               = require("assert");

import C                    = require("../stores/contracts");
import DurationModel        = require("../stores/duration");
import Note                 = require("./_note");
import NoteNotation         = require("./_noteNotation");
import PureModelViewMixin   = require("./pureModelViewMixin");
import Rest                 = require("./_rest");
import UnbeamedTuplet       = require("./_unbeamedTuplet");

/**
 * This is a pseudo-component to maintain compatibility with
 * GroupBridgeView. At some point, GroupBridgeView should be
 * rewritten so we can enjoy the full performance benefits
 * of components here.
 */
class Duration extends TypedReact.Component<Duration.IProps, {}> {
    render(): React.ReactElement<any> {
        var props = this.props;
        var spec = props.spec;
        assert(spec instanceof DurationModel);

        var notations: any[] = spec.continuingNotations.map(this._mapContinuingNotation).filter(n => !!n);
        // _.map(spec.displayNotations || [], (m, idx) =>
        //     <!NoteNotation.Component
        //         idx={1}
        //         direction={props.direction}
        //         notation={m}
        //         key={idx}
        //         line={3}
        //         notehead={props.spec.noteheadGlyph}
        //         x={NaN /*assigned later :( */}
        //         y={NaN /*assigned later :( */} />);

        /**
         * Mode to reduce unneeded renders.
         */
        var zeroOffsetMode = !C.renderUtil.useGL && !spec.isRest &&
            !_.any(spec.tieds, t => t && t.type !== C.MusicXML.StartStopContinue.Stop);

        var lyKey = 0;
        var lyrics = _.chain(spec._notes)
                        .map(n => n.lyrics)
                        .filter(l => !!l)
                        .flatten(true)
                        .filter((l: C.MusicXML.Lyric) => !!l)
                        .map((l: C.MusicXML.Lyric) => {
                            var text: any[] = [];
                            var currSyllabic = C.MusicXML.SyllabicType.Single;
                            for (var i = 0; i < l.lyricParts.length; ++i) {
                                switch(l.lyricParts[i]._class) {
                                    case "Syllabic":
                                        var syllabic = <C.MusicXML.Syllabic> l.lyricParts[i];
                                        currSyllabic = syllabic.data;
                                        break;
                                    case "Text":
                                        var textPt = <C.MusicXML.Text> l.lyricParts[i];
                                        var width = C.SMuFL.bravuraBBoxes[props.spec.noteheadGlyph][0]*10;
                                        text.push(<!text
                                                textAnchor="middle"
                                                fontSize={textPt.fontSize || "22"}
                                                key={++lyKey}
                                                x={width/2 + (zeroOffsetMode ? 0 : spec.x)}
                                                y={60      + (zeroOffsetMode ? 0 : spec.y)}>
                                            {textPt.data}
                                        </text>);
                                }
                            };
                            return text;
                        })
                        .flatten()
                        .value();

        var dotOffset = C.SMuFL.bravuraBBoxes[props.spec.noteheadGlyph || spec.restHead][0]*10 + 6;

        if (spec.isRest) {
            return <!Rest.Component
                    dotOffset={dotOffset}
                    dotted={spec.displayDots}
                    line={spec.lines}
                    key={spec.key}
                    isNote={true /* In this context, we mean not a wrapper. */}
                    notehead={spec.restHead}
                    multiRest={spec.multiRest}
                    spacing={spec.spacing}
                    stroke={spec.color}
                    x={spec.x}
                    y={spec.y}>
                {notations}
            </Rest.Component>;
        }

        var note = <!Note.Component
                    accidentals={spec._displayedAccidentals}
                    accStrokes={spec.accStrokes}
                    direction={this.props.direction || spec.direction}
                    dotOffset={dotOffset}
                    dotted={spec.displayDots}
                    flag={spec.flag}
                    hasStem={spec.hasStem}
                    isNote={true}
                    key={spec.key}
                    lyrics={lyrics}
                    line={spec.lines}
                    notehead={spec.noteheadGlyph}
                    secondaryStroke={spec.color}
                    stemHeight={this.props.stemHeight}
                    strokes={spec.strokes}
                    tieTo={spec.tieTo && spec.tieTo.x}
                    x={zeroOffsetMode ? 0 : spec.x}
                    y={zeroOffsetMode ? 0 : spec.y}>
                {notations}
            </Note.Component>

        if (zeroOffsetMode) {
            return <!g
                    key={<any> spec.key /* numeric keys are okay */}
                    x={spec.x /* for beam */}
                    y={spec.y /* for beam */}
                    transform={"translate(" + spec.x + "," + spec.y + ")"}>
                {note}
            </g>
        } else {
            return note;
        }
    }

    private _mapContinuingNotation(m: DurationModel.IContinuingNotation, idx: number): any {
        switch (m.type) {
            case "tuplet":
                return React.createElement(UnbeamedTuplet.Component, <UnbeamedTuplet.IProps> {
                    key: "cn_" + idx,
                    direction: this.props.spec.direction,
                    line1: m.body[0].lines[0], // FIX 
                    line2: m.body[1].lines[1], // FIX
                    stemWidth: 0,
                    stroke: "black",
                    tuplet: m.notation,
                    tupletsTemporary: null,
                    width:m.body[1].x - m.body[0].x,
                    x: m.body[1].x,
                    y: m.body[0].y
                });
            default:
                assert(false, "Not implemented");
        }
    }
}

module Duration {
    export var Component = TypedReact.createClass(Duration, [PureModelViewMixin]);
    export interface IProps {
        key: number;
        spec: DurationModel;
        direction: number;
        stemHeight: number;
    }
}

export = Duration;
