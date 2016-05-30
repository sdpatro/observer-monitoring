$(document).ready(pageInit);

_common = {"currentMachine":document.cookie};
_apiEndPoint = "http://"+window.location.hostname+":9000/api";
_simEndPoint = "http://"+window.location.hostname+":9001/sim";
_liveEndPoint = "http://"+window.location.hostname+":9002/live";
_filesEndPoint = "http://"+window.location.hostname+":9000/files";
_computeEndPoint = "http://"+window.location.hostname+":9003/compute";
loc = window.location.pathname;
_currentPage= loc.substring(loc.lastIndexOf('/')+1,loc.length);


function pageInit(){
    remoteMachinesUpdater();
    if(document.cookie == null){
        document.cookie = "machine-name=remote-laptop";
        _common = {"currentMachine":getCookie("machine-name")};
    }
    var headerMachineName = getCookie("machine-name");
    if(headerMachineName == null)
        headerMachineName = "";
    $("#currentMachineHeader").html("<i style=\"margin-right:5px\" class=\"fa fa-server\" aria-hidden=\"true\"></i> "+headerMachineName);
    setPageActive();
}

function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

function setPageActive(){
    if(_currentPage!=null && _currentPage!=""){
        var navList = $("#sidebar-nav").children();
        for(var i=0 ; i<navList.length ; i++){
            if($(navList[i]).attr("id")==_currentPage+"-nav"){
                $(navList[i]).addClass("active");
                break;
            }
        }
    }
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
    var currentSelected = -1;
    for(var i=0 ; i<remoteMachines.length ; i++){
        lastOnlineStamp = new Date(remoteMachines[i]["last_online"]*1000)
        currentStamp = new Date();
        timeDiff = currentStamp-lastOnlineStamp;
        var status = "online";

        if(timeDiff/1000 > 10){
            status = "offline";
        }

        if(remoteMachines[i].name == getCookie("machine-name")){
            currentSelected = i;
        }

        var $item = getListItem(remoteMachines[i].name,remoteMachines[i].ip,status);
        $("#machines-remote").append($item);
    }

    if(currentSelected!=-1){
        lastOnlineStamp = new Date(remoteMachines[currentSelected]["last_online"]*1000)
        currentStamp = new Date();
        timeDiff = currentStamp-lastOnlineStamp;
        if(timeDiff/1000 > 10){
            if($("#sys-offline-msg")!=null && remoteMachines[i].name==getCookie("machine-name")){
                $("#sys-offline-msg").css("display","");
            }
        }
        else{
            $("#sys-offline-msg").css("display","none");
        }
    }

}

function getListItem(name,ip,status){
    var listItemElementString = "<a class=\"list-group-item\" onclick='changeMachine(\""+name+"\",\""+ip+"\");'><b style=\"padding-right:10px\">"+name+"</b></a>";
    var $listItemElement = $(listItemElementString);

    if(status=="online")
        $listItemElement.append($("<i style=\"float:right\" class=\"fa fa-exchange\" aria-hidden=\"true\"></span>"));
    else
        $listItemElement.append($("<i style=\"float:right; visibility:hidden;\" class=\"fa fa-exchange\" aria-hidden=\"true\"></span>"));
    if(getCookie("machine-name")==name)
        $listItemElement.addClass("active");

    $listItemElement.append($("<div style=\"padding-right:10px;\">"+ip+"</div>"));
    return $listItemElement;
}

function changeMachine(machineName,machineIP){
    document.cookie = "machine-name="+machineName;
    location.reload();
}

function showIdle(status){
    if(status == true) // Show idle
    {
        $("#main-area").css('display','none');
        $("#idle-area").show();
    }
    else{   // Remove idle
        $("#idle-area").css('display','none');
        $("#main-area").show();
    }
}

function roundOff(num){
    return (Math.round(num*100))/100;
}
