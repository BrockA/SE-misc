// ==UserScript==
// @name        Stack Exchange, Flagging tweaks
// @description Adds flag-summary link to your profile pages that lack it.  Color codes flagging history. Plus more.
// @match       *://*.askubuntu.com/*
// @match       *://*.mathoverflow.net/*
// @match       *://*.serverfault.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @exclude     *://*.stackexchange.com/election/*
// @exclude     *://*.stackoverflow.com/election/*
// @exclude     *://stackoverflow.com/election/*
// @exclude     *://api.stackexchange.com/*
// @exclude     *://blog.stackexchange.com/*
// @exclude     *://blog.stackoverflow.com/*
// @exclude     *://chat.stackexchange.com/*
// @exclude     *://data.stackexchange.com/*
// @exclude     *://elections.stackexchange.com/*
// @exclude     *://openid.stackexchange.com/*
// @exclude     *://stackexchange.com/*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @noframes
// @version     2.0
// @history     2.0 Avoid mixed content warning on SSL pages.  Add Tampermonkey metadata.
// @history     1.9 Flag summary post, edge case.
// @history     1.8 Updated to accomodate new topbar. Ref: meta.stackoverflow.com/q/343103/
// @history     1.7 For moderators, only summerize the mod's flags.
// @history     1.6 Block operation in iFrames.
// @history     1.5 Handle old-style flags.
// @history     1.0 Initial public release.
// @author      Brock Adams
// @homepage    http://stackapps.com/q/7057/7653
// ==/UserScript==

var userId;
if (objHas (unsafeWindow, "StackExchange.options.user.userId") ) {
    userId = unsafeWindow.StackExchange.options.user.userId;
}
else {
    console.log ("===> ", GM_info.script.name + ": no user detected.");
    // Note: on double-runs caused by rapid redirects, the first pass will report no user. This is okay and only the last run counts.
}

/*  Other potential icons:
    //-- Mops, brooms:
    http://i.stack.imgur.com/05rE1.png      -- Transp white outline, transparent.
    http://i.stack.imgur.com/Y9Ffx.png      -- White outline, transparent.
    http://i.stack.imgur.com/m5n2A.png      -- White outline, black BG.

    //-- Skulls:
    http://i.stack.imgur.com/yfleb.png      -- Darker blue
    http://i.stack.imgur.com/yTdZC.png      -- Green
    http://i.stack.imgur.com/wU37v.png      -- Overly light green?
    http://i.stack.imgur.com/0CLsA.png      -- Green, with light fill
    http://i.stack.imgur.com/4ti36.png      -- Blue, with light green fill
    http://i.stack.imgur.com/78mbl.png      -- Blue, with transparent white fill
*/
var flagSumIconSrc  = "*://i.stack.imgur.com/05rE1.png";

/*--- There are 2 cases:
    1) New style user page, plus meta site user page.
    2) Old style user page, plus meta site user page.

    Must make sure we are on the user's own profile and he's logged in (can't see flag summary otherwise).
*/
var editTabNewStyle = $("#mainbar-full #tabs > a[href^='/users/edit/'], #mainbar-full #tabs > a[href^='/users/preferences/']").first ();
if (editTabNewStyle.length) {
    //--- We're on an eligible profile page.
    editTabNewStyle.after ('<a href="/users/flag-summary/' + userId + '">Flag Summary</a>');
}
else {
    var editTabOldStyle = $("#mainbar-full .sub-header-links > a[href^='/users/edit/'], #mainbar-full .sub-header-links > a[href*='/help/privileges']").first ();
    if (editTabOldStyle.length) {
        //--- We're on an eligible profile page.
        editTabOldStyle.before ('<a href="/users/flag-summary/' + userId + '">flags</a>');
    }
}


/*--- On flagging summary pages, color code the flag entries.
    Flag staus looks like, in Russian:
        <div class="cbt mod-flag">
            <span class="bounty-indicator-tab flagbg bounty-fix">????</span> –
            <a href="/users/177669/brock-adams">Brock Adams</a>
            <span title="2015-11-15 09:09:14Z" class="relativetime">15 ????? ?????</span>
            &nbsp;
            <span class="supernovabg mod-flag-indicator">? ????????</span>
        </div>
        This is for a spam flag that is still pending.
*/
if ( /\/users\/flag-summary\/\d+/.test (location.pathname) ) {
    $(".flagged-post").each ( function () {
        //--- Posts can have multiple flags, so may have to stripe each flag seperately
        var jThis       = $(this);
        var postsFlags  = jThis.find (".mod-flag");
        if (postsFlags.length === 0) {
            //--- Oops. This should not happen!
            jThis.css ('background', 'red');
            reportImportantError ("Page structure change or error in flag report markup");
        }
        else if (postsFlags.length === 1) {
            //--- Simpler case
            styleNodeBasedOnFlagContents (jThis);
        }
        else {
            //--- More than 1 flag per post.
            var indFlagLines    = jThis.find (".mod-flag");
            indFlagLines.each ( function () {
                var jThisL      = $(this);
                styleNodeBasedOnFlagContents (jThisL);
            } );

            //--- Now color the overall entry based on subentry stats:
            if (jThis.find (".gmFlagPending").length) {
                jThis.addClass ('gmFlagPending');
            }
            else if (jThis.find (".gmFlagDeclined").length) {
                jThis.addClass ('gmFlagDeclined');
            }
            else if (jThis.find (".gmFlagDisputed").length) {
                jThis.addClass ('gmFlagDisputed');
            }
            else if (jThis.find (".gmFlagHelpful").length) {
                jThis.addClass ('gmFlagHelpful');
            }
            else if (jThis.find (".gmFlagRetracted").length) {
                jThis.addClass ('gmFlagRetracted');
            }
            else {
                jThis.css ('background', "red");
                reportImportantError ("Unresolved Overall flag entry!", false, jThis);
            }
        }
    } );

    //--- Create summary table:
    //--- But only if the flag summary page matches the logged-in user.
    var pgUsrMtch   = location.pathname.match (/flag-summary\/(\d+)/);
    if (pgUsrMtch  &&  pgUsrMtch[1] == userId) {
        var statsArray  = [
            0,  //-- Total for percent calcs
            0,  //-- status=1 waiting for review        <-- Stored 0
            0,  //-- status=2 helpful                   <-- Stored 1
            0,  //-- status=3 declined                  <-- Stored 2
            0,  //-- status=4 disputed                  <-- Stored 3
            0,  //-- status=5 expired, AKA "Aged Away"  <-- Stored 4
            0,  //-- Grand Total                        <-- Stored 5
            0,  //-- New Retracted status               <-- Stored 6
            // percentHelp                              <-- Stored 7
        ];

        //--- Loop thru History table entries and tot up stats:
        $("#flag-stat-info-table > tbody > tr > td.col2 > a[href*='status=']").each ( function () {
            var jThis   = $(this);
            var fType   = parseInt (jThis.attr ("href").replace (/^.+?\bstatus=(\d+).*$/, "$1"), 10);
            var fCount  = parseInt (jThis.parent ().prev ().text ().replace (/\D/g, ""), 10);

            statsArray[6]  += fCount;   //-- Increment grand total, always.

            switch (fType) {
                case 1:  //-- Pending
                case 4:  //-- Disputed
                case 5:  //-- Expired
                    statsArray[fType]  += fCount;
                    /*-- "Pending" doesn't count for percent calcs.
                        Likwise, from http://meta.stackexchange.com/a/141400/148310 :
                            "The flag weight is decreased by declined flags, but not by disputed ones. "
                        We were *encouraged*, at one point to dispute flags, too.
                    */
                break;
                case 6:  //-- Retracted
                    statsArray[7]  += fCount;   //-- Because added late by SE, index is off if we want to preserve old stats.
                break;
                case 2:  //-- Helpful
                case 3:  //-- Declined
                    statsArray[fType]  += fCount;
                    statsArray[0]      += fCount;  //-- Also used for percent calcs
                break;
                default:
                    reportImportantError ("Unexpected case while parsing flag history table: ", false, fType);
                break;
            }
        } );

        var percentHelp = Math.round (100.0 * statsArray[2] / (statsArray[0] || 1) );

        var siteNameKey = location.hostname;
        /*--- IMPORTANT!
                We DON't store the first column (Total for percent calcs) using GM_setValue
                but we do add and store percentHelp to the array.
        */
        var oldStats    = JSON.parse (GM_getValue (siteNameKey, "[0,0,0,0, 0,0,0,0]") );
        if (oldStats.length !== 8) {
            //-- Preserve old stats AMAP, while adding new columns at end...
            console.log ("GM: Stat array changed! Compensating...");
            oldStats    = oldStats.slice (0,7).concat (0);
        }

        var newStats    = statsArray.slice (1,8).concat (percentHelp);
        GM_setValue (siteNameKey, JSON.stringify (newStats) );

        var changeDsp   = $.map (newStats, function (newValue, J) {
            var diff    = newValue - oldStats[J];
            var dspStr  = diff < 0  ?  diff  :  (diff > 0  ?  "+" + diff  :  "&nbsp;");

            return dspStr;
        } );

        $("#flag-stat-info-table").before ( `
            <table id="gmFlagStatTbl">
                <tr><th title="Pending">P</th>   <th title="Helpful">H</th>   <th title="Declined">Dc</th>
                    <th title="Disputed">Ds</th> <th title="Expired">Ex</th>  <th title="Retracted">R</th>

                    <th title="Total">T</th> <th title="Percent Helpful">%</th>
                </tr><tr>
                    <td title="Click to filter.">` + statsArray[1] + `</td>
                    <td title="Click to filter.">` + statsArray[2] + `</td>
                    <td title="Click to filter.">` + statsArray[3] + `</td>
                    <td title="Click to filter.">` + statsArray[4] + `</td>
                    <td title="Click to filter.">` + statsArray[5] + `</td>
                    <td title="Click to filter.">` + statsArray[7] + `</td>  <!-- Newly added status type -->
                    <td title="Click to filter.">` + statsArray[6] + `</td>
                    <td title="Click to filter.">` + percentHelp + `</td>
                </tr><tr>
                    <td title="Change since last page view">` + changeDsp[0] + `</td>
                    <td title="Change since last page view">` + changeDsp[1] + `</td>
                    <td title="Change since last page view">` + changeDsp[2] + `</td>
                    <td title="Change since last page view">` + changeDsp[3] + `</td>
                    <td title="Change since last page view">` + changeDsp[4] + `</td>
                    <td title="Change since last page view">` + changeDsp[6] + `</td>  <!-- Newly added status type -->
                    <td title="Change since last page view">` + changeDsp[5] + `</td>
                    <td title="Change since last page view">` + changeDsp[7] + `</td>
                </tr>
            </table>
        ` );

        /*--- Linkify the table cells.  Can get more useful results than page's filters.
            URL's like:  http://superuser.com/users/flag-summary/41023?status=3
        */
        $("#gmFlagStatTbl").on ("click", "td, th", function (zEvent) {
            var filterURL   = location.pathname;
            var columnIdx   = zEvent.target.cellIndex;

            switch (columnIdx) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    filterURL  += '?status=' + (columnIdx + 1);
                break;
                case 6:
                case 7:
                    //-- No change needed to filterURL, cause going to show all results.
                break;
                default:
                    reportImportantError ("Unexpected case in summary table, click handler: ", false, columnIdx);
                break;
            }
            location.assign (filterURL);
        } );
    }  //  Flag summary page matches the logged-in user
}
else {
    //--- Not on flagging summary page.

    //--- Add quicklink for flag summary in topbar
    if (userId) {
        //-- Old topbar style
        $(".topbar-links").prepend ( `
            <a class="profile-me" href="/users/flag-summary/` + userId + `" title="Flag Summary page">
                <div class="gravatar-wrapper-24">
                    <img id="gmFlagSumIco" class="avatar-me js-avatar-me" src="` + flagSumIconSrc + `">
                </div>
            </a>
        `);
        //-- New topbar style
        $(".my-profile").before ( `
            <a class="profile-me" href="/users/flag-summary/` + userId + `" title="Flag Summary page">
                <div class="grayBG gravatar-wrapper-24">
                    <img id="gmFlagSumIco" class="avatar-me js-avatar-me" src="` + flagSumIconSrc + `">
                </div>
            </a>
        `);
    }

    //--- Check if we are too late to flag an answer:
    var qstMtch = location.pathname.match (/\/questions\/(\d+)\/.+?\/(\d+)\/?$/);
    if (qstMtch  &&  qstMtch.length > 2) {
        var ansId   = qstMtch[2];
        var ansPost = $("#answer-" + ansId);
        if (ansPost.length === 0) {
            var alrtPopup   = $('<div id="gmAnswerGoneAlrt">The linked answer is gone from this page.</div>').appendTo ("body");
            alrtPopup.append ('<div class="small">(Click to close this message)</div>');
            alrtPopup.click ( function () { $(this).hide (); } );
        }
    }
}

function styleNodeBasedOnFlagContents (jNode) {
    if (jNode.has (".Declined").length) {
        jNode.addClass ('gmFlagDeclined');
    }
    else if (jNode.has (".Disputed").length) {
        jNode.addClass ('gmFlagDisputed');
    }
    else if (jNode.has (".ScheduledTaskInvalidated").length) {
        jNode.addClass ('gmFlagDisputed');
    }
    else if (jNode.has (".Helpful").length) {
        jNode.addClass ('gmFlagHelpful');
    }
    else if (jNode.has (".SelfClear").length) {
        jNode.addClass ('gmFlagRetracted');
    }
    //--- Unresolved flags = poor SE design too
    else if (jNode.has (".supernovabg").length) {
        jNode.addClass ('gmFlagPending');
    }
    else {
        /*--- Last ditch check for old-style flags.  These were not tracked the modern way.
            The change happened approximately April 28th, 2011.?
        */
        var chngDate    = new Date ("2011-04-28");
        var dateNd      = jNode.find (".relativetime");
        var flagDate    = new Date (dateNd.attr ("title") );
        if (flagDate < chngDate) {
            jNode.addClass ('gmObsolete');
        }
        else {
            jNode.css ('background', "red");
            reportImportantError ("Unresolved flag entry!", false, jNode);
        }
    }
}

function reportImportantError (errMess, bNoAlert) {
    console.error ("Flagging script: " + errMess);
    if (arguments.length > 2) {
        console.error.apply (console, Array.prototype.slice.call (arguments, 2) );
    }

    if ( ! bNoAlert) {
        //-- On SE pages, use SE's error popup:
        var targNode    = $("#hmenus");
        var seUtils     = unsafeWindow.StackExchange;

        if (targNode.length  &&  objHas (seUtils, "helpers.showErrorPopup") ) {
            //-- Can't pass targNode because of sandbox...
            seUtils.helpers.showErrorPopup ("#hmenus", "Page structure change or script error. See Console.");
        }
        else {
            alert ("Page structure change or script error. See Console.");
        }
    }
}

function objHas (obj, key) {
    //-- Needed because .hasOwnProperty() does not work for nested properties. :(
    return key.split (".").every (_rcrsvlyChkPropname);

    //-- Declared function for better performance...
    function _rcrsvlyChkPropname (propName) {
        if ( obj === null  ||  typeof obj !== "object"  ||  ! (propName in obj) ) {
            return false;
        }
        obj = obj[propName];
        return true;
    }
}

GM_addStyle ( `
    #gmFlagStatTbl {
        margin:                 -1.4ex 0ex 2ex 0ex;
        width:                  100%;
    }
    #gmFlagStatTbl td, #gmFlagStatTbl th{
        padding:                0.6ex 0.2ex 0.6ex 0.6ex;
        border:                 1px solid lightgray;
        text-align:             left;
        width:                  5em;
        cursor:                 pointer;
        background-color:       #f0f8ff;    // very light blue-ish
    }
    .gmFlagPending, #gmFlagStatTbl td:nth-child(1), #gmFlagStatTbl th:nth-child(1) {
        background-color:       lightyellow;
    }
    .gmFlagHelpful, #gmFlagStatTbl td:nth-child(2), #gmFlagStatTbl th:nth-child(2) {
        background-color:       #eeffee;    // very light green
    }
    .gmFlagDeclined, #gmFlagStatTbl td:nth-child(3), #gmFlagStatTbl th:nth-child(3) {
        background-color:       pink;
    }
    .gmFlagDisputed,
    #gmFlagStatTbl td:nth-child(4), #gmFlagStatTbl th:nth-child(4),
    #gmFlagStatTbl td:nth-child(5), #gmFlagStatTbl th:nth-child(5) {
        background-color:       #fbc97f;    // light orange
    }
    .gmFlagRetracted, #gmFlagStatTbl td:nth-child(6), #gmFlagStatTbl th:nth-child(6) {
        background-color:       #f2e6ff;    // lavender-y
    }
    .gmObsolete {
        background-color:       lightgray;
    }
    #gmFlagStatTbl tr:nth-child(3) > td {
        background:             none;
        border:                 none;
        padding:                0 1px 0 4px;
    }
    #gmFlagSumIco {
        width:                  20px;
        height:                 20px;
    }
    #gmAnswerGoneAlrt {
        position:               fixed;
        top:                    2rem;
        width:                  60vw;
        background:             pink;
        font-size:              2rem;
        padding:                2rem;
        border:                 1px solid blue;
        border-radius:          0.5ex;
        left:                   calc(50% - 36vw);
        cursor:                 pointer;
    }
    #gmAnswerGoneAlrt > .small {
        font-size:              1rem;
        margin:                 1.5rem 0 -1rem 0;
        color:                  gray;
    }
    .grayBG {
        background:             gray;
    }
` );
