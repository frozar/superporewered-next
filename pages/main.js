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

function Credit(props) {
  if (props.fileName === "") {
    return (
      <div>
        Thank you{" "}
        <a
          href="https://soundcloud.com/freemusicforvlogs/joakim-karud-classic-free-music-for-vlogs"
          target="_blank"
        >
          Joakim Karud - Classic
        </a>
      </div>
    );
  } else {
    return <div>File "{props.fileName}" loaded</div>;
  }
}

class DropZone extends React.Component {
  validateFile = (file) => {
    const validTypes = ["audio/mpeg"];
    if (validTypes.indexOf(file.type) === -1) {
      return false;
    }
    return true;
  };

  dropHandler = async (ev) => {
    ev.preventDefault();

    if (ev.dataTransfer.items.length !== 1) {
      console.error("Drop only 1 file at a time");
      return;
    }

    const dataTransferItem = ev.dataTransfer.items[0];
    if (dataTransferItem.kind !== "file") {
      console.error("Accepte only file on the drop zone");
      return;
    }

    if (!this.validateFile(dataTransferItem)) {
      console.error("Doesn't handle file of type:", dataTransferItem.type);
      return;
    }

    const file = dataTransferItem.getAsFile();

    this.props.cleanAudioContext();
    await this.props.initAudioNode();
    this.props.setFileName(file.name);
    this.props.processInputSound(file);
  };

  // These handlers prevent the browser to open the dropped file
  dragOver = (e) => {
    e.preventDefault();
  };

  dragEnter = (e) => {
    e.preventDefault();
  };

  dragLeave = (e) => {
    e.preventDefault();
  };

  render() {
    return (
      <div
        id="drop_zone"
        onDragOver={this.dragOver}
        onDragEnter={this.dragEnter}
        onDragLeave={this.dragLeave}
        onDrop={this.dropHandler}
      >
        <p>You can drop a sound file here to try it :)</p>
      </div>
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

  state = { step: this.INIT, fileName: "" };

  initAudioNode = async () => {
    const onMessageFromAudioScope = (message) => {
      console.log("Message received from the audio node: " + message);
    };

    this.audioContext = this.Superpowered.getAudioContext(44100);
    this.audioNode = await this.Superpowered.createAudioNodeAsync(
      this.audioContext,
      "/processor.js",
      "MyProcessor",
      onMessageFromAudioScope
    );
  };

  processInputSound = async (input) => {
    this.setState({ step: this.DECODING });
    let rawData = await input.arrayBuffer();
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

      this.setState({ step: this.READY });
    });
  };

  cleanAudioContext = () => {
    this.audioContext.suspend();
    this.audioContext = null;
    this.setState({ step: this.INIT, fileName: "" });
  };

  setFileName = (fileName) => {
    this.setState({ fileName });
  };

  fetchDefaultSong = async () => {
    this.setState({ step: this.DOWNLOADING });
    let response = await fetch("track.mp3");

    this.processInputSound(response);
  };

  componentDidMount() {
    SuperpoweredModule({
      licenseKey: "ExampleLicenseKey-WillExpire-OnNextUpdate",
      enableAudioTimeStretching: true,

      onReady: (SuperpoweredInstance) => {
        this.Superpowered = SuperpoweredInstance;

        this.initAudioNode();
        this.fetchDefaultSong();
      },
    });
  }

  componentWillUnmount() {
    this.cleanAudioContext();
  }

  render() {
    // console.log("this.state", this.state);
    const { step } = this.state;
    if (step === this.INIT) {
      return <div>Init state</div>;
    } else if (step === this.DOWNLOADING) {
      return <div>Downloading music...</div>;
    } else if (step === this.DECODING) {
      return <div>Decoding audio...</div>;
    } else if (step >= this.READY) {
      return (
        <>
          <PlayButton audioContext={this.audioContext} />
          <RateSlider audioNode={this.audioNode} />
          <PitchButtons audioNode={this.audioNode} />
          <Credit fileName={this.state.fileName} />
          <DropZone
            cleanAudioContext={this.cleanAudioContext}
            initAudioNode={this.initAudioNode}
            setFileName={this.setFileName}
            processInputSound={this.processInputSound}
          />
        </>
      );
    }
  }
}

export default Stretcher;
