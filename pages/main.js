import SuperpoweredModule from "../public/superpowered";
import React from "react";

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
    this.props.audioNode.sendMessageToAudioScope({ pitchShift });
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

class PlayButton extends React.Component {
  state = { value: 0 };

  togglePlayback = () => {
    const { value } = this.state;
    if (value === 1) {
      this.setState({ value: 0 });
      this.props.audioContext.suspend();
    } else {
      this.setState({ value: 1 });
      this.props.audioContext.resume();
    }
  };

  render() {
    const buttonText = this.state.value === 0 ? "PLAY" : "PAUSE";
    return (
      <button id="playPause" onClick={this.togglePlayback}>
        {buttonText}
      </button>
    );
  }
}

class RateSlider extends React.Component {
  initValue = 10000;
  state = { value: this.initValue };

  // sending the new rate to the audio node
  updateAudioRate = (rate) => {
    this.props.audioNode.sendMessageToAudioScope({ rate });
  };

  changeRate = (evt) => {
    const value = evt.target.valueAsNumber;
    this.setState({ value });
    this.updateAudioRate(value);
  };

  changeRateDbl = () => {
    const value = this.initValue;
    this.setState({ value });
    this.updateAudioRate(value);
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
          value={this.state.value}
          onInput={this.changeRate}
          onDoubleClick={this.changeRateDbl}
          style={{ width: "100%" }}
        />
      </>
    );
  }
}

class Stretcher extends React.Component {
  INIT = 0;
  DOWNLOADING = 1;
  DECODING = 2;
  READY = 3;
  Superpowered = null;
  audioNode = null;
  audioContext = null;

  state = { step: this.INIT };

  componentDidMount() {
    SuperpoweredModule({
      licenseKey: "ExampleLicenseKey-WillExpire-OnNextUpdate",
      enableAudioTimeStretching: true,

      onReady: (SuperpoweredInstance) => {
        this.Superpowered = SuperpoweredInstance;
      },
    });
  }

  incState = () => {
    const { step } = this.state;
    this.setState({ step: step + 1 });
  };

  // when the START button is clicked
  start = async () => {
    const onMessageFromAudioScope = (message) => {
      console.log("Message received from the audio node: " + message);
    };

    this.audioContext = this.Superpowered.getAudioContext(44100);
    let currentPath = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/")
    );

    this.audioNode = await this.Superpowered.createAudioNodeAsync(
      this.audioContext,
      currentPath + "/processor.js",
      "MyProcessor",
      onMessageFromAudioScope
    );

    this.incState();
    let response = await fetch("track.wav");

    this.incState();
    let rawData = await response.arrayBuffer();
    this.audioContext.decodeAudioData(rawData, (pcmData) => {
      // Safari doesn't support await for decodeAudioData yet
      // send the PCM audio to the audio node
      this.audioNode.sendMessageToAudioScope({
        left: pcmData.getChannelData(0),
        right: pcmData.getChannelData(1),
      });

      // audioNode -> audioContext.destination (audio output)
      this.audioContext.suspend();
      this.audioNode.connect(this.audioContext.destination);

      this.incState();
    });
  };

  render() {
    const { step } = this.state;
    if (step === this.INIT) {
      return (
        <button id="startButton" onClick={this.start}>
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
          <PlayButton audioContext={this.audioContext} />
          <RateSlider audioNode={this.audioNode} />
          <PitchButtons audioNode={this.audioNode} />
        </>
      );
    }
  }
}

export default Stretcher;
