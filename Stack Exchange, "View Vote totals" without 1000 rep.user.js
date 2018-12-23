// ==UserScript==
// @name        Stack Exchange: View Up&Down Vote totals, on posts, without 1000 rep
// @description Enables the up/down vote counts feature without requiring an account or 1k+ reputation.
// @match       *://*.askubuntu.com/*
// @match       *://*.onstartups.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://area51.stackexchange.com/*
// @exclude     *://blog.*.com/*
// @exclude     *://chat.*.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @grant       none
// @version     1.0
// @history     1.0 Write from scratch after Rob Wu's script was busted by site changes.
// @author      Brock Adams
// @homepage    https://stackapps.com/q/8166/7653
// @supportURL  https://stackapps.com/q/8166/7653
// ==/UserScript==
/* global $, StackExchange */
/* eslint-disable no-multi-spaces, curly */

const voteCntSelector   = ".js-vote-count";
const seApiBaseUrl      = "https://api.stackexchange.com/2.2/";
const scrtPrefix        = "TM VVT script:";
const supportUrl        = GM_info.script.supportURL || GM_info.script.homepage || "not set!";

StackExchange.ready ( () => {
    //-- Does the user already have vote-count privileges?
    if (StackExchange.options.user.rep >= 1000 ) {
        console.info (`${scrtPrefix} No action needed, vote-view privilege already in place.`);
        return;
    }

    //-- Add UI hint.  Note that on review pages, the posts might not be loaded yet. That's not a show-stopper.
    $(voteCntSelector).attr ("title", "View upvote and downvote totals").addClass ("tmTalkToTheHand");

    //-- Activate click handling.
    $("body").on ("click", voteCntSelector, fetchVoteCounts);

    //-- Touch up CSS
    addStyle ( `
        .tmTalkToTheHand {cursor: pointer;}
    ` );
} );


function fetchVoteCounts (zEvent) {
    /*-- Get vote counts for *all* posts on page, since can do it in one API call.
        This also makes the click handler a one-shot.
    */
    //$("body").off ("click", voteCntSelector, fetchVoteCounts);

    let scoreNodes = $(voteCntSelector);
    StackExchange.helpers.addSpinner (scoreNodes);
    scoreNodes.removeClass ("tmTalkToTheHand c-pointer");

    let postIds = scoreNodes.map ( (J, zNode) => {
        var idNode  = $(zNode).closest (".js-voting-container");
        var id      = idNode.attr ("data-post-id");
        return id;
    } ).get ();
    console.log (`${scrtPrefix} postIds: `, postIds);
    if (postIds.length === 0 ) {
        console.warn (`${scrtPrefix} No posts found!  Adjust @excludes or selectors as appropriate.`);
        return;
    }

    //-- Fetch all post vote data from API:
    let reqURL  = seApiBaseUrl + "posts/" + postIds.join (";")
                + "?filter=!*7PkKVPlnPbb*vm6AspvYO*NVMi6&key=SE5QpaMeN)UPGK7NporOPA(("
                // Sort votes avoids auto add of last_activity_date and auto adds score instead.
                + "&sort=votes&pagesize=100&site=" + location.host
                ;

    $.getJSON (reqURL, processVoteCounts).fail ( (jqXHR, textStatus) => {
        StackExchange.helpers.removeSpinner ();
        reportError ("API error: " + textStatus, "Detail: " + jqXHR.responseText);
    } );
}

function processVoteCounts (jsonRsp) {
    checkForRoutineAPI_Errors (jsonRsp);

    /*-- Overwrite the vote cells with the up/down data.
        From:
            <div class="js-vote-count grid--cell fc-black-500 fs-title grid fd-column ai-center" itemprop="upvoteCount" data-value="11" title="View upvote and downvote totals">
                11
            </div>

        To:
            <div class="js-vote-count grid--cell fc-black-500 fs-title grid fd-column ai-center" itemprop="upvoteCount" data-value="11" title="11 up / 0 down">
                <div style="color:green">+11</div>
                <div class="vote-count-separator"></div>
                <div style="color:maroon">0</div>
            </div>
    */
    let voteCntnrs = $(".js-voting-container");
    $.each (jsonRsp.items, (J, postData) => {
        var prefUpCnt   = postData.up_vote_count   ?  `+${postData.up_vote_count}`   :  0;
        var prefDownCnt = postData.down_vote_count ?  `-${postData.down_vote_count}` :  0;
        var postVtNode  = voteCntnrs.filter (`[data-post-id='${postData.post_id}']`).find (voteCntSelector);

        postVtNode.attr ("title",  `${postData.up_vote_count} up / ${postData.down_vote_count} down`);
        postVtNode.html ( `
            <div style="color:green">${prefUpCnt}</div>
            <div class="vote-count-separator"></div>
            <div style="color:maroon">${prefDownCnt}</div>
        ` );
    } );
}

function checkForRoutineAPI_Errors (jsonRsp) {
    //-- Always check for (and ideally handle) these errors, esp backoff:
    if (jsonRsp.backoff)
        reportError (`API sent backoff warning, ${jsonRsp.backoff} seconds.`);
    if (jsonRsp.quota_remaining < 20)
        reportError (`API low quota alert. ${jsonRsp.quota_remaining} remaining.`);
    if (jsonRsp.error_id) {
        reportError (
            `Error ${jsonRsp.error_id}, ${jsonRsp.error_name}.`,
            jsonRsp.error_message
        );
    }
}
function reportError (errLine1, errLine2) {
    console.error (`${scrtPrefix} `, errLine1);
    if (errLine2) {
        console.error (errLine2);
        errLine2 = "<br>" + errLine2;
    }
    else
        errLine2 = "";

    StackExchange.notify.show (
        `Error in ${GM_info.script.name} userscript.<br>
         ${errLine1} ${errLine2} <br>
         If the error persists, please report it at <a href="${supportUrl}">the support page</a>.
        `,
        131313 //-- Should be unique-ish number
    );
}
function addStyle (cssStr) {
    var D               = document;
    var newNode         = D.createElement ('style');
    newNode.textContent = cssStr;

    var targ    = D.getElementsByTagName ('head')[0] || D.body || D.documentElement;
    targ.appendChild (newNode);
}
