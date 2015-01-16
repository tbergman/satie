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

import React            = require("react");
import TypedReact       = require("typed-react");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Annotator        = require("./stores/annotator");
import C                = require("./stores/contracts");
import Dispatcher       = require("./stores/dispatcher");
import Renderer         = require("./renderer/renderer");
import ScoreStore       = require("./stores/scoreStore");

export var MusicXML = C.MusicXML;

/*---- Public Interface -------------------------------------------------------------------------*/

/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
export function init(options: ISatieOptions): void {
    "use strict";
    invariant(!BrowserSetup.cssInjected, "initSatie must be called before any Satie component is mounted " +
        "and must only be called once");
    BrowserSetup.injectStyles(options);
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

export function toSVG(musicXML: C.MusicXML.ScoreTimewise, onSuccess: (svg: string) => void, onError: (err: any) => void) {
    "use strict";
    invariant(_.isFunction(onSuccess),
        "If a tree falls in a forest and no one is around to hear it, does it make a sound? " +
        "(Satie.toSVG is asynchronous and expects a callback function)");

    var dispatcher = new Dispatcher;
    var score = new ScoreStore(dispatcher);
    dispatcher.PUT("/webapp/song/mxmlJSON", musicXML, handleSuccess, onError);

    function handleSuccess() {
        var props = {
            context: score.finalCtx,
            raw: true,
            parts: score.parts,
            voices: score.voices,
            header: score.header,
            editMode: false
        };
        try {
            onSuccess("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>" +
                React.renderToStaticMarkup(React.createElement(Renderer.Component, props))
                    .replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" ")
                        .replace(/class="mn_"/g, "font-family='bravura'")
                        .replace(/class="tn_"/g, "font-family='Alegreya'")
                        .replace(/class="mmn_"/g, "font-family='Alegreya' " +
                                 "font-style='italic' stroke='#7a7a7a'")
                        .replace(/class="bn_"/g, "font-family='Alegreya' " +
                                 "font-style='italic' text-anchor='end' stroke='#7a7a7a'")
            );
        } catch(err) {
            onError(err);
        }
    }
}

/*---- Private ----------------------------------------------------------------------------------*/

module BrowserSetup {
    "use strict";
    export var cssInjected = false;

    export function injectStyles(spec: ISatieOptions = {}): void {
        "use strict";
        // Only run this function once.
        if (cssInjected) {
            return;
        }
        cssInjected = true;
        if (typeof window === "undefined") {
            return;
        }

        if (spec.useGoogleFonts !== false) {
            (<any>window).WebFontConfig = {
                google: { families: ["Alegreya:400italic,700italic,900italic,400,700:latin", "Alegreya+SC:700,400:latin"] }
            };
            var protocol = "https:" === document.location.protocol ? "https" : "http";
            var wf = document.createElement("script");
            wf.src = protocol +
                "://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js";
            wf.type = "text/javascript";
            wf.async = true;

            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(wf, s);
        }

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
}

class MusicXMLViewSpec extends TypedReact.Component<ISatieProps, ISatieState> {
    render(): any {
        var body: any;

        if (this.state.error) {
            body = React.createElement("div", null, this.state.error.split("\n").map(
                (v: string, k: any) => React.createElement("div", {key: k}, v || "\u00a0")));
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
                height:     this.props.height,
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
        BrowserSetup.injectStyles();
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

function validateURL(url: string) {
    "use strict";
    return re_weburl.test(url);
}

//
// Regular Expression for URL validation
//
// Author: Diego Perini
// Updated: 2010/12/05
// License: MIT
//
// Copyright (c) 2010-2013 Diego Perini (http://www.iport.it)
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
var re_weburl = new RegExp(
  "^" +
    // protocol identifier
    "(?:(?:https?|ftp)://)" +
    // user:pass authentication
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
      // IP address exclusion
      // private & local networks
      "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
      "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
      "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
      // IP address dotted notation octets
      // excludes loopback network 0.0.0.0
      // excludes reserved space >= 224.0.0.0
      // excludes network & broacast addresses
      // (first & last IP address of each class)
      "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
      "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
      "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
      // host name
      "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
      // domain name
      "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
      // TLD identifier
      "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))?" +
    ")" +
    // port number
    "(?::\\d{2,5})?" +
    // resource path
    "(?:/\\S*)?" +
  "$", "i"
);
