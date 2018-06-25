// ==UserScript==
// @name         Slime Spotter
// @description  Warns you about potential slime in your TagPro game
// @author       Ko
// @version      1.1
// @include      http://tagpro-*.koalabeast.com:*
// @connect      koalabeast.com
// @download     https://raw.githubusercontent.com/wilcooo/TagPro-SlimeSpotter/master/tpss.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==






const slimeID =
      '53d16350b98cd3c90bfad52a';
      // '568c0e575f205782559d87c9';

const host = window.location.protocol + '//' + window.location.hostname;

var reservedName,wins;


var spotted = GM_getValue('last_time',0) > Date.now() - 21600000; // Six hours


// Main function:

tagpro.ready(function(){

    // Get name/degree/flair from slime's profile

    GM_xmlhttpRequest({
        method: "GET",
        url: host + '/profiles/' + slimeID,
        onload: function(response) {
            var profile = JSON.parse(response.response)[0];

            reservedName = profile.reservedName;
            wins = profile.won.all;
            flair = profile.selectedFlair;


            // Check all balls that are already in game

            for (var id in tagpro.players) {
                isSlime(id);
            }


            // Check all balls that change their name or join later

            tagpro.socket.on('p', function(p) {
                var u = p.u || p;

                for ( var id in u ) if ( u[id].name || u[id].auth || u[id].flair || u[id].degree ) {
                    isSlime(id);
                }
            });
        }
    });
});





// Is this a slimey ball?

function isSlime(id) {
    console.log('slime');
    if (spotted) return;

    var player = tagpro.players[id];

    if (!player) return console.warn('False id');

    if ((player.flair && player.flair.description) === description(flair,id) &&
        player.degree == degree(wins) &&
        ((player.auth && player.name == reservedName) ||
         !player.auth
        )) {

        tagpro.socket.emit('chat',{message:'If it looks like slime, rolls like slime, and pops like slime...'});
        spotted = true;
        GM_setValue('last_time',Date.now());
    }
}





// Total wins --> degree converter

function degree(wins) { for ( var d in winReq ) if (winReq[Number(d)+1] > wins) return Number(d); }

var winReq = [0,1,3];
for (var i = 3; i<=360; i++) winReq[i] = winReq[i-1] + (winReq[i-1]-winReq[i-2]) * (1 + 0.1 * Math.pow(0.9725, i-3) );
winReq = winReq.map(Math.round);





// flair id --> flair description converter

function description(flair,testID) {

    if (flair === "") return null;

    var known = GM_getValue('flair_descriptions',{});

    if ( known[flair] ) return known[flair];

    else {

        console.warn('Slime Spotter: unknown flair detected, looking for updates');

        GM_xmlhttpRequest({
            method: "GET",
            url: host + '/profile/' + slimeID,
            onload: function(profile) { // slimeID is used, but could be any valid id

                $(profile.responseText).find('#all-flair .flair-item').each( function(i,o) {
                    known[ o.parentElement.getAttribute('data-flair') ] = $(o).find('.flair-header').text().trim();
                });

                GM_setValue('flair_descriptions',known);

                if (known[flair]) {
                    isSlime(testID);  // Test again now that we found the flair description
                }

                else console.warn('Slime Spotter: Someone wears an unknown flair!',flair);
            }
        });
    }

}
