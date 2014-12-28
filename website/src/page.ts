/** 
 * Copyright (C) 2015 Josh Netterfield
 * Part of the ripieno-musicxml project, a MusicXML to SVG converter.
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

/* tslint:disable */

import About        = require("./about");
import Header       = require("./header");
import Start        = require("./start");
import Spec         = require("./spec");
import Playground   = require("./playground");

import Bootstrap    = require("react-bootstrap");
import React        = require("react");
import TypedReact   = require("typed-react");
import _            = require("lodash");
import assert       = require("assert");

class Page extends TypedReact.Component<Header.IProps, IState> {
    render(): any {
        return <!div className="main">
            <!Header.Component key="header" selectedKey={this.state.pageKey} onSelect={this.handlePageSelect}/>
            {this.state.pageKey === "about" && <!About.Component key="about" />}
            {this.state.pageKey === "start" && <!Start.Component key="start" />}
            {this.state.pageKey === "playground" && <!Playground.Component key="playground" />}
            {this.state.pageKey === "spec" && <!Spec.Component key="spec" />}
            <!div style={{width: "100%", textAlign: "center"}}>
                {"\u00a9"} <!a href="https://nettek.ca"> Josh Netterfield </a> 2015.
                Some rights reserved.<!br />

                Contribute on <!a href="https://github.com/ripieno/ripieno-musicxml"> Github</a>.
                <!div style={{height: 10}} />
            </div>
        </div>;
    }

    getInitialState(): IState {
        return {
            pageKey: "playground"
        };
    }

    handlePageSelect(key: string) {
        this.setState({
            pageKey: key
        });
    }
}

interface IState {
    pageKey?: string;
}

module Page {
    export var Component = TypedReact.createClass(Page);
    export interface IProps {
    }
}

export = Page;
