window.instacall || (window.instacall = {});

(function () {

/*
  Call a function whenever this video freezes. Uses two offscreen canvases to compare video frames.
  The <video> element should be playing and visible on screen when this method is called.

  Arguments:
    video - The video element to detect on
    frameInterval - The number of milliseconds between frames to compare.
    onFreeze - A function to be called whenever two frames [frameInterval] apart are the same.
               Returns a boolean indicating whether or not to keep checking for freezes.
*/
function detectVideoFreeze(video, frameInterval, onFreeze) {
  // Get the rendered dimensions of the target video
  var width = video.offsetWidth;
  var height = video.offsetHeight;
  var pixels = width * height;

  console.log("calling", video, ".detectFreeze()");

  // Return the CanvasRenderingContext2D of a new offscreen <canvas> the same dimensions as the target video.
  function makeContext () {
    var c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c.getContext('2d');
  }
  var contexts = [0,1].map(makeContext);

  // Draw a [width] by [height] element [image] to the [index]th canvas
  video.dfToCanvas = function (index) {
    // FF might throw an exception without these
    if (video.offsetWidth > video.width)
      width = video.width = video.offsetWidth;
    if (video.offsetHeight > video.height)
      height = video.height = video.offsetHeight;

    contexts[index].drawImage(video, 0, 0, width, height);
    return true;
  }

  // Return a Uint32Array representing the image rendered by the given canvas context
  function get32BitImageData (context) {
    return new Uint32Array(context.getImageData(0, 0, width, height).data.buffer);
  }

  // Determine whether two Uint32Array objects of length [pixels] have the same items
  function eq32Arrays (datas) {
    for (var i = 0; i < pixels; i++) {
      if (datas[0][i] ^ datas[1][i]) {
        return false;
      }
    }
    return true;
  }

  // Determine whether the offscreen canvases show the same frame.
  function sameFrames () {
    return eq32Arrays(contexts.map(get32BitImageData));
  }

  // should only be called with index=0 or index=1
  video.dfScheduleUpdate = function (index) {
    this.detectFreezeTimeoutID = window.setTimeout(this.dfUpdate.bind(this, index), frameInterval);
  }

  // should only be called with index=0 or index=1
  video.dfUpdate = function (index) {
    // this is set up as a try-catch block because Firefox sometimes has weird errors
    try {
      if (this.paused
          || (this.dfToCanvas(index) && !sameFrames())
          || onFreeze(this)) {
        this.dfScheduleUpdate(1 - index);
      }
    }
    catch (e) {
        console.log("detectFreeze dfUpdate() ignoring exception:", e);
        this.dfScheduleUpdate(1 - index);
    }
  }

  try {
    // draw the current frame to the first canvas
    video.dfToCanvas(0);
    // start checking for freezes
    video.dfScheduleUpdate(1);

    console.log(video, ".detectFreeze() init successful");
    // prevent re-init
    video.dfInit = video.detectFreeze = function () {};
  }
  catch (e) {
    console.log("dfInit() caught", e);
  }
}

// Export function for global access
instacall.Detector || (instacall.Detector = {});
instacall.Detector.detectVideoFreeze = detectVideoFreeze;

}());