window.instacall || (window.instacall = {});

// TODO - depends on Array.prototype.reduce
// TODO - depends on document.documentElement.classList
// TODO - depends on location.search
// TODO - depends on document.querySelectorAll

(function () {

  // Default values
  var C = {
    THEME: 'flat-light',
    INSTRUCTIONS: 'Start your call with us.',
    FROM_URI: 'anonymous.' + Math.round(Math.random() * 1000000 - 0.5) + '@anonymous.invalid'
  };

  var QueryParser = {
    
    // Given a query string of the form "k=v&k2=v2&...",
    // returns an object of the form {k: "v", k2: "v2", ...}
    parse: function (query) {
      // Given param of form "k=v", sets obj[k] = v.
      function addParam (obj, param) {
        var kv = param.split('=', 2);

        // Unmask aliases and normalize to lowercase
        var key = (this.aliases[kv[0]] || kv[0]).toLowerCase();

        obj[key] = decodeURIComponent(kv[1]);
        return obj;
      }

      return query.split('&').reduce(addParam.bind(this), {});
    },

    // Map renamed properties to their canonical names
    aliases: {
      instacallname: 'internalname'
    },


    // Run take a parsed config and run update behaviors
    update: function (config) {
      var method;
      for (method in this.afterUpdate) {
        if (this.afterUpdate.hasOwnProperty(method) &&
            typeof this.afterUpdate[method] === 'function') {
          this.afterUpdate[method](config);
        }
      }
    },

    // Convenience method that parses a String and runs update behaviors
    parseAndUpdate: function (query) {
      return this.update(this.parse(query));
    },

    // Post-update behavior, organized by query parameter
    afterUpdate: {
      address: function (config) {
        if (instacall.config) {
          instacall.config.target = config.address;
        }
      },

      fromuri: function (config) {
        if (instacall.config) {
          instacall.config.uri = config.fromuri || C.FROM_URI;
        }
      },

      theme: function (config) {
        var validThemes = ['flat-light', 'flat-dark', 'skeu-light', 'skeu-dark'],
            theme = config.theme;

        // Remove old theme
        document.documentElement.classList.remove('theme-' + instacall.theme);

        instacall.theme = validThemes.indexOf(theme) >= 0 ? theme : C.THEME;

        document.documentElement.classList.add('theme-' + instacall.theme);
      },

      instructions: function (config) {
        var instructions, i, l, elems;

        instructions = config.instructions || C.INSTRUCTIONS;

        elems = document.querySelectorAll('.param-instructions');
        for (i = 0, l = elems.length; i < l; i++) {
          elems[i].innerHTML = '';
          elems[i].appendChild(document.createTextNode(instructions));
        }
      },

      alts: function (config) {
        var i, l, elems, html = '';

        if (config.altphone) {
          html += '<li><span>Phone</span><span>' + config.altphone + '</span></li>';
        }
        if (config.altemail) {
          html += '<li><span>Email</span><a href="mailto:' +
            config.altemail + '">' + config.altemail + '</a></li>';
        }
        if (config.altwebsite) {
            html += '<li><span>Online</span><a href=http://' +
            config.altwebsite +' target="_blank">' + config.altwebsite + '</a></li>';
        }

        if (!html) {
          document.documentElement.classList.add('no-alts');
        }

        elems = document.querySelectorAll('.param-alts');
        for (i = 0, l = elems.length; i < l; i++) {
          elems[i].innerHTML = html;
        }
      },

      postmessage: function(config) {
        var postmessage = config.postmessage;
        if (postmessage) {
          document.getElementById('call-complete-message').innerHTML = postmessage;
        }
      },

      video: function (config) {
        var video = (config.video === 'true');
        instacall.video = video;

        document.documentElement.classList[video ? 'add' : 'remove']('video-device');
        if (document.documentElement.classList.contains('active-preview')) {
          document.getElementById('streams').classList[video?'remove':'add']('hidden');
          document.getElementById('bottom').classList[video?'remove':'add']('skinny');
        }
      },

      dtmf: function (config) {
        var dtmf = (config.dtmf === 'true');
        instacall.dtmf = dtmf;

        if (dtmf && document.documentElement.classList.contains('active-preview')) {
          document.documentElement.classList.add('has-dtmf');
        } else {
          document.documentElement.classList.remove('has-dtmf');
        }
      },

      internalname: function (config) {
        instacall.internalname = config.internalname;
      },

      sidebar: function (config) {
        if (config.display === 'sidebar') {
          document.documentElement.classList.add('sidebar');
        }
      },

      callerid: function (config) {
        var callerName;
        instacall.callerid = config.callerid;
        instacall.calleridtag = config.calleridtag;

        if (instacall.callerid === 'instacall-name') {
          document.documentElement.classList.remove('has-name-field');
          instacall.config && (instacall.config.displayName = instacall.internalname);
        } else {
          document.documentElement.classList.add('has-name-field');
          callerName = document.getElementById('name').value;
          if (instacall.config && instacall.callerid === 'caller-name-tag') {
            instacall.config.displayName = instacall.calleridtag + ' ' + callerName;
          } else if (instacall.config) {
            instacall.config.displayName = callerName;
          }
        }
      }
    }
  };

  /* Load the initial configuration from URL */
  window.instacall.urlVars = QueryParser.parse(location.search.substr(1));

  // Export functions for later use
  window.instacall.QueryParser = QueryParser;
})();
