/**
 * Renders everything under /song. It's an editor for your songs, and a viewer
 * for everyone else's. Songs that are not secret can be seen by anyone with the
 * right URL, even those who are not logged in.
 *
 * There are functions in this file for setting an editing Tool, for saving and
 * uploading, for changing the rastal size, and other things that neither belong
 * in the Ribbon nor the Renderer.
 *
 * @jsx React.DOM
 */

var React = require('react');
var Router = require('react-router-component');
var _ = require("lodash");
var saveAs;
if (typeof window !== "undefined") {
    saveAs = require("../../third_party/fileSaver/FileSaver.js");
}

var Renderer = require("./renderer.jsx");
var Ribbon = require("../ribbon/ribbon.jsx");
var RipienoHeader = require("../landing/ripienoHeader.jsx");
var SongEditorStore = require("../stores/songEditor.jsx");
var renderUtil = require("./util.jsx");

var Link = Router.Link;

var SongEditor = React.createClass({
    render: function() {
        if (!this.state.width) {
            // Still loading
            return <div className="global">
                <div className="workspace" />
            </div>;
        }

        // Right now, the size of the sheet music is decided by the size
        // and shape of the viewer. In the future, it will be possible to
        // zoom in and out.
        var aspectRatio = this.state.staves ?
            this.state.pageSize.width / this.state.pageSize.height :
            1; // Set to 1 to prevent divide by zero.

        var width = this.state.width*0.8;
        var height = width/aspectRatio;
        if (height/this.state.height > 2) {
            height = (this.state.height - renderUtil.V_PADDING * 2)*2;
            width = aspectRatio * height;
        }

        // The Ribbon is hidden for viewers with small screens (e.g., tablets),
        // and users viewing someone else's song. If a song is loading, and
        // we're not sure who owns it, we render the Ribbon. This makes loading
        // slightly faster.
        var showRibbon = this.state.width >= 667 &&
            this.props.session.user &&
            (!this.state.staves ||
                this.props.session.user._id === this.props.activeSong._owner);

        return <div className="global">
            {/* THE HEADER */}
            {showRibbon ?
                <div className="topLeftPageOverlay">
                    <Link href="/library">
                        <i className="fa fa-arrow-circle-o-left" />
                        Library
                    </Link>
                </div> :

                <RipienoHeader session={this.props.session} />
            }

            {/* THE RIBBON */}
            {showRibbon && <span className="pageHeader">
                <Ribbon
                    activeSong={this.props.activeSong}
                    downloadFn={this.download}
                    openFn={this.open}
                    reloadFn={this.reload}
                    selection={this.state.selection}
                    session={this.props.session}
                    width={this.state.width}
                    tool={this.state.tool} />
            </span>}

            {/* THE SHEET MUSIC */}
            {this.state.staves && <Renderer
                height={height}
                marginBottom={renderUtil.V_PADDING}
                marginTop={renderUtil.V_PADDING}
                pageSize={this.state.pageSize}
                ref="renderer"
                selection={this.state.selection}
                staveHeight={this.state.staveHeight}
                staves={this.state.staves}
                store={SongEditorStore}
                tool={this.state.tool}
                top={showRibbon ? 140 : 44}
                width={width} />}

        </div>;
    },

    getInitialState: function() {
        return _.extend({
            height: 0,
            width: 0
        }, this.storeState());
    },

    /**
     * Called whenever the window is resized, whether or not the node has actually
     * changed sizes.
     *
     * Does not affect annotation, but forces a complete re-rendering.
     */
    updateDimensions: function() {
        var r = this.getDOMNode().getBoundingClientRect();
        this.setState({
            width: r.width,
            height: r.height
        });
    },

    /**
     * Debugging utility to verify that the current sheet music can be saved and
     * re-opened. Called in save, because it's a lot better to crash here than when
     * quitting and loading a file later.
     */
    reload: function() {
        var lyliteStr = this.refs.renderer.writeLylite();
        this.setState({
            staves: lylite.parse(lyliteStr)
        });
    },

    /**
     * Save a lilypond-style file to your computer.
     */
    download: function() {
        var lyliteStr = this.refs.renderer.writeLylite();
        var blob = new Blob([lyliteStr], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "music.lylite");
    },

    /**
     * Updates the server with the current sheet music.
     */
    save: function() {
        this.reload(); // better crash here than on loading the sheet music later

        this.state.song.src = this.refs.renderer.writeLylite();
        ("/api/song/_" + this.state.song._id).PUT({
            data: this.state.song.src
        });
    },

    /**
     * Given an event from a file input, try to parse it as Lylite.
     *
     * Replaces the current file currently.
     */
    open: function(evt) {
        var files = evt.target.files;
        if (!files.length) {
            return;
        }

        var reader = new FileReader();
        reader.onload = () => {
            var currentStaves = this.state.staves;
            try {
                this.setState({
                    staves: lylite.parse(reader.result)
                });
            } catch(e) {
                alert("It's our fault. Ripieno could not open that file.");
            }
        };
        reader.readAsText(files[0]);
    },

    componentWillMount: function() {
        _.defer(() => ("/local/song/show/_" + this.props.songId).PUT());
    },
    componentDidMount: function() {
        SongEditorStore.addChangeListener(this._onChange);

        global.addEventListener("resize", this.updateDimensions);
        this.updateDimensions();
        this._onChange();
    },
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.songId !== this.props.songId) {
            ("/local/song/show/_" + nextProps.songId).PUT();
        }
    },
    componentWillUnmount: function() {
        SongEditorStore.removeChangeListener(this._onChange);

        // This might have race-condition issues if we're replacing one
        // song consumer with another!
        ("/local/song/show/_" + this.props.songId).DELETE();
        global.removeEventListener("resize", this.updateDimensions);
    },
    _onChange: function() {
        this.setState(this.storeState());
    },
    storeState: function() {
        return {
            pageSize: SongEditorStore.pageSize(),
            selection: SongEditorStore.selection(),
            staveHeight: SongEditorStore.staveHeight(),
            staves: SongEditorStore.staves(),
            tool: SongEditorStore.tool()
        };
    },

    mixins: [Router.NavigatableMixin] // for this.navigate
});

module.exports = SongEditor;
