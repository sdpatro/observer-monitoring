
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
  updateSpecs(document.cookie);
  getStatData(document.cookie);
});

statData = [];
cpuData = [[],[],[],[]];
ramData = [];
netData = [[],[]];
storageData = [];

function updateStorage(record){
    if(storageData.length>0){
        $("#storage").text("Disk Used: "+record["disk_used"]+", Disk Total: "+record["disk_total"]);
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
                    $("#version").text(response.version);
                    $("#proc-arch").text(response.architecture[0]+" "+response.architecture[1]);
                  },
        'failure':function(response){
                    console.log(response);
                  }
    });
}

function renderGraphs(){

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
          "all":"%H:%i"
        }
      },
      "series": cpuSeries
    };
    zingchart.render({
        id:'cpu_chart',
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
          "type":"date",
          "all":"%H:%i"
        }
      },
      "series": [
        {"values":netData[0]},
        {"values":netData[1]}
      ]
    };
    zingchart.render({
        id:'net_chart',
        data:chartData,
        height:400,
        width:600
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
          "type":"date",
          "all":"%H:%i"
        }
      },
      "series": [
        {"values":storageData}
      ]
    };
    zingchart.render({
        id:'storage_chart',
        data:chartData,
        height:400,
        width:600
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
                    updateStorage(statData[statData.length-1]);
                    renderGraphs();
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
