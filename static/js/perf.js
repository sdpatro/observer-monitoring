
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
  fetchTestsList();
});

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
    for(var i=0 ; i<tests.length ; i++){
        $("#tests-list-group").append("<li class=\"list-group-item\" onclick=\"loadTest(this)\">"+tests[i]['name']+"</li>");
    }
}
function loadTest(e){
    _currentTestName = $(e).text();
    $('#test-name-header').text(_currentTestName);

    dataJson = {'action':'FETCH_TEST','machine':document.cookie,'test_name':_currentTestName};
    $.ajax({
        'type' : 'POST',
        'url' : _apiEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        test = JSON.parse(response.response_data);
                        $("#code-input").val(test["script"]);
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    });
}
function runFirefox(test_id){

    runTest(test_id,'FIREFOX');
}
function runPhantom(test_id){

    runTest(test_id,'PHANTOMJS');
}
function changeTestStatus(test_id,status,test_output){
    id = test_id.substring((test_id).length-1);
    if(status=='RUNNING'){
        $("#test_status_"+id).css('display','');
        $("#test_status_"+id).text("Running tests, please wait....");
        $("#test_progress_"+id).css('display','');
        $("#test_output_"+id).css('display','none');
    }
    else if(status=='DONE'){
        $("#test_status_"+id).text("Tests done.");
        $("#test_progress_"+id).css('display','none');
        $("#test_output_"+id).css('display','');
        for(i=0 ; i<test_output.length ; i++){
            $("#test_output_"+id).append("<li>"+test_output[i]+"</li>")
        }
    }
}

function runCustomTest(){
    runLiveMonitoring();
    dataJson = {'action':'RUN_TEST','testName':'customTest','testCode':$("#code-input").val(),'machineName':document.cookie};
    $.ajax({
        'type' : 'POST',
        'url' : _simEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        attachImages(response.output);
                        attachBarChartData(response.output);
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    })
}

function attachImages(output){
    var testSnaps = JSON.parse(output)["snaps"];
    for(var i=0 ; i<testSnaps.length ; i++){
        $("#snapshots-wrapper").append("<img src=\"data:image/png;base64,"+testSnaps[i]+"\" />");
    }
}

function attachBarChartData(output){
    var testOutput = JSON.parse(output);
    var steps = [];
    console.log(testOutput);
    for(var i=0 ; i<testOutput["steps"].length ; i++){
        if(testOutput["steps"][i]["record"] == true)
            steps.push(testOutput["steps"][i]);
    }
    loadTestOutputCharts(steps);
    closeLiveMonitoring();
}
function saveTest(){
    testName = $("#test-name-input").val();
    sourceCode = $("#code-input").val()
    if(testName=="" || sourceCode==""){
        alert("Test name cannot be empty.");
        return;
    }
    dataJson = {'action':'SAVE_TEST','testName':testName,'testCode':sourceCode,'machine':document.cookie};
    $.ajax({
        'type' : 'POST',
        'url' : _apiEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        alert(response.status + " " + response.output);
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    });
}

function loadTestOutputCharts(steps){
    setChartDimensions("#bar-chart",200,500);
    setChartDimensions("#line-chart-cpu",200,500);
    setChartDimensions("#line-chart-ram",200,500);
    setChartDimensions("#line-chart-disk",200,500);
    setChartDimensions("#line-chart-net",200,500);

    loadBarChart(steps);
    loadLineChart_CPU();
    loadLineChart_RAM();
    loadLineChart_Disk();
    loadLineChart_Net();
}

function setChartDimensions(chartCanvas, height, width){
    $(chartCanvas).attr("height",height);
    $(chartCanvas).attr("width",width);
}

function loadBarChart(steps){
    labels = [];
    steps_duration = [];
    for(var i=0 ; i<steps.length ; i++){
        var date1 = new Date(steps[i]["startTime"]);
        var date2 = new Date(steps[i]["endTime"]);
        labels.push("     test#"+i);
        steps_duration.push((date2-date1)/1000);
    }
    var data = {
        labels : labels.reverse(),
        datasets: [
            {
                label: "My First dataset",
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: steps_duration.reverse()
            },
        ]
    };
    var ctx = $("#bar-chart").get(0).getContext("2d");
    new Chart(ctx).HorizontalBar(data, {
        barShowStroke: false,
    });
}

function loadLineChart_CPU(){
    var labels = [];
    var cpuCoreCount = liveDataCache[0]["cpu_count"];
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
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: cpuDataSet[i]
            })
    }

    var data = {
        labels : labels,
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
        labels: labels,
        datasets: [
            {
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
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
        labels: labels,
        datasets: [
            {
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: diskReadDataSet
            },
            {
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
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
        labels: labels,
        datasets: [
            {
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: netRecvDataSet
            },
            {
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
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
    attachLineChartData();
}

function runGraph_CPU(){
    $("#live-chart-container").append("<canvas id=\"graph-cpu\" width=\"400\" height=\"100\"></canvas>");
    _isCpuTimeSeriesAdded = false;
    var colors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
    var fillStyles = ["rgba(238,97,70,0.2)","rgba(255,213,87,0.2)","rgba(82,144,142,0.51)","rgba(82,144,113,0.51)"];

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

    smoothie.addTimeSeries(net_send,{'strokeStyle':'#991300','fillStyle':'rgba(152,19,0,0.2)'});
    smoothie.addTimeSeries(net_recv,{'strokeStyle':'#262835','fillStyle':'rgba(38,40,53,0.2)'});
}

function pollLiveData(){
    data = {'client-name':_common["currentMachine"],'action':'GET_LIVE_DATA'};
    $.ajax({
        'data':data,
        'type' : 'post',
        'url' : _apiEndPoint,
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
