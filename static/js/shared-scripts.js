$(document).ready(pageInit);

_common = {"currentMachine":document.cookie};
_apiEndPoint = "http://"+window.location.hostname+":9000/api";
_simEndPoint = "http://"+window.location.hostname+":9001/sim";
_liveEndPoint = "http://"+window.location.hostname+":9002/live";
_filesEndPoint = "http://"+window.location.hostname+":9000/files";
_computeEndPoint = "http://"+window.location.hostname+":9003/compute";

function pageInit(){
    remoteMachinesUpdater();
    if(document.cookie == null){
        document.cookie = "remote-laptop";
        _common = {"currentMachine":document.cookie};
    }
    $("#currentMachineHeader").text(document.cookie);
}

function remoteMachinesUpdater(){
    $.ajax({
        "type":"POST",
        "data" : {action:"GET_REMOTE_MACHINES"},
        "dataType" : "json",
        "success" : function(response){
                        loadRemoteMachines((JSON.parse(response.remoteMachines))["machines"]);
                        setTimeout(function(){
                            remoteMachinesUpdater();
                        },1000);
                    },
        "error" : function(response){ },
        "url" : _apiEndPoint
    });
}


function loadRemoteMachines(remoteMachines){
    $("#machines-remote").empty();
    for(var i=0 ; i<remoteMachines.length ; i++){
        lastOnlineStamp = new Date(remoteMachines[i]["last_online"])
        currentStamp = new Date();
        timeDiff = currentStamp-lastOnlineStamp;
        var status = "online";
        if(timeDiff/1000 > 10){
            status = "offline";
        }
        var $item = $("<a class=\"list-group-item\" onclick='changeMachine(\""+remoteMachines[i].name+"\",\""+remoteMachines[i].ip+"\");'>"+remoteMachines[i].name+" "+remoteMachines[i].ip+" "+status+"</a>");
        $("#machines-remote").append($item);
    }
}

function changeMachine(machineName,machineIP){
    document.cookie = machineName;
    location.reload();
}
