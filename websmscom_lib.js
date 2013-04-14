/**
 * @author <gerd.reifenauer@ut11.net>
 */
var util = require("util");
var https = require('https');
var url = require('url');
var os = require('os');
var events = require('events');

(function(scope){
  'use strict';
  
  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = scope;
  
  // Create a reference to this
  var WebSmsCom = {
  
    VERSION: '1.0.0',
    
    isDebug: false,
    
    isNode: false,
    
    doThrowMessageCreationError: true,
    
    // causes returned as errorObj.cause - public, definable 
    errorCauses: {
      'parameter': 'parameter',
      'authorization': 'authorization',
      'connection': 'connection',
      'api': 'api',
      'unknown': 'unknown'
    },
    
    defaultGatewayUrl: 'https://api.websms.com'
  };
  
  var emitter;
  
  // Export the WebSmsCom object 
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSmsCom;
    root['websmscom'] = WebSmsCom;
    emitter = new events.EventEmitter();
    WebSmsCom.isNode = true;
  } else {
    root['websmscom'] = WebSmsCom;
  }
  
  // helper function  
  WebSmsCom.applyIf = function(object, config){
    var property;
    if (object) {
      for (property in config) {
        if (object[property] === undefined) {
          object[property] = config[property];
        }
      }
    }
    return object;
  };
  
  /***
   * WebSmsCom.getErrorObj
   *
   *    generates errorObj out of given obj (used to call WebSmsCom.defaultErrorCallback over 'error' event)
   *    default properties are:
   *        'throwError':  true/false boolean - will result in thrown error (default true at message object creation)
   *        'message'   :  Error message
   *
   *     Sample object:
   *    {
   *      message       : "<error message string>",
   *      messageObject : <TextMessage or BinaryMessage object affected>,
   *      apiResponse   : <ApiResponse Object in case there was an API Response>,
   *      error         : <Error>,  //Javascript Error() object
   *      throwError    : <boolean>
   *    }
   *
   * @param {Object} obj
   * @return {Object} errorObj
   */
  WebSmsCom.getErrorObj = function(obj){
    if (obj === undefined) {
      obj = {};
    } else if (typeof obj === 'string') {
      var s = obj;
      obj = {
        message: s
      };
    }
    WebSmsCom.applyIf(obj, {
      'cause': WebSmsCom.errorCauses['parameter'],
      'message': "Internal Error",
      'throwError': this.doThrowMessageCreationError
    });
    return obj;
  };
  
  /**
   * Wrapper for logger
   *   used like console.log
   * @param {Object} errorObj
   * @param {Object} errCb
   */
  WebSmsCom.log = function(){
    if (WebSmsCom.isDebug) {
      console.log.apply(this, arguments);
    }
  };
  
  /***
   * WebSmsCom.defaultErrorCallback
   *    function executed by error listeners
   * @param {Object} errorObj
   * @param {Object} errCb
   */
  WebSmsCom.defaultErrorCallback = function(errorObj, errCb, message){
    WebSmsCom.log("WebSmsCom.defaultErrorCallback, errorObj:", errorObj);
    if (errCb !== undefined) {
      WebSmsCom.log("custom callback: ", errCb);
      errCb(errorObj, message);
    } else {
      WebSmsCom.log("default callback. ", errorObj);
    }
    // failed creation of message has to throw Error!
    if (errorObj.throwError) {
      throw new Error(errorObj.message);
    }
  };
  
  /***
   * WebSmsCom.defaultOkCallback
   *    function executed by https data/end listeners
   *    when Message was successfully transferred
   * @param {Object} ApiResponse
   * @param {Object} Callback
   */
  WebSmsCom.defaultOkCallback = function(cb, ApiResponse, message){
    WebSmsCom.log("WebSmsCom.defaultOkCallback, ApiResponse:", ApiResponse);
    if (cb !== undefined) {
      WebSmsCom.log("custom ok callback: ", cb);
      cb(ApiResponse, message);
    } else {
      WebSmsCom.log("default ok callback. ");
      WebSmsCom.log(ApiResponse, message);
    }
  };
  
  //----------------- MESSAGE OBJECTS -------------
  
  WebSmsCom.Message = function(recipientAddressList){
    WebSmsCom.log("Message constructor", this);
    
    events.EventEmitter.call(this);
    
    // initialise Message stuff    
    this.data = {};
    this.data['recipientAddressList'] = [];
    this.data['senderAddress'] = undefined;
    this.data['senderAddressType'] = undefined;
    this.data['sendAsFlashSms'] = undefined;
    this.data['notificationCallbackUrl'] = undefined;
    this.data['clientMessageId'] = undefined;
    this.data['priority'] = undefined;
    
    this.setRecipientAddressList(recipientAddressList);
  };
  
  WebSmsCom.Message.prototype = emitter;
  WebSmsCom.Message.prototype.availableSenderAddressTypes = {
    'national': true,
    'international': true,
    'alphanumeric': true,
    'shortcode': true
  };
  
  /***
   * checkRecipientAddressList
   *
   * @param {Array of Strings} recipientAddressList
   * @return (boolean)
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.checkRecipientAddressList = function(recipientAddressList){
    // Used internally to check validity of recipient_address_list (array of string)
    if (!util.isArray(recipientAddressList)) {
      this.emit('error', WebSmsCom.getErrorObj("Argument 'recipientAddressList' (Array) invalid while contructing " + this.constructor.name));
      return false;
    }
    
    for (var i = 0; i < recipientAddressList.length; i++) {
      if (!/^\d{1,15}$/.test(recipientAddressList[i])) {
        this.emit('error', WebSmsCom.getErrorObj("Recipient '" + recipientAddressList[i] + "' is invalid. (max. 15 digits full international MSISDN. Example: 4367612345678)"));
        return false;
        WebSmsCom.log("After Emit");
      }
    }
    return true;
  };
  
  /***
   * getRecipientAddressList
   *
   * @return (Array) from message
   */
  WebSmsCom.Message.prototype.getRecipientAddressList = function(){
    return this.data['recipientAddressList'];
  };
  /***
   * setRecipientAddressList
   *
   * @param {Array of strings} recipientAddressList  e.G.: ['4367612345678', '4912345678']
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setRecipientAddressList = function(recipientAddressList){
    if (this.checkRecipientAddressList(recipientAddressList)) {
      this.data['recipientAddressList'] = recipientAddressList;
    }
  };
  /***
   * getData
   *
   * @return (Object) containing representation of message object set (only set/defined values)
   */
  WebSmsCom.Message.prototype.getData = function(){
    var keys = Object.keys(this.data);
    var data = {};
    
    for (var i = keys.length - 1; i >= 0; i--) {
      if (this.data[keys[i]] !== undefined) {
        data[keys[i]] = this.data[keys[i]];
      }
    }
    return data;
  };
  /***
   * getSenderAddress
   *
   * @return {string} containing senderAddress of Message
   */
  WebSmsCom.Message.prototype.getSenderAddress = function(){
    return this.data['senderAddress'];
  };
  /***
   * Set sender_address
   *  available sender address is dependend on user account
   *
   * @param {string} senderAddress
   * @return {string} senderAddress set
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setSenderAddress = function(senderAddress){
    if (typeof senderAddress === 'string' || senderAddress === undefined) {
      this.data['senderAddress'] = senderAddress;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("sender_address '" + senderAddress + "' is invalid. Must be string containing numeric or alphanumeric value"));
      return;
    }
    return this.data['senderAddress'];
  };
  
  /***
   * getSenderAddressType
   *
   * @return {string} containing one of ['national', 'international', 'alphanumeric' or 'shortcode']
   */
  WebSmsCom.Message.prototype.getSenderAddressType = function(){
    return this.data['senderAddressType'];
  };
  
  /***
   * setSenderAddressType
   *
   * @param {string} senderAddressType
   * @return {string} senderAddressType set (one of ['national', 'international', 'alphanumeric' or 'shortcode'])
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setSenderAddressType = function(senderAddressType){
    if (this.availableSenderAddressTypes[senderAddressType] === true || senderAddressType === undefined) {
      this.data['senderAddressType'] = senderAddressType;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("senderAddressType '" + senderAddressType + "' invalid. Must be one of '" + Object.keys(this.availableSenderAddressTypes) + "'."));
    }
    return this.data['senderAddressType'];
  };
  
  /***
   * getSendAsFlashSms
   *
   * @return {boolean}
   */
  WebSmsCom.Message.prototype.getSendAsFlashSms = function(){
    return this.data['sendAsFlashSms'];
  };
  
  /***
   * setSendAsFlashSms
   *
   * @param {boolean} sendAsFlashSms
   * @return {boolean}
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setSendAsFlashSms = function(sendAsFlashSms){
    if (sendAsFlashSms === undefined || typeof sendAsFlashSms === 'boolean') {
      this.data['sendAsFlashSms'] = sendAsFlashSms;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("sendAsFlashSms '" + sendAsFlashSms + "' invalid. Must be undefined, true or false."));
      return;
    }
    return this.data['sendAsFlashSms'];
  };
  
  /***
   * getNotificationCallbackUrl
   *
   * @return {string} notificationCallbackUrl
   */
  WebSmsCom.Message.prototype.getNotificationCallbackUrl = function(){
    return this.data['notificationCallbackUrl'];
  };
  
  /***
   * setNotificationCallbackUrl
   *
   * @param {string} notificationCallbackUrl: string of notification callback URI
   *                 customers URI that listens for delivery report notifications
   *                 or replies for this message
   * @return {string} notificationCallbackUrl set
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setNotificationCallbackUrl = function(notificationCallbackUrl){
    if (notificationCallbackUrl === undefined || typeof notificationCallbackUrl === 'string') {
      this.data['notificationCallbackUrl'] = notificationCallbackUrl;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("notificationCallbackUrl '" + notificationCallbackUrl + "' invalid. Must be string. "));
      return;
    }
    return this.data['notificationCallbackUrl'];
  };
  
  /***
   * getClientMessageId
   *
   * @return {string} clientMessageId set for this Message object
   */
  WebSmsCom.Message.prototype.getClientMessageId = function(){
    return this.data['clientMessageId'];
  };
  
  /***
   * setClientMessageId
   *
   * @param {string} clientMessageId: string with message id for this message.
   *                 This message id is returned with the response to the send request
   *                 and used for notifications
   * @return {string} clientMessageId set
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setClientMessageId = function(clientMessageId){
    if (clientMessageId === undefined || typeof clientMessageId === 'string') {
      this.data['clientMessageId'] = clientMessageId;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("clientMessageId '" + clientMessageId + "' invalid. Must be string."));
      return;
    }
    return this.data['clientMessageId'];
  };
  
  /***
   * getPriority
   *
   * @return {number} priority set for this Message object
   */
  WebSmsCom.Message.prototype.getPriority = function(){
    return this.data['priority'];
  };
  
  /***
   * setPriority
   *
   * @param {number} priority: message priority as integer (1 to 9)
   *                 (level height must be supported by account settings)
   * @return {string} priority set
   * @exception ParameterValidationException
   */
  WebSmsCom.Message.prototype.setPriority = function(priority){
    if (priority === undefined || typeof priority === 'number') {
      this.data['priority'] = priority;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("priority '" + priority + "' invalid. Must be a number."));
      return;
    }
    return this.data['priority'];
  };
  
  /***
   * WebSmsCom.TextMessage
   *
   * @param {Array} recipientAddressList
   * @param {string} messageContent
   * @param {Function} errorCallback
   * @return {Object} TextMessage
   */
  WebSmsCom.TextMessage = function(recipientAddressList, messageContent, errorCallback){
    WebSmsCom.log("Text constructor", this);
    // privates
    var errCb = errorCallback;
    var oCfg;
    
    if (typeof recipientAddressList === 'object' &&
        messageContent === undefined &&
        errorCallback === undefined) {
      // quick usage
      oCfg= recipientAddressList;
      recipientAddressList = oCfg.recipientAddressList;
      errCb = oCfg.errorCallback;
      messageContent = oCfg.messageContent;
    }
    
    // register events before calling WebSmsCom.Message
    this.on('error', function(errorObj){
      WebSmsCom.defaultErrorCallback(errorObj, errCb, this);
    });
    
    // call WebSmsCom.Message (Baseclass)
    WebSmsCom.Message.call(this, recipientAddressList);
    
    // initialise TextStuff
    this.data['messageContent'] = undefined;
    
    if (oCfg !== undefined) {
        // set all parameter the "quick" way from given object
        var isDataKey = {};
        Object.keys(this.data).forEach(function(element, index, array){
            isDataKey[element] = true;
        });
        var cfgAttributes = Object.keys(oCfg);
        for (var k=0;k<cfgAttributes.length;k++) {
            var attr = cfgAttributes[k];
            if (attr === 'recipientAddressList' || attr === 'errorCallback') {
                continue;
            }
            if (isDataKey[attr]) {
                var attrFUC = attr.charAt(0).toUpperCase() + attr.substr(1);
                this['set'+attrFUC].call(this,oCfg[attr]);
            } else {
                this.emit('error', WebSmsCom.getErrorObj("Invalid attribute '"+attr+"' for '"+this.constructor.name+"'. Possible values are: "+Object.keys(this.data).join(',')));
                return;
            }
        }
    } else {
        // just set given function parameter
        this.setMessageContent(messageContent);
    }
  };
  util.inherits(WebSmsCom.TextMessage, WebSmsCom.Message);
  
  /***
   * TextMessage.getMessageContent
   *
   * @return {string} messageContent
   */
  WebSmsCom.TextMessage.prototype.getMessageContent = function(){
    return this.data['messageContent'];
  };
  
  /***
   * TextMessage.setMessageContent
   *
   * @param {string} messageContent  - utf8/unicode string
   * @return {string} messageContent
   */
  WebSmsCom.TextMessage.prototype.setMessageContent = function(messageContent){
    if (messageContent !== undefined && typeof messageContent === 'string') {
      this.data['messageContent'] = messageContent;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("Invalid messageContent for TextMessage. Must be utf8/unicode."));
      return;
    }
    return this.data['messageContent'];
  };
  
  
  /***
   * WebSmsCom.BinaryMessage
   *
   * @param {Array} recipientAddressList - Example: ['4367612345678','4369912345678']
   * @param {Array} messageContent - segments of base64 strings (binary encoded to base64)
   *                                 Example: ["BQAD/AIBWnVzYW1tZW4=", "BQAD/AICZ2Vmw7xndC4="]
   * @param {Function} errorCallback function (optional) when message creation fails
   * @return {Object} BinaryMessage Object
   */
  WebSmsCom.BinaryMessage = function BinaryMessage(recipientAddressList, messageContent, userDataHeaderPresent, errorCallback){
    WebSmsCom.log("Binary constructor", this);
    // privates
    var errCb = errorCallback;
    var oCfg;
    
    if (typeof recipientAddressList === 'object' &&
        messageContent === undefined &&
        errorCallback === undefined) {
      // quick usage
      oCfg= recipientAddressList;
      recipientAddressList = oCfg.recipientAddressList;
      errCb = oCfg.errorCallback;
      messageContent = oCfg.messageContent;
    }
    // register events before calling WebSmsCom.Message
    this.on('error', function(errorObj){
      WebSmsCom.defaultErrorCallback(errorObj, errCb, this);
    });
    
    // call WebSmsCom.Message (Baseclass)
    WebSmsCom.Message.call(this, recipientAddressList);
    
    // initialise BinaryStuff
    this.data['messageContent'] = [];
    this.data['userDataHeaderPresent'] = undefined;
    
    if (oCfg !== undefined) {
        // set all parameter the "quick" way from given object
        var isDataKey = {};
        Object.keys(this.data).forEach(function(element, index, array){
            isDataKey[element] = true;
        });
        var cfgAttributes = Object.keys(oCfg);
        for (var k = 0; k < cfgAttributes.length; k++) {
            var attr = cfgAttributes[k];
            if (attr === 'recipientAddressList' || attr === 'errorCallback') {
                continue;
            }
            if (isDataKey[attr]) {
                var attrFUC = attr.charAt(0).toUpperCase() + attr.substr(1);
                this['set' + attrFUC].call(this, oCfg[attr]);
            } else {
                this.emit('error', WebSmsCom.getErrorObj("Invalid attribute '" + attr + "' for '" + this.constructor.name + "'. Possible values are: " + Object.keys(this.data).join(',')));
                return;
            }
        }
    } else {
        // just set given function parameter
        this.setMessageContent(messageContent);
        this.setUserDataHeaderPresent(userDataHeaderPresent);
    }
  };
  util.inherits(WebSmsCom.BinaryMessage, WebSmsCom.Message);
  
  /***
   * BinaryMessage.getMessageContent
   *
   * @return {string} messageContent
   */
  WebSmsCom.BinaryMessage.prototype.getMessageContent = function(){
    return this.data['messageContent'];
  };
  
  /***
   * BinaryMessage.setMessageContent
   *
   * @param {Array} messageContent  Array of string/unicode containing base64 encoded binary
   * @return {Array} messageContent
   */
  WebSmsCom.BinaryMessage.prototype.setMessageContent = function(messageContent){
    if (messageContent !== undefined && util.isArray(messageContent)) {
      this.data['messageContent'] = messageContent;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("Invalid messageContent for BinaryMessage. Must be array of strings containing Base64 encoded Binary"));
      return;
    }
    return this.data['messageContent'];
  };
  
  /***
   * BinaryMessage.getUserDataHeaderPresent
   *
   * @return {boolean} userDataHeaderPresent
   */
  WebSmsCom.BinaryMessage.prototype.getUserDataHeaderPresent = function(){
    return this.data['userDataHeaderPresent'];
  };
  
  /***
   * BinaryMessage.setMessageContent
   *
   * @param {Array} messageContent  Array of string/unicode containing base64 encoded binary
   * @return {Array} messageContent
   */
  WebSmsCom.BinaryMessage.prototype.setUserDataHeaderPresent = function(userDataHeaderPresent){
    if (userDataHeaderPresent !== undefined && typeof userDataHeaderPresent === 'boolean') {
      this.data['userDataHeaderPresent'] = userDataHeaderPresent;
    } else {
      this.emit('error', WebSmsCom.getErrorObj("Invalid userDataHeaderPresent for BinaryMessage. Must be boolean"));
      return;
    }
    return this.data['userDataHeaderPresent'];
  };
  
  
  //----------------- CLIENT -------------
  
  /***
   * WebSmsCom.Client
   *
   *    "Client" used to send Messages to api.websms.com gateway
   *
   *   Example:
   *        var client = new websms.Client('https://api.websms.com', 'your_username', 'your_password');
   *        client.send(TextMessageObject, 1, true, function(ApiResponse, messageObj){}, function(errorObj, messageObj){});
   *
   * @param {string} gateway_url
   * @param {string} username
   * @param {string} password
   
   */
  WebSmsCom.Client = function(gateway_url, username, password){
    this.gateway_url = gateway_url;
    this.username = username;
    this.password = password;
    this.header_useragent = 'nodejs SDK Client (v' + WebSmsCom.VERSION + ', ' + os.type() + ',' + os.platform() + ',' + os.release() + ')';
    
    this.parsedUrl = url.parse(this.gateway_url);
    this.path = '/json/smsmessaging';
    this.path_text = '/text';
    this.path_binary = '/binary';
    WebSmsCom.log("this.parsedUrl.host:" + this.parsedUrl.host);
    this.request_options = {
      auth: this.username + ':' + this.password,
      host: this.parsedUrl.hostname,
      path: this.parsedUrl.path + this.path,
      port: this.parsedUrl.port || 443,
      headers: {
          'User-Agent'  : this.header_useragent,
          'Content-Type' :'application/json;charset=UTF-8'
      }
    };
  };
  
  /***
   * _responseCallback
   *    Internal response callback function that will be attached to http response
   *
   * @param {Function} cb    - ok callback function
   * @param {Function} errCb - error callback function
   * @param {Object} message - Message Object (TextMessage or BinaryMessage)
   */
  WebSmsCom.Client.prototype._responseCallback = function(cb, errCb, message){
    return function(response){
      var str = '';
      
      WebSmsCom.log('HTTP Response Status: ', response.statusCode);
      
      response.on('data', function(chunk){
        str += chunk;
      });
      
      response.on('end', function(){
      
        WebSmsCom.log('--- RESPONSE RECEIVED --:\n' + str + '\n-------------\n');
        
        var isReadable = /json/.test(response.headers['content-type']);
        var msg = 'Internal Error';
        
        if (response.statusCode != 200 || !isReadable) {
          // HTTP failed
          var msg = "HTTP Connection failed, Server returned HTTP Status: " + response.statusCode;
          var cause = WebSmsCom.errorCauses['parameter'];
          if (response.statusCode == 401) {
            msg = "HTTP Authentication failed, check username and password. HTTP Status: " + response.statusCode;
            cause = WebSmsCom.errorCauses['authorization'];
          } else if (response.statusCode == 400) {
            msg = "HTTP Status 400 - Bad Request. Server couldnot understand Request/Content. " + str;
            cause = WebSmsCom.errorCauses['unknown'];
          } else if (!isReadable && response.statusCode == 200) {
            msg = "HTTP Response is of unknown content-type '" + response.headers['content-type'] + "', Response body was: " + str;
            cause = WebSmsCom.errorCauses['unknown'];
          }
          var errorObj = WebSmsCom.getErrorObj({
            'cause': cause,
            'message': msg,
            //responseObject: response,
            //responseBody: str,
            'error': undefined,
            'throwError': false
          });
          WebSmsCom.defaultErrorCallback(errorObj, errCb, message);
          
        } else {
          // HTTP success and isReadable
          if (cb) {
            var ApiResponse;
            try {
              ApiResponse = JSON.parse(str);
            } catch (err) {
              ApiResponse = {
                message: 'JSON parse error:' + err.message,
                error: err,
                rawString: str,
                statusCode: 0
              };
            }
            if (ApiResponse['statusCode'] < 2000 || ApiResponse['statusCode'] > 2001) {
              // API failed
              msg = 'API statusCode: ' + ApiResponse['statusCode'] + ', statusMessage: ' + ApiResponse['statusMessage'];
              var errorObj = WebSmsCom.getErrorObj({
                'cause': WebSmsCom.errorCauses['api'],
                'message': msg,
                //messageObject: message,
                'apiResponse': ApiResponse,
                'error': undefined,
                'throwError': false
              });
              WebSmsCom.defaultErrorCallback(errorObj, errCb, message);
            } else {
              // success
              WebSmsCom.defaultOkCallback(cb, ApiResponse, message);
            }
            
          }
        }
      });
      
      response.on('error', function(e){
        var errorObj = WebSmsCom.getErrorObj({
          'cause': WebSmsCom.errorCauses['connection'],
          'message': 'HTTPS Response error event: ' + e.message,
          //messageObject: message,
          'error': e,
          'throwError': false
        });
        WebSmsCom.defaultErrorCallback(errorObj, errCb, message);
      });
      
      response.on('close', function(e){
        var errorObj = WebSmsCom.getErrorObj({
          'cause': WebSmsCom.errorCauses['connection'],
          'message': 'HTTPS Response close event: ' + e.message,
          //messageObject: message,
          'error': e,
          'throwError': false
        });
        WebSmsCom.defaultErrorCallback(errorObj, errCb, message);
      });
      
    }
  };
  
  /***
   * _requestCallback
   *    Internal callback function attached to https request
   *    Used to handle error listener of request (when no response can occurr)
   *
   * @param {Function} errCb - error callback function
   * @param {Object} message - Message object (TextMessage or BinaryMessage)
   */
  WebSmsCom.Client.prototype._requestCallback = function(errCb, message){
    return function(e){
      var errorObj = WebSmsCom.getErrorObj({
        'cause': WebSmsCom.errorCauses['connection'],
        'message': 'HTTPS request error: ' + e.message,
        //messageObject: message,
        'error': e,
        'throwError': false
      });
      WebSmsCom.defaultErrorCallback(errorObj, errCb, message);
    }
  };
  
  /***
   * _post
   *    Internal function for https POST request to API
   *
   * @param {string} path   - endpoint path for text or binary
   * @param {Object} data   - content message data
   * @param {Function} cb   - callback function when message was transferred
   * @param {Function} errCb - callback function when message was not transferred
   * @param {Object} message - full Message object that is posted to be passed through
   */
  WebSmsCom.Client.prototype._post = function(path, data, cb, errCb, message){
  
    var content = JSON.stringify(data);
    
    var opts = {};
    WebSmsCom.applyIf(opts, this.request_options);
    
    opts.path = opts.path + path;
    opts.path = opts.path.replace(/\/\//, '/','g');
    opts.method = "POST";
    opts.headers['Content-Length'] = Buffer.byteLength(content, 'utf8');
   
    WebSmsCom.log("https request opts:", opts);
    
    var request = https.request(opts, this._responseCallback(cb, errCb, message));
    
    request.on('error', this._requestCallback(errCb, message));
    
    WebSmsCom.log("https request content:", content);
    request.write(content);
    request.end();
  };
  
  /***
   * Client.send
   *    send message object.
   *
   *    Example usage:
   *    client.send( TextMessageObject,
   *                 1,
   *                 true,
   *                 function(ApiResponse, messageObj){},
   *                 function(errorObj, messageObj){}
   *                );
   *
   * @param {Object} message        - Message Object (TextMessage or BinaryMessage)
   * @param {int} maxSmsPerMessage  - Amount
   * @param {boolean} isTest        - set to false to really send SMS
   * @param {Function} cb           - function called when message was transferred. Params: cb(ApiResponse,messageObj)
   * @param {Function} errCb        - error callback function when message was (probably) not transferred. Params: errCb(errorObj,messageObj)
   */
  WebSmsCom.Client.prototype.send = function(message, maxSmsPerMessage, isTest, cb, errCb){
    var message_path;
    var data;
    if (message instanceof WebSmsCom.TextMessage || message instanceof WebSmsCom.BinaryMessage) {
      data = message.getData();
      if (isTest !== undefined) {
        if (typeof isTest === 'boolean') {
          data['test'] = isTest;
        } else {
          var msg = "Invalid isTest parameter '" + isTest + "' must be boolean.";
          WebSmsCom.defaultErrorCallback(WebSmsCom.getErrorObj({
            'cause': WebSmsCom.errorCauses['parameter'],
            'message': msg,
            'error': new Error(msg),
            'throwError': false
          }), errCb, message);
          return;
        }
      }
      if (message instanceof WebSmsCom.TextMessage) {
        WebSmsCom.log("sending TextMessage");
        message_path = this.path_text;
        if (maxSmsPerMessage !== undefined) {
          if (maxSmsPerMessage > 0 && maxSmsPerMessage < 256) {
            data['maxSmsPerMessage'] = maxSmsPerMessage;
          } else {
            var msg = "Invalid maxSmsPerMessage parameter '" + maxSmsPerMessage + "' must be 1-255.";
            WebSmsCom.defaultErrorCallback(WebSmsCom.getErrorObj({
              'cause': WebSmsCom.errorCauses['parameter'],
              'message': msg,
              'error': new Error(msg),
              'throwError': false
            }), errCb, message);
            return;
          }
        }
      } else if (message instanceof WebSmsCom.BinaryMessage) {
        WebSmsCom.log("sending BinaryMessage");
        message_path = this.path_binary;
      }
    } else {
      var msg = 'Unknown message object instance. Neither TextMessage nor BinaryMessage.';
      WebSmsCom.defaultErrorCallback(WebSmsCom.getErrorObj({
        'cause': WebSmsCom.errorCauses['parameter'],
        'message': msg,
        'error': new Error(msg),
        'throwError': false
      }), errCb, message);
      return;
    }
    this._post(message_path, data, cb, errCb, message);
  };
  
  
})(this);

