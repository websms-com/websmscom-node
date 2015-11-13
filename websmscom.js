#!/usr/bin/env node
module.exports = websms = require("./websmscom_lib");


// tests
if (module === require.main) {

    var PossibleArguments = {
        'u': {
            value: undefined
        },
        'p': {
            value: undefined
        },
        'm': {
            value: undefined
        },
        'max': {
            value: undefined
        },
        'v': {
            type: 'bool',
            value: undefined
        },
        't': {
            type: 'bool',
            value: false
        },
        'g': {
            value: 'https://api.websms.com'
        },
        'r': {
            type: 'array',
            accumulateValues: true,
            delimiter: ',',
            value: []
        },
        's': {
            value: undefined
        },
        'st': {
            value: undefined
        },
        'f': {
            type: 'bool',
            value: undefined
        },
        'c': {
            value: undefined
        },
        'id': {
            value: undefined
        },
        'pri': {
            value: undefined
        },
        'send': {
            type: 'bool',
            value: undefined
        },
        'moduletest': {
            type: 'bool',
            value: false
        },
        'h': {
            type: 'bool',
            value: undefined
        },
        'help': {
            type: 'bool',
            value: undefined
        }
        
    };
    
    var parameter_tag = '\-\-'; // parameter tag
    process.argv.forEach(function(arg, index, array){
        //console.log(index + ': ' + arg);
        var tag_start_regex = new RegExp("^"+parameter_tag);
        var param_rex = new RegExp("^" + parameter_tag + "(" + Object.keys(PossibleArguments).join('|') + ")(\=|$)"); // /^--(u|p|m|v|g)=?/
        var matches = param_rex.exec(arg);
        //console.log('matches: ', matches);
        if (matches !== null) {
            var argkey = matches[1];
            
            var argrex = new RegExp("^" + parameter_tag + argkey + "=(.*)$");
            var argmatches = argrex.exec(arg);
            var value;
            if (argmatches !== null) {
                value = argmatches[1];
                if (value === '' || value === undefined) {
                    console.log("Value for argument " + matches[0] + " is undefined");
                    process.exit(1);
                }
            } else if (typeof array[index + 1] !== 'undefined' && !array[index + 1].match(tag_start_regex)) {
                value = array[index + 1];
            }
            
            var Argument = PossibleArguments[argkey];
            
            if (Argument.type === 'bool') {
                if (value !== undefined) {
                    Argument.value = (value == 'true');
                } else {
                    Argument.value = true;
                }
            } else if (value === undefined) {
                // no flag arguments underneath this if-condition
                console.log("Missing value for argument '" + argkey + "'");
                process.exit(1);
            } else if (Argument.type === 'array') {
                var arr = value.split(Argument.delimiter);
                if (Argument.accumulateValues) {
                    Argument.value = Argument.value.concat(arr);
                } else {
                    Argument.value = arr;
                }
            } else {
                Argument.value = value;
            }
        }
    });
    
    var SetArguments = getValues(PossibleArguments);
    //console.log("Set arguments: \n", SetArguments);
    
    if (SetArguments['h'] || SetArguments['help']) {
        printUsage();
    } else if (SetArguments['moduletest'] && SetArguments['send']) {
        console.log("Please choose one action only (send or moduletest)");
        printUsage();
    } else if (SetArguments['moduletest'] === true) {
        doTests();
    } else if (SetArguments['send'] === true) {
        doSend(SetArguments);
    } else {
        printUsage();
    }
}

function doTests() {
    'use strict';
    
    var assert = require("assert");
    console.log("Running module tests");
    
    var recipientListOk    = ['4367612345678','4369912345678'];
    var messagetextOk      = "\u20acurozeichen";
    var recipientListError = ['+4367612345678','43-699-12345678'];
    var messagetextError;
    var i;
    
    //websms.isDebug = true;
    
    console.log("Text Message creation tests.");
    var messageOk, quickMessageOk;
    
    assert.doesNotThrow(function() {
        messageOk = new websms.TextMessage(recipientListOk,messagetextOk);
    });
    
    assert.doesNotThrow(function () {
      quickMessageOk = new websms.TextMessage({
        'recipientAddressList': recipientListOk,
        'messageContent': messagetextOk,
        'senderAddress': "AlphanumericSender",
        'senderAddressType': 'alphanumeric', // also possible values: 'shortcode', 'international', 'national
        'sendAsFlashSms': true,
        'priority': 1,
        'notificationCallbackUrl': 'https://my_server_for_send_notification',
        'clientMessageId': "My custom message id",
        'callback': callbackErrorExpected
      });

  });
        
    assert.throws(function() {
        var message = new websms.TextMessage(recipientListError,messagetextOk);
    });
    
    assert.throws(function() {
        var message = new websms.TextMessage(recipientListOk,messagetextError);
    });
    
    var m_amount = 10000;
    var ttimerlabel = 'Message creation Time for '+m_amount+' new TextMessages';
    console.time(ttimerlabel);
    var messages=[];
    for (i=0;i<m_amount;i++) {
        messages[i] = new websms.TextMessage(recipientListOk,messagetextOk);
    }
    console.timeEnd(ttimerlabel);
    console.log("OK.");
    
    
    console.log("Binary Message creation tests.");
    var segment_1 = new Buffer([0x05,0x00,0x03,0xfc,0x02,0x01, 0x5a,0x75,0x73,0x61,0x6d,0x6d,0x65,0x6e]).toString('base64');
    var segment_2 = new Buffer([0x05,0x00,0x03,0xfc,0x02,0x02, 0x67,0x65,0x66,0xc3,0xbc,0x67,0x74,0x2e]).toString('base64');
    var messageBinaryOk = [segment_1, segment_2];
    
    var messageBinaryError = messagetextOk;
    
    assert.doesNotThrow(function() {
        var binaryMessage = new websms.BinaryMessage(recipientListOk, messageBinaryOk, true);
    });
    
    assert.throws(function() {
        var binaryMessage = new websms.BinaryMessage(recipientListError, messageBinaryOk, true);
    });
    
    assert.throws(function() {
        var binaryMessage = new websms.BinaryMessage(recipientListOk, messageBinaryError, true);
    });
    
    assert.throws(function() {
        var binaryMessage = new websms.BinaryMessage(recipientListOk, messageBinaryOk);
    });
    var b_amount = 10000;
    var btimerlabel = 'Message creation Time for '+b_amount+' new BinaryMessages';
    console.time(btimerlabel);
    var binmessages=[];
    for (i=0;i<b_amount;i++) {
        binmessages[i] = new websms.BinaryMessage(recipientListOk, messageBinaryOk, true);
    }
    console.timeEnd(btimerlabel);
    console.log("OK.");
    
    
    console.log("client send message tests.");
    var client = new websms.Client(websms.defaultGatewayUrl,'nodejs','nodejs');
    assert.deepEqual(typeof client.send, 'function');
    
    
    function callbackErrorExpected(err,ok){
      if (err) {
        assert.ok(true, "Correct Callback");
      } else {
        assert.ok(false, "Incorrect Callback");
      }
    }
   
    assert.doesNotThrow(function() {
        client.send(messageOk, -1, true, callbackErrorExpected); // calls error callback (ok)
    });
    assert.doesNotThrow(function() {
        client.send(messageOk, 1, true, callbackErrorExpected); // calls error callback (ok)
    });
    
    assert.doesNotThrow(function() {
        client.send(quickMessageOk, -1, true, callbackErrorExpected); // calls error callback (ok)
    });
    assert.doesNotThrow(function() {
        client.send(quickMessageOk, 1, true, callbackErrorExpected); // calls error callback (ok)
    });

    console.log("Passed tests. OK.");
}

function doSend(SetArgs){
    console.log("Send sms");
    if (SetArgs['v']) {
        websms.isDebug = true;
    }
    var client = new websms.Client(SetArgs['g'] || websms.defaultGatewayUrl, SetArgs['u'], SetArgs['p']);
    var msg;
    try {
        msg = new websms.TextMessage(SetArgs['r'], SetArgs['m']);
        if (SetArgs['s']   !== undefined) msg.setSenderAddress(SetArgs['s']);
        if (SetArgs['st']  !== undefined) msg.setSenderAddressType(SetArgs['st']);
        if (SetArgs['f']   !== undefined) msg.setSendAsFlashSms(SetArgs['f']);
        if (SetArgs['c']   !== undefined) msg.setNotificationCallbackUrl(SetArgs['c']);
        if (SetArgs['id']  !== undefined) msg.setClientMessageId(SetArgs['id']);
        if (SetArgs['pri'] !== undefined) msg.setPriority(SetArgs['pri']);
    } catch (e) {
        console.log('Caught error at message creation:',e.message,e.stack);
        process.exit(1);
    }
    client.send(msg, SetArgs['max'], SetArgs['t'], callback);
}
 
function getValues(obj){
    var keys = Object.keys(obj);
    var data = {};
    for (var i = keys.length - 1; i >= 0; i--) {
      if (obj[keys[i]].value !== undefined) {
        data[keys[i]] = obj[keys[i]].value;
      }
    }
    return data;
}

function callback(errorObj, apiResponse) {
    console.log(errorObj, apiResponse);
}



function printUsage() {
    // node websmscom.js --g http://192.168.11.111:8443/bpapi --u swtest --p 1234 --r=4367612345678 --m="Superduper kann ich nur sagen!" --s "REIFI" --st="national" --f --c "http://localhost/callback" --id="--custom ID" --prio 9 --send --t --v
    console.log(" ");
    console.log("USAGE:");
    console.log(" "); 
    console.log("   node websmscom <parameters>");
    console.log(" ");
    console.log(" Example:");
    console.log(" ");
    console.log("   node websmscom.js --send --u myUsername --p myPassword --r=43676123456789,43699123456789 --m=\"Hello from Service X!\" ");
    console.log(" ");
    console.log("    You can also write parameters like this: -id=\"--sample id--\" or --v=false");
    console.log(" ");
    console.log(" Parameter:");
    console.log(" ");
    console.log("   --h, --help          this screen      (flag)");
    console.log("   --send               Send SMS         (flag)");
    console.log("   --moduletest         Run module tests (flag)");
    console.log(" ");
    console.log("   --u \"<username>\"     Authentication user name");
    console.log("   --p \"<password>\"     Authentication password");
    console.log("   --r \"<recipients>\"   Comma-delimited recipient list");
    console.log("                        like: --r 4367612345678,4367612345679");
    console.log("   --m  \"<message>\"      Text Message in unicode. Eurosign is e.G. \\u20ac");
    console.log(" ");
    console.log("   --t                              (optional) Do not send sms, just test interface (flag)");
    console.log("   --v                              (optional) Verbose flag");
    console.log("   --s \"<senderAddress>\"            (optional) Sender Address (needs to be set for account)");
    console.log("   --st \"<senderAddressType>\"       (optional) type of sender address"); 
    console.log("   --f                              (optional) send as flash sms (flag)");
    console.log("   --c \"<notificationCallbackUrl>\"  (optional) notificationCallbackUrl");
    console.log("   --id \"<clientMessageId>\"         (optional) custom message id attached to message");
    console.log("   --pri <int>                      (optional) message priority 1-9");
    console.log("   --max <int>                      (optional) MaxSmsPerMessage, default: 1");
    console.log("   --g \"<gatewayUrl>\"               (optional) gateway url different from https://api.websms.com");

}

