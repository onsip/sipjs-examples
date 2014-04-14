window.instacall || (window.instacall = {});

(function () {

function MediaStreamManagerReuseAV(defaultConstraints) {
  this.streams = {
    audioOnly: null,
    audioVideo: null
  };
  this.setConstraints(defaultConstraints);
};

MediaStreamManagerReuseAV.prototype = Object.create(
  SIP.WebRTC.MediaStreamManager.prototype, {
    acquire: {value: function acquire (onSuccess, onFailure, constraints) {
      constraints = constraints || this.constraints;
      var tracks = constraints.video ? 'audioVideo' : 'audioOnly';
      if (this.streams[tracks]) {
        // HACK to prevent stoppage when referred. Search Session.js for "HACK.*localMedia"
        this.streams[tracks].stop = function () {
          console.warn("Don't stop() me now! If you wanna re-use me for... " +
                       "another new call!");
        };
        onSuccess(this.streams[tracks]);
      } else {
        SIP.WebRTC.getUserMedia(
          constraints,
          function (stream) {
            this.streams[tracks] = stream;
            onSuccess(stream);
          }.bind(this),
          onFailure
        );
      }
    }},

    // don't stop released streams
    release: {value: function release (stream) {}}
  }
);

// Export constructor for global use
instacall.MediaStreamManagerReuseAV = MediaStreamManagerReuseAV;

}());