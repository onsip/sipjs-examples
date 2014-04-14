window.instacall || (window.instacall = {});

(function () {

  var C, Loader, Widget, Buttons, BHR;

  /**
     Constants
  **/
  C = {
    SRC_PREFIX: 'https://insta.onsip.com/call/', // Root path of InstaCall
    IC_SELECTOR: '.ic-button',
    DEFAULT_BUTTON_TEXT: 'Click to Call'
  };

  /**
     Util functions for loading extra ECMAScript and CSS
  **/
  Loader = {
    loadECMAScript: function (path, callback) {
      // Create the <script> element
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = C.SRC_PREFIX + path;

      // Bind various cross-browser load events to callback
      script.onreadystatechange = script.onload = callback;

      // Attach to the page (triggering load)
      document.head.appendChild(script);
    },

    loadCSS: function (path) {
      // Create the <link> element
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = C.SRC_PREFIX + path;

      // Attach to the page (triggering load)
      document.head.appendChild(link);
    },

    /* Check if there is definitely no microphone/camera (Chrome only)
     * Returns false if no mic/camera.  True if present or unknown.
     */
    mediaStreamTrackCheck: function () {
      if (window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
        try {
          window.MediaStreamTrack.getSources(function (sources) {
            var constraints = {audio: false, video: false};
            var i;

            for (i = 0; i < sources.length; i++) {
              constraints[sources[i].kind] = true;
              console.log('found', sources[i].kind, 'device');
            }

            if (!constraints.audio && !constraints.video) {
              return false;
            }
          });
        }
        catch (error) {
          console.log('MediStreamTrack.getSources is exceptional. Are you in Firefox?');
        }

        return true;
      }
    }
  };

  /**
     InstaCall popup window functions
  **/
  Widget = {

    /* Attach IFrame to page (for data-display="sidebar")*/
    insertIFrame: function (url) {
      document.documentElement.classList.add('ic-shift');
      document.body.insertAdjacentHTML(
        'beforeend',
        '<iframe id="ic-frame" src="' + url + '"></iframe>' +
          '<button id="ic-frame-close">Close</button>'
      );

      document.getElementById('ic-frame-close').addEventListener(
        'click', function (e) {
          e.preventDefault();
          Widget.removeIFrame();
        }, false);

      return document.getElementById('ic-frame').contentWindow;
    },

    /* Remove IFrame from page, if present (for data-display="sidebar")*/
    removeIFrame: function () {
      var frame = document.getElementById('ic-frame');
      var closeButton = document.getElementById('ic-frame-close');
      if (frame) {
        frame.parentNode.removeChild(frame);
        closeButton.parentNode.removeChild(closeButton);
        document.documentElement.classList.remove('ic-shift');
      }
    },

    /* Listen for windows to ask for customdata */
    getOnMessage: function (widget) {
      return (function (e) {
        var json;
        try {
          console.log(e.origin, 'sent', e.data, 'to button window');
          if ('customdata?' === e.data &&
              widget === e.source &&
              instacall.customdata) {
            json = JSON.stringify(instacall.customdata);
            widget.postMessage('customdata:' + json, e.origin);
            console.log('button window sent customdata to widget window:', json);
          }
        } catch (error) {
          console.error('failed to send customdata:', error);
        }
      });
    }
  };

  /**
     Button related code goes hereabouts
  **/
  Buttons = {
    /* Result of findAllButtons will go here */
    buttons: null,

    /* Query for all InstaCall buttons on the page */
    findAllButtons: function () {
      this.buttons = document.querySelectorAll(C.IC_SELECTOR);
    },

    /* Run a callback for each button */
    forEach: function (callback) {
      var i, l;

      if (this.buttons == null) {
        this.findAllButtons();
      }

      for (i = 0, l = this.buttons.length; i < l; i++) {
        callback(this.buttons[i]);
      }
    },

    /* Adjust innerHTML with default values if empty */
    addInnerHTML: function (button) {
      if (button.innerHTML.trim() === '') {
        button.innerHTML =
          '<span class="ic-button-text">' +
            (button.dataset.altphone || C.DEFAULT_BUTTON_TEXT) +
          '</span>';
      }
    },

    /* Click handler for buttons. *Note: `this` will be a <button>* */
    onClick: function (e) {
      var height, popupSpecs, query, param, value, url, tracker, widgetWindow;

      e.preventDefault();

      height = 177;
      query = '?';

      if (instacall.browser.opr) {
        height += 61;
      }

      for (param in this.dataset) {
        if (this.dataset[param]) {
          value = encodeURIComponent(this.dataset[param]);

          // Check if we must add space for name field
          if (param === 'callerid' &&
              value !== 'internal-name' && // deprecated
              value !== 'instacall-name') {
            height += 55;
          }

          query += param + '=' + value + '&';
        }
      }

      popupSpecs = 'width=320,toolbar=0,menubar=0,location=0,status=0,scrollbars=0,' +
        'resizable=1,left=20,top=20,height=' + height;

      // Build the full InstaCall URL
      url = C.SRC_PREFIX + 'phone.html' + query;
      if (window._gat && window._gat._getTrackerByName) {
        tracker = window._gat._getTrackerByName();
        if (tracker && tracker._getLinkerUrl) {
          url = tracker._getLinkerUrl(url);
        }
      }

      // Display the InstaCall window
      if (this.dataset.display !== 'sidebar') {
        widgetWindow = window.open(url, 'OnSIP InstaCall', popupSpecs);
      } else {
        widgetWindow = Widget.openIFrame(url);
      }

      window.addEventListener('message', Widget.getOnMessage(widgetWindow), false);
    },

    toggle: function (button, toggle, reason) {
      button.disabled = !toggle;
      button.title = reason;
    },

    disableAll: function (reason) {
      this.forEach(function (button) {
        this.toggle(button, false, reason);
      }.bind(this));
    },

    enableAll: function (reason) {
      this.forEach(function (button) {
        this.toggle(button, true, reason);
      }.bind(this));
    }
  };

  /**
     Business Hour Rules
  **/
  BHR = {
    /* Server time populated by getServerTime */
    serverTime: null,       // Date object
    serverTimeString: null, // 'YYYY-MM-DD'
    isDST: false,

    /* Fetch the time from OnSIP Web API */
    getServerTime: function (callback) {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        var month, date, day;

        if (xhr.readyState != 4) return;

        if (xhr.status == 200) {
          this.serverTimeString = JSON.parse(xhr.responseText).
            Response.
            Context.
            Request.
            DateTime;
          this.serverTime = new Date(this.serverTimeString);
          this.serverTimeString = this.serverTimeString.substr(0,10);
        } else {
          // Web API failed.  Fall back to browser time.  Adjust for timezone.
          this.serverTime = new Date();
          this.serverTime.setMinutes(this.serverTime.getMinutes() +
                                     this.serverTime.getTimezoneOffset());
          this.serverTimeString = this.serverTime.getFullYear() + '-' +
            (this.serverTime.getMonth() < 10 ? '0' : '') + this.serverTime.getMonth() +
            (this.serverTime.getDate()  < 10 ? '0' : '') + this.serverTime.getDate();
        }

        // Is it Daylight Saving Time?
        month = this.serverTime.getMonth();
        date = this.serverTime.getDate();
        day = this.serverTime.getDay();

        this.isDST = (month > 2 && month < 10) || // Between March and November
        (month == 2 &&
         ((date - day + 6) % 7 + 8 < date)) || // March, but after 2nd Sunday
          (month == 10 &&
           ((date - day + 12) % 7 + 1 > date)); // Nov, but before first Sunday

        // Callback rather than returning
        callback();
      }.bind(this);

      xhr.open('GET', 'https://www.jnctn.com/webapi?Action=NoOp&Output=json', true);
      xhr.send();
    },

    applyRules: function (button) {
      var dataset = button.dataset;
      var days = ['Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday'];

      var offset = -parseInt(dataset.timezone || '0') - (this.isDST ? 1 : 0);

      var rules = {}, today, todayRule, next, day;

      var i, bhri, raw;

      // Parse rules
      for (i = 0; i < 7; i++) {
        bhri = 'bhr' + i;
        raw = dataset[bhri];

        // Combine separate open and close rules into one for parsing
        if (!raw &&
            (dataset[bhri+'open'] || dataset[bhri+'close'])) {
          raw = dataset[bhri] =
            (dataset[bhri+'open']  || '') +
            (dataset[bhri+'close'] || '');
        }

        if (this.validateBHR(raw)) {
          // Split the raw string into 4 groups of 2
          raw = raw.match(/.{1,2}/g);

          rules[i] = {
            open: {
              hour: raw[0],
              minute: raw[1],
              date: new Date(this.serverTimeString +'T'+ raw[0] +':'+ raw[1] + '+00:00')
            },

            close: {
              hour: raw[2],
              minute: raw[3],
              date: new Date(this.serverTimeString +'T'+ raw[2] +':'+ raw[3] + '+00:00')
            }
          };

          // Adjust for offset
          rules[i].open.date.setHours(rules[i].open.date.getHours() + offset);
          rules[i].close.date.setHours(rules[i].close.date.getHours() + offset);

        } else {
          // Default to always open
          rules[i] = {
            open: {
              hour: '00',
              minute: '00',
              date: new Date(this.serverTimeString + 'T00:00')
            },
            close: {
              hour: '23',
              minute: '59',
              date: new Date(this.serverTimeString + 'T23:59')
            }
          };
        }

        // Set the display time (needs to wait until after offset is set)
        rules[i].open.string =
          (rules[i].open.date.getHours() % 12 || 12) + ':' + rules[i].open.minute;
        rules[i].close.string =
          (rules[i].close.date.getHours() % 12 || 12) + ':' + rules[i].close.minute;

      } // End rule parsing

      // Apply today's rule
      today = this.serverTime.getDay();
      todayRule = rules[today];
      if (todayRule) {

        // If it's before open time (and open time is before close time)
        if (this.serverTime.getTime() < todayRule.open.date.getTime() &&
            todayRule.open.date.getTime() < todayRule.close.date.getTime()) {
          Buttons.toggle(button, false,
                         'Web calling will be available (' +
                          todayRule.open.string + ' - ' +
                          todayRule.close.string + ', Today)');

        // Else if it's after close time (and open time is before close time)
        } else if (todayRule.close.date.getTime() < this.serverTime.getTime() &&
                   todayRule.open.date.getTime() < todayRule.close.date.getTime()) {

          // Find the next open day
          for (i = 0; i < 7; i++) {
            next = (today+i)%7;
            if (rules[next] &&
                rules[next].open.date.getTime() < rules[next].close.date.getTime()) {
              break;
            }
          }

          if (next === (today + 1) % 7) {
            day = 'tomorrow';
          } else {
            day = days['next'];
          }

          Buttons.toggle(button, false,
                         'Web calling will be available (' +
                          rules[next].open.string + ' - ' +
                          rules[next].close.string + ', ' + day + ')');

        } // else we are in the Open range...good to go!
      }
    },

    validateBHR: function (bhr) {
      var hour1, hour2, min1, min2;

      if (!bhr || bhr.length !== 8) {
        return false;
      }

      var hour1 = bhr.substr(0,2);
      var hour2 = bhr.substr(4,2);
      if (hour1 < 0 || hour1 > 23 || hour2 < 0 || hour2 >23) {
        return false;
      }
      var min1 = bhr.substr(2,2);
      var min2 = bhr.substr(6,2);
      if (min1 < 0 || min1 > 59 || min2 < 0 || min2 > 59) {
        return false;
      }
      return true;
    }
  };

  /**
   *
   *  Wire it all together!
   *
   **/
  if (!document.head ||
      !document.documentElement ||
      !document.documentElement.classList ||
      !document.querySelectorAll) {
    // ...or not. Need browser support.
    return;
  }

  Loader.loadECMAScript('js/support.js', supportLoaded);
  Loader.loadCSS('css/button.css');

  function supportLoaded() {
    var doEnable = instacall.webrtcSupport; // from support.js

    Buttons.forEach(function (button) {
      Buttons.addInnerHTML(button);
      button.addEventListener('click', Buttons.onClick, false);
    });

    if (!doEnable) {
      Buttons.disableAll('To make a web call, please use the latest version ' +
                         'of Chrome, Firefox, or Opera.');
      return;
    }

    doEnable = Loader.mediaStreamTrackCheck();

    if (!doEnable) {
      Buttons.disableAll('To make a web call, please attach a microphone and camera.');
      return;
    }

    BHR.getServerTime(gotServerTime);
  }

  function gotServerTime() {
    Buttons.enableAll('Click here to make a web call.');
    Buttons.forEach(BHR.applyRules.bind(BHR));
  }

})();
