// ==UserScript==
// @name        Stack Exchange, Close Vote Reasons, Add em back
// @description Adds back missing and/or deprecated close-vote reasons.
// @match       *://*.askubuntu.com/questions/*
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
// @noframes
// @grant       none
// @version     1.0
// @history     1.0 Initial write, in response to chat conversation.
// @author      Brock Adams
// @homepage    https://stackapps.com/q/8327/7653
// @supportURL  https://github.com/BrockA/SE-misc/blob/master/Stack%20Exchange%2C%20Close%20Vote%20Reasons%2C%20Add%20em%20back.user.js
// ==/UserScript==
/* global $, waitForKeyElements, StackExchange */
/* eslint-disable no-multi-spaces, curly */

/*--- Site Type values (`st`):
    0   = Don't use
    1   = Use on both regular sites and teams
    2   = Regular sites only
    3   = Teams sites only
*/
const possblCloseReasons = [                                                     //-- Note that dscrptn text does not control what's stored/used by SE.
    {id:   1,  defInptVal: "Duplicate",     st: 1,  name: "exact duplicate",             dscrptn: ``},
    {id:   2,  defInptVal: "OffTopic",      st: 0,  name: "off topic",                   dscrptn: `DON'T USE?`},
    {id:   3,  defInptVal: "",              st: 1,  name: "not constructive",            dscrptn: `As it currently stands, this question is not a good fit for our Q&A
                                                                                                  format. We expect answers to be supported by facts, references, or
                                                                                                  specific expertise, but this question will likely solicit debate,
                                                                                                  arguments, polling, or extended discussion.`},
    {id:   4,  defInptVal: "",              st: 1,  name: "not a real question",         dscrptn: `It's difficult to tell what is being asked here. This question is
                                                                                                  ambiguous, vague, incomplete, overly broad, or rhetorical and cannot be
                                                                                                  reasonably answered in its current form.`},
    {id:   7,  defInptVal: "",              st: 1,  name: "too localized",               dscrptn: `This question is unlikely to help any future visitors; it is only
                                                                                                  relevant to a small geographic area, a specific moment in time, or an
                                                                                                  extraordinarily narrow situation that is not generally applicable to
                                                                                                  the worldwide audience of the internet.`},
    {id:  10,  defInptVal: "",              st: 1,  name: "general reference",           dscrptn: `Major Pain.`},
    {id:  20,  defInptVal: "",              st: 1,  name: "noise or pointless",          dscrptn: `But not <em>quite</em> spam or offensive.`},
    {id: 101,  defInptVal: "Duplicate",     st: 1,  name: "duplicate",                   dscrptn: ``},
    {id: 102,  defInptVal: "OffTopic",      st: 2,  name: "off-topic",                   dscrptn: `**Not coded (yet)**` /* for regular sites? */},
    {id: 103,  defInptVal: "Unclear",       st: 1,  name: "unclear what you're asking",  dscrptn: ``},
    {id: 104,  defInptVal: "TooBroad",      st: 1,  name: "too broad",                   dscrptn: ``},
    {id: 105,  defInptVal: "OpinionBased",  st: 1,  name: "primarily opinion-based",     dscrptn: ``},
    {id: 201,  defInptVal: "OffTopic",      st: 3,  name: "off-topic (channels/teams)",  dscrptn: `**Not coded (yet)**` /* for teams sites? */},
];
const isTeamsSite       = /^\/c\//.test (location.pathname);
const scrtPrefix        = "SE CVR script:";
const supportUrl        = GM_info.script.supportURL || GM_info.script.homepage || "not set!";

waitForNodes ('#close-question-form', addMissingCloseReasons);

function addMissingCloseReasons (zNode) {
    addCSS_TweaksOnceAsNeeded ();

    var jNode           = $(zNode);
    var reasnNdList     = jNode.find ("#pane-main .action-list");
    var natCloseVals    = reasnNdList.find ("input[name='close-reason']").map ( (J, node) => node.value).get ();
    //--- If there where no natural inputs, then this dialog is being used for a previosly close-voted post that is not eleigable for a new vote yet.
    if (natCloseVals.length !== 0) {
        //--- Append reasons only if they are not already on the page.
        for (var reasn of possblCloseReasons) {
            if (natCloseVals.includes (reasn.defInptVal) )  continue;
            if (reasn.st === 0)                             continue;
            if (reasn.st === 2  &&  isTeamsSite)            continue;
            if (reasn.st === 3  &&  ! isTeamsSite)          continue;
            //console.log ("reasn: ", reasn.name);
            reasnNdList.append ( `
                <li class="tmAddedCloseReason"><label>
                    <input type="radio" name="close-reason" value="${reasn.id}" data-subpane-name="">
                    <span class="action-name">${reasn.name}</span>
                    <span class="action-desc">${reasn.dscrptn}</span>
                </label></li>
            ` );
        }
    }
    //--- Activate our items:
    reasnNdList.on ("hide-action", ".tmAddedCloseReason", zEvent => {
        $(zEvent.currentTarget).removeClass ('action-selected');
    } );
    reasnNdList.on ("select click", ".tmAddedCloseReason input", zEvent => {
        var inpNd   = $(zEvent.currentTarget);
        var parntLI = inpNd.closest ("li");

        parntLI.siblings (".action-selected").trigger ("hide-action");
        parntLI.addClass ("action-selected");

        jNode.find (".popup-submit").removeAttr ("disabled").css ("cursor", "pointer").removeClass ("disabled-button");
    } );

    jNode.find (".popup-submit").click (zEvent => {
        zEvent.preventDefault ();
        zEvent.stopImmediatePropagation ();
        /*-- On click of the button, if the value is text, it's native; let the dialog continue normally.
            If it's an integer, it's one of our added values; process the close flag ourselves.
        */
        let closeReason = $(`#pane-main input[name="close-reason"]:checked`).val ();
        if (isNaN (closeReason) ) {
            console.log (`${scrtPrefix} => Normal close reason fired.`);
            $(zEvent.currentTarget).closest ("form").submit ();
        }
        else {
            console.log (`${scrtPrefix} => Retro/custom close reason fired.`);
            $.ajax ( {
                type:       "POST",
                url:        `https://${location.host}/flags/questions/${StackExchange.question.getQuestionId()}/close/add`,
                dataType:   "json",
                data:       {
                    fkey:           StackExchange.options.user.fkey,
                    closeReasonId:  parseInt (closeReason, 10)
                },
                success:    processFlagResult
            } ).fail ( (jqXHR, textStatus) => {
                reportError ("API error: " + textStatus, "Detail: " + jqXHR.responseText);
            } ).always ( () => {
                StackExchange.helpers.closePopups ( $("#popup-close-question") );
            } );
        }
    } );
}

function addCSS_TweaksOnceAsNeeded () {
    if (addCSS_TweaksOnceAsNeeded.doneRun)  return;
    addCSS_TweaksOnceAsNeeded.doneRun = true;
    addStyle ( `
        .tmAddedCloseReason {
            background: repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255, 255, 0, 0.5) 20px, rgba(255, 255, 0, 0.5) 40px );
            border-top: 1px solid #f0f0ff;
        }
        .tmAddedCloseReason.action-selected::before {
            color:          black;
            content:        "WARNING: This reason is not officially supported by Stack Exchange. Use at your own risk.";
            background:     pink;
            margin:         -7px -5px 0 -5px;
            display:        block;
            padding:        1ex 2ex;
            font-weight:    bold;
            font-size:      2.4ex;
        }
    ` );
}

function processFlagResult (json) {
    console.log ("jsonRsp: ", json);
    let closeLink           = $("#question .post-menu a.close-question-link").parent ();

    if (json.Success) {
        //-- Flag accepted.
        //close_submitSuccess(json, closeLink);
        if (json.ResultChangedState) {
            location.reload ();
            return;
        }
        if (json.Tooltip) {
            closeLink.attr ('title', json.Tooltip);
        }
        if (json.Message) {
            closeLink.parent (). showInfoMessage (
                json.Message,
                {transient: false,  css: {'max-width': '600px', 'line-height': '25px'} }
            );
        }
    }
    else {
        //-- Flag rejected.
        //close_submitRejected(json, closeLink);
        if (json.Message) {
            StackExchange.helpers.showErrorMessage (closeLink, json.Message);
        }
    }
}

function reportError (errLine1, errLine2) {
    console.error (`${scrtPrefix} `, errLine1);
    if (errLine2)   console.error (errLine2);
    else            errLine2 = "";

    if (objHas (window, "StackExchange.notify.show") ) {
        if (errLine2)   errLine2 = "<br>" + errLine2;

        StackExchange.notify.show (
            `Error in ${GM_info.script.name} userscript.<br>
             ${errLine1} ${errLine2} <br>
             If the error persists, please report it at <a href="${supportUrl}">the support page</a>.
            `,
            13137713 //-- Should be unique-ish number
        );
    }
    else {
        if (errLine2)   errLine2 = "\n" + errLine2;
        alert (
            `Error in ${GM_info.script.name} userscript.\n`             +
            `${errLine1} ${errLine2}\n`                                 +
            `If the error persists, please report it at ${supportUrl}.`
        );
    }
}

function objHas (obj, key) {
    //-- Needed because .hasOwnProperty() does not work for nested properties. :(
    return key.split (".").every (_rcrsvlyChkPropname);

    function _rcrsvlyChkPropname (propName) {
        if ( obj === null  ||  typeof obj !== "object"  ||  ! (propName in obj) ) {
            return false;
        }
        obj = obj[propName];
        return true;
    }
}

function addStyle (cssStr) {
    var D               = document;
    var newNode         = D.createElement ('style');
    newNode.textContent = cssStr;

    var targ    = D.getElementsByTagName ('head')[0] || D.body || D.documentElement;
    targ.appendChild (newNode);
}

function waitForNodes (targSelector, actionFunction, baseSelector, bFirstNodeOnly) {
    let _self           = waitForNodes;
    _self.instID        = (_self.instID  ||  0) + 1;
    let baseNode        = document.documentElement;
    const flgVarName    = `wfnFndAlready${_self.instID}`;

    let targNodes       = baseNode.querySelectorAll (targSelector);
    if (resolveEachNodeJustOnce (targNodes, bFirstNodeOnly) )  return;

    var newNodeObsrvr   = new MutationObserver ( (mutationRecords, callingObserver) => {
        mutationRecords.forEach (muttn => {
            if (muttn.type === "childList"  &&  typeof muttn.addedNodes === "object") {
                muttn.addedNodes.forEach (newNode => {
                    /*- The matches test fails because target node is often a child of the newNode.
                        Don't want to churn through recursion on every new node.
                    if (newNode.matches  &&  newNode.matches (targSelector) ) {
                    */
                    if (newNode.nodeType !== Node.TEXT_NODE) {
                        debounceDomChanges (111);
                    }
                } );
            }
        } );
    } )
    .observe (document.documentElement, {childList: true, subtree: true} );

    function debounceDomChanges (delayMS) {
        var _self           = debounceDomChanges;
        /*-- Time-delay so not spamming the browser with full search in every added element...
        */
        _self.domSunami     = _self.domSunami || null;
        if (_self.domSunami) {
            clearTimeout (_self.domSunami);
            _self.domSunami = null;
        }
        _self.domSunami     = setTimeout (scanForNodes, delayMS);
    }

    function scanForNodes () {
        let targNodes       = baseNode.querySelectorAll (targSelector);
        let stopOnFirstNode = resolveEachNodeJustOnce (targNodes, bFirstNodeOnly);
        if (stopOnFirstNode) {
            newNodeObsrvr.disconnect ();
        }
    }

    function resolveEachNodeJustOnce (nodeOrNodeList, bFirstNodeOnly) {
        if (nodeOrNodeList) {
            if (nodeOrNodeList instanceof NodeList) {
                Array.from (nodeOrNodeList).forEach (zNode => {
                    let stopOnFirstNode = resolveSingleNode (zNode, bFirstNodeOnly);
                    if (stopOnFirstNode) {
                        return true;
                    }
                } );
            }
            else {
                return resolveSingleNode (nodeOrNodeList, bFirstNodeOnly);
            }
        }
        return false;
    }
    function resolveSingleNode (zNode, bFirstNodeOnly) {
        if ( ! zNode.dataset[flgVarName] ) {
            let ndNotProcessed = actionFunction (zNode);
            if (ndNotProcessed)  return false;

            zNode.dataset[flgVarName] = "true";
            return bFirstNodeOnly;
        }
        return false;
    }
}

/*-------- EOF --------*/
