// FILL IN THESE VALUES
var config = {
  wsServers: null,
  uri: null,
  authorizationUser: null,
  password: null,
  // FILL IN THOSE VALUES ^

  userAgentString: 'SIP.js/0.5.0-devel BAREBONES DEMO',
  traceSip: true,
};

var $ = document.getElementById.bind(document);

// ensure config values are provided
var requiredParams = ['wsServers', 'uri', 'authorizationUser', 'password'];
requiredParams.some(function checkParam (param) {
  if (config[param]) {
    return false;
  }

  alert('config.' + param + ' is not set! Please open phone.js and set each of the following:\n\n\t* config.' + requiredParams.join('\n\t* config.'));
  return true;
});

var ua = new SIP.UA(config);

ua.on('invite', handleInvite);
ua.on('message', receiveMessage);

function handleInvite (s) {
  var text = s.remoteIdentity.uri.toString() + ' is calling you. Accept?';
  var accept = confirm(text);
  if (accept) {
    s.accept(getSessionOptions());
    setupSession(s);
  }
  else {
    s.reject();
  }
}

function receiveMessage (e) {
  var remoteUri = e.remoteIdentity.uri.toString();
  showMessage(remoteUri, e.body);
}

function showMessage (from, body) {
  $('chat-log').textContent += from + ': ' + body + '\n'
  $('log-container').scrollTop = $('log-container').scrollHeight;
}

function sendMessage () {
  var target = $('target') || (session && session.remoteIdentity.uri.toString());
  if (!target) {
    return;
  }

  var body = $('message').value;
  $('message').value = '';
  ua.message(target, body);
  showMessage(ua.configuration.uri.toString(), body);
}

function sendDtmf (value) {
  if (session && /[1234567890#*]/.test(value)) {
    session.dtmf(value);
  }
}

var session;

function getSessionOptions () {
  return {
    media: {
      audio: true,
      video: $('video-enabled').checked
    }
  };
}

function dial () {
  if (!$('target').value) {
    return;
  }

  setupSession( ua.invite($('target').value, getSessionOptions()) );
}

function endSession () {
  if (session) {
    session.terminate();
  }
}

function setupSession (s) {
  endSession();
  session = s;

  session.on('accepted', onAccepted.bind(session));
  session.once('bye', onTerminated.bind(session));
  session.once('failed', onTerminated.bind(session));
  session.once('cancel', onTerminated.bind(session));
}

function onTerminated () {
  session = null;
  attachMediaStream($('remote-media'), null);
}

function onAccepted () {
  this.mediaHandler.getRemoteStreams().forEach(
    attachMediaStream.bind(null, $('remote-media'))
  );
}

function attachMediaStream (element, stream) {
  if (typeof element.src !== 'undefined') {
    URL.revokeObjectURL(element.src);
    element.src = URL.createObjectURL(stream);
  } else if (typeof element.srcObject !== 'undefined'
       || typeof element.mozSrcObject !== 'undefined') {
    element.srcObject = element.mozSrcObject = stream;
  } else {
    console.log('Error attaching stream to element.');
    return false;
  }

  ensureMediaPlaying(element);
  return true;
}

function ensureMediaPlaying (mediaElement) {
  var interval = 100;
  mediaElement.ensurePlayingIntervalId = setInterval(function () {
    if (mediaElement.paused) {
      mediaElement.play()
    }
    else {
      clearInterval(mediaElement.ensurePlayingIntervalId);
    }
  }, interval);
}
