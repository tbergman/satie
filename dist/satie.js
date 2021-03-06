var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
exports.MusicXML = require("musicxml-interfaces");
var React = require("react");
var TypedReact = require("typed-react");
var _ = require("lodash");
var invariant = require("react/lib/invariant");
var C = require("./stores/contracts");
var Dispatcher = require("./stores/dispatcher");
var Renderer = require("./renderer/renderer");
var ScoreStore = require("./stores/scoreStore");
function init(options) {
    "use strict";
    invariant(!BrowserSetup.cssInjected, "initSatie must be called before any Satie component is mounted " + "and must only be called once");
    BrowserSetup.injectStyles(options);
}
exports.init = init;
exports.MusicXMLView;
function toSVG(musicXML, onSuccess, onError) {
    "use strict";
    invariant(_.isFunction(onSuccess), "If a tree falls in a forest and no one is around to hear it, does it make a sound? " + "(Satie.toSVG is asynchronous and expects a callback function)");
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
            onSuccess("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>" + React.renderToStaticMarkup(React.createElement(Renderer.Component, props)).replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" ").replace(/class="mn_"/g, "font-family='bravura'").replace(/class="tn_"/g, "font-family='Alegreya'").replace(/class="mmn_"/g, "font-family='Alegreya' " + "font-style='italic' stroke='#7a7a7a'").replace(/class="bn_"/g, "font-family='Alegreya' " + "font-style='italic' text-anchor='end' stroke='#7a7a7a'"));
        }
        catch (err) {
            onError(err);
        }
    }
}
exports.toSVG = toSVG;
var BrowserSetup;
(function (BrowserSetup) {
    "use strict";
    BrowserSetup.cssInjected = false;
    function injectStyles(spec) {
        "use strict";
        if (spec === void 0) { spec = {}; }
        if (BrowserSetup.cssInjected) {
            return;
        }
        BrowserSetup.cssInjected = true;
        if (typeof window === "undefined") {
            return;
        }
        if (spec.useGoogleFonts !== false) {
            window.WebFontConfig = {
                google: { families: ["Alegreya:400italic,700italic,900italic,400,700:latin", "Alegreya+SC:700,400:latin"] }
            };
            var protocol = "https:" === document.location.protocol ? "https" : "http";
            var wf = document.createElement("script");
            wf.src = protocol + "://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js";
            wf.type = "text/javascript";
            wf.async = true;
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(wf, s);
        }
        var style = document.createElement("style");
        style.appendChild(document.createTextNode(""));
        document.head.appendChild(style);
        var bravuraFontFace;
        if (spec.bravuraURL === "none") {
            bravuraFontFace = "";
        }
        else {
            invariant(!spec.bravuraURL || validateURL(spec.bravuraURL), "The bravuraURL must be undefined, a valid URL with protocol, or \"none\", but is \"%s\".", spec.bravuraURL);
            var bravuraURL = spec.bravuraURL || (protocol + "://cdn.rawgit.com/ripieno/satie/724fa96260b40e455e9e5217e226825066ba8312/res/bravura.woff");
            bravuraFontFace = "@font-face {" + "font-family: 'bravura';" + "src: url('" + bravuraURL + "') format('woff');" + "font-weight: normal;" + "font-style: normal;" + "}";
        }
        style.innerHTML = bravuraFontFace + ".mn_ {" + "-moz-user-select: none;" + "-ms-user-select: none;" + "-webkit-touch-callout: none;" + "-webkit-user-select: none;" + "cursor: default;" + "font-family: 'bravura';" + "user-select: none;" + "pointer-events: none;" + "text-rendering: optimizeSpeed;" + "}" + ".mmn_ {" + "font-family: 'Alegreya';" + "font-style: italic;" + "text-anchor: middle;" + "stroke: #7a7a7a;" + "}" + ".bn_ {" + "font-family: 'Alegreya';" + "font-style: italic;" + "text-anchor: end;" + "stroke: #7a7a7a;" + "}";
    }
    BrowserSetup.injectStyles = injectStyles;
})(BrowserSetup || (BrowserSetup = {}));
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
        BrowserSetup.injectStyles();
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
    MusicXMLViewSpec.prototype.componentWillUnmount = function () {
        this.state.score.removeListener(1 /* Annotate */, this._updateFromStore);
        this.state.score.destructor();
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
    MusicXMLViewSpec.prototype._updateFromStore = function () {
        this.setState({
            error: null,
            context: this.state.score.finalCtx
        });
    };
    return MusicXMLViewSpec;
})(TypedReact.Component);
exports.MusicXMLView = TypedReact.createClass(MusicXMLViewSpec);
function validateURL(url) {
    "use strict";
    return re_weburl.test(url);
}
var re_weburl = new RegExp("^" + "(?:(?:https?|ftp)://)" + "(?:\\S+(?::\\S*)?@)?" + "(?:" + "(?!(?:10|127)(?:\\.\\d{1,3}){3})" + "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" + "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" + "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" + "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" + "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" + "|" + "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" + "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" + "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))?" + ")" + "(?::\\d{2,5})?" + "(?:/\\S*)?" + "$", "i");
