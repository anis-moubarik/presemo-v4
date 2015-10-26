
//Bar chart code

//check when .char div is loaded
var chart = [];
var interval = setInterval(function(){
  chart = d3.select('.chart');
  console.log("Checking for .chart");
  if(chart[0] != null){
    clearInterval(interval);
    drawBarChart(chart);
  }
}, 100);

var svg, xAxis, yAxis, x, y, width, height;
function drawBarChart(c){

  var margin = {top: 20, right: 30, bottom: 30, left: 40};
  width = 500 - margin.left - margin.right;
  height = 400 - margin.top - margin.bottom;

  x = d3.scale.ordinal().rangeRoundBands([0, width],.1);
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
    .text("Mood")

  d3.json("http://localhost:3000/dev/assets/static/js/testdata.json", function(error, data){
    x.domain(data.map(function(d){ return d.mood; }));
    y.domain([0, d3.max(data, function(d){ return d.value; })]);

    setTimeout(function(){
      replay(data);
    }, 1000)
  });

  setInterval(function(){

    var fakeData = [
      {
        "mood": "Confused",
        "value": (Math.random()*100)%30
      },
      {
        "mood": "Bored",
        "value": (Math.random()*100)%30
      },
      {
        "mood": "Interesting",
        "value": (Math.random()*100)%30
      },
      {
        "mood": "Funny",
        "value": (Math.random()*100)%30
      }
    ];

    draw(fakeData);
  }, 5000)
}

function replay(data){
  var count = 5;
  var slices = [];
  for (var i = 0; i <= data.length; i++){
    slices.push(data.slice(0, i));
  }
  slices.forEach(function(slice, index){
    setTimeout(function(){
      draw(slice);
    }, index * 300);
  });
}

function draw(data){
  //x.domain(data.map(function(d){ return d.mood; }));
  //y.domain([0, d3.max(data, function(d){ return d.value; })]);

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

function type(d){
  d.mood = +d.mood;
  return d;
}
