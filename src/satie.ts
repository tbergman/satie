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

/// <reference path="../typings/tsd.d.ts" />

export import MusicXML  = require("musicxml-interfaces");
import React            = require("react");
import TypedReact   	= require("typed-react");
import _            	= require("lodash");
import assert       	= require("assert");

import Annotator        = require("./stores/annotator");
import BeginModel   	= require("./stores/begin");
import C            	= require("./stores/contracts");
import Dispatcher   	= require("./stores/dispatcher");
import Instruments  	= require("./stores/instruments");
import Model        	= require("./stores/model");
import Renderer     	= require("./renderer/renderer");
import ScoreStore   	= require("./stores/scoreStore");

class MusicXMLViewSpec extends TypedReact.Component<ISatieProps, ISatieState> {
    render(): any {
        var body: any;

        if (this.state.error) {
            body = React.createElement("div", null, this.state.error.split("\n").map(
                (v, k) => React.createElement("div", {key: k}, v || "\u00a0")));
        } else if (!this.state.context) {
            body = React.createElement("div", null, "Loading...");
        } else {
            body = React.createElement(Renderer.Component, {
                context: this.state.context,
                dispatcher: this.state.dispatcher,
                parts: this.state.score.parts,
                voices: this.state.score.voices,
                header: this.state.score.header,
                editMode: false,
                width: this.props.width,
                height: this.props.width, // Ensures entire width is used.
                top: 0,
                store: this.state.score
            });
        }
        return React.createElement("div", {
            style: {
                width:      this.props.width,
                height: 	this.props.height,
                overflowY:  "scroll",
                overflowX:  "hidden",
                border:     "1px solid #eee",
                position:   "relative"
            }},
            body
        );
    }

    getInitialState(): ISatieState {
        var dispatcher = new Dispatcher;
        var score = new ScoreStore(dispatcher);
        score.addListener(C.EventType.Annotate, this._updateFromStore);

        return {
            dispatcher: dispatcher,
            score: score
        };
    }

    componentWillMount() {
        injectCSS();
    }

    componentDidMount() {
        this.state.dispatcher.PUT("/webapp/song/mxmlJSON", this.props.musicXML, null, this._onError);
    }

    componentDidUpdate(prevProps: ISatieProps) {
        if (prevProps.musicXML !== this.props.musicXML) {
            this.setState({
                error: null,
                context: null
            });
            this.state.dispatcher.PUT("/webapp/song/mxmlJSON", this.props.musicXML, null, this._onError);
        }
    }

    _onError(err: any) {
        if (typeof err.toString === "function") {
            console.warn(err.toString());
            this.setState({
                error: err.toString()
            });
        } else {
            console.warn("Unknown error.");
            this.setState({
                error: "Unknown error."
            });
            console.warn(err);
            throw err;
        }
    }

    componentWillUnmount() {
        this.state.score.removeListener(C.EventType.Annotate, this._updateFromStore);
        this.state.score.destructor();
    }

    private _updateFromStore() {
        this.setState({
            error: null,
            context: this.state.score.finalCtx
        });
    }
}

interface ISatieState {
    context?: Annotator.Context;
    score?: ScoreStore;
    dispatcher?: C.IDispatcher;
    error?: string;
}

var cssInjected = false;
function injectCSS() {
    if (cssInjected || typeof window === "undefined") {
        return;
    }
    cssInjected = true;

	var style = document.createElement("style");
	style.appendChild(document.createTextNode("")); // WebKit hack
	document.head.appendChild(style);

    style.innerHTML =
        "@font-face {"+
    	    "font-family: 'bravura';"+
    		"src: url('/res/bravura.woff') format('woff');"+
    		"font-weight: normal;"+
    		"font-style: normal;"+
    	"}"+
    	".mn_ {"+
    	    "-moz-user-select: none;"+
    		"-ms-user-select: none;"+
    		"-webkit-touch-callout: none;"+
    		"-webkit-user-select: none;"+
    		"cursor: default;"+
    		"font-family: 'bravura';"+
    		"user-select: none;"+
    		"pointer-events: none;"+
    		"text-rendering: optimizeSpeed;"+
    	"}" +
        ".mmn_ {"+
            "font-family: 'Alegreya';" +
            "font-style: italic;" +
            "text-anchor: middle;" +
            "stroke: #7a7a7a;" +
        "}" +
        ".bn_ {"+
            "font-family: 'Alegreya';" +
            "font-style: italic;" +
            "text-anchor: end;" +
            "stroke: #7a7a7a;" +
        "}";
}

export interface ISatieProps {
    musicXML: C.MusicXML.ScoreTimewise;
    width: number;
    height: number;
}

export var MusicXMLView = TypedReact.createClass(MusicXMLViewSpec);

