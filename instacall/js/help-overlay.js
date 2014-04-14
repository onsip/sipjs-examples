window.instacall || (window.instacall = {});

(function() {
  var helpOverlay = document.getElementById('help-overlay');
  var current = "help-first"
  var html = document.documentElement;
  var chromeWording = document.getElementById('chromeWording');
  var firefoxWording = document.getElementById('firefoxWording');
  // Creates an event listener that stops the event before calling a callback.
  // If [onlyTarget] is supplied, do nothing if it's not the event's target.
  function eatEvent(callback, onlyTarget) {
    return function (e) {
      if (onlyTarget && e.target !== onlyTarget) {
        return;
      };
      e.preventDefault();
      e.stopPropagation();
      callback();
    }
  }

  // A verson of Function.prototype.bind that takes a packed array of arguments.
  // bindArr (callback, [a1, a2, a3]) ~= callback.bind(null, a1, a2, a3)
  function bindArr (callback, args) {
    return callback.bind.apply(callback, [null].concat(args));
  }

  // Provides an easy way to create iterator callbacks.
  // callMethod('log', [1, 2, 3])(console) ~= console.log(1, 2, 3)
  function callMethod (methodName, methodArgs) {
    return function (thisObj) {
      return thisObj[methodName].apply(thisObj, methodArgs);
    }
  };

  function forEach (list, callback) {
    for (var i = 0; i < list.length; i++) {
      callback(list[i]);
    }
  }

  // Whenever a <button> of class [className] is clicked,
  // call [callback] with unpacked [args] array.
  // The click event is eaten.
  function addClickListeners (className, callback, args) {
    var listener = eatEvent(bindArr(callback, args));
    forEach(helpOverlay.querySelectorAll('button.' + className),
      callMethod('addEventListener', ['click', listener, false])
    );
  }

  // Replace class [current] with [to] on <html>
  instacall.switchHelp = function (to) {
    html.classList.remove(current);
    html.classList.add(to);
    current = to;
  }

  function toggleHelp (show) {
    html.classList[show ? 'add' : 'remove']('help-overlay');
  }

  instacall.showHelp = toggleHelp.bind(null, true);
  instacall.hideHelp = toggleHelp.bind(null, false);

  // set up button click listeners
  addClickListeners("help-next", instacall.switchHelp, ["help-second"]);
  addClickListeners("help-prev", instacall.switchHelp, ["help-first"]);
  addClickListeners("help-done", instacall.hideHelp);

  helpOverlay.addEventListener('click', eatEvent(instacall.hideHelp, helpOverlay), false);

  if(!instacall.video)
	{
    firefoxWording.innerHTML = "";
		chromeWording.innerHTML = "";
	}

  /*document.getElementById('help-allow').addEventListener('click', function () {
    instacall.switchHelp('help-first');
    instacall.showHelp();
  }, false); */
})();
