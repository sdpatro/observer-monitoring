$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
    fetchInstanceTypes('amazon-ec2');
    _chartHeight = 400;
    _chartWidth = 800;
    fetchExtrapolatedCharts(1);
    fetchUtilization(document.cookie);
});

statData = [];
cpuData = [[],[],[],[]];
ramData = [];
netData = [[],[]];
storageData = [];
_chartHeight = 0;
_chartWidth = 0;
_instancePricing = null;

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
                        $("#instance-type-dropdown-menu").append("<li onclick=\"setCurrentInstanceType(this)\">"+_instancePricing['instances'][i]['name'] +"<li>")
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
    _usagePercentage = Math.round((count/duration)*100,2);
    $("#usage-perc").text(count.toString()+"/"+duration.toString()+" : "+_usagePercentage+"%");
}

function setEstimationDuration(){
    _daysDuration = parseInt($("#days-duration-input").val());
    fetchExtrapolatedCharts(_daysDuration);
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


function setCpuOptimization(){
    if(Math.abs(_cpuDataMedian-_cpuDataMean) > 10){ // Checking skewness of data
        cpuCentralValue = _cpuDataMedian;
    }
    else{
        cpuCentralValue = _cpuDataMean;
    }

    var cpuUsageMessage = "";
    var cpuSuggestedChange = 0;

    if(cpuCentralValue < 30){
        cpuUsageMessage = "Under used CPU";
        cpuSuggestedChange = -1.5;
    }
    else if(cpuCentralValue>=31 && cpuCentralValue<=50){
        cpuUsageMessage = "Light usage of CPU";
        cpuSuggestedChange = -1;
    }
    else if(cpuCentralValue>50 && cpuCentralValue<=75){
        cpuUsageMessage = "Optimal usage";
        cpuSuggestedChange = 0;
    }
    else{
        cpuUsageMessage = "Very high usage"
        cpuSuggestedChange = 1;
    }

    var suggestedInstanceTypes = [];
    console.log("_currentInstance: "+_currentInstanceType);
    var currentInstanceTypeIndex = getCurrentInstanceTypeIndex(_currentInstanceType);
    console.log("currentInstanceTypeIndex: "+currentInstanceTypeIndex);

    currentInstanceTypeObject = _instancePricing['instances'][currentInstanceTypeIndex];

    switch(cpuSuggestedChange){
        case -1.5: if(currentInstanceTypeObject['vCpu']==2){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 1){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   else if(currentInstanceTypeObject['vCpu']==4){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 2 || _instancePricing['instances'][i]['vCpu'] == 1){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   else if(currentInstanceTypeObject['vCpu']==8){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 4 || _instancePricing['instances'][i]['vCpu'] == 2){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   break;
        case -1:  if(currentInstanceTypeObject['vCpu']==2){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 1){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   else if(currentInstanceTypeObject['vCpu']==4){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 2){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   else if(currentInstanceTypeObject['vCpu']==8){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 4){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   break;
                  break;
        case 1:   if(currentInstanceTypeObject['vCpu']==2){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 4){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   else if(currentInstanceTypeObject['vCpu']==4){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 8){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   else if(currentInstanceTypeObject['vCpu']==1){
                        for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                            if(_instancePricing['instances'][i]['vCpu'] == 2){
                                suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                            }
                        }
                   }
                   break;
                 break;
    }

    var optimizationMessageString = cpuUsageMessage;
    for(var i=0 ; i<suggestedInstanceTypes.length ; i++){
        optimizationMessageString += " "+suggestedInstanceTypes[i];
    }

    $("#cpu_optimizations").text(optimizationMessageString);
}

function setRamOptimization(){
    if(Math.abs(_ramDataMedian-_ramDataMean) > 10){ // Checking skewness of data
        ramCentralValue = _ramDataMedian;
    }
    else{
        ramCentralValue = _ramDataMean;
    }

    var ramUsageMessage = "";
    var ramSuggestedChange = 0;

    if(ramCentralValue < 30){
        ramUsageMessage = "Under used RAM";
        ramSuggestedChange = -1.5;
    }
    else if(ramCentralValue>=31 && ramCentralValue<=50){
        ramUsageMessage = "Light usage of RAM";
        ramSuggestedChange = -1;
    }
    else if(ramCentralValue>50 && ramCentralValue<=75){
        ramUsageMessage = "Optimal usage";
        ramSuggestedChange = 0;
    }
    else{
        ramUsageMessage = "Very high usage"
        ramSuggestedChange = 1;
    }

    var suggestedInstanceTypes = [];
    console.log("_currentInstance: "+_currentInstanceType);
    var currentInstanceTypeIndex = getCurrentInstanceTypeIndex(_currentInstanceType);
    console.log("currentInstanceTypeIndex: "+currentInstanceTypeIndex);

    currentInstanceTypeObject = _instancePricing['instances'][currentInstanceTypeIndex];

    switch(ramSuggestedChange){
        case -1.5:
                    for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                        if(_instancePricing['instances'][i]['memory'] < 0.5*currentInstanceTypeObject['memory']){
                            suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                        }
                    }

                   break;
        case -1:  for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                        if(_instancePricing['instances'][i]['memory'] < (0.75*currentInstanceTypeObject['memory'])){
                            suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                        }
                   }
                   break;
        case 1:   for(var i=0 ; i<_instancePricing['instances'].length ; i++){
                        if(_instancePricing['instances'][i]['memory'] > 1.25*currentInstanceTypeObject['memory']){
                            suggestedInstanceTypes.push(_instancePricing['instances'][i]['name']);
                        }
                    }
                   break;
    }

    var optimizationMessageString = ramUsageMessage;
    for(var i=0 ; i<suggestedInstanceTypes.length ; i++){
        optimizationMessageString += " "+suggestedInstanceTypes[i];
    }

    $("#ram_optimizations").text(optimizationMessageString);
}

function setCpuDemandStats(){
    cpuDataNormalised = [];
    console.log(_cpuCoreCount+" "+cpuDataNormalised);
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
    $("#current-instance-type-details").text(getInstanceDetails(el.innerText));
    _currentInstanceType = el.innerText;
    setCpuOptimization();
    setRamOptimization();
    computeCost();
}

function computeCost(){
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
            var returnString =  "vCpu: "+instanceType['vCpu'] + "\n";
            returnString += "Hourly Cost: "+instanceType['hourly-cost']+"$\n";
            returnString += "Memory: "+instanceType['memory']+"GB\n";
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
