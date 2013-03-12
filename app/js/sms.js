window.addEventListener('login', function(event) {

  navigator.sms.login('olav@comoyo.com', 'd3SD7891');

}, false);

// UI end

// Loosely implemented WebSMS shim ( https://wiki.mozilla.org/WebAPI/WebSMS )
function Sms() {

  this._edgeeEvents = document.createElement('events');

  // Internal event handlers
  this._edgeeEvents.addEventListener('ClientRegistrationResponse', function(event) {
    console.log(this);
    var data = event.data;
    localStorage.setItem('clientId', data.clientId);
    this._init();
  }.bind(this), false);

  this._edgeeEvents.addEventListener('AccountLoginResponse', function(event) {
    var data = event.data;

    if (!data.loggedIn) {
      console.log('TODO: Failed logging in');
      return;
    }

    localStorage.setItem('userId', data.userId);
    localStorage.setItem('sessionKey', data.sessionKey);

    var serviceRequest = this._message('ServiceRequestCommand', {
      'serviceId': 'smsplus'
    });
    this._socket.send(serviceRequest);
  }.bind(this), false);

  this._edgeeEvents.addEventListener('AuthenticateSessionResponse', function(event) {
    var data = event.data;

    if (!data.authenticated) {
      console.log('TODO: Failed authenticating');
      return;
    }

    var serviceRequest = this._message('ServiceRequestCommand', {
      'serviceId': 'smsplus'
    });
    this._socket.send(serviceRequest);
  }.bind(this), false);

  this._edgeeEvents.addEventListener('ServiceResponse', function(event) {
    var data = event.data;

    if (!data.serviceOk) {
      console.log('ServiceResponse was not ok');
      return;
    }

    localStorage.setItem('number', data.msisdn);

    var subscription = this._message('SubscriptionCommand', {
      'subscriptionInformation': {
        'subscribeToContactUpdates': false,
        'subscribeToConversationUpdates': true
      }
    });
    this._socket.send(subscription);
  }.bind(this), false);

  this._edgeeEvents.addEventListener('ConversationHgn', function(event) {
    var data = event.data;

    // TODO: Better arithmetics
    var hgn = localStorage.getItem('conversationHgn');
    if (!hgn) {
      hgn = '000000000';
      localStorage.setItem('conversationHgn', hgn);
    } else {
      hgn = hgn.substr(0, hgn.length - 9) + String(parseInt(hgn.substring(hgn.length - 9)) + 1);
    }

    if (localStorage.getItem('conversationHgn') < String(data.generation)) {
      var conversationUpdate = this._message('ConversationUpdateRequestCommand', {
        'generationRange': {
          'generationRangeStart': hgn,
          'generationRangeEnd': String(data.generation)
        }
      });
      this._socket.send(conversationUpdate);
    }
  }.bind(this), false);

  this._edgeeEvents.addEventListener('ConversationUpdateResponse', function(event) {
    var data = event.data;

    // TODO: Sort on timestamp to update newest conversations first
    // TODO: Fix callback hell
    data.conversations.sort(function(a, b) {
      // TODO: Sort
      return 0;
    }).forEach(function(conversation) {
      // We skip caching conversations. We just download the entire thing!
      var cachedConversation;
      var req = this.getObjectStore('conversations', 'readonly')
        .get(conversation.conversationId);
      req.onsuccess = function(evt) {
        cachedConversation = evt.target.result;

        var prevMessageHighestGeneration = cachedConversation ?
          cachedConversation.messageHighestGeneration : '000000000';

        // TODO: Using previous messageHighestGeneration gives wrong results .. Why?
        var messageQuery = this._message('MessageQueryCommand', {
          'query': {
            'conversationId': conversation.conversationId,
            'maxResults': 1000,
            //'messageLowestGeneration': prevMessageHighestGeneration,
            'messageLowestGeneration': localStorage.getItem('conversationHgn'),
            'messageHighestGeneration': conversation.messageHighestGeneration
          }
        });
        this._socket.send(messageQuery);
      }.bind(this);
    }.bind(this));
  }.bind(this), false);

  this._edgeeEvents.addEventListener('MessageQueryResponse', function(event) {
    var data = event.data;

    // Set conversationHgn
    var conversationHgn = localStorage.getItem('conversationHgn');
    if (conversationHgn < data.messageHighestGeneration) {
      localStorage.setItem('conversationHgn', data.messageHighestGeneration);
    }

    // Get earlier conversation
    var req = this.getObjectStore('conversations', 'readonly')
      .get(data.conversationId);

    req.onsuccess = function(evt) {
      var conversation = evt.target.result || { messages: {} };

      conversation.conversationId = data.conversationId;
      conversation.messageHighestGeneration = data.messageHighestGeneration;
      conversation.timestamp = data.timestamp;

      data.messages.forEach(function(message) {
        conversation.messages[message.messageId] = true;

        // Turn message into standard format
        message.id = message.messageId;
        delete message.messageId;
        message.body = message.body.richTextElements[0].richTextString.text;
        message.delivery = message.incoming ? 'received' : 'sent';
        delete message.incoming;
        message.sender = message.messageSender;
        delete message.messageSender;
        message.receiver = message.messageReceiver;
        delete message.messageReceiver;
        message.read = message.viewed;
        delete message.viewed;

        // Should message be broadcast?
        if (message.read === false &&
            message.delivery === 'received' &&
            message.timestamp + 60 * 1000 >= data.timestamp) {
          // Create new message event
          var messageEvent = new CustomEvent('smsreceived');
          messageEvent.data = message;
          window.dispatchEvent(messageEvent);
        }

        this.getObjectStore('messages', 'readwrite').put(message);
      }.bind(this));

      // Put edited conversation back in db
      this.getObjectStore('conversations', 'readwrite').put(conversation);
    }.bind(this);
  }.bind(this), false);


  this.openDb();

  this._edgeeEndpoint = 'wss://edgee-ws-api.comoyo.com:443';

  this._socket = new WebSocket(this._edgeeEndpoint);
  this._socket.onopen = this.onopen.bind(this);
  this._socket.onmessage = this.onmessage.bind(this);
  this._socket.onclose = function() {alert('TODO: Reestablish socket')};

}

Sms.prototype = {
  openDb: function() {
    var req = indexedDB.open('smsplus', 1);
    req.sms = this;
    req.onsuccess = this.dbonsuccess;
    req.onupgradeneeded = this.dbonupgradeneeded;
    req.onerror = this.dbonerror;
  },

  dbonerror: function() { console.log('TODO: dbonerror'); },

  dbonsuccess: function(evt) {
    this.sms._db = this.result;
  },

  dbonupgradeneeded: function(evt) {
    console.log('db upgraded');
    var conversationStore = evt.currentTarget.result.createObjectStore(
      'conversations', {keyPath: 'conversationId', autoIncrement: false});

    var messagesStore = evt.currentTarget.result.createObjectStore(
      'messages', {keyPath: 'id', autoIncrement: false});

    messagesStore.createIndex('createTime', 'createTime', {unique: false});

    // TODO: Create reasonable indices here
  },

  getObjectStore: function(name, mode) {
    return this._db.transaction(name, mode).objectStore(name);
  },

  clearObjectStore: function(name) {
    var store = this.getObjectStore(name, 'readwrite');
    var req = store.clear();
    req.onsuccess = function(evt) { console.log('store cleared'); };
  },

  getMessage: function(messageId) {
    return this.getObjectStore('messages', 'readonly')
      .get(messageId);
  },

  login: function(name, pass) {
    var loginCommand = this._message('AccountLoginCommand', {
      'accountLoginInformation': {
        'userName': name,
        'password': pass,
        'clientId': localStorage.getItem('clientId')
      }
    });
    this._socket.send(loginCommand);
  },

  getAll: function() {
    var messages = [];
    var promise = new Object({ onsuccess: function() {} });

    var store = this.getObjectStore('messages', 'readonly')
    store.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;

      if (cursor) {
        messages.push(cursor.value);
        cursor.continue();
      } else {
        promise.onsuccess(messages);
      }
    }
    return promise;
  }

};

/**
  * @param {string} name Name of edgee command.
  * @param {object} content Object passed in command.
  * @return {string} cookies.
  */
Sms.prototype._message = function(name, content) {
  var message = {};
  message['com.telenor.sw.adaptee.th.' + name] = content;

  console.log(message);

  // Turn integer strings back into integer format
  var stringedMessage = JSON.stringify(message);

  // greedily matches numbers of 9+ digits
  var strToInt = /"(\d{9,})"/g;
  // Unlike generation numbers, userIds are actually strings!
  var quoteUserId = /"userId":(\d+)/g;

  return stringedMessage
    .replace(strToInt, '$1')
    .replace(quoteUserId, '"userId":"$1"');
};

/** Initializes connection */
Sms.prototype.onopen = function() {
  // Keep-alive
  window.setInterval(function(socket) {
    socket.send('');
    console.log('Keep-alive');
  }, 50 * 1000, this._socket);

  this._init();
};

/** Dispatches events from the edgee socket
  * @param {MessageEvent} message The raw websocket message from edgee. */
Sms.prototype.onmessage = function(message) {
  // Because WebSocket is a litte weird we explicitly tell how far we'll read
  var receivedString = message.data.substring(0, message.data.length - 1);
  // Because of javascript integer precision we work with with big integers as
  // strings
  // TODO: Need reliable regex based on JSON spec..
  var intToStr = /:(\d{9,})(?!\d|")/g; // Match 9+ digit numbers not stringed
  var stringified = receivedString.replace(intToStr, ':"$1"');

  // Shuffle stuff around to make object easier to work with
  var data;
  try {
    data = JSON.parse(stringified);
    console.log(data);
  } catch (e) {
    console.log('TODO: Unexpected data from edgee: ' + stringified);
    return;
  }

  var key = Object.keys(data)[0];
  var data = data[key];
  var eventName = key.split('.').pop();

  // Dispatch event using the edgee DOM element
  if (!this._edgeeEvents[eventName])
    this._edgeeEvents[eventName] = new CustomEvent(eventName);

  this._edgeeEvents[eventName].data = data;
  this._edgeeEvents.dispatchEvent(this._edgeeEvents[eventName]);
};

Sms.prototype._init = function() {

  // Register site as a 'device' using sms+
  if (!localStorage.getItem('clientId')) {
    var registerDevice = this._message('ClientRegistrationCommand', {
      'clientInformation': {
        'clientType': 'web',
        'clientVersion': window.location.host
      }
    });
    this._socket.send(registerDevice);

    return;
  }

  // If no userId or sessionKey stored a login is needed
  if (!localStorage.getItem('userId') || !localStorage.getItem('sessionKey')) {

    var loginEvt = new CustomEvent('login');
    loginEvt.data = this;

    window.dispatchEvent(loginEvt);

    return;
  }

  // Authenticate already stored session
  var auth = this._message('AuthenticateSessionCommand', {
    'authenticateSessionInformation': {
      'userId': localStorage.getItem('userId'),
      'clientId': localStorage.getItem('clientId'),
      'sessionKey': localStorage.getItem('sessionKey')
    }
  }, false);
  this._socket.send(auth);
};

// TODO: Error checking
Sms.prototype.send = function(number, message) {

  // Token used to filter out the correct SendSmsResponse
  var token = Math.random().toString(36).substring(7);

  // Create SmsRequest object
  var request = new SmsRequest({
    number: number,
    message: message,
    sms: this,
    token: token
  });

  var smsMessage = this._message('SendSmsCommand', {
    'smsMessage': {
      'timestamp': String(Date.now()),
      'messageReceiver': String(number),
      'smsContent': message
    },
    'token': token
  });
  this._socket.send(smsMessage);

  return request;
};

/**
  * SmsRequest tracks the status of an sms
  * @param {object} opts Options passed from the send command
  * TODO: store sender somewhere ..
  */
function SmsRequest(opts) {
  self = this;
  this._token = opts.token;
  this.result = new SmsMessage({
    id: null,
    delivery: 'sent',
    sender: localStorage.getItem('number'),
    receiver: opts.number,
    body: opts.message,
    timestamp: String(Date.now()),
    read: true
  });

  // Listen on SendSmsResponse for the message
  opts.sms._edgeeEvents.addEventListener('SendSmsResponse', function(event) {
    if (event.data.token !== self._token)
      return;

    // Make sure it is sent
    if (event.data.response)
      self.onsuccess();
    else
      self.onerror();

    // Remove listener when message caught
    this.removeEventListener('SendSmsResponse', arguments.callee, false);
  });
}

SmsRequest.prototype = {
  onsuccess: function() { console.log('sent ok'); },
  onerror: function() { console.log('sending failed'); }
};

function SmsMessage(opts) {
  this.id = opts.id;
  this.delivery = opts.delivery;
  this.sender = opts.sender;
  this.receiver = opts.receiver;
  this.body = opts.body;
  this.timestamp = opts.timestamp;
  this.read = opts.read;
}

navigator.sms = new Sms();
