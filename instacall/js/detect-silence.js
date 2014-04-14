window.instacall || (window.instacall = {});
(function () {

// adapted from https://github.com/muaz-khan/WebRTC-Experiment/tree/master/RecordRTC
function detectSilence (mediaStream, duration, onSilence) {
    // creates the audio context
    var audioContext = window.AudioContext || window.webkitAudioContext;

    if (!audioContext) {
      return;
    }

    var context = new audioContext();

    if (!context || !context.createGain || !context.createMediaStreamSource || !context.createScriptProcessor) {
      return;
    }

    // creates a gain node
    var volume = context.createGain();

    // creates an audio node from the microphone incoming stream
    var audioInput = context.createMediaStreamSource(mediaStream);

    // connect the stream to the gain node
    audioInput.connect(volume);

    // From the spec: This value controls how frequently the audioprocess event is
    // dispatched and how many sample-frames need to be processed each call.
    // Lower values for buffer size will result in a lower (better) latency.
    // Higher values will be necessary to avoid audio breakup and glitches

    // bug: how to minimize wav size?

    // The size of the buffer (in sample-frames) which needs to
    // be processed each time onprocessaudio is called.
    // Legal values are (256, 512, 1024, 2048, 4096, 8192, 16384).
    var legalBufferValues = [256, 512, 1024, 2048, 4096, 8192, 16384];
    var bufferSize = 2048;

    if (legalBufferValues.indexOf(bufferSize) == -1) {
        throw 'Legal values for buffer-size are ' + JSON.stringify(legalBufferValues, null, '\t');
    }

    // The sample rate (in sample-frames per second) at which the
    // AudioContext handles audio. It is assumed that all AudioNodes
    // in the context run at this rate. In making this assumption,
    // sample-rate converters or "varispeed" processors are not supported
    // in real-time processing.

    // The sampleRate parameter describes the sample-rate of the
    // linear PCM audio data in the buffer in sample-frames per second.
    // An implementation must support sample-rates in at least
    // the range 22050 to 96000.
    var sampleRate = context.sampleRate || 44100;

    if (sampleRate < 22050 || sampleRate > 96000) {
        throw 'sample-rate must be under range 22050 and 96000.';
    }

    console.log('sample-rate', sampleRate);
    console.log('buffer-size', bufferSize);

    var recorder = context.createScriptProcessor(bufferSize, 2, 2);

    var lastHeard = new Date().getTime();

    recorder.onaudioprocess = function(e) {
        if (mediaStream.ended) {
          recorder.onaudioprocess = function () {};
          return;
        }
        var time = new Date().getTime();
        var left = e.inputBuffer.getChannelData(0);
        var allzeros = true;
        for (var i = 0; i < left.length; i++) {
          if (left[i] != 0) {
            allzeros = false;
            break;
          }
        }
        // assume disabled streams aren't broken
        if (!allzeros || !mediaStream.getAudioTracks()[0].enabled) {
          lastHeard = time;
        }
        else if ((time - lastHeard) > duration && !onSilence(mediaStream)) {
          recorder.onaudioprocess = function () {};
        }
    };

    // we connect the recorder
    volume.connect(recorder);
    recorder.connect(context.destination);
}

// Export function for global access
instacall.Detector || (instacall.Detector = {});
instacall.Detector.detectSilence = detectSilence;  

}());