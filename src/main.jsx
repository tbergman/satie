/**
 * @jsx React.DOM
 */

var React = require('react');
var Router = require('react-router-component');
var _ = require('underscore');
var saveAs = require("./thirdParty/fileSaver/FileSaver.js");

var FourOhFour = require("./landing/fourOhFour.jsx");
var HeroPage = require("./landing/heroPage.jsx");
var LibraryPage = require("./landing/libraryPage.jsx");
var Redirect = require("./util/redirect.jsx");
var Renderer = require("./renderer/renderer.jsx");
var SongEditor = require("./songEditor.jsx");
var ajax = require("./util/ajax.jsx").untrusted;
var unittest = require("./unittest.jsx");

var Location = Router.Location;
var NotFound = Router.NotFound;
var Locations = Router.Locations;

require("./main.less");
require("./landing/landing.less");

var Ripieno = React.createClass({
    propTypes: {
        aspectRatio: React.PropTypes.number.isRequired
    },
    getDefaultProps: function() {
        return {
            aspectRatio: 8.5/11
        };
    },

    render: function() {
        if (!this.state.session) {
            return <i />;
        }

        var loggedIn = this.state.session.state === "LoggedIn";

        return <Locations ref="router" style={{width: "100%", height: "100%"}}>
            {loggedIn ?
                <Redirect path="/" to="/library" /> :
                <Location path="/"
                    handler={HeroPage}
                    loggedInFn={this.handleLoggedIn}
                    session={this.state.session} />}

            {loggedIn ?
                <Location path="/library*" 
                    handler={LibraryPage}
                    songs={this.state.songs}
                    songsUpdatedFn={this.handleSongsUpdated}
                    session={this.state.session}
                    loadSongs={this.loadSongs} /> :
                <Redirect path="/library*" to="/"
                    onRedirect={(path) => { futurePath = path; }} />}

            <Location path="/songs/:songId"
                handler={SongEditor}
                songs={this.state.songs}
                session={this.state.session}
                loadSongs={this.loadSongs} />

            <NotFound handler={FourOhFour} />
        </Locations>;
    },
    getInitialState: function() {
        return {
            session: null,
            songs: null
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
    handleLoggedIn: function(data) {
        var newPath = futurePath || "/library";
        this.setState({
            session: data
        });
        this.refs.router.navigate(newPath, {replace: "true"});
    },
    handleSongsUpdated: function(songs) {
        this.setState({songs: songs});
    },
    loadSongs: function() {
        if (!this.state.session.user) {
            _.defer(() => this.handleSongsUpdated([]));
            return;
        }

        ajax.getJSON("/api/song?userId=" + this.state.session.user._id,
            (songs) => {
                this.handleSongsUpdated(songs);
            });
    },
    componentWillMount: function() {
        ajax.getJSON("/api/user/start_session", (response, request) => {
            if (request.status !== 200) {
                this.setState({failed: true});
                return;
            }
            this.setState({session: response});
        });
    }
});

var V_PADDING = 20;
var futurePath = null;

(() => {
    window.React = React; // for Chrome devtool extension
    unittest.runAll();

    React.renderComponent(
        <Ripieno />,
        document.body
    );
})();
