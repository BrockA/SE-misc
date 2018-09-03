// ==UserScript==
// @name            Stack Exchange Chat, Wheel of Blame and other Easter eggs
// @description     Annoy yourself with song and "dance"!
// @description     Reference https://meta.stackexchange.com/q/75861/148310 and the @homepage, below.
// @match           *://chat.stackoverflow.com/rooms/*
// @match           *://chat.stackexchange.com/rooms/*
// @match           *://chat.meta.stackexchange.com/rooms/*
// @run-at          document-body
// @noframes
// @grant           none
// @version         1.2
// @history         1.2 Fix bug when last message was posted by a Stack Exchange bot.
// @history         1.1 Iframe or double-run problem in MS Edge!?
// @history         1.0 Initial release
// @author          Brock Adams
// @homepage        https://stackapps.com/a/7828/7653
// ==/UserScript==

window.addEventListener ("load", function () {
    if ( ! Eggs.WOB) {
        console.log ("Loading eggs.js...");
        $.getScript ('//cdn-chat.sstatic.net/chat/Js/eggs.js');
    }
    if ( $("#yourPoison").length) {
        console.error (`${top == self} Double run occured somehow?! Please report this message and your browser/OS/Tampermonkey details to the developer.`);
        return;
    }
    $( `
        <select id="yourPoison" style="margin-left: 3em;">
            <option value="WoB">WoB</option>
            <option value="Asteroids">Asteroids</option>
            <option value="Assistant">Assistant</option>
            <option value="Console">Console</option>
            <option value="Cthulu">Cthulu</option>
        </select>
        <button id="gmEEoDBtn" class="button">EEgg</button>
    ` ).insertAfter ("#codify-button");

    $("#gmEEoDBtn").click (launchEEgg);
} );

function launchEEgg (zEvent) {
    var eeType = $("#yourPoison").val ();
    switch (eeType) {
        case "WoB":
            /*-- Important: Autoplay blocker can kill the sound but
                try/catch does not catch it here. The User must check the console for messages like:
                "play method is not allowed by the user agent"
            */
            var msg = $('.message').last ().addClass ('neworedit');
            Eggs.WOB.blame (msg.parent().parent().attr('class').match(/user-(-?\d+)/)[1], msg);
            break;
        case "Asteroids":
            Eggs.Asteroids ('insert coin');
            break;
        case "Assistant":
            Eggs.Assistant ('I would like to start the assistant');
            break;
        case "Console":
            Eggs.Console ('rm -r');
            break;
        case "Cthulu":
            Eggs.Cthulu('<[^>]');
            break;
        default:
            console.error ("Unexpected Easter Egg type: ", eeType);
        break;
    }
}
