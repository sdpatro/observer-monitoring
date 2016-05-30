$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
    fetchInstanceTypes('amazon-ec2');
    _chartHeight = 400;
    _chartWidth = 800;
    fetchExtrapolatedCharts(1);
    fetchUtilization(getCookie("machine-name"));
    _rowWidth = 0.8*$("#cpu-stats").width();
});

_chartHeight = 0;
_chartWidth = 0;
_instancePricing = null;
_currentInstanceType = null;
_daysDuration = null;

function fetchInstanceTypes(providerName){
    var dataJson = {'action':'FETCH_INSTANCE_PRICING','provider_name':providerName};
    $.ajax({
        'type':'POST',
        'url':_apiEndPoint,
        'dataType':'json',
        'data': dataJson,
        success : function(response){
                    _instancePricing = JSON.parse(response.response_data);
                    $("#instance-type-dropdown-menu").empty();
                    for(var i=0 ; i<(_instancePricing['instances']).length ; i++){
                        $("#instance-type-dropdown-menu").append("<li class=\"dropdown-list-item\" onclick=\"setCurrentInstanceType(this)\">"+_instancePricing['instances'][i]['name'] +"<li>")
                    }
                  },
        failure: function(response){
                    console.log(response);
                 }
    });
}

function emptyRecords(){
    statData = [];
    cpuData = [[],[],[],[]];
    ramData = [];
    netData = [[],[]];
    storageData = [];
    cpuData_disjoint = [[],[],[],[]];
    ramData_disjoint = [];
    netData_disjoint = [[],[]];
    storageData_disjoint = [];
}

cpuColors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
ramColor = "#99a367";
storageColor = "#3ff4cb";
netColor = ["#991300","#262835"];
_graphType = true;

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
    _usagePercentage = Math.round((count/duration)*100,2);
    $("#usage-perc").html("<b>"+count.toString()+"</b> (minutes) out of <b>"+duration.toString()+"</b> (minutes): "+_usagePercentage+"%");
}

function setEstimationDuration(){
    _daysDuration = parseInt($("#days-duration-input").val());
    fetchExtrapolatedCharts(_daysDuration);
}

function fetchExtrapolatedCharts(daysDuration){
    var dataJson = {'action':'FETCH_ESTIMATED_CHARTS','machine':getCookie("machine-name"),'days_duration':daysDuration};
    $.ajax({
        'type':'POST',
        'url': _computeEndPoint,
        'dataType':'json',
        'data':dataJson,
        'success':function(response){
                    if(response['status']=='success')
                    {
                        emptyRecords();

                        statData = response['stat_data'];
                        statData.forEach(generateData_CPU);
                        statData.forEach(generateData_RAM);
                        statData.forEach(generateData_Net);
                        statData.forEach(generateData_Storage);

                        ramData_disjoint = cleanTimeData(ramData,60000);
                        _cpuCoreCount = cpuCoreCount;
                        for(var i=0 ; i<cpuCoreCount ; i++){
                            cpuData_disjoint[i] = cleanTimeData(cpuData[i],60000);
                        }
                        storageData_disjoint = cleanTimeData(storageData,60000);
                        netData_disjoint[0] = cleanTimeData(netData[0],60000);
                        netData_disjoint[1] = cleanTimeData(netData[1],60000);
                        setNetDemandStats(response['misc_data']);
                        setDemandStats();
                        showGraphs(_graphType);
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

function setDemandStats(){
    setCpuDemandStats();
    setRamDemandStats();
}

function setCpuDemandStats(){
    cpuDataNormalised = [];
    _cpuDataMean = 0;
    for(var i=0 ; i<cpuData[0].length ; i++){
        temp_sum = 0;
        for(var j=0 ; j<_cpuCoreCount ; j++){
            temp_sum += (cpuData[j][i][1]/_cpuCoreCount);
        }
        cpuDataNormalised.push(temp_sum);
        _cpuDataMean += cpuDataNormalised[i];
    }

    _cpuDataMean = Math.round(_cpuDataMean/cpuDataNormalised.length * 100) / 100;
    cpuDataNormalised = cpuDataNormalised.sort();
    _cpuDataMedian = Math.round(cpuDataNormalised[Math.round(cpuDataNormalised.length/2)]*100) / 100;
    $("#cpu_demand_stats").text("Mean "+_cpuDataMean.toString()+" Median: "+_cpuDataMedian);
}

function getCurrentInstanceTypeIndex(instanceTypeName){
    for(var i=0; i<_instancePricing['instances'].length ; i++){
        if(_instancePricing['instances'][i]['name']==instanceTypeName){
            return i;
        }
    }
}

function setCurrentInstanceType(el){
    $("#current-instance-type").text(el.innerText);
    $("#current-instance-type-details").html(getInstanceDetails(el.innerText));
    _currentInstanceType = el.innerText;
}

function computeCost(){
    if(_currentInstanceType === undefined || _currentInstanceType === null){
        alert("Instance type not set.");
        return;
    }
    if(!_daysDuration){
        alert("Days' duration is not set.");
        return;
    }
    currentInstanceTypeObject = _instancePricing['instances'][getCurrentInstanceTypeIndex(_currentInstanceType)];
    hourlyCost = currentInstanceTypeObject['hourly-cost'];
    instanceMonthlyCost = 730*hourlyCost;
    reservationCostMonthly = instanceMonthlyCost;
    ulBandwidthMonthly = Math.round( (_ulBandwidthGb/_daysDuration)*30 * 100) / 100;
    ulBandwidthMonthlyCost = Math.round( ulBandwidthMonthly * 0.09 );
    $("#instance-reservation-cost").text("Instance reservation cost (monthly): "+Math.round(reservationCostMonthly*_usagePercentage)/100+"$");
    $("#bandwidth-data-cost").text("Bandwidth data cost (monthly): "+ulBandwidthMonthlyCost+"$");
    totalMonthlyCost = Math.round(reservationCostMonthly*_usagePercentage)/100 + ulBandwidthMonthlyCost;
    totalYearlyCost = totalMonthlyCost*12;
    $("#monthly-cost").text("Total monthly cost: "+totalMonthlyCost+"$");
    $("#yearly-cost").text("Total yearly cost: "+totalYearlyCost+"$");
}

function getInstanceDetails(instanceTypeName){
    for(var i=0; i<_instancePricing['instances'].length ; i++){
        if(_instancePricing['instances'][i]['name']==instanceTypeName){
            instanceType = _instancePricing['instances'][i];
            var returnString =  "vCpu: <b>"+instanceType['vCpu'] + "</b> <br>";
            returnString += "Hourly Cost: <b>"+instanceType['hourly-cost']+"$</b> <br>";
            returnString += "Memory: <b>"+instanceType['memory']+"GB</b> <br>";
            return returnString;
        }
    }
}

function setRamDemandStats(){
    temp_sum = 0;
    for(var i=0 ; i<ramData.length ; i++){
        temp_sum += ramData[i][1];
    }
    _ramDataMean = Math.round(temp_sum/ramData.length * 100) / 100;
    ramData = ramData.sort();
    _ramDataMedian = Math.round(ramData[Math.round(ramData.length/2)][1] * 100) / 100;
    $("#ram_demand_stats").text("Mean: "+_ramDataMean+" Median: "+_ramDataMedian);
}

function setNetDemandStats(misc_data){
    _dlBandwidthGb = Math.round(misc_data['dl_bandwidth']/(1024*1024*1024) * 100) / 100;
    _ulBandwidthGb = Math.round(misc_data['ul_bandwidth']/(1024*1024*1024) * 100) / 100;
    $("#net_demand_stats").text("Total GB downloaded: "+_dlBandwidthGb.toString()+" Total GB uploaded: "+_ulBandwidthGb.toString());
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

function renderGraphs_disjoint(){
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

function setChartsInfo(){
    setCpuChartInfo();
    setNetChartInfo();
    setStorageChartInfo();
    setRamChartInfo();
}

function setCpuChartInfo(){
    var cpuChartHtml = "";
    $("#cpu-chart-info").html("");
    for(var i=0 ; i<cpuCoreCount ; i++){
        cpuChartHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+cpuColors[i]+"\"></div><div class=\"meter-info\">CPU"+i+" (%)</div></div>\n";
    }
    $("#cpu-chart-info").html(cpuChartHtml);
}

function setRamChartInfo(){
    $("#ram-chart-info").html("<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+ramColor+"\"></div><div class=\"meter-info\">RAM (%)</div></div>\n")
}

function setNetChartInfo(){
    netChartInfoHtml = "";
    netChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+netColor[0]+"\"></div><div class=\"meter-info\">Data Recvd (MB)</div></div>\n";
    netChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+netColor[1]+"\"></div><div class=\"meter-info\">Data Sent (MB)</div></div>\n";
    $("#net-chart-info").html(netChartInfoHtml);
}

function setStorageChartInfo(){
    $("#storage-chart-info").html("<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+storageColor+"\"></div><div class=\"meter-info\">Storage Used (GB)</div></div>\n");
}