
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
  fetchTests();
});

function fetchTests(){
    dataJson = {'action':'FETCH_TESTS','machine':document.cookie};
    $.ajax({
        'type' : 'POST',
        'url' : _apiEndPoint,
        'dataType' : 'json',
        'success' : function(response){
                        console.log(response);
                        loadTests((JSON.parse(response.response_data))["tests"]);
                    },
        'failure' : function(response){
                        console.log(response);
                    },
        'data' : dataJson
    });
}

function loadTests(tests){
    for(var i=0 ; i<tests.length ; i++){
        $("#tests-list-group").append("<li class=\"list-group-item\">"+tests[i]['name']+"</li>");
    }
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

function runTest(test_id,driver){
    data = {'action':'RUN_TEST','test-id':test_id, 'driver':driver};
    $.ajax({
        'type':'post',
        'data':data,
        'dataType':'json',
        'beforeSend':function(){
                        changeTestStatus(test_id,'RUNNING');
                    },
        'success':function(response){
                    console.log(response);
                    changeTestStatus(test_id,'DONE',response.test_output);
                },
        'error':function(){
                },
        'url':_apiEndPoint
    });

}

window.onload = function(){
    $("#test_status_1").css("display","none");
    $("#test_status_2").css("display","none");
    $("#test_progress_1").css("display","none");
    $("#test_progress_2").css("display","none");
    $("#test_output_1").css("display","none");
    $("#test_output_2").css("display","none");
}

function runCustomTest(){
    dataJson = {'action':'RUN_CUSTOM_TEST','testName':'customTest','testCode':$("#code_input").val(),'machine':document.cookie};
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
    })
}

function saveTest(){
    testName = $("#test-name-input").val();
    sourceCode = $("#code_input").val()
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


