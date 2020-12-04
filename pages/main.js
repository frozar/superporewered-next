import SuperpoweredModule from "../public/superpowered";
import React from "react";

var audioContext = null; // Reference to the audio context.
var audioNode = null; // This example uses one audio node only.
var Superpowered = null; // Reference to the Superpowered module.
var pitchShift = 0; // The current pitch shift value.

// onclick by the pitch shift minus and plus buttons
function changePitchShift(e) {
  // limiting the new pitch shift value
  let value = parseInt(e.target.value);
  pitchShift += value;
  if (pitchShift < -12) pitchShift = -12;
  else if (pitchShift > 12) pitchShift = 12;
  // displaying the value
  document.getElementById("pitchShiftDisplay").innerText =
    " pitch shift: " + (pitchShift < 1 ? pitchShift : "+" + pitchShift) + " ";
  // sending the new value to the audio node
  audioNode.sendMessageToAudioScope({ pitchShift: pitchShift });
}

// on change by the rate slider
function changeRate() {
  // displaying the new rate
  let value = document.getElementById("rateSlider").value,
    text;
  if (value == 10000) text = "original tempo";
  else if (value < 10000) text = "-" + (100 - value / 100).toPrecision(2) + "%";
  else text = "+" + (value / 100 - 100).toPrecision(2) + "%";
  document.getElementById("rateDisplay").innerText = text;
  // sending the new rate to the audio node
  audioNode.sendMessageToAudioScope({ rate: value });
}

// double click on the rate slider
function changeRateDbl() {
  document.getElementById("rateSlider").value = 10000;
  changeRate();
}

// click on play/pause
function togglePlayback(e) {
  let button = document.getElementById("playPause");
  if (button.value == 1) {
    button.value = 0;
    button.innerText = "PLAY";
    audioContext.suspend();
  } else {
    button.value = 1;
    button.innerText = "PAUSE";
    audioContext.resume();
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
          <button id="playPause" value="0" onClick={togglePlayback}>
            PLAY
          </button>
          <p id="rateDisplay">original tempo</p>
          <input
            id="rateSlider"
            type="range"
            min="5000"
            max="20000"
            defaultValue="10000"
            readOnly={true}
            onInput={changeRate}
            onDoubleClick={changeRateDbl}
            style={{ width: "100%" }}
          />
          <button id="pitchMinus" value="-1" onClick={changePitchShift}>
            -
          </button>
          <span id="pitchShiftDisplay"> pitch shift: 0 </span>
          <button id="pitchPlus" value="1" onClick={changePitchShift}>
            +
          </button>
        </>
      );
    }
  }
}

export default Init;
