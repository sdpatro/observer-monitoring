$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
    fetchUtilization(document.cookie);
    _chartHeight = 400;
    _chartWidth = 800;
    fetchExtrapolatedCharts(1);
});

statData = [];
cpuData = [[],[],[],[]];
ramData = [];
netData = [[],[]];
storageData = [];
_chartHeight = 0;
_chartWidth = 0;

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
                    if(response['status']=='success')
                    {
                        console.log("dl_bandwidth: "+response['misc_data']['dl_bandwidth']);
                        emptyRecords();
                        statData = response['stat_data'];
                        statData.forEach(generateData_CPU);
                        statData.forEach(generateData_RAM);
                        statData.forEach(generateData_Net);
                        statData.forEach(generateData_Storage);
                        attachCpuEstimationChart(statData);

                        setNetDemandStats(response['misc_data']);
                    }
                    else{
                        alert(response['message']);
                    }

                  },
        'failure':function(response){
                    console.log(response);
                  }
    });
}


function setCpuDemandStats(){
    cpuDataNormalised = [];
    console.log(_cpuCoreCount+" "+cpuDataNormalised);
    cpuDataMean = 0;
    for(var i=0 ; i<cpuData[0].length ; i++){
        temp_sum = 0;
        for(var j=0 ; j<_cpuCoreCount ; j++){
            temp_sum += (cpuData[j][i][1]/_cpuCoreCount);
        }
        cpuDataNormalised.push(temp_sum);
        cpuDataMean += cpuDataNormalised[i];
    }

    cpuDataMean = Math.round(cpuDataMean/cpuDataNormalised.length * 100) / 100;
    cpuDataNormalised = cpuDataNormalised.sort();
    cpuDataMedian = Math.round(cpuDataNormalised[Math.round(cpuDataNormalised.length/2)]*100) / 100;
    $("#cpu_demand_stats").text("Mean "+cpuDataMean.toString()+" Median: "+cpuDataMedian);
}
function setRamDemandStats(){
    temp_sum = 0;
    for(var i=0 ; i<ramData.length ; i++){
        temp_sum += ramData[i][1];
    }
    ramData_mean = Math.round(temp_sum/ramData.length * 100) / 100;
    ramData = ramData.sort();
    ramData_median = Math.round(ramData[Math.round(ramData.length/2)][1] * 100) / 100;
    $("#ram_demand_stats").text("Mean: "+ramData_mean+" Median: "+ramData_median);
}
function setNetDemandStats(misc_data){
    dl_bandwidth_gb = Math.round(misc_data['dl_bandwidth']/(1024*1024*1024) * 100) / 100;
    ul_bandwidth_gb = Math.round(misc_data['ul_bandwidth']/(1024*1024*1024) * 100) / 100;
    $("#net_demand_stats").text("Total GB downloaded: "+dl_bandwidth_gb.toString()+" Total GB uploaded: "+ul_bandwidth_gb.toString());
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
        height:_chartHeight,
        width:_chartWidth
    });
    setCpuDemandStats();

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
        height:_chartHeight,
        width:_chartWidth
    });

    setRamDemandStats();

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
        height:_chartHeight,
        width:_chartWidth
    });
}

function generateData_CPU(record){
    _cpuCoreCount = record['cpu'].length;
    for(var i=0 ; i<_cpuCoreCount ; i++){
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