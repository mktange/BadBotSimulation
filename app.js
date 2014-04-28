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

function between(n, m) {
  return n + Math.floor(Math.random() * (m-n));
}

function myrand(x) {
  return between(0,x);
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

function addUnique(array, newEntry) {
  for (var i = 0; i < array.length; ++i) {
    if (array[i] === newEntry)
      return array
  }
  return array.concat([newEntry]);
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
        .map(function (x, i) { return i; })
        .filter(function (e) { return !(e in ips) });
  return arr[myrand(arr.length)];
}

function getNewPort() {
  return between(49152, 65535);
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
    peer_list[x] = addUnique(peer_list[x], addr);

    for (var i = 0; i < 10; i++) {
      var random_peer = peer_list[x][myrand(peer_list[x].length)];
      notify(x, random_peer, knownInfectedIPs[x], peer_list[x]);
      
      var randomIP = getRandomIP(knownInfectedIPs[x]);
      if (randomIP !== undefined && Math.random() <= 0.2) {
        infect(randomIP, knownInfectedIPs[x], peer_list[x]);
      }
    }
  }
}



// ***********************
// * Controls and layout *
// ***********************
var infoShown = -1;

function arrToOption(arr) {
  var sarr = new Array();
  for (var i = 0; i < arr.length; i++) {
    sarr.push("<option>" + arr[i] + "</option>");
  }
  return sarr.join(" ");
}

function showInfo(x) {
  infoShown = x;
  if (x == -1) {
    $("#sysinfo")
      .html("<i>Click on a system to see information about it.</i><br>")
      .append("<i>Hover over an infected system to see which it knows to be infected as well.</i>");

  } else if (x in peer_list) {
    var arr = new Array();
    for (c in knownInfectedIPs[x]) {
      arr.push(c);
    }
    $("#sysinfo")
      .html("Current port: " + cPort[x] + "<br>")
      .append("Known infected IPs: ")
      .append($('<select>').append(arrToOption(arr)))
      .append("size: " + arr.length)
      .append("<br>")
      .append("Peer list: ")
      .append($('<select>').append(arrToOption(peer_list[x])))
      .append("size: " + peer_list[x].length)
    ;

  } else {
    $("#sysinfo").html("This system is not infected yet.");
  }
}

function highlightKnown(el, color) {
  var x = parseInt(el.attr('sysid'));
  if (x in peer_list) {
    for (c in knownInfectedIPs[x]) {
      $("#systems li").eq(c).css('background', color);
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
      $('<li>')
        .attr('class', 'uninfected')
        .attr('sysid', i)
        .append(i)
    );
  }

  // Add onClick for each system
  $("#systems li").click(function () {
    var x = parseInt($(this).attr('sysid'));
    showInfo(x);
  });

  $("#systems li").hover(
    function () {
      highlightKnown($(this), 'orange');
    },
    function () {
      highlightKnown($(this), '');
    }
  );
  // Infect random system
  infect(myrand(N), {}, new Array());
}


// Check for correct input and send to init function.
$("#start").click(function () {
  var n = parseInt($("#amount").val());
  if (isNaN(n)) {
    alert("'" + $("#amount").val() + "' is not a number.");
  } else if (n > 1000) {
    alert(n + " is too great with the current settings (>1000).");
  } else {
    init(n);
    $("#step").removeAttr("disabled");
    $("#autostep").removeAttr("disabled");
    $("#stepsTaken").html(0);
    showInfo(-1);
  }

});

$("#step").attr("disabled", "disabled");
$("#autostep").attr("disabled", "disabled");

// Run BadBot in random order on infected systems.
function step() {
  var arr =
      shuffle(
        Array.apply(null, Array(iList.length))
        .map(function (x, i) { return i; }
      ));

  for (var i = 0; i < arr.length; i++) {
    turn(iList[arr[i]]);
  }

  $("#stepsTaken").html(++stepCount);
  showInfo(infoShown);

  if (iList.length == N) {
    endStepping();
    alert("All systems infected in " + stepCount + " steps!");
  }
}


// Auto stepping functionality
var autostepping;

function endStepping() {
  $("#step").attr("disabled", "disabled");
  $("#autostep").attr("disabled", "disabled");
  $("#autostep").val("Auto Step");

  if (autostepping !== undefined) {
    clearInterval(autostepping);
    autostepping = undefined;
  }
}

function stopAutoStep() {
  $("#step").removeAttr("disabled");
  $("#autostep").val("Auto Step");

  clearInterval(autostepping);
  autostepping = undefined;
}

function startAutoStep() {
  $("#step").attr("disabled", "disabled");
  $("#autostep").val("Pause");

  var ms = parseInt($("#ms").val());
  autostepping = setInterval(function () {
    step();
  }, ms);
}

$("#autostep").click(function () {
  if (N < 0) return;

  if (autostepping !== undefined) {
    stopAutoStep();
  } else {
    startAutoStep();
  }

});

$("#step").click(function () {
  if (N < 0) return;
  $("#step").attr("disabled", "disabled");

  step();

  if (iList.length < N) {
    $("#step").removeAttr("disabled");
  }
});