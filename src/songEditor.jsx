/**
 * @jsx React.DOM
 */

var React = require('react');
var Router = require('react-router-component');
var _ = require('underscore');
var saveAs = require("./thirdParty/fileSaver/FileSaver.js");

var Renderer = require("./renderer/renderer.jsx");
var Ribbon = require("./ribbon/ribbon.jsx");
var ajax = require("./util/ajax.jsx").untrusted;
var lylite = require("./renderer/lylite.jison").parser;
var unittest = require("./unittest.jsx");

var SongEditor = React.createClass({
    mixins: [Router.NavigatableMixin],
    propTypes: {
        aspectRatio: React.PropTypes.number.isRequired
    },
    getDefaultProps: function() {
        return {
            aspectRatio: 8.5/11
        };
    },

    render: function() {
        if (!this.state.width) {
            // Still loading
            return <div className="global">
                <div className="workspace" />
            </div>;
        }

        var width = this.state.width*0.8;
        var height = width/this.props.aspectRatio;
        if (height/this.state.height > 2) {
            height = (this.state.height - V_PADDING * 2)*2;
            width = this.props.aspectRatio * height;
        }

        var showRibbon = this.state.width > 910 &&
            this.props.session.user &&
            (!this.state.song ||
                this.props.session.user._id === this.state.song._owner);

        return <div className="global">
            {showRibbon && <span className="pageHeader">
                <Ribbon
                    session={this.props.session}
                    reloadFn={this.reload}
                    downloadFn={this.download}
                    saveFn={this.save}
                    openFn={this.open}
                    onToolSet={this.handleToolSet}
                    largerFn={this.largerFn}
                    smallerFn={this.smallerFn} />
            </span>}
            {this.state.song && <div className="workspace" style={{top: showRibbon ? 140 : 0}}>
                <div className="page" style={{
                        width: width,
                        height: height,
                        marginTop: V_PADDING,
                        marginBottom: V_PADDING}}>
                    <Renderer
                        ref="renderer"
                        rastal={this.state.rastal}
                        staves={this.state.staves}
                        tool={this.state.tool} />
                </div>
            </div>}
        </div>;
    },
    show: function(song) {
        this.setState({
            song: song,
            staves: lylite.parse(song.src)
        });
    },
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
            width: 0,
            height: 0,
            staves: null,
            tool: null,
            rastal: 4
        };
    },

    handleChange: function(ev) {
        this.setState({
            lilytext: ev.target.value
        });
    },
    handleToolSet: function(tool) {
        this.setState({tool: tool});
    },
    largerFn: function() {
        if (this.state.rastal > 0) {
            this.setState({
                rastal: this.state.rastal - 1
            });
        }
    },
    smallerFn: function() {
        if (this.state.rastal < 8) {
            this.setState({
                rastal: this.state.rastal + 1
            });
        }
    },
    updateDimensions: function() {
        var r = this.getDOMNode().getBoundingClientRect();
        this.setState({
            width: r.width,
            height: r.height
        });
    },
    reload: function() {
        var lyliteStr = this.refs.renderer.writeLylite();
        this.setState({
            staves: lylite.parse(lyliteStr)
        });
    },
    download: function() {
        var lyliteStr = this.refs.renderer.writeLylite();
        var blob = new Blob([lyliteStr], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "music.lylite");
    },
    save: function() {
        this.state.song.src = this.refs.renderer.writeLylite();
        ajax.putJSON("/api/song/" + this.state.song._id, {
                data: this.state.song.src
            }, (savedSong, request) => {
                console.log("Saved!");
            });
    },
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
    }
});

var V_PADDING = 20;
module.exports = SongEditor;
