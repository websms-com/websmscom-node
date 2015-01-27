#!/usr/bin/env node

//--------------------------------------------------------------------------------------
// Example on how to send a queue of messages 
//--------------------------------------------------------------------------------------

var websms = require("../websmscom");

// set websms.debug to true if you want more console output than necessary
websms.isDebug = false; 

//--- Modify these values to your needs ----------------
var username             = 'your_username';
var password             = 'your_password';
var gatewayUrl           = 'https://api.websms.com/';
var recipientAddressList = ['4367612345678'];
var unicodeMessageText   = 'This is a random Message with Number: ';
var maxSmsPerMessage     = 1;
var isTest               = true;
//-------------------------------------------------------

var myClient = new websms.Client(gatewayUrl, username, password);

function main() {
    
    var queue_position    = 0;

    var createCallback = function() {
        
        return function(errorObj, apiResponse) {
          
          if (errorObj) {
            
            console.log(queue_position + " not transferred, stop the whole process.");
            console.log(errorObj.message);
            console.log('Untransferred Message had message id: ',errorObj.messageObject.getClientMessageId());
            
            if (errorObj.cause === 'api' && errorObj.apiResponse.statusCode === 4023) {
                // limit hit
                console.log("Will try again in 10 seconds");
                setTimeout(function(){
                    sendSms(queue_position);
                }, 10000);
            } else {
                console.log("Will not retry, stop.");
            }
            
          } else {
            
            console.log("queue_position " + queue_position + " transferred, send next message...", apiResponse.messageObject.getMessageContent());
            // send next one
            queue_position++;
            sendSms(queue_position);
            
          }
        };
    };
    
    var sendSms = function(position) {
        
        if (message_queue !== undefined && typeof message_queue[position] !== 'undefined') {
            
            // alter message for demonstration
            message_queue[position].setClientMessageId(
                message_queue[position].getClientMessageId() + ' , queue_position ' +position
            );
           
            // send message
            myClient.send(message_queue[position], maxSmsPerMessage, isTest, createCallback());
            
        } else {
            console.log("No (more) messages");
        }
    };
    
    // Create all messages
    var message_queue = generate_messages(30);
    
    // send one after the other, stop if one fails, 
    // if limit (statusCode 4023) is hit, 
    // will retry in 10 seconds
    sendSms(queue_position);
    
}


function generate_messages(amount){

  // 2.) -- create text message ----------------
  //     Create Message objects between try..catch to catch invalid parameters at creation
  //     and stop further broken creations or you set 'websms.doThrowMessageCreationError = false;'
  
  var messages = [];
  
  // generate 100 random messages
  try {
    
    for (var i=0;i<amount;i++) {
        messages[i] = new websms.TextMessage({
            'recipientAddressList': recipientAddressList,
            'messageContent': unicodeMessageText + (i+1),
            'clientMessageId' : ''+(i+1)
        } );
    }

  } catch (e) {
    console.log('Caught message creation error: ', e.message);
    console.log('Stacktrace: ', e.stack);
    
    return;
  }

  return messages;
}

main();

