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
import invariant        = require("react/lib/invariant");

import Annotator        = require("./stores/annotator");
import BeginModel   	= require("./stores/begin");
import C            	= require("./stores/contracts");
import Dispatcher   	= require("./stores/dispatcher");
import Instruments  	= require("./stores/instruments");
import Model        	= require("./stores/model");
import Renderer     	= require("./renderer/renderer");
import ScoreStore   	= require("./stores/scoreStore");

/*---- Public Interface -------------------------------------------------------------------------*/

/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
export function init(options: ISatieOptions) {
    invariant(!cssInjected, "initSatie must be called before any Satie component is mounted " +
        "and must only be called once");
    injectStyles(options);
}

/**
 * Options for initSatie. All options have defaults.
 */
export interface ISatieOptions {
    /**
     * Absolute URL of Bravura font, including protocol. By default, Bravura is loaded from Rawgit's CDN.
     * If you are using Satie in production, you should host Bravura yourself (otherwise you are relying on
     * Rawgit's uptime, which has no guarantee).
     *
     * Set to "none" if Satie should not load Bravura at all. This is useful if you are also using Bravura
     * outside of Satie.
     * 
     * Default: location.protocol + "//cdn.rawgit.com/ripieno/satie/724fa96260b40e455e9e5217e226825066ba8312/" +
     *          "res/bravura.woff"
     *
     * Server behavior: This value is ignored on the server.
     */
    bravuraURL?: string;

    /**
     * Download fonts from Google Fonts as needed. Currently, just Alegreya is downloaded.
     * In future versions, other fonts defined in sheet music will also be downloaded.
     *
     * Default: true
     * 
     * Server behavior: This value is ignored on the server.
     */
    useGoogleFonts?: boolean;
}

/**
 * React component which renders MusicXML. For props, see ISatieProps.
 * 
 * @example
 * // Renders the XML in variable `xml`.
 * var React = require("react");
 * var Satie = require("satie");
 * 
 * var xml = ...your song goes here...;
 * var score = Satie.MusicXML.parseXML(xml);
 * React.render(
 *    <Satie.MusicXMLView
 *        musicXML={score}
 *        width={780}
 *        height={1280} />,
 *    document.body);
 */
export var MusicXMLView: React.ComponentClass<ISatieProps>;

/**
 * Props of MusicXMLView.
 */
export interface ISatieProps {
    /**
     * MXMLJSON structure returned from Satie.MusicXML.parseXML or musicxml-interfaces.
     */
    musicXML: C.MusicXML.ScoreTimewise;

    /**
     * Width of component in pixels. The score will be scaled to fit within the width.
     */
    width: number;

    /**
     * Height of component in pixels. A scrollbar will be used if the score does not
     * fit within this height.
     */
    height: number;
}

/*---- Private ----------------------------------------------------------------------------------*/

var cssInjected = false;

function injectStyles(spec: ISatieOptions = {}) {
    // Only run this function once.
    if (cssInjected) {
        return;
    }
    cssInjected = true;
    if (typeof window === "undefined") {
        return;
    }

    if (spec.useGoogleFonts) {
        (<any>window).WebFontConfig = {
            google: { families: ['Alegreya:400italic,700italic,900italic,400,700:latin', 'Alegreya+SC:700,400:latin'] }
        };
        var protocol = 'https:' === document.location.protocol ? 'https' : 'http';
        var wf = document.createElement('script');
        wf.src = protocol +
            '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
        wf.type = 'text/javascript';
        wf.async = true;
    }

    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
	var style = document.createElement("style");
	style.appendChild(document.createTextNode("")); // WebKit hack
	document.head.appendChild(style);

    var bravuraFontFace: string;
    if (spec.bravuraURL === "none") {
        bravuraFontFace = "";
    } else {
        invariant(!spec.bravuraURL || validateURL(spec.bravuraURL),
            "The bravuraURL must be undefined, a valid URL with protocol, or \"none\", but is \"%s\".", spec.bravuraURL);
        var bravuraURL = spec.bravuraURL ||
            (protocol + "://cdn.rawgit.com/ripieno/satie/724fa96260b40e455e9e5217e226825066ba8312/res/bravura.woff");
        bravuraFontFace = "@font-face {"+
    	    "font-family: 'bravura';"+
    		"src: url('" + bravuraURL + "') format('woff');"+
    		"font-weight: normal;"+
    		"font-style: normal;"+
    	"}";
    }

    style.innerHTML =
        bravuraFontFace +
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
        injectStyles();
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

    componentWillUnmount() {
        this.state.score.removeListener(C.EventType.Annotate, this._updateFromStore);
        this.state.score.destructor();
    }

    private _onError(err: any) {
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

MusicXMLView = TypedReact.createClass(MusicXMLViewSpec);

function validateURL(url: string){
    return /^http:\/\/\w+(\.\w+)*(:[0-9]+)?\/?(\/[.\w]*)*$/i.test(url);
} 