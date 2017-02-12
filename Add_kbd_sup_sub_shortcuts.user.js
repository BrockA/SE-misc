// ==UserScript==
// @name        StackExchange, Add kbd, sup, and sub shortcuts
// @description Adds buttons and keyboard shortcuts to add <kbd>, <sup>, and <sub>, tags.
// @match       *://*.askubuntu.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.stackexchange.com/*
// @exclude     *://blog.stackoverflow.com/*
// @exclude     *://chat.stackexchange.com/*
// @exclude     *://chat.stackoverflow.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @exclude     *://*/review
// @grant       none
// @version     2.1
// @history     2.1 No point in injecting script anymore due to Chrome and Firefox changes.
// @history     2.0 Update for SE changes (jQuery version, esp.), Added <sup> and <sub> support. Moved to GitHub proper.
// @history     1.2 SSL support
// @history     1.1 Style tweak
// @history     1.0 Standardized wrap logic to same as SE markup
// @history     1.0 Initial release on GitHubGist
// ==/UserScript==

$("textarea.wmd-input").each (AddOurButtonsAsNeeded);

var rootNode = $("#content");
rootNode.on ("focus",   "textarea.wmd-input", AddOurButtonsAsNeeded);
rootNode.on ("keydown", "textarea.wmd-input", InsertOurTagByKeypress);
rootNode.on ("click",   ".wmd-kbd-button, .wmd-sup-button, .wmd-sub-button",  InsertOurTagByClick);

function AddOurButtonsAsNeeded () {
    var jThis   = $(this);
    if ( ! jThis.data ("hasKbdBttn") ) {
        //--- Find the button bar and add our buttons after the italics btn (Since they are all text formatting).
        var btnBar  = jThis.prevAll ("div.wmd-button-bar");
        if (btnBar.length) {
            //--- The button bar takes a while to AJAX-in.
            var bbListTimer = setInterval ( function() {
                    var bbList  = btnBar.find ("ul.wmd-button-row");
                    if (bbList.length) {
                        clearInterval (bbListTimer);
                        var insrtPnt    = bbList.find (".wmd-button").not (".wmd-help-button").last ();
                        var lftPos      = parseInt (insrtPnt[0].style.left.replace ("px", ""), 10);
                        insrtPnt.after ( `
                            <li class="wmd-button wmd-kbd-button" title="Keyboard tag &lt;kbd&gt; Alt+K" style="left: ${lftPos+25}px;">
                                <!-- Use shorter text for space reasons -->
                                <span><kbd>kb</kbd></span>
                            </li>
                            <li class="wmd-button wmd-sup-button" title="Superscript &lt;sup&gt; Alt+&#8593;" style="left: ${lftPos+56}px;">
                                <span><sup>sup</sup></span>
                            </li>
                            <li class="wmd-button wmd-sub-button" title="Subscript &lt;sub&gt; Alt+&#8595;" style="left: ${lftPos+81}px;">
                                <span><sub>sub</sub></span>
                            </li>
                        ` );
                        jThis.data ("hasKbdBttn", true);
                    }
                },
                100
            );
        }
    }
}

function InsertOurTagByKeypress (zEvent) {
    //--- On Alt-K, insert the <kbd> set.
    if (zEvent.altKey  &&  zEvent.which == 75) {
        InsertOurTag (this, "<kbd>");
        return false;
    }
    //--- On Alt-{up arrow}, insert the <sup> set.
    else if (zEvent.altKey  &&  zEvent.which == 38) {
        InsertOurTag (this, "<sup>");
        return false;
    }
    //--- On Alt-{down arrow}, insert the <sub> set.
    else if (zEvent.altKey  &&  zEvent.which == 40) {
        InsertOurTag (this, "<sub>");
        return false;
    }

    //--- Ignore all other keys.
    return true;
}

function InsertOurTagByClick (zEvent) {
    //--- From the clicked button, find the matching textarea.
    var jThis       = $(this);
    var targArea    = jThis.parents ("div.wmd-button-bar").nextAll ("textarea.wmd-input");
    var tagTxt      = "";
    if (jThis.hasClass ("wmd-kbd-button") )         tagTxt = "<kbd>";
    else if (jThis.hasClass ("wmd-sup-button") )    tagTxt = "<sup>";
    else if (jThis.hasClass ("wmd-sub-button") )    tagTxt = "<sub>";

    if (tagTxt) {
        InsertOurTag (targArea[0], tagTxt);
        targArea.focus ();
        try {
            //--- This is a utility function that SE currently provides on its pages.
            StackExchange.MarkdownEditor.refreshAllPreviews ();
        }
        catch (e) {
            console.warn ("***Userscript error: refreshAllPreviews() is no longer defined!");
        }
    }
    else console.warn ("***Userscript error: tag event handler miswired.");
}

function InsertOurTag (node, tagTxt) {
    //--- Wrap selected text or insert at curser.
    var tagLength       = tagTxt.length;
    var endTag          = tagTxt.replace (/</, "</");
    var unwrapRegex     = new RegExp ('^' + tagTxt + '((?:.|\\n|\\r)*)' + endTag + '$');

    var oldText         = node.value || node.textContent;
    var newText;
    var iTargetStart    = node.selectionStart;
    var iTargetEnd      = node.selectionEnd;
    var selectedText    = oldText.slice (iTargetStart, iTargetEnd);
    var possWrappedTxt;
    try {
        //--- Lazyman's overrun checking...
        possWrappedTxt  = oldText.slice (
                            iTargetStart - tagLength,
                            iTargetEnd   + tagLength + 1
                        );
    }
    catch (e) {
        possWrappedTxt  = "Text can't be wrapped, cause we overran the string.";
    }

    /*--- Is the current selection wrapped?  If so, just unwrap it.
        This works the same way as SE's bold, italic, code, etc...
        "]text["                --> "<kbd>]text[</kbd>"
        "<kbd>]text[</kbd>"     --> "]text["
        "]<kbd>text</kbd>["     --> "<kbd>]<kbd>text</kbd>[</kbd>"

        Except that:
        "]["                    --> "<kbd>][</kbd>"
        "<kbd>][</kbd>"         --> "]["
        with no placeholder text.
        Note that `]` and `[` denote the selected text here.
    */
    if (possWrappedTxt  &&
        selectedText    == possWrappedTxt.replace (unwrapRegex, "$1")
    ) {
        iTargetStart   -= tagLength;
        iTargetEnd     += tagLength + 1;
        newText         = oldText.slice (0, iTargetStart)
                        + selectedText + oldText.slice (iTargetEnd)
                        ;
        iTargetEnd      = iTargetStart + selectedText.length;
    }
    else {
        /*--- Here we will wrap the selection in our tags, but there is one extra
            condition.  We don't want to wrap leading or trailing whitespace.
        */
        var trimSelctd  = selectedText.match (/^(\s*)(\S?(?:.|\n|\r)*\S)(\s*)$/)
                        || ["", "", "", ""]
                        ;
        if (trimSelctd.length != 4) {
            console.warn ("***Userscript error: unexpected failure of whitespace RE.");
        }
        else {
            newText         = trimSelctd[1]     //-- Leading whitespace, if any.
                            + tagTxt + trimSelctd[2] + endTag
                            + trimSelctd[3]     //-- Trailing whitespace, if any.
                            ;
            newText         = oldText.slice (0, iTargetStart)
                            + newText + oldText.slice (iTargetEnd)
                            ;
            iTargetStart   += tagLength + trimSelctd[1].length;
            iTargetEnd     += tagLength - trimSelctd[3].length;
        }
    }

    //console.log (newText);
    node.value          = newText;
    //--- After using spelling corrector, this gets buggered, hence the multiple sets.
    node.textContent    = newText;

    //--- Have to reset the selection, since we overwrote the text.
    node.selectionStart = iTargetStart;
    node.selectionEnd   = iTargetEnd;
}

//--- Touch up styles...
var newStyle         = document.createElement ('style');
newStyle.textContent = `
    .wmd-kbd-button > span, .wmd-sup-button > span, .wmd-sub-button > span {
        background-image: none;
    }
    .wmd-kbd-button > span > kbd {
        border: 0px;
    }
`;
document.head.appendChild (newStyle);
