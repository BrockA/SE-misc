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
// @exclude     *://stackexchange.com/*
// @grant       GM_addStyle
// @run-at      document-start
// @version     2.0
// @history     2.0 Switch to SE image server for more reliable hosting.
// @history     2.0 Placed script in GitHub. Review gets duckies too.
// @history     1.5 Fix icon cutoff problem that many sites had.
// @history     1.0 Initial release
// @author      Samcarter
// @homepage    https://stackapps.com/q/8116/7653
// ==/UserScript==

GM_addStyle ( `
    /* change icons of badges */
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
