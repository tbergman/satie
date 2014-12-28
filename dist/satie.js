var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var C = require("./stores/contracts");
var Dispatcher = require("./stores/dispatcher");
var Renderer = require("./renderer/renderer");
var SongEditor = require("./stores/songEditor");
exports.MusicXML = require("musicxml-interfaces");
var Satie = (function (_super) {
    __extends(Satie, _super);
    function Satie() {
        _super.apply(this, arguments);
    }
    Satie.prototype.render = function () {
        var body;
        if (!this.state.context) {
            body = React.createElement("div", null, "Loading...");
        }
        else {
            body = React.createElement(Renderer.Component, {
                context: this.state.context,
                dispatcher: this.state.dispatcher,
                parts: this.state.songEditor.parts,
                header: this.state.songEditor.header,
                editMode: false,
                width: this.props.width,
                height: this.props.width,
                top: 0,
                store: this.state.songEditor
            });
        }
        return React.createElement("div", {
            style: {
                width: this.props.width,
                height: this.props.height,
                overflow: "scroll",
                border: "1px solid #eee",
                position: "relative"
            }
        }, body);
    };
    Satie.prototype.getInitialState = function () {
        var dispatcher = new Dispatcher;
        var songEditor = new SongEditor(dispatcher);
        songEditor.addListener(1 /* Annotate */, this._updateFromStore);
        return {
            dispatcher: dispatcher,
            songEditor: songEditor
        };
    };
    Satie.prototype.componentWillMount = function () {
        if (!cssInjected && typeof window !== "undefined") {
            injectCSS();
        }
    };
    Satie.prototype.componentDidMount = function () {
        this.state.dispatcher.PUT("/webapp/song/mxmlJSON", this.props.musicXML);
    };
    Satie.prototype.componentDidUpdate = function (prevProps) {
        if (prevProps.musicXML !== this.props.musicXML) {
            this.setState({
                context: null
            });
            this.state.dispatcher.PUT("/webapp/song/mxmlJSON", this.props.musicXML);
        }
    };
    Satie.prototype.componentWillUnmount = function () {
        this.state.songEditor.removeListener(1 /* Annotate */, this._updateFromStore);
        this.state.songEditor.destructor();
    };
    Satie.prototype._updateFromStore = function () {
        this.setState({
            context: this.state.songEditor.finalCtx
        });
    };
    return Satie;
})(TypedReact.Component);
var cssInjected = false;
function injectCSS() {
    cssInjected = true;
    var style = document.createElement("style");
    style.appendChild(document.createTextNode(""));
    document.head.appendChild(style);
    style.innerHTML = "@font-face {" + "font-family: 'bravura';" + "src: url('/res/bravura.woff') format('woff');" + "font-weight: normal;" + "font-style: normal;" + "}" + ".mn_ {" + "-moz-user-select: none;" + "-ms-user-select: none;" + "-webkit-touch-callout: none;" + "-webkit-user-select: none;" + "cursor: default;" + "font-family: 'bravura';" + "user-select: none;" + "pointer-events: none;" + "text-rendering: optimizeSpeed;" + "}" + ".bn_ {" + "font-family: 'Alegreya';" + "font-style: italic;" + "text-anchor: end;" + "stroke: #7a7a7a;" + "}";
}
exports.MusicXMLView = TypedReact.createClass(Satie);
