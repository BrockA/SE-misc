// ==UserScript==
// @name        Stack Exchange, View Comment source markdown/code
// @description Adds buttons to each comment to copy that comment's markdown to the clipboard.
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
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant       GM_addStyle
// @grant       GM_setClipboard
// @version     1.0
// @history     1.0 Initial write in response to https://meta.stackoverflow.com/q/382478/331508
// @author      Brock Adams
// @homepage    https://stackapps.com/q/8296/7653
// @supportURL  https://github.com/BrockA/SE-misc/blob/master/Stack%20Exchange%2C%20View%20Comment%20source%20markdown_code.user.js
// ==/UserScript==
/* global $, waitForKeyElements, StackExchange */
/* eslint-disable no-multi-spaces, curly */

const seApiBaseUrl      = "https://api.stackexchange.com/2.3/";
const scrtPrefix        = "SE VCM script:";
const supportUrl        = GM_info.script.supportURL || GM_info.script.homepage || "not set!";
const tm_msgOptions     = { position: {at: "top center", my: "bottom center"}, type: 'info', transient: false };
var   gbl_LastCmmntId   = 0;

waitForKeyElements (".comment-body", addMarkdownBttn);

function addMarkdownBttn (jNode) {
    //--  `<button class="js-comment-edit s-btn s-btn__link" aria-label="Edit"><span class="hover-only-label">Edit</span></button>`
    jNode.append (
        `<button class="tmCCodeBtn s-btn s-btn__link" aria-label="Code"><span class="hover-only-label">Code</span></button>`
    );

}
$("#content").on ("click", ".tmCCodeBtn", zEvent => {
    var commentNd   = $(zEvent.currentTarget).closest (".comment");
    var commentId   = commentNd.data ("commentId");

    StackExchange.helpers.showMessage (
        zEvent.currentTarget,
        `<textarea class="tmCmmntCode" id="tmCmmntCode-${commentId}">Fetching data...</textarea>
        <br><button class="tmCopyCmmntCode">to Clipboard</button>`,
        tm_msgOptions
    );
    $(`#tmCmmntCode-${commentId}`).click (stopClickFromClosing);  //  Attach this way so can intercept a message's default click.
    $(`.tmCopyCmmntCode`).click (clipboardizeComment);  // Catch click before default close.
    fetchCommentMarkdown (commentId);
} );

function stopClickFromClosing (zEvent) {
    zEvent.preventDefault ();
    zEvent.stopPropagation ();
}

function clipboardizeComment (zEvent) {
    var txtArea = $(zEvent.target).prevAll (".tmCmmntCode");
    GM_setClipboard (txtArea.val(), 'text');
}

function fetchCommentMarkdown (commentId) {
    gbl_LastCmmntId = commentId;

    //-- Fetch comment markdown from API:
    let reqURL  = seApiBaseUrl + "comments/" + commentId
                + "?filter=*J74u4MrvgeNSF_WvbUk&key=5CtZ)DaSoSCUwmIDR*c09Q(("
                + "&site=" + location.host
                ;
    $.getJSON (reqURL, processCommentBody).fail ( (jqXHR, textStatus) => {
        reportError ("API error: " + textStatus, "Detail: " + jqXHR.responseText);
    } );
}

function processCommentBody (jsonRsp) {
    checkForRoutineAPI_Errors (jsonRsp);
    var cmmntMarkDown   = "Comment not found! (Likely API error)";
    var commentId       = gbl_LastCmmntId;

    if (jsonRsp.items.length) {
        cmmntMarkDown   = jsonRsp.items[0].body_markdown  ||  "API bug: Markdown not returned";
        commentId       = jsonRsp.items[0].comment_id  ||  gbl_LastCmmntId;
    }

    let textAreaNd      = $(`#tmCmmntCode-${commentId}`);
    textAreaNd.val (cmmntMarkDown);
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
        13137713 //-- Should be unique-ish number
    );
}

GM_addStyle ( `
    .tmCCodeBtn {
        margin-left:            1ex;
    }
    .tmCmmntCode {
        width:                  32em;
        min-height:             8em;
    }
` );
