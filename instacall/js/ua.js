window.instacall || (window.instacall = {});

(function () {
  var elements = {
    //elements present throughout
    html: document.documentElement,
    multi: document.getElementById('multi-button'),
    videoDial: document.getElementById('video-dial-button'),
    audioDial: document.getElementById('audio-dial-button'),
    bottom: document.getElementById('bottom'),
    status: document.getElementById('status'),
    overlay: document.getElementById('overlay'),
    
    //setup screen elements
    connect: document.getElementById('connecting'),
    connectwrap: document.getElementById('connecting-wrap'),
    welcome: document.getElementById('welcome'),
    intro: document.getElementById('intro'),
    vidcheck: document.getElementById('video-box'),
    name: document.getElementById('name'),

    //phone elements
    callstatus: document.getElementById('call-status'),
    company: document.getElementById('company'),
    timer: document.getElementById('timer'),
    controls: document.getElementById('controls'),
    streams: document.getElementById('streams'),
    mutetext: document.getElementById('mute-text'),
    mutebox: document.getElementById('mute-box'),
    switchtext: document.getElementById('switch-text'),
    videoswitch: document.getElementById('video-switch'),
    volume: document.getElementById('volume-slider'),
    volpic: document.getElementById('volume-pic'),
    remoteVideo: document.getElementById('stream-remote'),
    localVideo: document.getElementById('stream-local'),
    noVideo: document.getElementById('no-video'),
    ringback: document.getElementById('ringback'),
    dtmfbuttons: document.getElementsByClassName('dtmf'),
  };
  elements.html.classList.remove('no-js');
  if (!instacall.webrtcSupport) {

  } else if (elements.overlay) {
    elements.overlay.classList.add('overlayabsent');
  }
  var timer;
  
  /*
   *  #45: The instant phone should display an error message if there are not enough parameters
   */
   
  if (!instacall.config.target || instacall.config.target === "") {
    instacall.switchHelp('missing-params');
    instacall.showHelp();
    console.log("Missing target address");
    return;
  }

  function attachMediaStream(element, stream) {
    if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }

    element.play();
  }

  function onSilence (mediaStream) {
    var bodyConnected = document.body.classList.contains('connected');
    onSilence.firstCallMade |= bodyConnected;
    if (mediaStream === onSilence.defaultStream) {
      // Ignore silence on the default audio stream created by getUserMedia on page load,
      // if there haven't been any calls yet.
      if (onSilence.firstCallMade) {
        console.log("onSilence ignoring default local audio stream silence");
        return false;
      }
    }
    else if (!bodyConnected) {
      // Ignore silence on streams made for calls that are not connected.
      console.log("onSilence ignoring non-default local audio stream non-call silence");
      return false;
    }
    console.log("Local audio went silent. Notifying user.");
    elements.html.classList.add('lost-local-audio');
    instacall.switchHelp('lost-local-media');
    instacall.showHelp();
    return false;
  }

  function detectLocalSilence (localMediaStream) {
    var duration = 5000;
    try {
      if (localMediaStream.getAudioTracks().length) {
        instacall.Detector.detectSilence(localMediaStream, duration, onSilence);
      }
    }
    catch (e) {
      console.log(e);
    }
  }

  // use setTimeout to allow time for window.outerWidth/Height to be set
  window.setTimeout(function () {
    // Short circuit instead of failing later
    if (!instacall.webrtcSupport) return;

    // resize Chrome window to account for getUserMedia prompt - ticket 136
    var chromeGrow = 36;
    var chromeShrink = -chromeGrow;
    var gumEatenInnerHeight;
    var retryGumTimeout;
    if (instacall.browser.chrome) {
      gumEatenInnerHeight = window.innerHeight + chromeGrow;
      window.resizeBy(0, chromeGrow);
    }

    function firstGum () {
      instacall.getUserMedia(
        //constraints
        {
          video: instacall.video,
          audio: true,
        },
        //success Callback
        function(localMediaStream) {
          window.clearTimeout(retryGumTimeout);
          instacall.mediaStreamManager = new instacall.MediaStreamManagerReuseAV();

          var hasVideo = localMediaStream.getVideoTracks().some(function () {
            instacall.mediaStreamManager.streams.audioVideo = localMediaStream;
            return true;
          });
          if (!hasVideo) {
            instacall.mediaStreamManager.streams.audioOnly = localMediaStream;
          }

          if (instacall.browser.chrome) {
            window.resizeBy(0, chromeShrink);
          }

          instacall.hideHelp();
          attachMediaStream(elements.localVideo, localMediaStream);

          onSilence.defaultStream = localMediaStream
          var setupDelay = 2000;
          setTimeout(detectLocalSilence.bind(null, localMediaStream), setupDelay);

          // if there's a local media stream, tell the user if it freezes (usually means the webcam stopped working)
          if (localMediaStream.getVideoTracks().length) {
            var videoFreezeTimeout = 5000;

            function onFreeze () {
              console.log("Local video froze for", videoFreezeTimeout, "milliseconds. Notifying user.");
              elements.html.classList.add('lost-local-video');
              instacall.switchHelp('lost-local-media');
              instacall.showHelp();
              return false;
            }

            // XXX wait until firefox has the video up and playing
            var setupDelay = 5000;
            window.setTimeout(function () {
              instacall.Detector.detectVideoFreeze(
                elements.localVideo,
                videoFreezeTimeout,
                onFreeze);
            }, setupDelay);
          }
        },
        //error Callback
        function(err) {
          window.clearTimeout(retryGumTimeout);
          if (instacall.browser.chrome) {
            window.resizeBy(0, chromeShrink);
          }

          console.log(err);
        }
      );
    }

    firstGum();

    if (instacall.browser.chrome) {
      var gumEatenDelay = 2000;
      retryGumTimeout = window.setTimeout(function () {
        if (window.innerHeight === gumEatenInnerHeight) {
          console.error('Chrome seems to have eaten the first getUserMedia, trying again...');
          firstGum();
        }
      }, gumEatenDelay);
    }
  }, 200);

  function dial() {
    if(window._gaq) {
      window._gaq.push(['_trackEvent', 'instacall/' + instacall.urlVars.internalname, 'callDialed']);
    }
    var options = {
      media: {
        audio: true,
        video: elements.vidcheck.checked
      },
      RTCConstraints: {
        optional: [{
          DtlsSrtpKeyAgreement: true
        }],
        mandatory: {
          OfferToReceiveVideo: elements.vidcheck.checked
        }
      },
      eventHandlers: {
        'started': function () {
          if(window._gaq) {
            window._gaq.push(['_trackEvent', 'instacall/' + instacall.urlVars.internalname, 'callStarted']);
          }
        }
      },
      inviteWithoutSdp: true
    };

    var session = instacall.ua.invite(instacall.config.target, options);
    instacall.onInvite(session);
  }

  function connecting() {
    if (elements.connect.innerHTML == "Connecting....") {
      elements.connect.innerHTML = "Connecting.";
    } else {
      elements.connect.innerHTML += ".";
    }
  }

  function endCall(e) {
    if (instacall.session) {
      instacall.session.terminate();
    }
  }

  function earlyEnd(e) {
    elements.overlay.classList.add('overlayabsent');
    elements.multi.classList.remove('foreground');
    elements.status.classList.remove('foreground');

    elements.multi.innerHTML = "Connect Now";

    elements.multi.removeEventListener('click', earlyEnd, false);
    elements.multi.addEventListener('click', initialState, false);

    elements.welcome.classList.remove("invisible");
    elements.connectwrap.classList.add("invisible");
    elements.audioDial.classList.remove('disabled');
    elements.videoDial.classList.remove('disabled');
    if (instacall.video) {
      elements.multi.classList.add('disabled');
    }

    clearInterval(timer);
  }

  /* This code runs on the initial Connect Now click */
  function initialState(e) {
    var usingNameField = elements.html.classList.contains('has-name-field');
    if (usingNameField && !elements.name.value) {
      elements.name.value = "Please enter your name";
      elements.name.classList.add('error');
      elements.name.blur();
      elements.name.addEventListener('focus', function(e) {
        elements.name.classList.remove('error')
        elements.name.value = '';
        this.removeEventListener('focus', arguments.callee, false);
      });
    } else if (!usingNameField || !elements.name.classList.contains('error')) {
      elements.overlay.classList.remove('overlayabsent');
      elements.multi.classList.add('foreground');
      elements.status.classList.add('foreground');
      if (usingNameField) {
        elements.name.blur();
      }

      elements.multi.innerHTML = "Cancel Call";


      elements.welcome.classList.add("invisible");
      elements.connectwrap.classList.remove("invisible");
      elements.audioDial.classList.add('disabled');
      elements.videoDial.classList.add('disabled');
      elements.multi.classList.remove('disabled');

      timer = setInterval(connecting, 500);

      elements.multi.removeEventListener('click', initialState, false);
      elements.multi.addEventListener('click', endCall, false);

      if (this === elements.videoDial) {
        elements.vidcheck.checked = true;
      } else if (this === elements.audioDial) {
        elements.vidcheck.checked = false;
      }

      initializeUA();
      dial();
    }
  }

  /* This code runs right before the call begins */
  function transferState(e) {
    var height = 288, width = 320;
    elements.overlay.classList.add('overlayabsent');
    elements.status.classList.remove('foreground');

    elements.intro.classList.add('hidden');

    elements.controls.classList.remove('hidden');

    if (elements.vidcheck.checked) { /* Video Check */
      elements.streams.classList.remove('hidden');
      elements.bottom.classList.remove('skinny');
      document.body.classList.remove('small');
      width = 640;
      height += 480;
    }

    elements.callstatus.classList.remove("invisible");
    elements.connectwrap.classList.add("invisible");
    elements.audioDial.classList.add('disabled');
    elements.videoDial.classList.add('disabled');
    elements.multi.classList.remove('disabled');

    elements.multi.innerHTML = "End Call";

    if (instacall.dtmf) { /* DTMF Check */
      elements.html.classList.add('has-dtmf');
      height += 206;
    }

    clearInterval(timer);
    window.resizeTo(width, height);

    elements.timer.timerStart();
  }

  /* This code runs when the call ends */
  function endState(e) {
    if(instacall.urlVars.video == "true") {
      window.resizeTo(320,284);
    }
    else {
      window.resizeTo(320,284);
    }
    elements.intro.classList.remove('hidden');

    elements.controls.classList.add('hidden');

    if (elements.vidcheck.checked) { /* Video Check */
      elements.bottom.classList.add('skinny');
      document.body.classList.add('small');
      elements.streams.classList.add('hidden');
    }

    if (true) { /* DTMF Check */
      elements.html.classList.remove('has-dtmf');
    }

    elements.callstatus.classList.add("invisible");
    elements.welcome.classList.remove("invisible");
    elements.audioDial.classList.remove('disabled');
    elements.videoDial.classList.remove('disabled');
    if (instacall.video) {
      elements.multi.classList.add('disabled');
    }

    elements.multi.innerHTML = "Connect Now";

    elements.multi.removeEventListener('click', endCall, false);
    elements.multi.addEventListener('click', initialState, false);
  }

  elements.multi.addEventListener('click', initialState, false);
  elements.audioDial.addEventListener('click', initialState, false);
  elements.videoDial.addEventListener('click', initialState, false);

  elements.mutebox.addEventListener('click', function (e) {
    var localStream = instacall.session.mediaHandler.getLocalStreams()[0],
    audioTrack = localStream.getAudioTracks()[0];

    if (elements.mutebox.checked) {
      elements.mutetext.innerHTML = "On mute";
      audioTrack.enabled = false;
    } else {
      elements.mutetext.innerHTML = "Mute";
      audioTrack.enabled = true;
    }
  }, false);

  elements.name.addEventListener('keypress', function (e) {
    var key = e.which || e.keyCode;
    if (key == 13) { // 13 is enter
      document.getElementById('multi-button').click();
    }
  }, false);

  elements.videoswitch.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var localStream = instacall.session.mediaHandler.getLocalStreams()[0],
        videoTrack = (localStream.getVideoTracks().length > 0) && localStream.getVideoTracks()[0];

    elements.videoswitch.classList.toggle('disable');

    if (!elements.videoswitch.classList.contains('disable')) {
      //enable local stream
      videoTrack.enabled = true;
      elements.localVideo.style.display = "block";
      elements.switchtext.innerHTML = "Disable Video";
    } else {
      //disable local stream
      videoTrack.enabled = false;
      elements.localVideo.style.display = "none";
      elements.switchtext.innerHTML = "Enable Video";
    }
  }, false);

  elements.volume.addEventListener('input', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var noiselevel = parseInt(elements.volume.value);
    elements.remoteVideo.volume = e.currentTarget.value / 100;
    
    var colorA;
    var colorB;
    
    if (instacall.theme === "flat-dark" || instacall.theme === "skeu-dark") {
      colorA = '#444444';
      colorB = '#666666';
    } else {
      colorA = '#CCCCCC';
      colorB = '#FFFFFF';
    }
    
    if (instacall.browser.chrome) {
    elements.volume.style.backgroundImage = "-webkit-gradient(linear, left top, right top, color-stop(0%," + colorA + "), color-stop(" + noiselevel + "%," + colorA + "), color-stop(" + (noiselevel + 1) + "%,"+ colorB + "), color-stop(100%," + colorB + "))";
    } else if (instacall.browser.mozilla) {
      elements.volume.style.backgroundImage = "-moz-linear-gradient(left, " + colorA + " 0%, "+ colorA + noiselevel + "%, " + colorB + (noiselevel + 1) + "%, " + colorB + " 100%)";
    }

    //NOTE: FF does not allow multiple removals at once
    if (noiselevel <= 32 && !elements.volpic.classList.contains('low')) {
      elements.volpic.classList.remove('med');
      elements.volpic.classList.remove('high');
      elements.volpic.classList.add('low');
    } else if (noiselevel > 32 && noiselevel <= 66 && !elements.volpic.classList.contains('med')) {
      elements.volpic.classList.remove('low');
      elements.volpic.classList.remove('high');
      elements.volpic.classList.add('med');
    } else if(noiselevel > 66 && !elements.volpic.classList.contains('high')){
      elements.volpic.classList.remove('med');
      elements.volpic.classList.remove('low');
      elements.volpic.classList.add('high');
    }
  }, false);

  function initializeUA() {
    if (instacall.ua) {
      instacall.ua.stop();
      instacall.session = null;
    }
    instacall.config.mediaHandlerFactory = function (session, options) {
      options = options || {};
      options.mediaStreamManager = instacall.mediaStreamManager;
      return new SIP.WebRTC.MediaHandler(session, options);
    };
    instacall.ua = new SIP.UA(instacall.config);
    instacall.ua.start();
    localStorage.setItem('sip:instanceId', instacall.ua.configuration.instanceId.replace(/uuid:/, ''));

    instacall.ua.on('registered', function () {
      firstTry = true;
    });

    instacall.ua.on('registrationFailed', function () {
      if (firstTry) {
        firstTry = false;
        instacall.ua.register();
      } else {
        
      }
    });

    instacall.ua.on('invite', onInvite);

    function onInvite(session, isReferred) {
      if (instacall.session) {
        instacall.session.terminate();
        if (!isReferred) {
          return;
        }
      }

      instacall.session = session;

      session.on('progress', progress);
      session.on('accepted', onAccept);
      session.once('bye', ended);
      session.once('failed', ended);
      session.once('cancel', ended);
      session.on('refer', onRefer);

      function onRefer (target, request) {
        instacall.referred = true;

        var hint = session.mediaHint;

        var referSession = instacall.ua.invite(target, {
          media: hint,
          RTCConstraints: {
            optional: [{
              DtlsSrtpKeyAgreement: true
            }],
            mandatory: {
              OfferToReceiveVideo: !!(hint && hint.video)
            }
          },
          inviteWithoutSdp: true
        });

        session.bye();
        instacall.onInvite(referSession, true);
      }
      
      function progress() {
        if (elements.ringback.paused) {
          elements.ringback.currentTime = 0;
          elements.ringback.play();
          if (instacall.customdata) {
            instacall.ua.message(instacall.config.target,
              JSON.stringify(instacall.customdata),
              {'contentType':'application/json'});
          }
        }
      }

      function parseMediaAnswered(message) {
        // Don't bother if the body isn't there yet.
        if (!message || !message.body) return;

        // Video is only really enabled if "m=video ..." isn't the only line in its media-level section. Thanks, Polycom...
        var pattern = "\nm=video[^\n]*\n[^\nm]";
        var activePattern = "\na=send"; // sendonly or sendrecv
        var audioPattern = "\nm=audio";

        var videoIndex = message.body.search(pattern);
        var audioIndex = message.body.search(audioPattern);

        var bodyToSearch = message.body;
        if (videoIndex === -1) {
          bodyToSearch = '';
        } else if (audioIndex > videoIndex) {
          bodyToSearch = bodyToSearch.substring(videoIndex, audioIndex);
        } else {
          bodyToSearch = bodyToSearch.substring(videoIndex);
        }

        var hasVideo = videoIndex > -1 && (bodyToSearch.search(activePattern) > -1);

        // Don't show the "video disabled" message if there's supposed to be video.
        if (hasVideo) {
          elements.noVideo.classList.add("hidden");
        } else {
          elements.noVideo.classList.remove("hidden");
        }
      }

      function onAccept (e) {
        if(window._gaq) {
          window._gaq.push(['_trackEvent', 'instacall/' + instacall.urlVars.internalname, 'callStarted']);
        }
        parseMediaAnswered(e.response);
        elements.ringback.pause();
        transferState()

        attachMediaStream(elements.remoteVideo, session.mediaHandler.getRemoteStreams()[0]);

        elements.localVideo.play();

        document.body.classList.add('connected')
        onSilence.firstCallMade = true;
        detectLocalSilence(session.mediaHandler.getLocalStreams()[0]);

        // Make sure the remote video actually plays - Ticket 157
        var playInterval = 100;
        elements.remoteVideo.ensurePlayingInterval = setInterval(function () {
          if (elements.remoteVideo.paused) {
            elements.remoteVideo.play()
          }
          else {
            clearInterval(elements.remoteVideo.ensurePlayingInterval);
          }
        }, playInterval);

        // Make sure the remote video is actually visible - Ticket 287
        var showInterval = 100;
        elements.remoteVideo.ensureShowingInterval = setInterval(function () {
          var remoteStream = session.mediaHandler.getRemoteStreams()[0];
          var stop = clearInterval.bind(null, elements.remoteVideo.ensureShowingInterval);
          if (!remoteStream) {
            stop();
          }
          else if (remoteStream.getVideoTracks().length > 0) {
            elements.noVideo.classList.add("hidden");
            stop();
          }
        }, showInterval);
      }

      function ended(e) {
        instacall.session.off();
        elements.timer.timerClear();
        if (instacall.referred) {
          instacall.referred = false;
        }
        else {
          var isBye = e && e.method === 'BYE';
          if(isBye && window._gaq) {
                 window._gaq.push(['_trackEvent', 'instacall/' + instacall.urlVars.internalname, 'callEnded']);
          }
          elements.ringback.pause();
          elements.multi.classList.remove('foreground');
          if (elements.connectwrap.classList.contains("invisible")) {
            elements.remoteVideo.src = '';
            elements.localVideo.pause();
            endState(e);
          } else {
            earlyEnd(e);
          }
          instacall.session = null;

          document.body.classList.remove('connected');
          var is2xx = e && 200 <= e.code && e.code < 300;
          var helpType = is2xx || isBye ? 'call-complete' : 'call-error';
          setTimeout(function () {
            instacall.switchHelp(helpType);
            instacall.showHelp();
          }, 1000);
        }
      }
    }
    instacall.onInvite = onInvite;
  }

  function dtmfHandler (value, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    var options = {
      'eventHandlers': {
        'succeeded': function(e){
          console.log('DTMF SUCCESS!');
        },
        'failed': function(e){
          console.log('DTMF FAILURE!');
        },
      },
    };
    if (instacall.session && elements.intro.classList.contains('hidden')) {
      instacall.session.dtmf(value,options);
    }
  }

  for (var i=0; i < elements.dtmfbuttons.length; i++) {
    var button = elements.dtmfbuttons[i]
    button.addEventListener('click', dtmfHandler.bind(null, button.id), false);
  }

  var dtmfValues = [1,2,3,4,5,6,7,8,9,'*',0,'#'].join('').split('');
  window.addEventListener('keypress', function (e) {
    var symbol = String.fromCharCode(e.charCode);
    if (dtmfValues.indexOf(symbol) > -1) {
      dtmfHandler(symbol);
    }
  }, false);

  function setText (text, node) {
    node.textContent = text;
  }

  function buildTimer (node) {
    var beginning;
    var intervalId;

    // adapted from http://stackoverflow.com/questions/6312993/javascript-seconds-to-time-with-format-hhmmss
    function toHHMMSS (sec_num) {
      var hours   = Math.floor(sec_num / 3600);
      var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
      var seconds = Math.floor(sec_num - (hours * 3600) - (minutes * 60));

      if (hours   < 10) {hours   = "0"+hours;}
      if (minutes < 10) {minutes = "0"+minutes;}
      if (seconds < 10) {seconds = "0"+seconds;}
      var time = hours+':'+minutes+':'+seconds;
      return time;
    }

    function init () {
      beginning = Date.now();
    }

    function update () {
      var nowMs = Date.now();
      var elapsedMs = nowMs - beginning;
      var elapsedSec = elapsedMs / 1000;
      setText(toHHMMSS(elapsedSec), node);
    }

    node.timerStart = function () {
      init();
      intervalId = window.setInterval(update, 500);
    };

    node.timerClear = function () {
      window.clearInterval(intervalId);
      window.setTimeout(setText.bind(null, "00:00:00", node), 1000);
    }

    node.timerClear();

    return node;
  }

  buildTimer(elements.timer);
})();

// Set up DTMF tone playback - Ticket 123
try {
  (function () {
    var intro = document.querySelector('#intro');
    instacall.audioContext = instacall.audioContext || new (window.AudioContext || window.webkitAudioContext)();

    // Creates, starts, and returns a sinusoidal tone of the specified frequency.
    // To play the tone, connect the tone to the audio context's destination.
    // To stop the tone, disconnect it.
    function makeTone (frequency) {
      var tone = instacall.audioContext.createOscillator();
      tone.frequency.value = frequency;
      tone.start(0);
      return tone;
    }

    // Build the tones corresponding to the frequency grid shown at
    // https://en.wikipedia.org/wiki/Dtmf#Keypad
    var toneRows = [697, 770, 852, 941].map(makeTone);
    var toneCols = [1209, 1336, 1477].map(makeTone);

    // Get the tones associated with the key at the specified grid index
    // in the keypad (ordered left-to-right, top-to-bottom).
    function getTones (keyIndex) {
      var row = Math.floor(keyIndex / 3);
      var col = keyIndex % 3;
      var tones = [toneRows[row], toneCols[col]];
      return tones;
    }

    // If [isOn], play the tones of the [keyIndex]th DTMF key.
    // Otherwise, stop its tones.
    function toggleKeyTones (keyIndex, isOn) {
      if (intro.classList.contains('hidden')) {
        var methodName = isOn ? 'connect' : 'disconnect';
        var tones = getTones(keyIndex);
        var audioOut = instacall.audioContext.destination;
        tones[0][methodName](audioOut);
        tones[1][methodName](audioOut);
      }
    }

    // Given a DTMF key <button> and its grid index, play the appropriate tones when the mouse is pressed on the key.
    function playOnPress (key, index) {
      ['mousedown', 'touchstart'].forEach(function (action) {
        var listener = toggleKeyTones.bind(null, index, true);
        key.addEventListener(action, listener, false);
      });
      ['mouseup', 'mouseout', 'touchend', 'touchcancel', 'touchleave'].forEach(function (action) {
        var listener = toggleKeyTones.bind(null, index, false);
        key.addEventListener(action, listener, false);
      });
    }

    [].forEach.call(document.querySelectorAll('.dtmf'), playOnPress);

    var dtmfValues = [1,2,3,4,5,6,7,8,9,'*',0,'#'].join('').split('');

    function bindToneKeyEvent (motion, isOn) {
      window.addEventListener('key' + motion, function (e) {
        var symbol = String.fromCharCode(e.keyCode);
        var index = dtmfValues.indexOf(symbol);
        if (index > -1) {
          if (!isOn) {
            toggleKeyTones(index, false);
            document.getElementById(symbol).classList.remove('dtmf-active');

            // turn off #/* buttons/tones to avoid key conflicts
            if ('3' === symbol) {
              toggleKeyTones(11, false);
              document.getElementById('#').classList.remove('dtmf-active');
            }

            if ('8' === symbol) {
              toggleKeyTones(9, false);
              document.getElementById('*').classList.remove('dtmf-active');
            }
          }
          else {
            toggleKeyTones(index, isOn);
            document.getElementById(symbol).classList.add('dtmf-active');
          }
        }
      }, false);
    }

    bindToneKeyEvent('press', true);
    bindToneKeyEvent('up', false);
  })();
}
catch (e) {
  console.error("DTMF tone playback failed to initialize:", e);
}

// Bind name field to caller ID - Ticket 99
try {
  (function () {
    var nameField = document.querySelector('#name');

    function changeListener (e) {
      var nameField = document.querySelector('#name');
      if (!instacall || !instacall.config || !nameField) {
        return;
      }

      var callerName = nameField.value;
      if (instacall.callerid === 'caller-name-tag') {
        instacall.config.displayName = instacall.calleridtag + ' ' + callerName;
      }
      else if (instacall.callerid === 'caller-name') {
        instacall.config.displayName = callerName;
      }
    }

    nameField.addEventListener('change', changeListener, false);
    nameField.addEventListener('keyup', changeListener, false);
  })();
}
catch (e) {
  console.error('Could not bind name field to caller ID:', e);
}

// Get customdata from the button window - Ticket 116
try {
  (function () {
    var buttonWindow = window.opener || window.parent;
    if (!buttonWindow || window === buttonWindow) {
      console.log("widget not opened by button");
      return;
    }

    window.addEventListener('message', function (e) {
      try {
        console.log(e.origin, 'sent', e.data, 'to widget window');
        var json = e.data.split('customdata:', 2)[1];
        console.log(json);
        window.instacall.customdata = JSON.parse(json);
      }
      catch (e) {
        console.error('failed to receive well-formed customdata:', e);
      }
    }, false);

    buttonWindow.postMessage('customdata?', '*');
  })();
}
catch (e) {
  console.error('Could not get customdata from button window:', e);
}

// Confirm when user closes window during a call. Terminate the session when the window closes. - Ticket 199
try {
  (function () {
    window.addEventListener('beforeunload', function (e) {
      if (instacall && instacall.session) {
        e.returnValue = "Leaving this page will end your call.";
      }
    }, false);

    window.addEventListener('unload', function (e) {
      instacall && instacall.session && instacall.session.terminate();
    }, false);
  })();
}
catch (e) {
  console.error('Could not register window-close listener:', e);
}
