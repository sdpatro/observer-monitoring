
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
});

liveDataCache = [];

window.onload = function(){
    pollLiveData();
    runGraph_CPU();
    runGraph_RAM();
    runGraph_disk();
    runGraph_net();
}

function runGraph_CPU(){
    var smoothie = new SmoothieChart({maxValue:100,minValue:0});
    smoothie.streamTo(document.getElementById("graph-cpu"),1000);

    var cpu0 = new TimeSeries();
    var cpu1 = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        $("#cpu0-meter").text("CPU0: " + dataUnit.cpu[0]+"%");
        $("#cpu1-meter").text("CPU1: " + dataUnit.cpu[1]+"%");
        cpu0.append(new Date().getTime(), dataUnit.cpu[0]);
        cpu1.append(new Date().getTime(), dataUnit.cpu[1]);
      }
    }, 1000);

    smoothie.addTimeSeries(cpu0,{'strokeStyle':'#ee6146','fillStyle':'rgba(238,97,70,0.2)'});
    smoothie.addTimeSeries(cpu1,{'strokeStyle':'#ffd557','fillStyle':'rgba(255,213,87,0.2)'});
}

function runGraph_RAM(){
    var smoothie = new SmoothieChart({maxValue:100,minValue:0});
    smoothie.streamTo(document.getElementById("graph-ram"),1000);

    var ram = new TimeSeries();

    setInterval(function() {
      if(liveDataCache.length>0)
      {
        dataUnit = liveDataCache[(liveDataCache).length-1];
        $("#ram-meter").text("RAM: "+dataUnit.ram+" %");
        ram.append(new Date().getTime(), dataUnit.ram);
      }
    }, 1000);

    smoothie.addTimeSeries(ram,{'strokeStyle':'#99a367','fillStyle':'rgba(153,163,103,0.2)'});
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
    data = {'client-name':'remote-laptop','action':'GET_LIVE_DATA'};
    $.ajax({
        'data':data,
        'type' : 'post',
        'url' : 'http://localhost:9000/api',
        'success':function(response){
                    liveDataCache.push(response);
                    if(liveDataCache.length > 60){
                        liveDataCache = liveDataCache.splice(0,1);
                    }
                    setTimeout(pollLiveData(),1000);
                   },
        'error':function(response){
                    console.log(response);
                  },
        'data-type':'json'
    })
}
