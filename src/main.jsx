/**
 * Contains a router for the main application.
 * Every part of Repieno is rendered through this file.
 *
 * @jsx React.DOM
 */

var React = require('react');
var Router = require('react-router-component');
var _ = require('underscore');

var FourOhFour = require("./landing/fourOhFour.jsx");
var HeroPage = require("./landing/heroPage.jsx");
var LibraryPage = require("./landing/libraryPage.jsx");
var Redirect = require("./util/redirect.jsx");
var Renderer = require("./renderer/renderer.jsx");
var SongEditor = require("./songEditor.jsx");
var ajax = require("./util/ajax.jsx").untrusted;
var unittest = require("./unittest.jsx");

var Location = Router.Location;
var Locations = Router.Locations;
var NotFound = Router.NotFound;

require("./landing/landing.less");
require("./main.less");

var Ripieno = React.createClass({
    render: function() {
        // Nothing is rendered until a session has started.
        if (!this.state.session) {
            return <i />;
        }

        var loggedIn = this.state.session.state === "LoggedIn";

        return <Locations ref="router" style={{width: "100%", height: "100%"}}>
            {/* The hero page with the login button */}
            {/* Only available to logged in users */}
            {loggedIn ?
                <Redirect path="/" to="/library" /> :
                <Location path="/"
                    handler={HeroPage}
                    loggedInFn={this.handleLoggedIn}
                    session={this.state.session} />}

            {/* Managing and creating new songs */}
            {/* Currenly you can only see your own library */}
            {loggedIn ?
                <Location path="/library*" 
                    handler={LibraryPage}
                    songs={this.state.songs}
                    songsUpdatedFn={this.handleSongsUpdated}
                    session={this.state.session}
                    loadSongs={this.loadSongs} /> :
                <Redirect path="/library*" to="/"
                    onRedirect={(path) => { futurePath = path; }} />}

            {/* View or edit a song. No login required. */}
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
            /* {
             *     csrf: "randomString",
             *     state: "LoggedOut" | "LoggedIn",
             *     user: {
             *         _id: "123456789",
             *         identity: {
             *             ... from Google+ ...
             *         }
             *     }
             * }
             */
            session: null,

            /**
             * Array of songs. See backend/src/songs.d.
             */
            songs: null
        };
    },

    /**
     * This is called when session.state transitions from
     * "LoggedOut" to "LoggedIn". It is not called when the
     * state is initially received.
     */
    handleLoggedIn: function(data) {
        // futurePath is set when a user requested a page
        // they did not have access to. By logging in, they
        // get access to it.
        var newPath = futurePath || "/library";
        this.setState({
            session: data
        });

        // By replacing the current state, we avoid creating
        // a page that cannot be easily exited.
        this.refs.router.navigate(newPath, {replace: "true"});
    },

    /**
     * This can be triggered by a user's library being loaded, a
     * song being added by a user, or a song being requested that is
     * not owned by the current user.
     */
    handleSongsUpdated: function(songs) {
        this.setState({songs: songs});
    },

    /**
     * Load all songs in a users library. Requested when viewing
     * a path under /library or /song.
     */
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

    /**
     * Start an API session.
     */
    componentWillMount: function() {
        var path = "/api/user/start_session";
        ajax.getJSON(path, (response, request) => {
            if (request.status !== 200) {
                this.setState({failed: true});
                return;
            }
            this.setState({session: response});
        });
    }
});

var futurePath = null;

(() => {
    window.React = React; // for Chrome devtool extension
    unittest.runAll(); // this currently does not do anything

    React.renderComponent(
        <Ripieno />,
        document.body
    );
})();
