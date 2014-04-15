var conf, priv;
var localVideo = document.querySelector('#local video');
var remote = document.querySelector('#remote video');
var newChat = document.getElementById('newChat');

var findChat = true;
 
//adds an onclick event to the newChat button.  This event sends a message to the group asking to be invited to a new video chat.
newChat.onclick = function (){ 
findChat = true;
priv.message(conf.configuration.uri, 'Invite me, please!');

};

//Attaches the media stream to the video element
function attachMediaStream(element, stream) {
  if (typeof element.src !== 'undefined') {
    element.src = URL.createObjectURL(stream);
  } else {
    console.log('Error attaching stream to element.');
  }
  //plays the video element that was attached
  setTimeout(function () {
    element.play();
  }, 0);
}
//gets the voice and video stream data from the camera and microphone, and sends it to the below function
SIP.WebRTC.getUserMedia({ audio: true, video: true}, function (stream) {
  window.localStream = stream;
  //plays the local video
  attachMediaStream(localVideo, stream);
  //creates a new user agent that can receive and send video call invites
  priv = new SIP.UA('guest.' + Math.floor(Math.random() * 9999) + '@codeday.onsip.com').
    once('registered', function () {
      //after the user agent is "registered", or created, it sends a message to the group, telling them to invite it to a new video call
      priv.message(conf.configuration.uri, 'Invite me, please!');
    }).
    on('invite', function (session) {
      //after receiving an invite, if it is looking for a new call, it accepts the call and sets up the video stream
      if(findChat == true){
      session.
        accept({mediaStream: window.localStream}).
        on('accepted', function () {
          //after accepting the call, it attaches the media stream to the video element, and stops looking for calls
        attachMediaStream(remote, this.getRemoteStreams()[0]);
          this.data.remote = remote;
          findChat = false;
        }).
        on('bye', function () {

        });
      }
    }).
    start();
  //registers to the chat@codeday.onsip.com account so that it an receive messages sent to this address.
  conf = new SIP.UA('chat@codeday.onsip.com').
    on('message', function (message) {
    //if you are looking for a new chat, then it sends an invite, and sets up a call, with anyone who messages the address.
    if(findChat == true){
        priv.invite(message.remoteIdentity.uri.toString(), null, window.localStream).
        on('accepted', function () {
          //attaches the video stream to the video element, and stops looking for a chat
        attachMediaStream(remote, this.getRemoteStreams()[0]);
          this.data.remote = remote;
          findChat = false;
        }).
        on('bye', function () {

        });
      }
    }).
    start(); //starts the user agent
  //ends all calls when the window closes
  window.onbeforeunload = function () {
    conf.stop();
    priv.stop();
  };

}, function () {});
