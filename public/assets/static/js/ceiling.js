
//Bar chart code

//check when .char div is loaded
var chart = [];
var interval = setInterval(function(){
  chart = d3.select('.chart');
  console.log("Checking for .chart");
  if(chart[0] != null){
    clearInterval(interval);
    console.log(chart);
    drawBarChart(chart);
  }
}, 100);


function drawBarChart(c){

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
    width = 500 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  var x = d3.scale.ordinal().rangeRoundBands([0, width],.1);
  var y = d3.scale.linear().range([height, 0]);



  var svg = c.append("svg")
    .attr("width", width+margin.left+margin.right)
    .attr("height", height+margin.top+margin.bottom)
    .append("g")
    .attr("transform", "translate("+margin.left + ","+ margin.top +")");

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(5, "");

  d3.json("http://localhost:3000/dev/assets/static/js/testdata.json", function(error, data){
    x.domain(data.map(function(d){ return d.mood; }));
    y.domain([0, d3.max(data, function(d){ return d.value; })]);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0,"+ height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .attr("text-anchor", "end")
      .text("Mood")

    svg.selectAll("bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) {
        return x(d.mood);
      })
      .attr("width", x.rangeBand())
      .attr("y", function(d){
        return y(d.value);
      })
      .attr("height", function(d){
        return height - y(d.value);
      });
  });

}

function type(d){
  d.mood = +d.mood;
  return d;
}
