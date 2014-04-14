window.instacall || (window.instacall = {});

(function () {
  if (!document.documentElement || !document.documentElement.classList) return;

  var elements = {
    //elements present throughout
    html: document.documentElement,
    status: document.getElementById('status'),
    overlay: document.getElementById('overlay'),
    intro: document.getElementById('intro'),
    controls: document.getElementById('controls'),
    streams: document.getElementById('streams'),
    bottom: document.getElementById('bottom'),
    callstatus: document.getElementById('call-status'),
    connectwrap: document.getElementById('connecting-wrap'),
    multi: document.getElementById('multi-button'),
    vidcheck: document.getElementById('video-box'),
    welcome: document.getElementById('welcome')
  };
    elements.html.classList.add('preview');
    if (instacall.urlVars.hasOwnProperty('active-preview')) {
      elements.html.classList.add('active-preview');
      var height = 288, width = 320;
      elements.welcome.classList.add('hidden');
      elements.overlay.classList.add('overlayabsent');
      elements.multi.classList.add('foreground');
      elements.status.classList.remove('foreground');
  
      elements.intro.classList.add('hidden');
  
      elements.controls.classList.remove('hidden');
  
      if (instacall.video) { /* Video Check */
        elements.streams.classList.remove('hidden');
        elements.bottom.classList.remove('skinny');
        document.body.classList.remove('small');
        width = 640;
        height += 480;
      }
  
      elements.callstatus.classList.remove("invisible");
      elements.connectwrap.classList.add("invisible");
  
      elements.multi.innerHTML = "End Call";
  
      if (instacall.dtmf) { /* DTMF Check */
        elements.html.classList.add('has-dtmf');
        height += 206;
      }
    }

})();
if (window.addEventListener) {
  window.addEventListener('message', function (e) {
    // You must verify that the origin of the message's sender matches your
    // expectations. In this case, we're only planning on accepting messages
    // from our own origin, so we can simply compare the message event's
    // origin to the location of this document. If we get a message from an
    // unexpected host, ignore the message entirely.
    //
    //  if (e.origin !== (window.location.protocol + "//" + window.location.host)) {
    //    console.log("preview iframe ignoring message from", e.origin);
    //    return;
    //  }

    console.log(e.origin, 'sent', e.data, 'to preview iframe');
    instacall.QueryParser.parseAndUpdate(e.data);
  }, false);
}
