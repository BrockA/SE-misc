// ==UserScript==
// @name        Stack Exchange, Dynamically expand the Q and A inputs
// @description Kill the vertical scrollbar, dynamically, on Q&A inputs while editing Stack Exchange posts.
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://blog.stackexchange.com/*
// @exclude     *://blog.stackoverflow.com/*
// @exclude     *://chat.stackexchange.com/*
// @exclude     *://chat.stackoverflow.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @exclude     *://*/review
// @grant       none
// @version     1.0
// @history     1.0 Initial release
// @author      Brock Adams
// @homepage    https://stackapps.com/a/7719/7653
// ==/UserScript==

//-- Add div to speed correlation between em and pixel units
$("<div>", {id:"tmCanary", text: "M", style: "position:fixed; bottom:-2em;"} ).appendTo ("body");

$("body").on ("click focus paste scroll", ".wmd-input", expandAreaIfNeeded);
$("body").on ("keyup", ".wmd-input", expandOnDebounce);

//-- If page is (re)loaded with open inputs, size them initially...
$(".wmd-input").each ( (J, zInput) => {
    expandAreaIfNeeded (zInput);
} );

function expandAreaIfNeeded (eventOrNode) {
    var targInput;
    if (eventOrNode.clientHeight)
        targInput = eventOrNode;
    else {
        targInput = eventOrNode.target;
        //console.log ("Fired. Event type: ", eventOrNode.type);
        //-- Paste events need some time to settle...
        if (eventOrNode.type === "paste") {
            setTimeout (expandAreaIfNeeded, 333, targInput);
            return;
        }
    }

    //-- Is scrollbar needed?
    if (targInput.scrollHeight <= targInput.clientHeight)   return;

    let desiredInpHeight    = targInput.scrollHeight + get3emHeight();

    //-- Just using jQ on WMD is enough.  Page nicely handles the rest
    $(targInput).height (desiredInpHeight);
}

function expandOnDebounce (zEvent) {
    /*-- Time-delay so not spamming the browser with size calcs and redraws...
    */
    this.resizeTimer    = this.resizeTimer || null;
    if (this.resizeTimer)
        clearTimeout (this.resizeTimer);

    this.resizeTimer    = setTimeout (expandAreaIfNeeded, 200, zEvent.target);
}

function get3emHeight () {  //  Returns pixels
    var theHeight   = 3 * ( $("#tmCanary").innerHeight() );
    // jshint -W021
    get3emHeight    = function () { return theHeight; };
    // jshint +W021

    return get3emHeight ();
}
