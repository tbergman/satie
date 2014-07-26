/**
 * @jsx React.DOM
 */

var React = require("react");
var ReactBootstrap = require("react-bootstrap");
var _ = require("lodash");
var assert = require("assert");

var Button = ReactBootstrap.Button;
var Modal = ReactBootstrap.Modal;

var SongEditorStore = require("./songEditor.jsx");

var TransposeModal = React.createClass({
    render: function() {
        var selection = SongEditorStore.selection();
        var body;
        if (!selection) {
            body = <div className="modal-body">
                First, use the <i className="fa fa-hand-o-up" /> <b>Select</b> tool
                to draw boxes around notes you want to transpose. Next,
                click the <i className="fa fa-arrows-v" /> <b>transpose</b> button.
            </div>;
        } else {
            body = <div className="modal-body">
                <h4>
                    <input type="radio"
                        checked={this.state.mode === "chromatic"}
                        onChange={() => this.setState({mode: "chromatic"})} />
                    Chromatic
                </h4>
                {this.state.mode === "chromatic" && <span>Transpose selection <select
                            value={this.state.direction}
                            onChange={(c) => this.setState({direction: c.target.value})}>
                    <option value="up">up</option>
                    <option value="down">down</option>
                </select> a <select value={this.state.interval}
                            onChange={(c) => this.setState({interval: c.target.value})}>
                    <optgroup label="0 SEMITONES">
                        <option value="u1_0">unison</option>
                        <option value="d2_0">diminished second</option>
                    </optgroup>

                    <optgroup label="1 SEMITONE">
                        <option value="m2_1">minor second</option>
                        <option value="a1_1">augmented unison</option>
                    </optgroup>

                    <optgroup label="2 SEMITONES">
                        <option value="M2_2">major second</option>
                        <option value="d3_2">diminished third</option>
                    </optgroup>

                    <optgroup label="3 SEMITONES">
                        <option value="m3_3">minor third</option>
                        <option value="a2_3">augmented second</option>
                    </optgroup>

                    <optgroup label="4 SEMITONES">
                        <option value="M3_4">major third</option>
                        <option value="d4_4">diminished fourth</option>
                    </optgroup>

                    <optgroup label="5 SEMITONES">
                        <option value="p4_5">perfect fourth</option>
                        <option value="a3_5">augmented third</option>
                    </optgroup>

                    <optgroup label="TRITONE">
                        <option value="d4_6">diminished fifth</option>
                        <option value="a4_6">augmented fourth</option>
                    </optgroup>

                    <optgroup label="7 SEMITONES">
                        <option value="p5_7">perfect fifth</option>
                        <option value="d6_7">diminished sixth</option>
                    </optgroup>

                    <optgroup label="8 SEMITONES">
                        <option value="m6_8">minor sixth</option>
                        <option value="a5_8">augmented fifth</option>
                    </optgroup>

                    <optgroup label="9 SEMITONES">
                        <option value="M6_9">major sixth</option>
                        <option value="d7_9">diminished seventh</option>
                    </optgroup>

                    <optgroup label="10 SEMITONES">
                        <option value="m7_10">minor seventh</option>
                        <option value="a6_10">augmented sixth</option>
                    </optgroup>

                    <optgroup label="11 SEMITONES">
                        <option value="M7_11">major seventh</option>
                        <option value="d8_11">diminished octave</option>
                    </optgroup>
                </select> and <input type="number"
                    value={this.state.octaves}
                    onChange={(e) => ((e.target.value || 0) ===
                            parseInt(e.target.value || 0)) &&
                        this.setState({octaves: parseInt(e.target.value || 0)})}
                    style={{width: 42}}/> octaves</span>}

                <h4>
                    <input type="radio"
                        checked={this.state.mode === "inKey"}
                        onChange={() => this.setState({mode: "inKey"})} />
                    Stay in key
                </h4>
                {this.state.mode === "inKey" && <span>
                    Transpose by <input type="number"
                        value={this.state.letters}
                        onChange={(e) => ((e.target.value || 0) ===
                                parseInt(e.target.value || 0)) &&
                            e.target.value >= -7 && e.target.value <= 7 && e.target.value &&
                            this.setState({letters: parseInt(e.target.value || 0)})}

                        style={{width: 42}}/> letters and <input type="number"
                            value={this.state.octaves}
                            onChange={(e) => ((e.target.value || 0) ===
                                    parseInt(e.target.value || 0)) &&
                                this.setState({octaves: parseInt(e.target.value || 0)})}
                            style={{width: 42}}/> octaves</span>}

                <h4>
                    <input type="radio"
                        checked={this.state.mode === "changeKey"}
                        onChange={() => this.setState({mode: "changeKey"})} />
                    Change key
                </h4>
                {this.state.mode === "changeKey" && <span>Coming soon</span>}
            </div>;
        }

        return this.transferPropsTo(<Modal title="Transpose">
            {body}
            <div className="modal-footer">
                <Button onClick={this.props.onRequestHide}>Close</Button>
                {selection && <Button bsStyle="primary" onClick={() => {
                    "/local/song/_transpose".PUT(this.state);
                    this.props.onRequestHide();
                }}>Do it!</Button>}
            </div>
        </Modal>);
    },

    getInitialState: function() {
        return {
            mode: "chromatic",

            // Chromatic Mode
            direction: "up",
            interval: "u1_0",
            octaves: 0,
            
            // In-key
            letters: 1
        };
    }
});

module.exports = TransposeModal;
