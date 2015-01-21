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

/**
 * @file engine/measure.ts Structures for a measure
 */

"use strict";

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");

import IModel           = require("./imodel"); // @circular
import Util             = require("./util");

/**
 * Based on MusicXML.Measure, but with additional information, and with a staff/voice-seperated and
 * monotonic parts element.
 */
export interface IMutableMeasure {
    idx:             number; // 0-indexed, can change
    uuid:            number;
    number:          string; // 1-indexed
    implicit?:       boolean;
    width?:          number;
    nonControlling?: boolean;
    parts: {
        [x: string]: IMeasurePart;
    };
}

export interface IMeasurePart {
    voices:          ISegmentRef[];
    staves:          ISegmentRef[];
}

export interface ISegment {
    models:          IModel[];
}

export interface IStaffSegment extends ISegment {
    attributes:      MusicXML.Attributes;
    models:          IModel[];
}

export interface IVoiceSegment extends ISegment {
    divisions:       number;
    models:          IModel[];
}

export interface ISegmentRef {
    staffSegment?:   IStaffSegment;
    voiceSegment?:   IVoiceSegment;

    /** 
     * The index of the owner staff or voice.
     */
    owner:           number;
}

/** 
 * Given a set of segments, scales divisions so that they are compatible.
 */
export function normalizeDivisons$(segments$: ISegmentRef[], factor: number = 0) {
    var divisions = _.reduce(segments$, (divisions, segment) =>
            Util.lcm(
                divisions,
                segment.staffSegment ?
                    segment.staffSegment.attributes.divisions :
                    segment.voiceSegment.divisions
            ),
        factor);

    _.forEach(segments$, segment => {
        var ratio = 1;
        if (segment.staffSegment) {
            ratio = divisions / segment.staffSegment.attributes.divisions;
        } else {
            ratio = divisions / segment.voiceSegment.divisions;
        }

        if (ratio !== 1) {
            if (segment.staffSegment) {
                segment.staffSegment.attributes.divisions *= ratio;
            } else {
                segment.voiceSegment.divisions *= ratio;
            }
            _.forEach((<any> segment.staffSegment || segment.voiceSegment).models, (model: IModel) => {
                if (model.divCount) {
                    model.divCount *= ratio;
                }
            });
        }
    });
};

export interface IMeasureLayout {
    elements:        IModel.ILayout[][];
    width:           number;
    paddingTop:      number;
    paddingBottom:   number;
}

export module IMeasureLayout {
    function replacer(key: string, value: any) {
        return key === "elements" ? undefined: value;
    }
    export function detach(layout: IMeasureLayout) {
        var clone: IMeasureLayout = JSON.parse(JSON.stringify(layout, replacer));
        clone.elements = _.map(layout.elements, v => _.map(v, IModel.ILayout.detach));
        return clone;
    };
}
