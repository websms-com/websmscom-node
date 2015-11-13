#!/usr/bin/env node

//--------------------------------------------------------------------------------------
// websms.com Gateway usage sample code
//  1.) create client, 
//  2.) create message, 
//  3.) send message with client.
//--------------------------------------------------------------------------------------

var websms = require("../websmscom");

// set websms.debug to true if you want more console output than necessary
websms.isDebug = false; 

//--- Modify these values to your needs ----------------
var username             = 'your_username';
var password             = 'your_password';
var gatewayUrl           = 'https://api.websms.com/';
var recipientAddressList = ['4367612345678'];
var unicodeMessageText   = 'Willkommen zur BusinessPlatform SDK von websms.com! Diese Nachricht enth\u00E4lt 160 Zeichen. Sonderzeichen: \u00E4\u00F6\u00FC\u00DF. Eurozeichen: \u20ac. Das Ende wird nun ausgez\u00E4hlt43210';
var maxSmsPerMessage     = 1;
var isTest               = false; // true: do not send sms but test interface, false: send sms

//-------------------------------------------------------

function main(){

  // 1.) -- create sms client (once) ------
  var myClient = new websms.Client(gatewayUrl, username, password);
  
  // 2.) -- create text message ----------------
  //     Create Message objects between try..catch to catch invalid parameters at creation.
  //     Message object is an EventEmitter and will exit at invalid creation or invalid parameters
  
  var myMessage;
  
  try {
  
    myMessage = new websms.TextMessage(recipientAddressList, unicodeMessageText);
    //myMessage.setClientMessageId("CustomMessageId-123"); // set additional properties (or write 'new TextMessage({clientMessageId:"myId"})' 
    //myMessage = example_createBinaryMessage(); // binary example

  } catch (e) {
    console.log('Caught message creation error: ', e.message);
    console.log('Stacktrace: ', e.stack);
    return;
  }
  
  // 3.) -- send message ------------------
  myClient.send(myMessage, maxSmsPerMessage, isTest, sendCallback);
  
}

function sendCallback(err, apiResponse) {
  
  if (err) {
    // ERROR
    
    if (err.cause === 'parameter' ||
        err.cause === 'authorization' ||
        err.cause === 'connection' ||
        err.cause === 'unknown') {
    
        console.log(err.message);
        
    } else if (err.cause === 'api') {
    
        // API responded, but some limit was hit 
        // statusCode and statusMessage are readable,
        // see API docs for codes
        
        var statusCode    = err.apiResponse.statusCode;
        var statusMessage = err.apiResponse.statusMessage;
        
        console.log('\n---- apiResponse:\n', err.apiResponse);
    }
    console.log('\n---- Related messageObject:\n', err.messageObject);
  
  } else {
    // OK
    
    console.log("\n---- transferredCallback function called with ApiResponse:\n", apiResponse);
    var statusCode      = apiResponse.statusCode;
    var statusMessage   = apiResponse.statusMessage;
    var transferId      = apiResponse.transferId;
    var clientMessageId = apiResponse.clientMessageId;
    var messageObject   = apiResponse.messageObject;
    
  }
  
}


function example_createBinaryMessage() {
    /**
     * Working messageContent sample of PDU sms containing content "Zusammengefügt."
     * sent as 2 SMS segments: ("Zusammen","gefügt.").
     * First 6 Bytes per segment are sample UDH. See http://en.wikipedia.org/wiki/Concatenated_SMS
     * 
     * var messageContentSegments = [
     *   "BQAD/AIBWnVzYW1tZW4=", // 0x05,0x00,0x03,0xfc,0x02,0x01, 0x5a,0x75,0x73,0x61,0x6d,0x6d,0x65,0x6e
     *   "BQAD/AICZ2Vmw7xndC4="  // 0x05,0x00,0x03,0xfc,0x02,0x02, 0x67,0x65,0x66,0xc3,0xbc,0x67,0x74,0x2e
     * ];
     * 
     */
    var segment_1 = new Buffer([0x05,0x00,0x03,0xfc,0x02,0x01, 0x5a,0x75,0x73,0x61,0x6d,0x6d,0x65,0x6e]).toString('base64');
    var segment_2 = new Buffer([0x05,0x00,0x03,0xfc,0x02,0x02, 0x67,0x65,0x66,0xc3,0xbc,0x67,0x74,0x2e]).toString('base64');
    
    var messageContentSegments = [segment_1, segment_2];
    var userDataHeaderPresent  = true;
    
    console.log('---- Binary Message Segments decoded');
    console.log('segment_1: ' + new Buffer(segment_1, 'base64').toString('ascii'));
    console.log('segment_2: ' + new Buffer(segment_2, 'base64').toString('ascii'));
    
    return new websms.BinaryMessage(recipientAddressList, messageContentSegments, userDataHeaderPresent, sendCallback);
}

main();

/***
 * Tip:
 * You don't need to use setter methods, it's also possible create a message with all properties at once:
 * Example:
 * 
   myMessage = new websms.TextMessage({
       'recipientAddressList'    : recipientAddressList,
       'messageContent'          : "Hello World!",
       'senderAddress'           : "AlphanumericSender",
       'senderAddressType'       : 'alphanumeric',
       'sendAsFlashSms'          : true,
       'priority'                : 1,
       'notificationCallbackUrl' : 'https://my_server_for_send_notification',
       'clientMessageId'         : "My custom message id",
       'callback'                : sendCallback
    });
 * 
 */
