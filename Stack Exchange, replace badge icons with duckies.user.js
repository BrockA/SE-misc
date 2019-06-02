// ==UserScript==
// @name        Stack Exchange, replace badge icons with duckies
// @description Does what it says on the tin.
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.*.com/*
// @exclude     *://chat.*.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @grant       none
// @run-at      document-start
// @version     3.0
// @history     3.0 Run on site-wide user pages. In Violentmonkey, the stylesheet was sometimes getting borked in a new tab.
// @history     2.0 Switch to SE image server for more reliable hosting.
// @history     2.0 Placed script in GitHub. Review gets duckies too.
// @history     1.5 Fix icon cutoff problem that many sites had.
// @history     1.0 Initial release
// @author      Samcarter and Brock Adams
// @homepage    https://stackapps.com/q/8116/7653
// @supportURL  https://github.com/BrockA/SE-misc/blob/master/Stack%20Exchange,%20replace%20badge%20icons%20with%20duckies.user.js
// ==/UserScript==
/* global $ */

main ();  // Add styles right away.

document.addEventListener ("DOMContentLoaded", () => {
//$(document).ready ( () => {  //  jQ not always loaded when this script first runs
    //-- Recheck and re-add styles if necessary.
    var bFoundStyleInDoc = false;

    $("style").each ( (J, stylNd) => {
        if (stylNd.textContent.includes ("Duckies Script: change icons of badges") ) {
            bFoundStyleInDoc = true;
            return false;
        }
    } );
    if ( ! bFoundStyleInDoc) {
        console.log ("Duckies styles got erased; reloading.");
        main ();
    }
} );

function main () {
    addStyle ( `
        /* Duckies Script: change icons of badges */
        .badge1, .badge2, .badge3 {
            background-image: url("https://i.stack.imgur.com/zm5Pg.png") !important;
            margin: 0 !important;
            width: 14px !important;
            height: 14px !important;
        }
        .badge1 { background-position: -39px 1px !important; } /* Gold */
        .badge2 { background-position: -19px 1px !important; } /* Silver */
        .badge3 { background-position:   1px 1px !important; } /* Bronze */
    ` );
}

function addStyle (cssStr) {
    var D               = document;
    var newNode         = D.createElement ('style');
    newNode.textContent = cssStr;

    var targ    = D.getElementsByTagName ('head')[0] || D.body || D.documentElement;
    targ.appendChild (newNode);
}
