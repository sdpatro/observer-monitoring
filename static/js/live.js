$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
    console.log("document cookie "+document.cookie);
    if(document.cookie != ""){
        initiateLive();
    }
    else{
        showIdle(true);
    }
});

function initiateLive(){
    pollLiveData();
    runGraph_CPU();
    runGraph_RAM();
    runGraph_disk();
    runGraph_net();
    update_uptime();
}

liveDataCache = [];

function convert_to_timedelta(seconds){

    var years  = Math.floor(seconds/(60*60*24*30*12));
    seconds = seconds%(60*60*24*30*12);
    var months = Math.floor(seconds/(60*60*24*30));
    seconds = seconds%(60*60*24*30);
    var days = Math.floor(seconds/(60*60*24));
    seconds = seconds%(60*60*24);
    var hours = Math.floor(seconds/(60*60));
    seconds = seconds%(60*60);
    var minutes = Math.floor(seconds/60);
    seconds = Math.floor(seconds%(60));

    var timedelta_string = "";
    if(years > 0){
        timedelta_string += years + " years "
    }
    if(months > 0){
        timedelta_string += months + " months "
    }
    if(days > 0){
        timedelta_string += days + " days "
    }
    if(hours > 0){
        timedelta_string += hours + " hours "
    }
    if(minutes > 0){
        timedelta_string += minutes + " minutes "
    }
    if(seconds > 0){
        timedelta_string += seconds + " seconds "
    }

    return timedelta_string;
}

function update_uptime(){
   if(liveDataCache.length>0){
    dataUnit = liveDataCache[(liveDataCache).length-1];
    $("#sys-uptime").text(convert_to_timedelta(dataUnit["uptime"]));
   }
   setTimeout(function(){
    update_uptime();
   },1000);
}

function runGraph_CPU(){
    _isCpuTimeSeriesAdded = false;
    var colors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
    var fillStyles = ["rgba(238,97,70,0.2)","rgba(255,213,87,0.2)","rgba(82,144,142,0.2)","rgba(82,144,113,0.2)"];

    var smoothie = new SmoothieChart({maxValue:100,minValue:0});
    smoothie.streamTo(document.getElementById("graph-cpu"),1000);

    var cpuTimeSeries = [new TimeSeries(), new TimeSeries(), new TimeSeries(), new TimeSeries()];
    var cpuCoreCount = 0;

    setInterval(function() {
      if(liveDataCache.length>0)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        cpuCoreCount = dataUnit["cpu"].length;
        if(!_isCpuTimeSeriesAdded){
            for(var i=0 ; i<cpuCoreCount ; i++)
            {
                smoothie.addTimeSeries(cpuTimeSeries[i],{'strokeStyle':colors[i],'fillStyle':fillStyles[i]});
                console.log("TimeSeries added: "+i);
                _isCpuTimeSeriesAdded = true;
            }
        }
        for(var i=0 ; i<cpuCoreCount ; i++){
            $("#cpu"+i+"-meter").html("<div class=\"meter-color\" style=\"background-color:"+colors[i]+"\"></div><div class=\"meter-info\">CPU"+i+":</div><div class=\"meter-usage\">"+dataUnit["cpu"][i]+"%</div>");
        }
        for(var i=0 ; i<cpuCoreCount ; i++){
            cpuTimeSeries[i].append(new Date().getTime(), dataUnit.cpu[i]);
        }
        $("#cpu-ctx-switches").html("Context Switches: <b>"+dataUnit["cpu_ctx_switches"]+"</b>");
        $("#cpu-interrupts").html("Interrupts: <b>"+dataUnit["cpu_interrupts"]+"</b>");
      }
    }, 1000);
}

function runGraph_RAM(){
    var smoothie = new SmoothieChart({maxValue:100,minValue:0});
    smoothie.streamTo(document.getElementById("graph-ram"),1000);

    var ram = new TimeSeries();
    var swap = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        $("#ram-meter").html("<div class=\"meter-color\" style=\"background-color:#99a367\"></div><div class=\"meter-info\">RAM: </div><div class=\"meter-usage\">"+dataUnit["ram"]+"%</div>");
        $("#swap-meter").html("<div class=\"meter-color\" style=\"background-color:#c4b200\"></div><div class=\"meter-info\">Swap: </div><div class=\"meter-usage\">"+dataUnit["swap"]+"%</div>");
        ram.append(new Date().getTime(), dataUnit.ram);
        swap.append(new Date().getTime(), dataUnit.swap);

        $("#ram-available").html("RAM Available: <b>"+roundOff(dataUnit["ram-available"]/(1024*1024*1024))+" GB</b>");
        $("#ram-used").html("RAM Used: <b>"+roundOff(dataUnit["ram-used"]/(1024*1024*1024))+" GB</b>");
        $("#swap-total").html("Swap Total: <b>"+roundOff(dataUnit["swap-total"]/(1024*1024*1024))+" GB</b>");
        $("#swap-used").html("Swap Used: <b>"+roundOff(dataUnit["swap-used"]/(1024*1024*1024))+" GB</b>");
      }
    }, 1000);

    smoothie.addTimeSeries(ram,{'strokeStyle':'#99a367','fillStyle':'rgba(153,163,103,0.2)'});
    smoothie.addTimeSeries(swap,{'strokeStyle':'#c4b200','fillStyle':'rgba(181,170,0,0.30)'});
}

function runGraph_disk(){
    var smoothie = new SmoothieChart();
    smoothie.streamTo(document.getElementById("graph-disk"),1000);

    var disk_read = new TimeSeries();
    var disk_write = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        $("#disk-read-meter").html("<div class=\"meter-color\" style=\"background-color:#3ff4cb\"></div><div class=\"meter-info\">Read rate: </div><div class=\"meter-usage\">"+roundOff(dataUnit["disk_read_rate"]/(1024))+" KB/s</div>");
        $("#disk-write-meter").html("<div class=\"meter-color\" style=\"background-color:#f43f68\"></div><div class=\"meter-info\">Write rate: </div><div class=\"meter-usage\">"+roundOff(dataUnit["disk_write_rate"]/(1024))+" KB/s</div>");

        $("#disk-total").html("Disk Total: <b>"+roundOff(dataUnit.disk_total/(1024*1024))+" GB</b>");
        $("#disk-used").html("Disk Used: <b>"+roundOff(dataUnit.disk_used/(1024*1024))+" GB</b>");
        disk_read.append(new Date().getTime(), dataUnit.disk_read_rate/1024);
        disk_write.append(new Date().getTime(), dataUnit.disk_write_rate/1024);
      }
    }, 1000);

    smoothie.addTimeSeries(disk_read,{'strokeStyle':'#3ff4cb','fillStyle':'rgba(63,244,203,0.2)'});
    smoothie.addTimeSeries(disk_write,{'strokeStyle':'#f43f68','fillStyle':'rgba(244,63,108,0.2)'});
}

function runGraph_net(){
    var smoothie = new SmoothieChart();
    smoothie.streamTo(document.getElementById("graph-network"),1000);

    var net_send = new TimeSeries();
    var net_recv = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        $("#net-send-meter").html("<div class=\"meter-color\" style=\"background-color:#991300\"></div><div class=\"meter-info\">Upload rate: </div><div class=\"meter-usage\">"+roundOff(dataUnit["ul_rate"]/(1024))+" KB/s</div>");
        $("#net-recv-meter").html("<div class=\"meter-color\" style=\"background-color:#262835\"></div><div class=\"meter-info\">Download rate: </div><div class=\"meter-usage\">"+roundOff(dataUnit["dl_rate"]/(1024))+" KB/s</div>");
        net_send.append(new Date().getTime(), dataUnit.ul_rate/1024);
        net_recv.append(new Date().getTime(), dataUnit.dl_rate/1024);
        $("#sent-total").html("Sent: <b>"+roundOff(dataUnit.bytes_sent/(1024*1024))+" MB</b>");
        $("#recv-total").html("Received: <b>"+roundOff(dataUnit.bytes_recv/(1024*1024))+" MB</b>");
        $("#packets-sent-total").html("Packets sent/dropped: <b>"+dataUnit.packets_sent[0]+"/"+dataUnit.packets_sent[1]+"</b>");
        $("#packets-recv-total").html("Packets received/dropped: <b>"+dataUnit.packets_recv[0]+"/"+dataUnit.packets_recv[1]+"</b>");
      }
    }, 1000);

    smoothie.addTimeSeries(net_send,{'strokeStyle':'#991300','fillStyle':'rgba(152,19,0,0.2)'});
    smoothie.addTimeSeries(net_recv,{'strokeStyle':'#262835','fillStyle':'rgba(38,40,53,0.4)'});
}

function pollLiveData(){
    data = {'client-name':_common["currentMachine"],'action':'GET_LIVE_DATA'};
    $.ajax({
        'data':data,
        'type' : 'post',
        'url' : _liveEndPoint,
        'success':function(response){
                    liveDataCache.push(response);
                    if(liveDataCache.length > 60){
                        liveDataCache = liveDataCache.splice(0,1);
                    }
                    setTimeout(function(){pollLiveData()},500);
                   },
        'error':function(response){
                    console.log(response);
                  },
        'data-type':'json'
    })
}