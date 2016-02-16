
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
});

statData = [];
cpuData = [[],[]];
ramData = [];

window.onload = function(){
    getStatData();
}

function renderGraphs(){

    var chartData={
      "type": "line",
      "background-color":"#333333",
      "utc":true,
      "plotarea":{
        "adjust-layout":true
        },
      "scale-x":{
        "transform":{
          "type":"date",
          "all":"%H:%i"
        }
      },
      "series": [
        {"values":cpuData[0]},
        {"values":cpuData[1]}
      ]
    };
    zingchart.render({
        id:'cpu_chart',
        data:chartData,
        height:400,
        width:600
    });

    var chartData={
      "type": "line",
      "background-color":"#333333",
      "utc":true,
      "plotarea":{
        "adjust-layout":true
        },
      "scale-x":{
        "transform":{
          "type":"date",
          "all":"%H:%i"
        }
      },
      "series": [
        {"values":ramData}
      ]
    };
    zingchart.render({
        id:'ram_chart',
        data:chartData,
        height:400,
        width:600
    });
}

function getStatData(){
    data = {'client-name':'remote-laptop', 'action':'GET_STAT_DATA'};
    $.ajax({
        'type':'post',
        'dataType':'json',
        'data':data,
        'success':function(response){
                    statData = response['stat_data'];
                    statData.forEach(generateData_CPU);
                    statData.forEach(generateData_RAM);
                    renderGraphs();
                 },
        'error':function(response){
                    console.log(response);
                },
        'url':'http://localhost:9000/api'
    });
}

function generateData_CPU(record){
    cpuData[0].push([Date.parse(record["date"]),record['cpu'][0]]);
    cpuData[1].push([Date.parse(record["date"]),record['cpu'][1]]);
}

function generateData_RAM(record){
    ramData.push([Date.parse(record["date"]),record['ram']]);
}

function createLineGraph(){
    var values_1 = [];
    var values_2 = [];
    for(i=0; i<100; i++){
        values_1.push(Math.random()*10000);
        values_2.push(Math.random()*10000);
    }
    var chartData={
        "type":"bar", // Specify your chart type here.
        "background-color":"#333333",
        "series":[ // Insert your series data here.
        { "values": values_1},
        { "values": values_2}
        ]
        };
        zingchart.render({ // Render Method[3]
        id:'cpu_chart',
        data:chartData,
        height:400,
        width:600
    });
}
