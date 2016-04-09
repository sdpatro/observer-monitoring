$(document).ready(pageInit);

_common = {"currentMachine":document.cookie};
_apiEndPoint = "http://"+window.location.hostname+":9000/api";

function pageInit(){
    $.ajax({
        "type":"POST",
        "data" : {action:"GET_REMOTE_MACHINES"},
        "dataType" : "json",
        "success" : function(response){ loadRemoteMachines((JSON.parse(response.remoteMachines))["machines"]);},
        "error" : function(response){ },
        "url" : _apiEndPoint
    });

    if(document.cookie == null){
        document.cookie = "remote-laptop";
        _common = {"currentMachine":document.cookie};
    }
    $("#currentMachineHeader").text(document.cookie);
}

function loadRemoteMachines(remoteMachines){
    for(var i=0 ; i<remoteMachines.length ; i++){
        console.log(remoteMachines[i]);
        var $item = $("<a class=\"list-group-item\" onclick='changeMachine(\""+remoteMachines[i].name+"\");'>"+remoteMachines[i].name+" "+remoteMachines[i].ip+"</a>");
        $("#machines-remote").append($item);
    }
}

function changeMachine(machineName){
    document.cookie = machineName;
    location.reload();
}
