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

class About extends TypedReact.Component<{}, IState> {
    render(): any {
        return <!div className="pageContent">
            There are two ways to use Satie.
            <!h3>Easy option: iframe API</h3>
            You can use Ripieno's embed service to easily share your MusicXML songs. Just set the desired
            parameters, and copy-paste the resulting HTML to your webpage. By using this service, you give
            Ripieno the right to host and modify the song. If you can't do that, see the React Component option.
            You should use this option if you need fallbacks for older browsers (see "About").<!br /><!br />
            <!div style={{padding: 20, backgroundColor: "#eef", borderBottom: "1px solid black"}}>
            <!form className="form-horizontal">
            <!Bootstrap.Input type="text" label="URL of song" labelClassName="col-xs-2" wrapperClassName="col-xs-10" value={this.state.uri} onChange={this.handleURIChange} />
            <!Bootstrap.Input type="checkbox" label="Indexable" wrapperClassName="col-xs-offset-2 col-xs-10" help="If this is set, the song will be added to Ripieno's search and directory. Set this to help people find your sheet music." checked={this.state.indexable} onChange={this.handleIndexableCheck} />
            <!Bootstrap.Input type="checkbox" label="Downloadable, Printable, and Copyable" wrapperClassName="col-xs-offset-2 col-xs-10" help="If this set, people will be able to download, print, and create copies of this song." checked={this.state.copyable} onChange={this.handleCopyCheck} />
            </form>
            </div>
            <!div style={{padding: 20, backgroundColor: "#eee"}}>
                <!div style={{textAlign: "center", width: "100%"}}>
                    Change the above values to see a preview here.
                </div><!br/><!br/>
                Copy and paste this code:
            <!Bootstrap.Well style={{fontFamily: "monospace"}} >
            {"<iframe"}<!br />
            {"\u00a0\u00a0\u00a0\u00a0width=\"600\""}<!br />
            {"\u00a0\u00a0\u00a0\u00a0height=\"1280\""}<!br />
            {"\u00a0\u00a0\u00a0\u00a0src=\"https://ripieno.io/api/v0/musicXML/embed?src=" + encodeURIComponent(this.state.uri) + "&indexable=" + (this.state.indexable ? "true": "false") + "&copyable=" + (this.state.copyable ? "true" : "false") + "\""}<!br />
            {"\u00a0\u00a0\u00a0\u00a0frameborder=\"0\">"}<!br />
            {"</iframe>"}
            </Bootstrap.Well>
            </div>

            <!h3>Harder option: React Component</h3>
            <!div style={{padding: 20, fontFamily: "monospace", backgroundColor: "#eee"}}>
            npm install -g satie
            </div>
            <!h3><!a href="javascript:void(0)">Continue »</a></h3>
            <!br /> <!br /> <!br /> <!br />
        </div>
    }

    handleURIChange(ev: React.SyntheticEvent) {
        this.setState({
            uri: (<any>ev.currentTarget).value
        });
    }

    handleIndexableCheck() {
        this.setState({
            indexable: !this.state.indexable
        });
    }

    handleCopyCheck() {
        this.setState({
            copyable: !this.state.copyable
        });
    }

    getInitialState() {
        return {
            uri: "http://url.to/music.xml",
            indexable: true,
            copyable: true
        };
    }
}

interface IState {
    uri?: string;
    indexable?: boolean;
    copyable?: boolean;
}

module About {
    export var Component = TypedReact.createClass(About);
}

export = About;
