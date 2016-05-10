
function submitPassword(){
    _password = $("#password-field").val();

    data = {'password':_password,'action':'LOGIN_ADMIN'};
    $.ajax({
        'data':data,
        'type' : 'post',
        'url' : _apiEndPoint,
        'success':function(response){
                    if(response.auth == "True"){
                        populateMachinesList();
                        return false;
                    }
                    else{
                        alert("Wrong password. Try again.");
                        return false;
                    }
                   },
        'error':function(response){
                    console.log(response);
                  },
        'data-type':'json'
    });

    return false;
}

function populateMachinesList(){
    $.ajax({
        "type":"POST",
        "data" : {action:"GET_REMOTE_MACHINES"},
        "dataType" : "json",
        "success" : function(response){
                        loadRemoteMachines_Admin((JSON.parse(response.remoteMachines))["machines"]);
                    },
        "error" : function(response){ },
        "url" : _apiEndPoint
    });
}

function loadRemoteMachines_Admin(machinesList){
    $("#machines-list").empty();
    for(var i=0 ; i<machinesList.length ; i++){
        $("#machines-list").append("<div id=\""+machinesList[i]['name']+"\" class=\"admin-machine-list-item\">"+machinesList[i]['name']+"<i onclick=\"deleteMachine(this)\" class=\"fa fa-trash machine-list-item-del-btn\" aria-hidden=\"true\"></div>")
    }
}

function deleteMachine(el){
    var listElement = $(el).parent();
    var machineName = $(listElement).attr("id");
    $.ajax({
        "type":"POST",
        "data" : {action:"DELETE_REMOTE_MACHINE",machine_id:machineName},
        "dataType" : "json",
        "success" : function(response){
                        if(response.status == "True"){
                            alert("Remote machine deleted successfully.");
                            listElement.remove();
                        }
                    },
        "error" : function(response){ },
        "url" : _apiEndPoint
    });
}

