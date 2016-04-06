$(document).ready(pageInit);

function pageInit(){
    $.ajax({
        "type":"POST",
        "data" : {action:"GET_REMOTE_MACHINES"},
        "dataType" : "json",
        "success" : function(response){ loadRemoteMachines(response.remoteMachines) },
        "error" : function(response){ },
        "url" : "http://"+window.location.hostname+":9000/api"
    });
}

function loadRemoteMachines(var remoteMachines){
    for(var i=0 ; i<remoteMachines.count ; i++){
        console.log(remoteMachines[i]);
    }
}