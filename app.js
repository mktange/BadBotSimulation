/// <reference path="Scripts/jquery-2.1.0.js" />


// **********************
// *  Global variables  *
// **********************

var infect_prob = 0.2;

var peer_list = {};
var knownInfectedIPs = {};
var cPort = {};
var iList = [];
var N = -1;
var stepCount = 0;

// **********************
// *  Helper functions  *
// **********************

function rand(n, m) {
  return Math.floor(n + Math.random() * m);
}

function rand(n) {
  return Math.floor(Math.random() * n);
}

function arrayUnique(array) {
  var a = array.concat();
  for (var i = 0; i < a.length; ++i) {
    for (var j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j])
        a.splice(j--, 1);
    }
  }

  return a;
}

function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
  ;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}



// ********************
// *  Core functions  *
// ********************

function getRandomIP(ips) {
  var arr = Array.apply(null, Array(N))
        .map(function (x, i) { return i; });
  return shuffle(arr.filter(function (e) { return !(e in ips) }))[0];
}

function getNewPort() {
  return rand(49152, 65535);
}

function infect(x, ips, pl) {
  if (x >= N || x < 0 || x in peer_list) return;

  $("#systems li").eq(x).attr('class', 'infected');
  peer_list[x] = pl.concat();  // clone peer_list
  knownInfectedIPs[x] = JSON.parse(JSON.stringify(ips)); // clone ips object
  knownInfectedIPs[x][x] = true;
  iList.push(x);
}

// Notify to peer
function notify(from, addr, ips, pl) {
  var arr = addr.split(":");
  var x = parseInt(arr[0]);
  var port = parseInt(arr[1]);

  if (x !== from && cPort[x] == port) {
    // Update IPs
    for (ip in ips) {
      knownInfectedIPs[x][ip] = true;
    }
    // .. and peer_list
    peer_list[x] = arrayUnique(peer_list[x].concat(pl));
  }
}


function turn(x) {
  // Should only run if it is infected and if it is lucky enough to
  // be executed on an even minute number (50%)
  if (peer_list.hasOwnProperty(x) && Math.random() >= 0.5) {
    var newPort = getNewPort();
    cPort[x] = newPort;

    var addr = x + ":" + newPort;
    peer_list[x] = arrayUnique(peer_list[x].concat([addr]));

    for (var i = 0; i < 10; i++) {
      var random_peer = peer_list[x][rand(peer_list[x].length)];
      notify(x, random_peer, knownInfectedIPs[x], peer_list[x]);
      
      var randomIP = getRandomIP(knownInfectedIPs[x]);
      if (randomIP !== undefined && Math.random() <= 0.2) {
        infect(randomIP, knownInfectedIPs[x], peer_list[x]);
      }
    }
  }
}


function init(n) {
  // Setup variables
  N = n;
  peer_list = {};
  cPort = {};
  iList = [];
  stepCount = 0;

  // Clear previous list and add new systems to list
  $("#systems").empty();
  for (var i = 0; i < n; i++) {
    $("#systems").append(
      $('<li>').attr('class', 'uninfected')
    );
  }
  
  // Infect random system
  infect(rand(N), {}, new Array());
}


// Check for correct input and send to init function.
$("#start").click(function () {
  var n = parseInt($("#amount").val());
  if (isNaN(n)) {
    alert("'" + $("#amount").val() + "' is not a number.");
  } else if (n > 1000) {
    alert("'" + n + "' is too great (>1000).");
  } else {
    init(n);
    $("#step").removeAttr("disabled");
    $("#stepsTaken").html(0);
  }

});

$("#step").attr("disabled", "disabled");

// Run BadBot in random order on infected systems.
$("#step").click(function () {
  if (N < 0) return;
  $("#step").attr("disabled", "disabled");

  var arr =
      shuffle(
        Array.apply(null, Array(iList.length))
        .map(function (x, i) { return i; }
      ));

  for (var i = 0; i < arr.length; i++) {
    turn(iList[arr[i]]);
  }

  $("#stepsTaken").html(++stepCount);

  if (iList.length == N) {
    alert("All systems infected in " + stepCount + " steps!");
  }

  $("#step").removeAttr("disabled");
});