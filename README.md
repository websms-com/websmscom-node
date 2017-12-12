websmscom.js
=========
### SMS text/binary messaging tool for node.js

![](https://websms.at/images/websms/system/websms-logo.png)

`websmscom.js` module provides an easy-to-use API for sending SMS text and binary messages through websms.com API (`https://api.websms.com`) and is also usable as command line tool directly from bash.
 


An example code of how to use this nodejs module in your own scripts can be found in 
`examples/send_sms.js` .

#### Features:

 * Text Messages
 * Binary Messages
 * Confirmation of Delivery
 * Answers to SMS can be forwarded
 * Usable in modules and from command line

See [websms.com](http://websms.com) website to [register](https://www.websms.com/websms-testen/) for an account.

For general API specification of the server (nodejs independent) visit: [https://api.websms.com](https://api.websms.com)

Installation
------------

Install with `npm`:

```bash
$ npm install websmscom
```

also see INSTALL file

Test
----

test for successful installation

```bash
$ npm test websmscom
```

Usage
-----
1. require

  ```
  var websms = require('websmscom');
  ```
2. Create a client object (once)

  ```
  var myClient = new websms.Client(gatewayUrl, username, password);
  ```
3. Create a Message object (or many)

  ```
  var myMessage = new websms.TextMessage(recipientAddressList, unicodeMessageText, [creationFailedCallback]);
  ```
4. Send Message object over Client

  ```
  myClient.send(myMessage, maxSmsPerMessage, isTest, callback);
  ```

#### Parameters explained:
 * __gatewayUrl__ : {string} URL used to connect to websms API like 'https://api.websms.com'
 * __username__   : {string}username used in basic authentication. This is your websms.com account username
 * __password__   : {string} password used in basic authentication  This is your websms.com account password
 * __recipientAddressList__ : {Array} of strings containing message recipient mobile numbers (MSISDN) like ['4367612345678','4369912345678']
 * __unicodeMessageText__ : {string} messageContent string sent that will be included in JSON object and sent as charset utf-8 to API. Special characters should be escaped as unicode. Euro sign is \u20AC.
 * __creationFailedCallback__ : {Function} function that is called when creation of message failed
 * __maxSmsPerMessage__ : {Number} integer number 1-255 telling how many concatenated sms parts are the limit for sending this message. (in case the text is longer than what fits into multiple sms)
 * __isTest__ : {boolean} false to really send sms. true to just test interface connection and process
 * __callback__ : {Function} callback at error or success
 
 


----

Full Example
------------

#### Send a TextMessage

    var websms = require('websmscom');
    var myMessage;

    // Set your account data
    username              = "your_username";
    password              = "your_password";
    gatewayUrl            = "https://api.websms.com";
    recipientAddressList  = ['4367612345678'];
    unicodeMessageText    = 'Willkommen zur BusinessPlatform SDK von websms.com! Diese Nachricht enth\u00E4lt 160 Zeichen. Sonderzeichen: \u00E4\u00F6\u00FC\u00DF. Eurozeichen: \u20ac. Das Ende wird nun ausgez\u00E4hlt43210';
    maxSmsPerMessage      = 1;
    isTest                = true; // true: do not send sms for real, just test interface

    // 1. Create a client object
    var myClient = new websms.Client(gatewayUrl, username, password);

    // 2. Create a Message object
    try {
    
      myMessage = new websms.TextMessage(recipientAddressList, unicodeMessageText, creationFailedCallback);

    } catch (e) {
    
      console.log('Caught message creation error: ', e.message, e.stack);
      return;

    }

    // 3. Send Message object over Client
    myClient.send(myMessage, maxSmsPerMessage, isTest, callback);

    // Finished


    function callback(errorObject, apiResponse) {
      console.log(ApiReponse, apiResponse);
    }

    


You can also prevent the throwing of exceptions by just setting 
```
websms.doThrowMessageCreationError = false;
```

#### Create a BinaryMessage

This example sends 2 sms messages as one concatenated message, using a user data header (first 6 bytes):

See [http://en.wikipedia.org/wiki/Concatenated_SMS]

    var segment_1 = new Buffer([0x05,0x00,0x03,0xfc,0x02,0x01, 0x5a,0x75,0x73,0x61,0x6d,0x6d,0x65,0x6e]).toString('base64');
    var segment_2 = new Buffer([0x05,0x00,0x03,0xfc,0x02,0x02, 0x67,0x65,0x66,0xc3,0xbc,0x67,0x74,0x2e]).toString('base64');
    
    var messageContentSegments = [segment_1, segment_2];
    var userDataHeaderPresent  = true;
    
    var binaryMessage = new websms.BinaryMessage(recipientAddressList, messageContentSegments, userDataHeaderPresent, creationFailedCallback);


----

From Command Line
-------------------------

In case you installed it globally, it can also be used as a command line tool: 

```bash
$ npm install -g websmscom
```

```bash
$ websmscom --send --u myUsername --p myPassword --r=43676123456789,43699123456789 --m="Service X is strill running!"
```

    USAGE:
    
       node websmscom <parameters>
    
       You can also write parameters like this: --id="--sample id--" or --v=false
    
     Parameter:
    
       --h, --help          this screen      (flag)
       --send               Send SMS         (flag)
       --moduletest         Run module tests (flag)
    
       --u "<username>"     Authentication user name
       --p "<password>"     Authentication password
       --r "<recipients>"   Comma-delimited recipient list
                            like: --r 4367612345678,4367612345679
       --m  "<message>"     Text Message in unicode. Eurosign is e.G. \u20ac
    
       --t                              (optional) Do not send sms, just test interface (flag)
       --v                              (optional) Verbose flag
       --s "<senderAddress>"            (optional) Sender Address (needs to be set for account)
       --st "<senderAddressType>"       (optional) type of sender address
       --f                              (optional) send as flash sms (flag)
       --c "<notificationCallbackUrl>"  (optional) notificationCallbackUrl
       --id "<clientMessageId>"         (optional) custom message id attached to message
       --pri <int>                      (optional) message priority 1-9
       --max <int>                      (optional) MaxSmsPerMessage, default: 1
       --g "<gatewayUrl>"               (optional) gateway url different from https://api.websms.com


----

Quick Message Construction
--------------------------

You don't need to use setter methods, it's also possible create a message with all properties at once:

    myMessage = new websms.TextMessage({
           'recipientAddressList'    : recipientAddressList,
           'messageContent'          : "Hello World!",
           'senderAddress'           : "AlphanumericSender",
           'senderAddressType'       : 'alphanumeric',  // also possible values: 'shortcode', 'international', 'national
           'sendAsFlashSms'          : true,
           'priority'                : 1,
           'notificationCallbackUrl' : 'https://my_server_for_send_notification',
           'clientMessageId'         : "My custom message id",
           'callback'                : callback
        });


Callback function format
------------------------
#### transferredCallback(apiResponse, messageObject)

    function (apiResponse, messageObject) {
        console.log("\n---- transferredCallback function called with ApiResponse:\n", apiResponse);
        console.log('\n---- Related messageObject:\n', messageObject);
        var statusCode      = apiResponse.statusCode;
        var statusMessage   = apiResponse.statusMessage;
        var transferId      = apiResponse.transferId;
        var clientMessageId = apiResponse.clientMessageId;
    };


#### notTransferredCallback(errorObj, messageObject)

    function (errorObj, messageObject){
    
        console.log("\n---- notTransferredCallback function called.\n");
    
        if (errorObj.cause === 'parameter' ||
            errorObj.cause === 'authorization' ||
            errorObj.cause === 'connection' ||
            errorObj.cause === 'unknown') {
        
            console.log(errorObj.message);
            //console.log("\n---- errorObj:\n", errorObj);
            
        } else if (errorObj.cause === 'api') {
        
            // API responded, but some limit was hit 
            // statusCode and statusMessage are readable,
            // see API docs for codes
            var apiResponse = errorObj.apiResponse;
            
            var statusCode    = apiResponse.statusCode;
            var statusMessage = apiResponse.statusMessage;
            
            console.log('\n---- apiResponse:\n', apiResponse);
        }
        console.log('\n---- Related messageObject:\n', messageObject);
    };

#### creationFailedCallback(errorObj, incompleteMessageObject)

    function (errorObj, incompleteMessageObject) {
        console.log("\n---- creationFailedCallback function called with errorObj:\n", errorObj);
        console.log("incompleteMessageObject:", incompleteMessageObject);
    };


----


Properties
----------

#### *websms.isDebug = true/false*
boolean - set to true to see more logging. Logging is done via function `websms.log` which you can overwrite

#### *websms.doThrowMessageCreationError = true/false*
boolean - set to false if you do not want to have thrown errors at message creation (creationFailedCallback is called everytime then given)

Functions
-------
#### *websms.log*
  passes *arguments* to console.log() when *websms.isDebug = true*

Classes
-------
#### Client
 > new websms.Client(*gatewayUrl, user, password*)
 
##### Methods/Functions
     Client.send(messageObject, maxSmsPerMessage, isTest, transferredCallback, notTransferredCallback)
     
#### TextMessage
 > new websms.TextMessage(*recipientAddressList, messageContent, creationFailedCallback*)

##### Methods/Functions
     TextMessage.getMessageContent()
     TextMessage.setMessageContent(messageContent)

#### BinaryMessage
 > new websms.BinaryMessage(*recipientAddressList, messageContentSegments, uerDataHeaderPresent, creationFailedCallback*)
 
##### Methods/Functions
     BinaryMessage.getMessageContent()
     BinaryMessage.setMessageContent(messageContentSegments)
     BinaryMessage.getUserDataHeader()
     BinaryMessage.setUserDataHeader(userDataHeader)

#### Message
 > Base class for all messages  (every message inherits from Event.Emitter)

##### Methods/Functions
     Message.getRecipientAddressList()
     Message.setRecipientAddressList(recipentAddressList)
     Message.checkRecipientAddressList(recipentAddressList)
     Message.getData()
     Message.getSenderAddress()
     Message.setSenderAddress(senderAddress)
     Message.getSenderAddressType()
     Message.setSenderAddressType(senderAddressType)
     Message.getSendAsFlashSms()
     Message.setSendAsFlashSms(sendAsFlashSms)
     Message.getNotificationCallbackUrl()
     Message.setNotificationCallbackUrl(notificationCallbackUrl)
     Message.getClientMessageId()
     Message.setClientMessageId(clientMessageId)
     Message.getPriority()
     Message.setPriority(priority)



errorObj
--------
Generated by function `websmscom.getErrorObj` out of given obj 

Sample object:
     
    {
      message       : "<error message string>",
      messageObject : <TextMessage or BinaryMessage object affected>,
      apiResponse   : <ApiResponse Object in case there was an API Response>,
      error         : <Error>,  //Javascript Error() object
      throwError    : <boolean> 
    }


default properties are:
  'throwError':  true/false boolean - will result in thrown error (default true at message object creation)
  'message'   :  Error message


apiResponse
-----------

Sample object:

    {
     statusCode : 2000,
     statusMessage : 'OK',
     transferId : '005097e89a000466fe56';
     clientMessageId : "<when defined in transferred message by user>";
    }

Contributors
------------

* Gerd Reifenauer (Author) [@reifi](https://github.com/reifi)
* Georg Hinteregger

License
-------

(The MIT License)

Copyright (c) 2012 sms.at mobile internet services gmbh

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

----------

Additionally:

 * Also available for C++, Java, Perl, Python, Ruby and more...
