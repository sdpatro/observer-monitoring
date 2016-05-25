
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
        $('.row-offcanvas').toggleClass('active');
      });

    if(document.cookie != ""){
        fetchTestsList();
        _currentTestName = "Custom Test";

        _editor = CodeMirror.fromTextArea(document.getElementById("code-input"), {
            lineNumbers: true,
            mode: "python",
            theme: 'base16-dark'
        });

        isTestResultsVisibile(false);
        isLiveChartsVisibile(false);
    }
    else{
        showIdle(true);
    }
});

cpuColors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
ramColor = "#99a367";
storageColor = "#3ff4cb";
netColor = ["#991300","#262835"];

function isTestResultsVisibile(status){
    if(status){
        $("#test-results").css("display","");
    }
    else{
        $("#test-results").css("display","none");
    }
}

function isLiveChartsVisibile(status){
    if(status){
        $("#test-live-charts").css("display","");
    }
    else{
        $("#test-live-charts").css("display","none");
    }
}

function isSnapshotsWrapperVisibile(status){
    if(status){
        $("#snapshots-wrapper").css("display","");
    }
    else{
        $("#snapshots-wrapper").css("display","none");
    }
}

window.onload = function(){
    $("#test_status_1").css("display","none");
    $("#test_status_2").css("display","none");
    $("#test_progress_1").css("display","none");
    $("#test_progress_2").css("display","none");
    $("#test_output_1").css("display","none");
    $("#test_output_2").css("display","none");
}

function fetchTestsList(){
    dataJson = {'action':'FETCH_TESTS_LIST','machine':document.cookie};
    $.ajax({
        'type' : 'POST',
        'url' : _apiEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        console.log(response);
                        attachTestsList((JSON.parse(response.response_data))["tests"]);
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    });
}

function attachTestsList(tests){
    $("#tests-list-group").empty();
    for(var i=0 ; i<tests.length ; i++){
        $("#tests-list-group").append("<li class=\"list-group-item test-list-item\" onclick=\"loadTest(this)\">"+tests[i]['name']+"</li>");
    }
    makeTestListItemActive();
}

function makeTestListItemActive(){
    var testsList = ($("#tests-list-group").children());
    for(var i=0 ; i<testsList.length ; i++){
        if($(testsList[i]).text()==_currentTestName){
            $(testsList[i]).addClass("active");
        }
        else{
            $(testsList[i]).removeClass("active");
        }
    }
}

function loadTest(e){
    _currentTestName = $(e).text();
    $('#test-name-header').text(_currentTestName);
    makeTestListItemActive();
    dataJson = {'action':'FETCH_TEST','machine':document.cookie,'test_name':_currentTestName};
    $.ajax({
        'type' : 'POST',
        'url' : _apiEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        test = JSON.parse(response.response_data);
                        console.log(test["script"]);
                        _editor.getDoc().setValue(test["script"]);
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    });
}

function increaseInstanceCount(){
    var instance_count = $("#instances-count").text();
    instance_count = parseInt(instance_count);
    instance_count = ((instance_count)%10)+1;
    $("#instances-count").text(instance_count);
}

function runCustomTest(){
    runLiveMonitoring();
    isLiveChartsVisibile(true);
    dataJson = {'action':'RUN_TEST','testName':_currentTestName,'testCode':_editor.getDoc().getValue(),'machineName':document.cookie,'instancesCount':parseInt($("#instances-count").text())};
    $.ajax({
        'type' : 'POST',
        'url' : _simEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        if(response.status == "success")
                        {
                            _testOutputJson = JSON.parse(response.output);
                            isLiveChartsVisibile(false);
                            isTestResultsVisibile(true);
                            attachImages(_testOutputJson[0][0]);
                            attachBarChartData(_testOutputJson[0][0]);
                        }
                        else{
                            alert("Fault in script. Error Message: "+response.msg);
                            closeLiveMonitoring();
                        }
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    })
}

function attachImages(output){
    isSnapshotsWrapperVisibile(false);
    _snapWidth = 0.8*$("#snapshots-wrapper").width();
    var testSnaps = output["snaps"];
    $("#snapshots-wrapper").empty();
    if(testSnaps.length > 0){
        isSnapshotsWrapperVisibile(true);
        for(var i=0 ; i<testSnaps.length ; i++){
            $snap = $("<div class=\"snap-container\" onclick=\"expandPhoto(this)\"><img id=\""+testSnaps[i]['snap_name']+"\" src=\"data:image/jpg;base64,"+testSnaps[i]['snap_content']+"\" /></div>");
            $($snap.children()[0]).attr("width","100%");
            $("#snapshots-wrapper").append($snap);
        }
    }
}

function expandPhoto(container){
    window.open($($(container).children()[0]).attr("src"),"_blank");
}


function attachBarChartData(output){
    var testOutput = output;
    var steps = [];
    for(var i=0 ; i<testOutput["steps"].length ; i++){
        if(testOutput["steps"][i]["record"] == true)
            steps.push(testOutput["steps"][i]);
    }

    $("#line-chart-wrapper").empty();
    $("#line-chart-wrapper").append("<h4>CPU Profiling</h4>\n"+
                        "<canvas id=\"line-chart-cpu\"  class=\"perf-test-chart\"></canvas>\n"+
                        "<div id=\"cpu-chart-info\"></div>\n"+
                        "<h4>RAM Profiling</h4>\n"+
                        "<canvas id=\"line-chart-ram\"  class=\"perf-test-chart\"></canvas>\n"+
                        "<div id=\"ram-chart-info\"></div>\n"+
                        "<h4>Disk Profiling</h4>\n"+
                        "<canvas id=\"line-chart-disk\"  class=\"perf-test-chart\"></canvas>\n"+
                        "<div id=\"disk-chart-info\"></div>\n"+
                        "<h4>Network Profiling</h4>\n"+
                        "<canvas id=\"line-chart-net\" class=\"perf-test-chart\"></canvas>\n"+
                        "<div id=\"net-chart-info\"></div>\n");

    loadTestOutputCharts(steps);
    closeLiveMonitoring();
}
function saveTest(){
    testName = $("#test-name-input").val();
    sourceCode = _editor.getDoc().getValue();
    if(testName==""){
        alert("Test name cannot be empty.");
        return;
    }
    if(sourceCode==""){
        alert("Test script cannot be empty.");
        return;

    }
    dataJson = {'action':'SAVE_TEST','testName':testName,'testCode':sourceCode,'machine':document.cookie};
    $.ajax({
        'type' : 'POST',
        'url' : _apiEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        alert("Successfully saved.");
                        fetchTestsList();
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    });


}

function loadTestOutputCharts(steps){

    _chartHeight = 200;
    _chartWidth = 0.8*$("#line-chart-wrapper").width();
    setChartDimensions("#line-chart-cpu",_chartHeight,_chartWidth);
    setChartDimensions("#line-chart-ram",_chartHeight,_chartWidth);
    setChartDimensions("#line-chart-disk",_chartHeight,_chartWidth);
    setChartDimensions("#line-chart-net",_chartHeight,_chartWidth);

    loadBarCharts();
    loadSteps(steps);
    attachLineChartData();
}

function loadBarCharts(){
    for(var i=0 ; i<_testOutputJson.length ; i++){
        steps = _testOutputJson[i][0]['steps'];
        var recorded_steps = [];
        for(var j=0 ; j<steps.length ; j++){
            if(steps[j]['record']==true)
            recorded_steps.push(steps[j]);
        }
        loadBarChart(recorded_steps,i);
    }
}

function attachLineChartData(){
    loadLineChart_CPU();
    loadLineChart_RAM();
    loadLineChart_Disk();
    loadLineChart_Net();
    setChartsInfo();
}

function setChartsInfo(){
    setCpuChartInfo();
    setNetChartInfo();
    setDiskChartInfo();
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
    netChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+netColor[0]+"\"></div><div class=\"meter-info\">Data Recvd (KB/s)</div></div>\n";
    netChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:"+netColor[1]+"\"></div><div class=\"meter-info\">Data Sent (KB/s)</div></div>\n";
    $("#net-chart-info").html(netChartInfoHtml);
}

function setDiskChartInfo(){
    var diskChartInfoHtml = "";
    diskChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:#3ff4cb\"></div><div class=\"meter-info\">Read Rate (KB/s)</div></div>\n";
    diskChartInfoHtml += "<div class=\"chart-info badge badge-default\"><div class=\"meter-color\" style=\"background-color:#f43f68\"></div><div class=\"meter-info\">Write Rate (KB/s)</div></div>\n";
    $("#disk-chart-info").html(diskChartInfoHtml);
}

function setChartDimensions(chartCanvas, height, width){
    $(chartCanvas).attr("height",height);
    $(chartCanvas).attr("width",width);
}

function loadSteps(steps){
    $("#steps-list").empty();
    for(var i=0 ; i<steps.length ; i++){
        var action = "Action"
        if(steps[i].action=="go_to")
            action = "Page navigate: ";
        else if(steps[i].action=="button_click")
            action = "Button click: ";
        else if(steps[i].action=="fill_form_element")
            action = "Fill form element: ";
        else if(steps[i].action=="form_submit")
            action = "Submit form: ";
        $("#steps-list").append($("<div class=\"steps-list-item\"><b>STEP "+(i+1)+":</b> "+action+" <b>"+steps[i].target+"</b></div>"));
    }
}

function loadBarChart(steps,index){
    $("#bar-chart-"+index.toString()).remove();
    $("<canvas id=\"bar-chart-"+index.toString()+"\" class=\"perf-test-chart\"></canvas>").insertAfter("#test-steps-header");
    labels = [];
    steps_duration = [];
    setChartDimensions("#bar-chart-"+index.toString(),50+50*steps.length,300);
    for(var i=0 ; i<steps.length ; i++){
        var date1 = new Date(steps[i]["startTime"]);
        var date2 = new Date(steps[i]["endTime"]);
        labels.push("       STEP "+(i+1));
        steps_duration.push((date2-date1)/1000);
    }
    var data = {
        labels : labels.reverse(),
        datasets: [
            {
                label: "My First dataset",
                fillColor: "rgba(51, 204, 51, 0.5)",
                strokeColor: "rgba(51, 204, 51, 0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: steps_duration.reverse()
            },
        ]
    };
    var ctx = $("#bar-chart-"+index.toString()).get(0).getContext("2d");
    new Chart(ctx).HorizontalBar(data, {
        barShowStroke: false,
    });
}

function cleanLabels(labels){
    var newLabels = [];
    for(var i=0 ; i<labels.length ; i++){
        if(i%(Math.round(labels.length/5)) == 0){
            newLabels.push(i);
        }
        else if(i==(labels.length-1)){
            newLabels.push(i);
        }
        else{
            newLabels.push("");
        }
    }
    return newLabels;
}

function loadLineChart_CPU(){
    var colors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
    var fillStyles = ["rgba(238,97,70,0.2)","rgba(255,213,87,0.2)","rgba(82,144,142,0.2)","rgba(82,144,113,0.2)"];
    var labels = [];
    cpuCoreCount = liveDataCache[0]["cpu_count"];
    var cpuDataSet = [];

    for(var i=0 ; i<cpuCoreCount ; i++){
        cpuDataSet.push(new Array(liveDataCache.length));
    }

    for(var i=0 ; i<liveDataCache.length ; i++){
        labels.push(i);
        for(var j=0 ; j<cpuCoreCount ; j++){
            cpuDataSet[j][i]=((liveDataCache[i])["cpu"][j]);
        }
    }
    datasets = [];

    for(var i=0 ; i<cpuCoreCount ; i++){
        datasets.push({
                fillColor: fillStyles[i],
                strokeColor: colors[i],
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: cpuDataSet[i]
            })
    }

    var data = {
        labels : cleanLabels(labels),
        datasets: datasets
    };
    var ctx = $("#line-chart-cpu").get(0).getContext("2d");
    new Chart(ctx).Line(data, {
        barShowStroke: false,
    });
}
function loadLineChart_RAM(){

    var ramDataSet = [];
    var labels = [];

    for(var i=0 ; i<liveDataCache.length ; i++){
        ramDataSet.push(liveDataCache[i]["ram"]);
        labels.push(i);
    }

    var data = {
        labels: cleanLabels(labels),
        datasets: [
            {
                fillColor: 'rgba(153,163,103,0.2)',
                strokeColor: '#99a367',
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: ramDataSet
            }
        ]
    };
    var ctx = $("#line-chart-ram").get(0).getContext("2d");
    new Chart(ctx).Line(data, {
        barShowStroke: false,
    });
}
function loadLineChart_Disk(){

    var diskReadDataSet = [];
    var diskWriteDataSet = [];
    var labels = [];

    for(var i=0 ; i<liveDataCache.length ; i++){
        diskReadDataSet.push(liveDataCache[i]["disk_read_rate"]/1024);
        diskWriteDataSet.push(liveDataCache[i]["disk_write_rate"]/1024);
        labels.push(i);
    }

    var data = {
        labels: cleanLabels(labels),
        datasets: [
            {
                fillColor: "rgba(63,244,203,0.2)",
                strokeColor: "#3ff4cb",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: diskReadDataSet
            },
            {
                fillColor: "rgba(244,63,108,0.2)",
                strokeColor: "#f43f68",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: diskWriteDataSet
            }
        ]
    };

    var ctx = $("#line-chart-disk").get(0).getContext("2d");
    new Chart(ctx).Line(data, {
        barShowStroke: false,
    });
}
function loadLineChart_Net(){

    var netSendDataSet = [];
    var netRecvDataSet = [];
    var labels = [];

    for(var i=0 ; i<liveDataCache.length ; i++){
        netRecvDataSet.push(liveDataCache[i]["dl_rate"]/1024);
        netSendDataSet.push(liveDataCache[i]["ul_rate"]/1024);
        labels.push(i);
    }

    var data = {
        labels: cleanLabels(labels),
        datasets: [
            {
                fillColor: "rgba(152,19,0,0.3)",
                strokeColor: "#991300",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: netRecvDataSet
            },
            {
                fillColor: "rgba(38,40,53,0.3)",
                strokeColor: "#262835",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: netSendDataSet
            }
        ]
    };

    var ctx = $("#line-chart-net").get(0).getContext("2d");
    new Chart(ctx).Line(data, {
        barShowStroke: false,
    });
}

function makeLabel(d){
    return d["action"]+" "+d["target"]+" "+d["duration"];
}

function runLiveMonitoring(){
    _isTestRunning = true;
    _isLiveGraphsRunning = false;

    liveDataCache = [];
    pollLiveData();
}

function runGraphs(){
    runGraph_CPU();
    runGraph_RAM();
    runGraph_disk();
    runGraph_net();
    _isLiveGraphsRunning = true;
}

function closeLiveMonitoring(){
    _isTestRunning = false;
    _isLiveGraphsRunning = false;
    $("#live-chart-container").empty();
}

function runGraph_CPU(){
    $("#live-chart-container").append("<canvas id=\"graph-cpu\" width=\"400\" height=\"100\"></canvas>");
    _isCpuTimeSeriesAdded = false;
    var colors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
    var fillStyles = ["rgba(238,97,70,0.2)","rgba(255,213,87,0.2)","rgba(82,144,142,0.2)","rgba(82,144,113,0.2)"];

    var smoothie = new SmoothieChart({maxValue:100,minValue:0});
    smoothie.streamTo(document.getElementById("graph-cpu"),1000);

    var cpuCoreCount = liveDataCache[0]["cpu_count"];
    var cpuTimeSeries = [];
    for(var i=0 ; i<cpuCoreCount ; i++){
        cpuTimeSeries.push(new TimeSeries());
        smoothie.addTimeSeries(cpuTimeSeries[i],{'strokeStyle':colors[i],'fillStyle':fillStyles[i]});
    }

    setInterval(function() {
      if(liveDataCache.length>0 && _isTestRunning)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        for(var i=0 ; i<cpuCoreCount ; i++){
            cpuTimeSeries[i].append(new Date().getTime(), dataUnit.cpu[i]);
        }
      }
    }, 1000);
}
function runGraph_RAM(){
    $("#live-chart-container").append("<canvas id=\"graph-ram\" width=\"400\" height=\"100\"></canvas>");
    var smoothie = new SmoothieChart({maxValue:100,minValue:0});
    smoothie.streamTo(document.getElementById("graph-ram"),1000);

    var ram = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0 && _isTestRunning)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        ram.append(new Date().getTime(), dataUnit.ram);
      }
    }, 1000);

    smoothie.addTimeSeries(ram,{'strokeStyle':'#99a367','fillStyle':'rgba(153,163,103,0.2)'});
}
function runGraph_disk(){
    $("#live-chart-container").append("<canvas id=\"graph-disk\" width=\"400\" height=\"100\"></canvas>");
    var smoothie = new SmoothieChart();
    smoothie.streamTo(document.getElementById("graph-disk"),1000);

    var disk_read = new TimeSeries();
    var disk_write = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0 && _isTestRunning)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        disk_read.append(new Date().getTime(), dataUnit.disk_read_rate/1024);
        disk_write.append(new Date().getTime(), dataUnit.disk_write_rate/1024);
      }
    }, 1000);

    smoothie.addTimeSeries(disk_read,{'strokeStyle':'#3ff4cb','fillStyle':'rgba(63,244,203,0.2)'});
    smoothie.addTimeSeries(disk_write,{'strokeStyle':'#f43f68','fillStyle':'rgba(244,63,108,0.2)'});
}

function runGraph_net(){
    $("#live-chart-container").append("<canvas id=\"graph-network\" width=\"400\" height=\"100\"></canvas>");
    var smoothie = new SmoothieChart();
    smoothie.streamTo(document.getElementById("graph-network"),1000);

    var net_send = new TimeSeries();
    var net_recv = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0 && _isTestRunning)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        $("#net-send-meter").text("Net RX: " + dataUnit.ul_rate/1024 + " kb/s");
        $("#net-recv-meter").text("Net TX: " + dataUnit.dl_rate/1024 + " kb/s");
        net_send.append(new Date().getTime(), dataUnit.ul_rate/1024);
        net_recv.append(new Date().getTime(), dataUnit.dl_rate/1024);
      }
    }, 1000);

    smoothie.addTimeSeries(net_send,{'strokeStyle':'#991300','fillStyle':'rgba(152,19,0,0.3)'});
    smoothie.addTimeSeries(net_recv,{'strokeStyle':'#262835','fillStyle':'rgba(38,40,53,0.3)'});
}

function pollLiveData(){
    data = {'client-name':_common["currentMachine"],'action':'GET_LIVE_DATA'};
    $.ajax({
        'data':data,
        'type' : 'post',
        'url' : _liveEndPoint,
        'success':function(response){
                    liveDataCache.push(response);
                    if(!_isLiveGraphsRunning && _isTestRunning){
                        runGraphs();
                    }
                    if(_isTestRunning)
                    {
                        setTimeout(function(){pollLiveData();},1000);
                    }
                   },
        'error':function(response){
                    console.log(response);
                  },
        'data-type':'json'
    })
}

function makeChartSummaryJson(){

    var jsonData = {'live_data':[],'snaps_id':[]};

    for(var i=0 ; i<liveDataCache.length ; i++){
        jsonData["live_data"].push(liveDataCache[i]);
    }

    snapContainers = $("#snapshots-wrapper").children();
    for(var i=0 ; i<snapContainers.length ; i++){
        jsonData["snaps_id"].push($($(snapContainers[i]).children()[0]).attr("id"));
    }

    wrapperJson = {'jsonData':JSON.stringify(jsonData),'action':'SAVE_TEST_RESULT_AS','test_name':_currentTestName,'file_type':'XLSX'};
    console.log(wrapperJson["jsonData"]);
    return wrapperJson;
}

function makeCSVSummaryJson(){
    var jsonData = {'live_data':[]};
    for(var i=0 ; i<liveDataCache.length ; i++){
        jsonData["live_data"].push(liveDataCache[i]);
    }
    wrapperJson = {'jsonData':JSON.stringify(jsonData),'action':'SAVE_TEST_RESULT_AS','test_name':_currentTestName,'file_type':'CSV'};
    return wrapperJson;
}

function saveAs(format){
    switch(format){
        case 'XLXS':var summaryJson = makeChartSummaryJson();
                    $.ajax({
                        'type':'POST',
                        'url': _apiEndPoint,
                        'dataType':'json',
                        'data':summaryJson,
                        'success':function(response){
                                    window.location = _filesEndPoint+"/"+response.file_name+".xlsx";
                                 },
                        'failure':function(response){
                                    console.log(response);
                                 }
                    });
                    break;
        case 'CSV': var summaryJson = makeCSVSummaryJson();
                    $.ajax({
                        'type':'POST',
                        'url': _apiEndPoint,
                        'dataType':'json',
                        'data':summaryJson,
                        'success':function(response){
                                    window.location = _filesEndPoint+"/"+response.file_name;
                                 },
                        'failure':function(response){
                                    console.log(response);
                                 }
                    });
                    break;
        case 'JPG':
                    break;
    }
}
