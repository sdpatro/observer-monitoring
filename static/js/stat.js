
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });

  if(document.cookie != "")
  {
    initiateStat();
  }
  else{
    showIdle(true);
  }
  _rowWidth = 0.8*$("#cpu-stats").width();
});

function initiateStat(){
    updateSpecs(document.cookie);
    getStatData(document.cookie);
}

_graphType = false;

statData = [];
cpuData = [[],[],[],[]];
ramData = [];
netData = [[],[]];
storageData = [];
cpuData_disjoint = [[],[],[],[]];
ramData_disjoint = [];
netData_disjoint = [[],[]];
storageData_disjoint = [];

cpuColors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
ramColor = "#99a367";
storageColor = "#3ff4cb";
netColor = ["#991300","#262835"];

function updateStorage(record){
    if(storageData.length>0){
        $("#storage").text(roundOff(record["disk_total"]/(1024*1024*1024))+" GB");
    }
}

function updateSpecs(machineName){
    var dataJson = {"action":"GET_SPECS",'machine_name':machineName};
    $.ajax({
        'type':'POST',
        'url':_apiEndPoint,
        'dataType':'json',
        'data':dataJson,
        'success':function(response){
                    $("#machine").text(response.machine);
                    $("#node").text(response.node);
                    $("#system").text(response.system);
                    setOperatingSystem(response.system);
                    $("#version").text(response.version);
                    $("#proc-arch").text(response.architecture[0]+" "+response.architecture[1]);
                    $("#memory").text(roundOff(response.memory/(1024*1024*1024)).toString() +"GB");
                  },
        'failure':function(response){
                    console.log(response);
                  }
    });
}

function setOperatingSystem(system){
    if(system=="Linux")
        $("#specs-os").html("<i style=\"margin-right:20px\" class=\"fa fa-linux\" aria-hidden=\"true\"></i>")
    else if(system == "Windows")
        $("#specs-os").html("<i style=\"margin-right:20px\" class=\"fa fa-windows\" aria-hidden=\"true\"></i>")
}

function setCpuChartInfo(){
    var cpuChartHtml = "";
    $("#cpu-chart-info").html("");
    for(var i=0 ; i<cpuCoreCount ; i++){
        cpuChartHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+cpuColors[i]+"\"></div><div class=\"meter-info\">CPU"+i+"</div></div>\n";
    }
    $("#cpu-chart-info").html(cpuChartHtml);
}

function setRamChartInfo(){
    $("#ram-chart-info").html("<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+ramColor+"\"></div><div class=\"meter-info\">RAM</div></div>\n")
}

function setNetChartInfo(){
    netChartInfoHtml = "";
    netChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+netColor[0]+"\"></div><div class=\"meter-info\">Data Recvd</div></div>\n";
    netChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+netColor[1]+"\"></div><div class=\"meter-info\">Data Sent</div></div>\n";
    $("#net-chart-info").html(netChartInfoHtml);
}

function setStorageChartInfo(){
    $("#storage-chart-info").html("<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+storageColor+"\"></div><div class=\"meter-info\">Storage Used</div></div>\n");
}

function setChartsInfo(){
    setCpuChartInfo();
    setNetChartInfo();
    setStorageChartInfo();
    setRamChartInfo();
}

function renderGraphs(){
    var cpuSeries = [];
    for(var i=0 ; i<cpuData.length ; i++){
        cpuSeries.push({'values':cpuData[i],"line-color":cpuColors[i],"line-width":2});
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
          "type":"date"
        }
      },
      "series": cpuSeries
    };
    zingchart.render({
        id:'cpu_chart',
        data:chartData,
        height:400,
        width:_rowWidth
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
        {"values":ramData,
         "line-color":ramColor}
      ]
    };
    zingchart.render({
        id:'ram_chart',
        data:chartData,
        height:400,
        width:_rowWidth
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
        {"values":netData[0],"line-color":netColor[0]},
        {"values":netData[1],"line-color":netColor[1]}
      ]
    };
    zingchart.render({
        id:'net_chart',
        data:chartData,
        height:400,
        width:_rowWidth
    });

    // Storage
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
        {"values":storageData,"line-color":storageColor}
      ]
    };
    zingchart.render({
        id:'storage_chart',
        data:chartData,
        height:400,
        width:_rowWidth
    });

}

function renderGraphs_disjoint(){
    console.log("renderGraphs_disjoint");
    var cpuSeries = [];
    for(var i=0 ; i<cpuData_disjoint.length ; i++){
        cpuSeries.push({'values':cpuData_disjoint[i],"line-color":cpuColors[i],"line-width":2});
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
          "type":"date"
        }
      },
      "series": cpuSeries
    };
    zingchart.render({
        id:'cpu_chart',
        data:chartData,
        height:400,
        width:_rowWidth
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
        {"values":ramData_disjoint,
            "line-color":ramColor}
      ]
    };
    zingchart.render({
        id:'ram_chart',
        data:chartData,
        height:400,
        width:_rowWidth
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
        {"values":netData_disjoint[0],"line-color":netColor[0]},
        {"values":netData_disjoint[1],"line-color":netColor[1]}
      ]
    };
    zingchart.render({
        id:'net_chart',
        data:chartData,
        height:400,
        width:_rowWidth
    });

    // Storage
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
        {"values":storageData_disjoint,"line-color":storageColor}
      ]
    };
    zingchart.render({
        id:'storage_chart',
        data:chartData,
        height:400,
        width:_rowWidth
    });
}

function getStatData(machineName){
    data = {'client-name':machineName, 'action':'GET_STAT_DATA'};
    $.ajax({
        'type':'post',
        'dataType':'json',
        'data':data,
        'success':function(response){
                    statData = response['stat_data'];
                    statData.forEach(generateData_CPU);
                    statData.forEach(generateData_RAM);
                    statData.forEach(generateData_Net);
                    statData.forEach(generateData_Storage);

                    ramData_disjoint = cleanTimeData(ramData,60000);
                    for(var i=0 ; i<cpuCoreCount ; i++){
                        cpuData_disjoint[i] = cleanTimeData(cpuData[i],60000);
                    }
                    storageData_disjoint = cleanTimeData(storageData,60000);
                    netData_disjoint[0] = cleanTimeData(netData[0],60000);
                    netData_disjoint[1] = cleanTimeData(netData[1],60000);

                    updateStorage(statData[statData.length-1]);
                    showGraphs(_graphType);
                 },
        'error':function(response){
                    console.log(response);
                },
        'url':_apiEndPoint
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

function cleanTimeData(dataArray,gradient){
    curTimeStamp = dataArray[0][0];
    var newDataArray = [];
    for(var i=0 ; i<dataArray.length-1 ; i++){
        newDataArray.push(dataArray[i]);
        var delta = Math.round((dataArray[i+1][0]-dataArray[i][0])/gradient) - 1;
        if(delta > 0){
            for(var j=0 ; j<delta ; j++){
                newDataArray.push(null);
            }
        }
    }
    newDataArray.push(dataArray[i]);
    return newDataArray;
}

function toggleDisjointGraphs(){
    if(_graphType == true){
        _graphType = false;
    }
    else{
        _graphType = true;
    }
    showGraphs(_graphType);
}

function showGraphs(_graphType){
    if(_graphType == true){
        renderGraphs();
    }
    else{
        renderGraphs_disjoint();
    }
    setChartsInfo();
}