var rpc = require("/core/rpc");
var socket = require("/core/socket");
var moment = require("/core/moment");

var sentimentdata = [
  {
    "mood": "Positive",
    "value": 0
  },
  {
    "mood": "Negative",
    "value": 0
  }
];

var seatmapdata = {};

var parsed = false;

socket.onmessage = function(event) {
  var eventdata = JSON.parse(event.data);

  if (eventdata.m !== undefined && eventdata.m.indexOf("$msgIn") !== -1) {
    var message = eventdata.p[0];

    if (isQuestion(message.text)) {
      addQuestion(message);
    }

    if (message.sentiment > 0){
      sentimentdata[0].value++;
    } else if(message.sentiment < 0){
      sentimentdata[1].value++;
    }

    draw(sentimentdata);
  }

  if (eventdata.p[0] && eventdata.p[0].msgs && !parsed) {
    parseChatMessages(eventdata.p[0].msgs);
    parsed = true;
  }
};

var config = {
  adminSeat: 0,
  numOfSeats: 8,
  sections: 4 // FIXME: Current HTML layout supports only 4 section
};

var dom = {};
$(document).on("ready", function () {
  dom = {
    seatmap: {
      topleft: $("#topleftloc"),
      topright: $("#toprightloc"),
      bottomleft: $("#bottomleftloc"),
      bottomright: $("#bottomrightloc")
    }
  };

  // Activity graph
  var graph = new Rickshaw.Graph({
    element: document.getElementById("activity-graph"),
    renderer: 'line',
    series: new Rickshaw.Series.FixedDuration([
        { name: 'total', color: 'lightblue' },
        { name: 'positive', color: 'green' },
        { name: 'negative', color: 'red' },
      ], undefined, {
      timeInterval: 250,
      maxDataPoints: 100,
      timeBase: new Date().getTime() / 1000
    })
  });

  graph.render();

  var iv = setInterval(function() {
    updateGraph();
  }, 250);

  var previousPositiveValue = 0;
  var previousNegativeValue = 0;

  function updateGraph() {
    var positiveValue = sentimentdata[0].value;
    var negativeValue = sentimentdata[1].value;

    if (previousPositiveValue !== positiveValue) {
      positiveValue = positiveValue === 0 ? 0 : positiveValue--;
    }

    if (previousNegativeValue !== negativeValue) {
      negativeValue = (negativeValue === 0) ? 0 : negativeValue--;
    }

    var data = {
      total: (positiveValue + negativeValue) + 5,
      positive: positiveValue + 1,
      negative: negativeValue
    };

    graph.series.addData(data);
    graph.render();

    previousPositiveValue = positiveValue;
    previousNegativeValue = negativeValue;
  }
});

var questions = [];

function parseChatMessages(messages) {
  messages.forEach(function (msg) {
    var seat = msg.username;

    if (seat != config.adminSeat) {
      var score = msg.sentiment;

      if (seat && seat != config.adminSeat && isQuestion(msg.text)) {
        addQuestion(msg);
        highlightSection(seat);
      }

      if (msg.sentiment > 0) {
        sentimentdata[0].value++;
      } else if(msg.sentiment < 0) {
        sentimentdata[1].value++;
      } else {
        sentimentdata[0].value++;
        sentimentdata[1].value++;
      }

      draw(sentimentdata);
      colorSection(seat, score);
    }
  });
}

function addQuestion(msg) {
  var question = {
    seat: msg.username,
    text: msg.text,
    timestamp: moment(msg.time).format("HH:mm")
  };

  var el = $("<p>").html(question.text).attr("data-id", question.seat);
  $("<p>")
    .html([question.timestamp, question.text].join(" - "))
    .attr("data-id", question.seat)
    .prependTo("#questions");

  questions.push(question);
}

// TODO: Animate section
function highlightSection(seat) {
  var section = getSection(seat);

  if (section.length && !section.hasClass("flash")) {
    section.addClass("flash").delay(1000).queue(function(){
        $(this).removeClass("flash").dequeue();
    });
  }
}

function colorSection(seat, score) {
  var section = getSection(seat);

  if (section.length) {
    if (!seatmapdata[section.selector]) {
      seatmapdata[section.selector] = {};
      seatmapdata[section.selector].sumOfScores = 0;
      seatmapdata[section.selector].numOfMessages = 0;
    }

    seatmapdata[section.selector].sumOfScores += score;
    seatmapdata[section.selector].numOfMessages++;

    section.css({
        backgroundColor: getHSLColor(getColorValueForSection(section))
    });
  }
}

/*
 * Returns the value to be passed to the HSL color function. The value is
 * an average of scores given by sentiment analysis for each message in the
 * given section. The scale is converted from -5..5 (values given by sentiment
 * analysis) to 0..1 to match the HSL color format.
 *
 * @param  {Object} section
 * @return {Number} Value between 0..1
 */
function getColorValueForSection(section) {
  var totalScore = seatmapdata[section.selector].sumOfScores;
  var numOfMessages = seatmapdata[section.selector].numOfMessages;
  var average = totalScore / numOfMessages;

  return (average + 5) / 10;
}

function getSection(seat) {
  var section = seat / config.numOfSeats;

  if (section <= 0.25) {
    return dom.seatmap.topleft;
  } else if (section > 0.25 && section <= 0.5) {
    return dom.seatmap.topright;
  } else if (section > 0.5 && section <= 0.75) {
    return dom.seatmap.bottomleft;
  } else if (section > 0.75 && section <= 1) {
    return dom.seatmap.bottomright;
  } else {
    return false;
  }
}

$(document).on("click", "#questions > p", function () {
  var seat = $(this).attr("data-id");
  highlightSection(seat);
});

//Bar chart code

//check when .char div is loaded
var chart = [];
var interval = setInterval(function () {
  chart = d3.select('.chart');

  if (chart[0] !== null) {
    clearInterval(interval);
    drawBarChart(chart);
  }
}, 100);

var svg, xAxis, yAxis, x, y, width, height;
function drawBarChart(c) {
  var margin = {top: 20, right: 30, bottom: 30, left: 40};
  width = 500 - margin.left - margin.right;
  height = 400 - margin.top - margin.bottom;

  x = d3.scale.ordinal().rangeRoundBands([0, width],0.1);
  y = d3.scale.linear().range([height, 0]);

  svg = c.append("svg")
    .attr("width", width+margin.left+margin.right)
    .attr("height", height+margin.top+margin.bottom)
    .append("g")
    .attr("transform", "translate("+margin.left + ","+ margin.top +")");

  xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
  yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(5, "");

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0,"+ height + ")");

  svg.append("g")
    .attr("class", "y axis")
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .attr("text-anchor", "end")
    .text("Mood");
}

function replay(data) {
  var slices = [];

  for (var i = 0; i <= data.length; i++) {
    slices.push(data.slice(0, i));
  }

  slices.forEach(function (slice, index) {
    setTimeout(function(){
      draw(slice);
    }, index * 300);
  });
}

function draw(data) {
  x.domain(data.map(function(d){ return d.mood; }));
  y.domain([0, d3.max(data, function(d){ return d.value; })]);

  svg.select('.x.axis').transition().duration(300).call(xAxis);
  svg.select('.y.axis').transition().duration(300).call(yAxis);

  var bars = svg.selectAll('.bar').data(data, function(d){ return d.mood; });

  bars.exit()
    .transition()
    .duration(300)
    .attr("y", y(0))
    .attr("height", height - y(0))
    .style("fill-opacity", 1e-6)
    .remove();

  bars.enter().append("rect")
    .attr("class", "bar")
    .attr("y", y(0))
    .attr("height", height - y(0));

  bars.transition().duration(300).attr("x", function(d){ return x(d.mood); })
    .attr("width", x.rangeBand())
    .attr("y", function(d){ return y(d.value); })
    .attr("height", function(d){ return height - y(d.value); });
}

function type(d) {
  d.mood = +d.mood;
  return d;
}

/*
 * We'll take really naive approach and assume every message with How, When, What, Where, ending with a ?-mark and/or starts with "is", is a question
 */
function isQuestion(message) {
  message = message.trim().toLowerCase();

  var questionwords = ['how', 'when', 'what', 'where'];

  if (message.slice(-1) === "?") {
    return true;
  }

  if (message.substring(0, 2) == "is") {
    return true;
  }

  for (var qw in questionwords) {
    if (message.contains(questionwords[qw])) {
      return true;
    }
  }
}

//Add contains method to strings.
String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

function getHSLColor(value) {
    //value from 0 to 1 (0 is red, 0.5 is yellow, 1.0 is green)
    var hue = (value * 120).toString(10);
    return ["hsl(",hue,",100%,50%)"].join("");
}
