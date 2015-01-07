var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
exports.MusicXML = require("musicxml-interfaces");
var React = require("react");
var TypedReact = require("typed-react");
var C = require("./stores/contracts");
var Dispatcher = require("./stores/dispatcher");
var Renderer = require("./renderer/renderer");
var ScoreStore = require("./stores/scoreStore");
var MusicXMLViewSpec = (function (_super) {
    __extends(MusicXMLViewSpec, _super);
    function MusicXMLViewSpec() {
        _super.apply(this, arguments);
    }
    MusicXMLViewSpec.prototype.render = function () {
        var body;
        if (this.state.error) {
            body = React.createElement("div", null, this.state.error.split("\n").map(function (v, k) { return React.createElement("div", { key: k }, v || "\u00a0"); }));
        }
        else if (!this.state.context) {
            body = React.createElement("div", null, "Loading...");
        }
        else {
            body = React.createElement(Renderer.Component, {
                context: this.state.context,
                dispatcher: this.state.dispatcher,
                parts: this.state.score.parts,
                voices: this.state.score.voices,
                header: this.state.score.header,
                editMode: false,
                width: this.props.width,
                height: this.props.width,
                top: 0,
                store: this.state.score
            });
        }
        return React.createElement("div", {
            style: {
                width: this.props.width,
                height: this.props.height,
                overflowY: "scroll",
                overflowX: "hidden",
                border: "1px solid #eee",
                position: "relative"
            }
        }, body);
    };
    MusicXMLViewSpec.prototype.getInitialState = function () {
        var dispatcher = new Dispatcher;
        var score = new ScoreStore(dispatcher);
        score.addListener(1 /* Annotate */, this._updateFromStore);
        return {
            dispatcher: dispatcher,
            score: score
        };
    };
    MusicXMLViewSpec.prototype.componentWillMount = function () {
        injectCSS();
    };
    MusicXMLViewSpec.prototype.componentDidMount = function () {
        this.state.dispatcher.PUT("/webapp/song/mxmlJSON", this.props.musicXML, null, this._onError);
    };
    MusicXMLViewSpec.prototype.componentDidUpdate = function (prevProps) {
        if (prevProps.musicXML !== this.props.musicXML) {
            this.setState({
                error: null,
                context: null
            });
            this.state.dispatcher.PUT("/webapp/song/mxmlJSON", this.props.musicXML, null, this._onError);
        }
    };
    MusicXMLViewSpec.prototype._onError = function (err) {
        if (typeof err.toString === "function") {
            console.warn(err.toString());
            this.setState({
                error: err.toString()
            });
        }
        else {
            console.warn("Unknown error.");
            this.setState({
                error: "Unknown error."
            });
            console.warn(err);
            throw err;
        }
    };
    MusicXMLViewSpec.prototype.componentWillUnmount = function () {
        this.state.score.removeListener(1 /* Annotate */, this._updateFromStore);
        this.state.score.destructor();
    };
    MusicXMLViewSpec.prototype._updateFromStore = function () {
        this.setState({
            error: null,
            context: this.state.score.finalCtx
        });
    };
    return MusicXMLViewSpec;
})(TypedReact.Component);
var cssInjected = false;
function injectCSS() {
    if (cssInjected || typeof window === "undefined") {
        return;
    }
    cssInjected = true;
    var style = document.createElement("style");
    style.appendChild(document.createTextNode(""));
    document.head.appendChild(style);
    style.innerHTML = "@font-face {" + "font-family: 'bravura';" + "src: url('/res/bravura.woff') format('woff');" + "font-weight: normal;" + "font-style: normal;" + "}" + ".mn_ {" + "-moz-user-select: none;" + "-ms-user-select: none;" + "-webkit-touch-callout: none;" + "-webkit-user-select: none;" + "cursor: default;" + "font-family: 'bravura';" + "user-select: none;" + "pointer-events: none;" + "text-rendering: optimizeSpeed;" + "}" + ".mmn_ {" + "font-family: 'Alegreya';" + "font-style: italic;" + "text-anchor: middle;" + "stroke: #7a7a7a;" + "}" + ".bn_ {" + "font-family: 'Alegreya';" + "font-style: italic;" + "text-anchor: end;" + "stroke: #7a7a7a;" + "}";
}
exports.MusicXMLView = TypedReact.createClass(MusicXMLViewSpec);
