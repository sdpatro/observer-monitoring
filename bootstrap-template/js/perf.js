
$(document).ready(function(){  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });
});

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
        'url':'http://localhost:9000/api'
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


