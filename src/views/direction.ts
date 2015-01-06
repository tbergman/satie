/**
 * Renders a MusicXML direction.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");

import C                    = require("../stores/contracts");
import DirectionModel       = require("../stores/direction");
import PureModelViewMixin   = require("./pureModelViewMixin");

class Direction extends TypedReact.Component<Direction.IProps, {}> {
    render(): any {
        return <!g />;
    }
};

module Direction {
    "use strict";
    export var Component = TypedReact.createClass(Direction, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: DirectionModel;
    }
}

export = Direction;
