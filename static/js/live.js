$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
    pollLiveData();
    runGraph_CPU();
    runGraph_RAM();
    runGraph_disk();
    runGraph_net();
});

liveDataCache = [];

function runGraph_CPU(){
    _isCpuTimeSeriesAdded = false;
    var colors = ["#ee6146","#ffd557","#00ffec","#00ff90"];
    var fillStyles = ["rgba(238,97,70,0.2)","rgba(255,213,87,0.2)","rgba(82,144,142,0.51)","rgba(82,144,113,0.51)"];

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
            $("#cpu"+i+"-meter").text("CPU"+i+": " + dataUnit.cpu[i]+"%");
        }
        for(var i=0 ; i<cpuCoreCount ; i++){
            cpuTimeSeries[i].append(new Date().getTime(), dataUnit.cpu[i]);
        }
        $("#cpu-ctx-switches").text("Context Switches: "+dataUnit["cpu_ctx_switches"]);
        $("#cpu-interrupts").text("Interrupts: "+dataUnit["cpu_interrupts"]);
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
        $("#ram-meter").text("RAM: "+dataUnit.ram+" %");
        $("#swap-meter").text("Swap: "+dataUnit.swap+" %");
        ram.append(new Date().getTime(), dataUnit.ram);
        swap.append(new Date().getTime(), dataUnit.swap);

        $("#ram-available").text("RAM Available: "+dataUnit["ram-available"]/(1024*1024*1024)+" GB");
        $("#ram-used").text("RAM Used: "+dataUnit["ram-used"]/(1024*1024*1024)+" GB");
        $("#swap-total").text("Swap Total: "+dataUnit["swap-total"]/(1024*1024*1024)+" GB");
        $("#swap-used").text("Swap Used: "+dataUnit["swap-used"]/(1024*1024*1024)+" GB");
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
        $("#disk-read-meter").text("Read: "+dataUnit.disk_read_rate/(1024) + " bytes/s");
        $("#disk-write-meter").text("Write: "+dataUnit.disk_write_rate/(1024) + " bytes/s");
        $("#disk-total").text("Disk Total: "+dataUnit.disk_total/(1024*1024)+" GB");
        $("#disk-used").text("Disk Used: "+dataUnit.disk_used/(1024*1024)+" GB");
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
        $("#net-send-meter").text("Net TX: " + dataUnit.ul_rate/1024 + " kb/s");
        $("#net-recv-meter").text("Net RX: " + dataUnit.dl_rate/1024 + " kb/s");
        net_send.append(new Date().getTime(), dataUnit.ul_rate/1024);
        net_recv.append(new Date().getTime(), dataUnit.dl_rate/1024);
        $("#sent-total").text("Sent: "+dataUnit.bytes_sent/(1024*1024)+" MB");
        $("#recv-total").text("Received: "+dataUnit.bytes_recv/(1024*1024)+" MB");
        $("#packets-sent").text("Packets sent: "+dataUnit.packets_sent/(1024*1024)+" MB");
        $("#packets-recv").text("Packets received: "+dataUnit.packets_recv/(1024*1024)+" MB");
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