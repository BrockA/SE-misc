// ==UserScript==
// @name        StackExchange, Add kbd, sup, and sub shortcuts
// @description Adds buttons and keyboard shortcuts to add <kbd>, <sup>, and <sub>, tags.
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
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
// @version     3.0
// @history     3.0 SE changed positioning; Added hover highlites; Added <br>; Added <del>; Clear JSHint warnings.
// @history     2.3 Add mathoverflow.net.
// @history     2.2 Update test and minor text formatting.
// @history     2.1 No point in injecting the script anymore, due to Chrome and Firefox changes.
// @history     2.0 Update for SE changes (jQuery version, esp.), Added <sup> and <sub> support. Moved to GitHub proper.
// @history     1.2 SSL support
// @history     1.1 Style tweak
// @history     1.0 Standardized wrap logic to same as SE markup
// @history     1.0 Initial release on GitHubGist
// ==/UserScript==
// jshint -W014

setInterval(function(){
    $("textarea.wmd-input:not(.hasKbdBtn)").each(checkIfToolbarButtonsLoaded);
}, 250);

var rootNode = $("#content");
rootNode.on("keydown", "textarea.wmd-input", InsertOurTagByKeypress);
rootNode.on("click", ".tmAdded", InsertOurTagByClick);

function checkIfToolbarButtonsLoaded() {
    var jThis = $(this),
        // Find the button bar and add our buttons after the last button
        btnBar = jThis.prevAll("div.wmd-button-bar");

    if (!btnBar.length) return true;

    // The button bar takes a while to AJAX-in.
    var bbList = btnBar.find("ul.wmd-button-row");
    if (!bbList.length) return true;

    // At this stage, everything has loaded and we can insert our buttons now
    var insrtPnt = bbList.find(".wmd-button").not(".wmd-help-button").last();
    insrtPnt.after(`<li class="wmd-button tmAdded wmd-kbd-button" title="Keyboard tag &lt;kbd&gt; Alt+K">
                        <!-- Use shorter text for space reasons -->
                        <span><kbd>kb</kbd></span>
                    </li>
                    <li class="wmd-button tmAdded wmd-sup-button" title="Superscript &lt;sup&gt; Alt+&#8593;">
                        <span><sup>sup</sup></span>
                    </li>
                    <li class="wmd-button tmAdded wmd-sub-button" title="Subscript &lt;sub&gt; Alt+&#8595;">
                        <span><sub>sub</sub></span>
                    </li>
                    <li class="wmd-button tmAdded wmd-del-button" title="Del/strike &lt;del&gt; Alt+X">
                        <span><del>del</del></span>
                    </li>
                    <li class="wmd-button tmAdded wmd-br-button" title="Break &lt;br&gt; Alt+B">
                        <span>&crarr;</span>
                    </li>`);
    jThis.addClass("hasKbdBtn");
}

function InsertOurTagByKeypress(zEvent) {
    var map = {
        75: "kbd", // K
        38: "sup", // up arrow
        40: "sub", // down arrow
        88: "del", // X
        66: "br"   // B
    };

    if (zEvent.altKey)
        for (var keyCode in map)
            if (map.hasOwnProperty(keyCode) && +keyCode === zEvent.which) {
                InsertOurTag(this, map[keyCode], map[keyCode] === "br");
                return false;
            }

    // Ignore all other keys.
    return true;
}

function InsertOurTagByClick(zEvent) {
    // From the clicked button, find the matching textarea.
    var jThis = $(this),
        targArea = jThis.parents("div.wmd-button-bar").nextAll("textarea.wmd-input"),
        tagTxt, bSoloTag = false,
        tags = ["kbd", "sup", "sub", "dl", "br"],        
        i = 0, len = tags.length; // loop variables

    for (; i < len; i++) {
        tagTxt = tags[i];
        if (jThis.hasClass("wmd-" + tagTxt + "-button")) break;
    }

    if (i != len) {
        if (tagTxt == "br") bSoloTag = true;
        InsertOurTag(targArea[0], tagTxt, bSoloTag);
        targArea.focus();
        try {
            // This is a utility function that SE currently provides on its pages.
            StackExchange.MarkdownEditor.refreshAllPreviews();
        } catch (e) {
            console.warn("***Userscript error: refreshAllPreviews() is no longer defined!");
        }
    }
}

// Wrap selected text or insert at cursor.
function InsertOurTag(node, tagTxt, bTagHasNoEnd) {
    tagTxt = "<" + tagTxt + ">";

    var tagLength = tagTxt.length,
        endTag = tagTxt.replace(/</, "</"),
        unwrapRegex = new RegExp('^' + tagTxt + '((?:.|\\n|\\r)*)' + endTag + '$'),
        oldText = node.value || node.textContent,
        newText,
        iTargetStart = node.selectionStart,
        iTargetEnd = node.selectionEnd,
        selectedText = oldText.slice(iTargetStart, iTargetEnd),
        possWrappedTxt, trimSelctd, middleText, beforeText, afterText;

    if (bTagHasNoEnd) {
        newText = oldText.slice(0, iTargetStart) + tagTxt + oldText.slice(iTargetStart);
        iTargetStart += tagLength;
        iTargetEnd += tagLength;
    } else {
        try {
            // Lazyman's overrun checking
            possWrappedTxt = oldText.slice(iTargetStart - tagLength, iTargetEnd + tagLength + 1);
        } catch (e) {
            possWrappedTxt = "Text can't be wrapped, cause we overran the string.";
        }

        /*  Is the current selection wrapped?  If so, just unwrap it.
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
        if (possWrappedTxt &&
            selectedText == possWrappedTxt.replace(unwrapRegex, "$1")
        ) {
            iTargetStart -= tagLength;
            iTargetEnd += tagLength + 1;
            newText = oldText.slice(0, iTargetStart) + selectedText + oldText.slice(iTargetEnd);
            iTargetEnd = iTargetStart + selectedText.length;
        } else {
            /* wrap the selection in our tags, but there is one extra
                condition.  We don't want to wrap leading or trailing whitespace.
            */
            trimSelctd = selectedText.match(/^(\s*)(\S?(?:.|\n|\r)*\S)(\s*)$/) || ["", "", "", ""];

            if (tagTxt === "<kbd>") middleText = processKbd(trimSelctd[2], tagTxt, endTag);
            else middleText = tagTxt + trimSelctd[2] + endTag;

            // surround selection with wrapped text, with leading and trailing whitespaces
            beforeText = oldText.slice(0, iTargetStart) + trimSelctd[1];
            afterText = trimSelctd[3] + oldText.slice(iTargetEnd);
            newText = beforeText + middleText + afterText;
            
            iTargetStart = beforeText.length + tagLength;
            iTargetEnd = beforeText.length + middleText.length - endTag.length;
        }
    }

    //console.log (newText);
    node.value = newText;
    // After using spelling corrector, this gets buggered, hence the multiple sets.
    node.textContent = newText;

    // Have to reset the selection, since we overwrote the text.
    node.selectionStart = iTargetStart;
    node.selectionEnd = iTargetEnd;
}

// convert `Shift+Alt+P` to <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>P</kbd> on single click
function processKbd(text, startTag, endTag) {
    var keys = text.split(/[+\-]/g),
        i = 0,
        separator = (text.indexOf("+") != -1 ? "+" : "-"),
        len = keys.length,
        lim = len - 1,
        output = "";

    if (len != 1)
        // insert all the keys except the last
        for (; i < lim; i++)
            output += startTag + keys[i] + endTag + separator;

    output += startTag + keys[lim] + endTag;

    return output;
}

// Touch up styles...
var newStyle = document.createElement('style');
newStyle.textContent = `
    .tmAdded > span {
        background-image: none;
    }
    .tmAdded:hover {
        color: orange;
    }
    .wmd-kbd-button {
        margin-right: 1ex;
    }
    .wmd-kbd-button > span > kbd {
        border: 0px;
    }
    .wmd-kbd-button:hover > span > kbd {
        background: orange;
    }
    .wmd-br-button > span {
        font-size: 120%;
        font-weight: bold;
    }
}
`;
document.head.appendChild(newStyle);
