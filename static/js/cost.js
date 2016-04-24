$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
    fetchUtilization(document.cookie);
    fetchExtrapolatedCharts(1);
});

statData = [];
cpuData = [[],[],[],[]];
ramData = [];
netData = [[],[]];
storageData = [];

function emptyRecords(){
    statData = [];
    cpuData = [[],[],[],[]];
    ramData = [];
    netData = [[],[]];
    storageData = [];
}

function fetchUtilization(machineName){
    var dataJson = {'action':'GET_COST_STATS','machine':machineName};
    $.ajax({
        'type':'POST',
        'url':_computeEndPoint,
        'dataType':'json',
        'data':dataJson,
        'success':function(response){
                    console.log(response);
                    setCurrentUtilization(response.duration,response.count);
                  },
        'failure':function(response){
                    console.log(response);
                  }
    });
}

function setCurrentUtilization(duration,count){
    var usage_percentage = Math.round((count/duration)*100,2);
    $("#usage-perc").text(count.toString()+"/"+duration.toString()+" : "+usage_percentage+"%");
}

function setEstimationDuration(){
    var daysDuration = parseInt($("#days-duration-input").val());
    fetchExtrapolatedCharts(daysDuration);
}

function fetchExtrapolatedCharts(daysDuration){
    var dataJson = {'action':'FETCH_ESTIMATED_CHARTS','machine':document.cookie,'days_duration':daysDuration};
    $.ajax({
        'type':'POST',
        'url': _computeEndPoint,
        'dataType':'json',
        'data':dataJson,
        'success':function(response){
                    emptyRecords();
                    statData = response['stat_data'];
                    statData.forEach(generateData_CPU);
                    statData.forEach(generateData_RAM);
                    statData.forEach(generateData_Net);
                    statData.forEach(generateData_Storage);
                    attachCpuEstimationChart(statData);
                  },
        'failure':function(response){
                    console.log(response);
                  }
    });
}

function attachCpuEstimationChart(records){
    var cpuSeries = [];
    for(var i=0 ; i<cpuData.length ; i++){
        cpuSeries.push({'values':cpuData[i]});
    }

    // CPU
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
        }
      },
      "series": cpuSeries
    };
    zingchart.render({
        id:'cpu_demand_curve',
        data:chartData,
        height:400,
        width:600
    });

    // RAM
    var chartData={
      "type": "line",
      "background-color":"#333333",
      "utc":true,
      "plotarea":{
        "adjust-layout":true
        },
      "scale-x":{
        "transform":{
          "type":"date"
        }
      },
      "series": [
        {"values":ramData}
      ]
    };
    zingchart.render({
        id:'ram_demand_curve',
        data:chartData,
        height:400,
        width:600
    });

    // Net
    var chartData={
      "type": "line",
      "background-color":"#333333",
      "utc":true,
      "plotarea":{
        "adjust-layout":true
        },
      "scale-x":{
        "transform":{
          "type":"date"
        }
      },
      "series": [
        {"values":netData[0]},
        {"values":netData[1]}
      ]
    };
    zingchart.render({
        id:'net_demand_curve',
        data:chartData,
        height:400,
        width:600
    });
}

function generateData_CPU(record){
    cpuCoreCount = record['cpu'].length;
    for(var i=0 ; i<cpuCoreCount ; i++){
        cpuData[i].push([Date.parse(record["date"]),record['cpu'][i]]);
    }
}

function generateData_RAM(record){
    ramData.push([Date.parse(record["date"]),record['ram']]);
}

function generateData_Net(record){
    netData[0].push([Date.parse(record["date"]),record['bytes_recv']/(1024*1024)]);
    netData[1].push([Date.parse(record["date"]),record['bytes_sent']/(1024*1024)]);
}

function generateData_Storage(record){
    storageData.push([Date.parse(record["date"]),record['disk_used']/(1024*1024*1024)]);
}