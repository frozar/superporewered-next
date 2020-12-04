import SuperpoweredModule from "../public/superpowered";
import React from "react";

var audioContext = null; // Reference to the audio context.
var audioNode = null; // This example uses one audio node only.
var Superpowered = null; // Reference to the Superpowered module.

class PitchButtons extends React.Component {
  state = { pitchShift: 0 };

  // onclick by the pitch shift minus and plus buttons
  changePitchShift = (increment) => {
    let { pitchShift } = this.state;
    pitchShift += increment;
    pitchShift = Math.max(pitchShift, -12);
    pitchShift = Math.min(pitchShift, 12);
    this.setState({ pitchShift });
    // sending the new value to the audio node
    audioNode.sendMessageToAudioScope({ pitchShift });
  };

  render() {
    const renderText = () => {
      const { pitchShift } = this.state;
      const text =
        " pitch shift: " +
        (pitchShift < 1 ? pitchShift : "+" + pitchShift) +
        " ";
      return text;
    };
    return (
      <>
        <button id="pitchMinus" onClick={() => this.changePitchShift(-1)}>
          -
        </button>
        <span id="pitchShiftDisplay"> {renderText()}</span>
        <button id="pitchPlus" onClick={() => this.changePitchShift(+1)}>
          +
        </button>
      </>
    );
  }
}

function onMessageFromAudioScope(message) {
  console.log("Message received from the audio node: " + message);
}

// when the START button is clicked
async function start(incState) {
  audioContext = Superpowered.getAudioContext(44100);
  let currentPath = window.location.pathname.substring(
    0,
    window.location.pathname.lastIndexOf("/")
  );

  audioNode = await Superpowered.createAudioNodeAsync(
    audioContext,
    currentPath + "/processor.js",
    "MyProcessor",
    onMessageFromAudioScope
  );

  // console.log("Downloading music...");
  incState();
  let response = await fetch("track.wav");

  incState();
  let rawData = await response.arrayBuffer();
  audioContext.decodeAudioData(rawData, function (pcmData) {
    // Safari doesn't support await for decodeAudioData yet
    // send the PCM audio to the audio node
    audioNode.sendMessageToAudioScope({
      left: pcmData.getChannelData(0),
      right: pcmData.getChannelData(1),
    });

    // audioNode -> audioContext.destination (audio output)
    audioContext.suspend();
    audioNode.connect(audioContext.destination);

    incState();
  });
}

class PlayButton extends React.Component {
  state = { value: 0 };

  togglePlayback = () => {
    const { value } = this.state;
    if (value === 1) {
      this.setState({ value: 0 });
      audioContext.suspend();
    } else {
      this.setState({ value: 1 });
      audioContext.resume();
    }
  };

  render() {
    const buttonText = this.state.value === 0 ? "PLAY" : "PAUSE";
    return (
      <button id="playPause" value="0" onClick={this.togglePlayback}>
        {buttonText}
      </button>
    );
  }
}

class RateSlider extends React.Component {
  initState = { value: 10000 };
  state = this.initState;

  changeRate = (evt) => {
    const value = evt.target.valueAsNumber;
    this.setState({ value });
    // sending the new rate to the audio node
    audioNode.sendMessageToAudioScope({ rate: value });
  };

  changeRateDbl = () => {
    this.setState(this.initState);
  };

  render() {
    const renderText = () => {
      const { value } = this.state;
      let text;
      if (value === 10000) {
        text = "original tempo";
      } else if (value < 10000) {
        text = "-" + (100 - value / 100).toPrecision(2) + "%";
      } else {
        text = "+" + (value / 100 - 100).toPrecision(2) + "%";
      }
      return text;
    };
    return (
      <>
        <p id="rateDisplay">{renderText()}</p>
        <input
          id="rateSlider"
          type="range"
          min="5000"
          max="20000"
          defaultValue={this.state.value}
          readOnly={true}
          onInput={this.changeRate}
          onDoubleClick={this.changeRateDbl}
          style={{ width: "100%" }}
        />
      </>
    );
  }
}

class Init extends React.Component {
  INIT = 0;
  DOWNLOADING = 1;
  DECODING = 2;
  READY = 3;

  state = { step: this.INIT };

  incState = () => {
    const { step } = this.state;
    this.setState({ step: step + 1 });
  };

  componentDidMount() {
    SuperpoweredModule({
      licenseKey: "ExampleLicenseKey-WillExpire-OnNextUpdate",
      enableAudioTimeStretching: true,

      onReady: function (SuperpoweredInstance) {
        Superpowered = SuperpoweredInstance;
      },
    });
  }

  render() {
    const { step } = this.state;
    if (step === this.INIT) {
      return (
        <button
          id="startButton"
          onClick={() => {
            start(this.incState);
          }}
        >
          START
        </button>
      );
    } else if (step === this.DOWNLOADING) {
      return <div>Downloading music...</div>;
    } else if (step === this.DECODING) {
      return <div>Decoding audio...</div>;
    } else if (step === this.READY) {
      // UI: innerHTML may be ugly but keeps this example small
      return (
        <>
          <PlayButton />
          <RateSlider />
          <PitchButtons />
        </>
      );
    }
  }
}

export default Init;
