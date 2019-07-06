/*  Reference:
        https://meta.stackexchange.com/questions/256042/sede-login-redirects-to-front-page-rather-than-returning
        https://meta.stackoverflow.com/questions/109649/automatic-logging-into-dataexplorer
        https://meta.stackoverflow.com/questions/115131/are-user-accounts-on-data-stackexchange-and-stackexchange-two-different-entities
*/
// ==UserScript==
// @name        Stack Exchange Data Explorer (SEDE) auto login
// @description When visiting SEDE (1) automatically logs in if needed. (2) Redirects back to the original desired page.
// @match       *://data.stackexchange.com/*
// @match       https://openid.stackexchange.com/account/login*
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require     https://crypto.stanford.edu/sjcl/sjcl.js
// @noframes
// @inject-into content
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @version     2.1
// @history     2.1 Fix "TypeError: n.replace is not a function" glitch in Violentmonkey.
// @history     2.0 Update and (re)release to public.
// @history     1.5 Switch to Stack Exchange login.
// @history     1.0 Initial write.
// @author      Brock Adams
// @homepage    https://stackapps.com/q/8366/7653
// @supportURL  https://github.com/BrockA/SE-misc/blob/master/Stack%20Exchange%20Data%20Explorer%20(SEDE)%20auto%20login.user.js
// ==/UserScript==
/* global $, waitForKeyElements, sjcl */
/* eslint-disable no-multi-spaces, curly */
'use strict';

var targetURL;
var encKey  = GM_getValue ("encKey",  "");
var usr     = GM_getValue ("lognUsr", "");
var pword   = GM_getValue ("lognPwd", "");

if ( ! encKey) {
    encKey  = prompt (
        'Script key not set for ' + location.hostname + '. Please enter a random string:',
        ''
    );
    GM_setValue ("encKey", encKey);

    usr     = pword = "";   // New key makes prev stored values (if any) unable to decode.
}
usr         = decodeOrPrompt (usr,   "U-name", "lognUsr");
pword       = decodeOrPrompt (pword, "P-word", "lognPwd");

/*-- Login steps vary.
    Typical A:
        1) https://data.stackexchange.com/users/11949/brock-adams?order_by=favorite
        2) https://data.stackexchange.com/account/login?returnurl=/users/11949/brock-adams?order_by=favorite
        3) Logged in.
*/
if (location.pathname == "/account/login") {
    console.log ("*** On login page. ***");
    waitForKeyElements (
        //-- "Log in using Stack Exchange"
        ".js-openid-wrap .preferred-login > p > span:last", clickNode, true
    );
}
else if ( $("a:contains('log out')").length === 0) {
    console.log ("*** Waiting for login link. ***");
    GM_setValue ("origTargetURL", location.href);

    waitForKeyElements (
        ".topbar-links > .navigation-links > a:contains('log in')", clickNode, true
    );
}
else if (targetURL = GM_getValue ("origTargetURL") ) {
    console.log ("*** Should be logged in. ***");
    GM_deleteValue ("origTargetURL");

    //-- If not on target page, redirect:
    if (targetURL != location.href) {
        console.log ("*** Redirecting to desired page. ***");
        location.assign (targetURL);
    }
}

function clickNode (jNode) {
    var clickEvent  = document.createEvent ('MouseEvents');
    clickEvent.initEvent ('click', true, true);
    jNode[0].dispatchEvent (clickEvent);
}

if (location.host === "openid.stackexchange.com"  &&  location.pathname === "/account/login") {
    $("#email").attr ('value', usr);
    $("#password").attr ('value', pword);
    $(".login-form input.affiliate-button").click ();
}


//----------------------------------------
//--- Start of sensitive info framework
//----------------------------------------
function decodeOrPrompt (targVar, userPrompt, setValVarName) {
    if (targVar) {
        targVar     = unStoreAndDecrypt (targVar);
    }
    else {
        targVar     = prompt (
            userPrompt + ' not set for ' + location.hostname + '. Please enter it now:',
            ''
        );
        GM_setValue (setValVarName, encryptAndStore (targVar) );
    }
    return targVar;
}

function encryptAndStore (clearText) {
    return  JSON.stringify (sjcl.encrypt (encKey, clearText) );
}

function unStoreAndDecrypt (jsonObj) {
    return  sjcl.decrypt (encKey, JSON.parse (jsonObj) );
}

//-- Add menu commands that will allow U and P to be changed.
GM_registerMenuCommand ("Change Username", changeUsername);
GM_registerMenuCommand ("Change Password", changePassword);

function changeUsername () {
    promptAndChangeStoredValue (usr,   "U-name", "lognUsr");
}

function changePassword () {
    promptAndChangeStoredValue (pword, "P-word", "lognPwd");
}

function promptAndChangeStoredValue (targVar, userPrompt, setValVarName) {
    targVar     = prompt (
        'Change ' + userPrompt + ' for ' + location.hostname + ':',
        targVar
    );
    GM_setValue (setValVarName, encryptAndStore (targVar) );
}
