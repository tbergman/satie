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

import Header = require("./header");

import Bootstrap = require("react-bootstrap");
import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");
import assert = require("assert");

class About extends TypedReact.Component<{}, {}> {
    render(): any {
        return <!div className="pageContent">

            <!h3>Satie renders and plays <!a href="http://musicxml.com">MusicXML</a> in realtime.</h3>
            <!Bootstrap.Well>
                <!div><!a href="javascript:void(0)">Embed your own song »</a></div>
                <!div><!a href="javascript:void(0)">Edit in realtime »</a></div>
            </Bootstrap.Well>
            Satie is a music engraver written in TypeScript that runs in modern browsers and on Node.js.
            You can use it to embed sheet music in a webpage or application, or
            on a server to convert MusicXML to images (SVG) and audio (MP3).
            Satie is an open-source component of <!a href="https://ripieno.io">Ripieno.io</a>,
            an online collaborative scorewritter.

            <!h3>Status</h3>
            Satie is currently in alpha, so not all or even most of MusicXML is supported.

            <!h3>Browser Support</h3>
            Satie targets SVG and either Web Audio or Flash. This means that
            Satie supports all major browsers natively, with the exception of Internet Explorer 8 and earlier.
            Playback is available in browsers except for the stock Android browser and
            Internet Explorer 8 and earlier.
            <!br/><!br/>
            If you need to support stock Android, old versions of Internet Explorer, and/or browsers without
            JavaScript, use Satie's free iframe API service, which provides static image and
            audio fallbacks.
            <!br />

            <!h3>License</h3>
            Satie is licensed under the GNU Affero General Public License v3.
            Applications, including web applications and ASPs, that incorporate or extend Satie
            must be licensed under a compatible license.
            <!h3><!a href="javascript:void(0)">Continue »</a></h3>
            <!br /> <!br /> <!br /> <!br />
        </div>
    }
}

module About {
    export var Component = TypedReact.createClass(About);
}

export = About;
