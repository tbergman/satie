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
var _ = require('underscore');
var saveAs = require("./thirdParty/fileSaver/FileSaver.js");

var Renderer = require("./renderer/renderer.jsx");
var Ribbon = require("./ribbon/ribbon.jsx");
var RipienoHeader = require("./landing/ripienoHeader.jsx");
var ajax = require("./util/ajax.jsx").untrusted;
var lylite = require("./renderer/lylite.jison").parser;
var renderUtil = require("./renderer/util.jsx");
var unittest = require("./unittest.jsx");

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
        var aspectRatio = this.state.pageSize.width / this.state.pageSize.height;
        var width = this.state.width*0.8;
        var height = width/aspectRatio;
        if (height/this.state.height > 2) {
            height = (this.state.height - V_PADDING * 2)*2;
            width = aspectRatio * height;
        }

        // The Ribbon is hidden for viewers with small screens (e.g., tablets),
        // and users viewing someone else's song. If a song is loading, and
        // we're not sure who owns it, we render the Ribbon. This makes loading
        // slightly faster.
        var showRibbon = this.state.width > 910 &&
            this.props.session.user &&
            (!this.state.song ||
                this.props.session.user._id === this.state.song._owner);

        return <div className="global">
            {this.props.session.state === "LoggedIn" ?
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
                    downloadFn={this.download}
                    getSelectionFn={() => this.refs.renderer.getSelection()}
                    transposeFn={(how) => this.refs.renderer.transpose(how)}
                    largerFn={this.largerFn}
                    onToolSet={this.handleToolSet}
                    openFn={this.open}
                    pageSizeFn={this.setPageSize}
                    reloadFn={this.reload}
                    saveFn={this.save}
                    selection={this.state.selection}
                    session={this.props.session}
                    smallerFn={this.smallerFn}
                    tool={this.state.tool} />
            </span>}

            {/* THE SHEET MUSIC */}
            {this.state.song && <Renderer
                height={height}
                marginBottom={V_PADDING}
                marginTop={V_PADDING}
                pageSize={this.state.pageSize}
                ref="renderer"
                selection={this.state.selection}
                setSelectionFn={s => this.setState({selection: s})}
                setToolFn={this.handleToolSet}
                staveHeight={this.state.staveHeight}
                staves={this.state.staves}
                tool={this.state.tool}
                top={showRibbon ? 140 : 44}
                width={width} />}

        </div>;
    },


    /**
     * Given a song element (see song.d), render it.
     */
    show: function(song) {
        var staves = lylite.parse(song.src);
        if (!_(staves).any(s => s.staveHeight)) {
            staves.splice(0, 0, {staveHeight: renderUtil.rastalToHeight[4]})
        }
        if (!_(staves).any(s => s.pageSize)) {
            staves.splice(0, 0, {pageSize: this.state.pageSize})
        }
        var staveHeight = _(staves).find(s => s.staveHeight).staveHeight;
        var pageSize = _(staves).find(s => s.pageSize).pageSize;

        this.setState({
            song: song,
            staves: staves,
            staveHeight: staveHeight,
            pageSize: pageSize
        });
    },

    /**
     * Given a song id (from e.g., the URL), find it and render it.
     * If it is not currently cached, requests it from the API.
     */
    showId: function(id, songs) {
        songs = songs || this.props.songs;

        var song = _(songs).findWhere({_id: id});
        if (song) {
            this.show(song);
        } else {
            ajax.getJSON("/api/song/" + id, (song, request) => {
                if (request.status === 404) {
                    this.navigate("/404");
                    return;
                }
                this.show(song);
            });
        } 
    },

    getInitialState: function() {
        return {
            height: 0,
            pageSize: renderUtil.pageSizes[0],
            selection: null,
            staveHeight: null,
            staves: null,
            tool: null,
            width: 0
        };
    },

    /**
     * Called from the Ribbon. See tool.jsx
     */
    handleToolSet: function(tool) {
        this.setState({tool: tool});
    },

    /**
     * Decrease the rastal size by one (lower rastal numbers are larger).
     *
     * Forces a complete re-annotation and rendering.
     */
    largerFn: function() {
        var h = Math.round(this.state.staveHeight*100)/100;
        for (var i = renderUtil.rastalToHeight.length - 1; i >= 0; --i) {
            if (renderUtil.rastalToHeight[i] > h) {
                this.setState({
                    staveHeight: renderUtil.rastalToHeight[i]
                });
                break;
            }
        }
    },

    /**
     * Decrease the rastal size by one (lower rastal numbers are larger).
     *
     * Forces a complete re-annotation and rendering.
     */
    smallerFn: function() {
        var h = Math.round(this.state.staveHeight*100)/100;
        for (var i = 0; i < renderUtil.rastalToHeight.length; ++i) {
            if (renderUtil.rastalToHeight[i] < h) {
                this.setState({
                    staveHeight: renderUtil.rastalToHeight[i]
                });
                break;
            }
        }
    },

    /**
     * Set the page size.
     *
     * @param {size} a value from renderUtil.pageSizes
     */
    setPageSize: function(size) {
        this.setState({
            pageSize: size
        });
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
        ajax.putJSON("/api/song/" + this.state.song._id, {
                data: this.state.song.src
            }, (savedSong, request) => {
                console.log("Saved!");
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
        if (!this.props.songs) {
            // Cache songs from library
            this.props.loadSongs();
            return;
        }

        this.showId(this.props.songId);
    },
    componentDidMount: function() {
        window.addEventListener("resize", this.updateDimensions);
        this.updateDimensions();
    },
    componentWillReceiveProps: function(nextProps) {
        if (!nextProps.songs) {
            return;
        }
        this.showId(nextProps.songId, nextProps.songs);
        if ((this.props.songId !== nextProps.songId) || nextProps.songs) {
            this.showId(nextProps.songId, nextProps.songs);
        }
    },
    componentDidUnmount: function() {
        window.removeEventListener("resize", this.updateDimensions);
    },

    mixins: [Router.NavigatableMixin] // for this.navigate
});

var V_PADDING = 20;

module.exports = SongEditor;
