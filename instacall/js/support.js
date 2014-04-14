window.instacall || (window.instacall = {});

/** Check for WebRTC support */
(function () {
  var tests = [], test, testResult, classList = [];
  var html = document.documentElement;

  if (!html.classList) {
    return;
  }

  html.classList.remove('preview');

  if (instacall.urlVars && instacall.urlVars.removelogo === 'true') {
    html.classList.add('no-logo');
  }
  
  instacall.getUserMedia = (navigator.getUserMedia &&
                           navigator.getUserMedia.bind(navigator)) ||
                          (navigator.webkitGetUserMedia &&
                           navigator.webkitGetUserMedia.bind(navigator)) ||
                          (navigator.mozGetUserMedia &&
                           navigator.mozGetUserMedia.bind(navigator));

  tests['webrtcObject'] = function webrtcObjectTest() {
    var getUserMedia = (navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia);
    var RTCPeerConnection = (window.webkitRTCPeerConnection ||
                             window.mozRTCPeerConnection ||
                             window.RTCPeerConnection);
    var RTCSessionDescription = (window.webkitRTCSessionDescription ||
                              window.mozRTCSessionDescription ||
                              window.RTCSessionDescription);

    return (getUserMedia && RTCPeerConnection && RTCSessionDescription) ?
      {
        result: true,
        classes: ['webrtc-obj']
      } :
      {
        result: false,
        classes: ['no-webrtc-obj']
      };
  };

  tests['uaSniff'] = function uaSniffTest() {
    function getBrowser(ua) {
      var match, browser = {};
      ua = ua.toLowerCase();

      match = /(opr)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
        /(chrome)[ \/]([\w.]+)/.exec(ua) ||
        /(webkit)[ \/]([\w.]+)/.exec(ua) ||
        /(msie) ([\w.]+)/.exec(ua) ||
        ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
        [];

      if (match[1]) {
        browser[match[1]] = true;
        browser.version = match[2] || '0';
      } else {
        browser = false;
      }

      if (browser.chrome || browser.opr) {
        browser.webkit = true;
      } else if (browser.webkit) {
        browser.safari = true;
      }
      return browser;
    }

    var browser, supported, old, ret;

    instacall.browser = getBrowser(navigator.userAgent);
    if (instacall.browser.chrome) {
      /* Only Chrome 25 and up */
      supported = (/^2[5-9]\.|^[3-9][0-9]/).test(instacall.browser.version);
      old = !supported;
    } else if (instacall.browser.mozilla) {
      /* Only Firefox 23 and up */
      supported = (/^2[3-9]\.|^[3-9][0-9]/).test(instacall.browser.version);
      old = !supported;
    } else if (instacall.browser.opr) {
      supported = (/^1[8-9]\.|^[2-9][0-9]/).test(instacall.browser.version);
      old = !supported;
    } else {
      supported = false;
      old = false;
    }

    supported = supported && instacall.getUserMedia;

    // determine platform type and filter help overlays appropriately
    // adapted from http://www.javascripter.net/faq/operatin.htm
    if (navigator.appVersion.indexOf("Win")!=-1) instacall.browser.platform="win";
    if (navigator.appVersion.indexOf("Mac")!=-1) instacall.browser.platform="mac";

    ret = [];
    if (instacall.browser.chrome) ret.push('chrome');
    if (instacall.browser.mozilla) ret.push('mozilla');
    if (instacall.browser.platform) ret.push(instacall.browser.platform)

    ret.push((supported ? '' : 'no-') + 'browser-support');
    ret.push((old ? 'no-' : '') + 'modern');

    return {
      result: supported,
      classes: ret
    };
  };

  tests['detectDevices'] = function detectDevicesTest () {
    try {
      window.MediaStreamTrack.getSources(function (sources) {
        var constraints = {audio: false, video: false};

        for (var i = 0; i < sources.length; i++) {
          constraints[sources[i].kind] = true;
          console.log('found', sources[i].kind, 'device');
        }

        constraints.audio || html.classList.remove('audio-device');
        constraints.video || html.classList.remove('video-device');

        if (!constraints.audio && !constraints.video) {
          html.classList.remove('help-first');
        }
      });
    }
    catch (e) {
      console.log("MediaStreamTrack.getSources is either absent or exceptional");
    }

    return {
      result: true,
      classes: []
    };
  };

  instacall.webrtcSupport = true;
  for (test in tests) {
    if (tests.hasOwnProperty(test)) {
      testResult = tests[test]();
      instacall.webrtcSupport = instacall.webrtcSupport && testResult.result;
      classList.push(testResult.classes.join(' '));
    }
  }

  html.className += ' ' +
    classList.join(' ') + ' ' +  (instacall.webrtcSupport ? 'webrtc' : 'no-webrtc');
})();
