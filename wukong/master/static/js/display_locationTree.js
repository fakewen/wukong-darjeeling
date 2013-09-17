var landmark={}
$(function () {
    $('#dispObj').hide();
});

function object_show() {
	$('#dispObj').show();
}

$('#dispObj .btn').click(function(e) {
	$('#dispObj').hide();
});

function common(_temp1, _temp2) {
	var temp1 = _temp1.split("/");
	var temp2 = _temp2.split("/");
	var common_loc = " ";
	for (var i=1; i<temp1.length; i++) {
		if(temp1[i]==temp2[i]) {
			common_loc += "/" + temp1[i];
		}else{
			break;
		}
	}
	return common_loc;
}

$("#addNode").click(function() {
	var add_node = $('#node_addDel').val();
	var add_loc = $('#locName').val();
	landmark[add_node] = add_loc;
	console.log(landmark);
	$.ajax('/loc_tree/land_mark', {
        type: 'PUT',
        dataType: 'json',
        data: {ope: 1, name: add_node, location: $('#locName').val(),size:$('#size').val(), direction:$('#direction').val()},
        success: function(data) {
            //data = JSON.parse(data);
            //display update
             $.post('/loc_tree', function(data) {
	    		display_tree(data);
	    		$('#content').append(data.node);
	    		load_landmark(data.xml);
			});
            if (data.status == 1) {
                alert(data.mesg);
            }
        }
    });
});

$("#delNode").click(function(){
	delNode = $('#node_addDel').val();
	$.ajax('/loc_tree/land_mark', {
        type: 'PUT',
        dataType: 'json',
        data: {ope: 0, name: delnode},
        success: function(data) {
            //data = JSON.parse(data);
            //display update
             $.post('/loc_tree', function(data) {
	    		display_tree(data);
	    		delete landmark[delNode];
            	$("li").remove("#"+delNode);
			});
            if (data.status == 1) {
                alert(data.mesg);
            }
        }
    });
});
/*
$("#delNode").click(function(){
	var del_node = $('#node_addDel').val();
	$.ajax('/loc_tree/land_mark', {
        type: 'PUT',
        dataType: 'json',
        data: {ope: 0, name: del_node, location: $('#locName').val()},
        success: function(data) {
             $.post('/loc_tree', function(data) {
	    		display_tree(data);
	    		$('#content').append(data.node);
//	    		load_landmark(data.xml);
			});
            if (data.status == 1) {
                alert(data.mesg);
            }
        }
    });
});
*/
$("#saveTree").click(function(){
	save_landmark();
});
$("#addModifier").click(function(){
    add_modifier();
});
$("#delModifier").click(function(){
    del_modifier();
});
$('.btn').click(function(){
    var nodeId = $(this).attr("id");
    var nodeName = $(this).text();
    var locTreeNodeId = $(this).parent().parent().children('.locTreeNode').attr("id");
	$('#node_addDel').val(nodeId);
	$.get('/loc_tree/nodes/'+locTreeNodeId+'/'+nodeId, function(data) {
        if (data.status == '1') {
            alert(data.message);
        }else if (data.status=='0'){
            $('#locName').val(data.location);
            $('#SensorId').val(nodeId);
            if (nodeId[0]=='l'){
                $('#size').val(data.size);
                $('#direction').val(data.direction);
                $('#nodeType').html("landmark");
            }else{
                $('#nodeType').html("sensor");
                $('#size').val("NA");
                $('#direction').val("NA");
            }
            $('#distmod_list').val("NA");
        }else{
            alert("received JASON format is wrong!!!");
        }
    });
});

$('.locTreeNode').dblclick(function(){
    var nodeId = $(this).attr("id");
    var nodeName = $(this).text();
    $.get('/loc_tree/nodes/'+nodeId, function(data) {
        if (data.status == '1') {
            alert(data.message);
        }else if (data.status=='0'){
            $('#locName').val(data.location);
            $('#SensorId').val(nodeId);
            $('#size').val(data.size);
            $('#direction').val('');
            $('#nodeType').html("location");
            $('#distmod_list').html(data.distanceModifier);
            $('#gloCoord').val(data.global_coord), 
            $('#localCoord').val(data.local_coord),
        }else{
            alert("received JASON format is wrong!!!");
        }
        
    });
});
$('.set_node').click(function() {
	var nodeId = $('#SensorId').val().substring(4);
	var tmp_type_str = $('#nodeType').val();
	var nodetype = -1;
	if (tmp_type_str == "location"){
	    nodetype =0;
    }
	else if (tmp_type_str == "sensor or landmark" || tmp_type_str == "sensor"){
	    nodetype =1;
	}else if (tmp_type_str == "landmark"){
	    nodetype =2;
	}else{
	    nodetype =-1;
	}
    console.log(nodeId);
    console.log($('#locName').val());
    $.ajax('/loc_tree/nodes/' + nodeId, {
        type: 'PUT',
        dataType: 'json',

        data: {type:nodetype, id:$('#SensorId').val(),location: $('#locName').val(),global_coord:$('#gloCoord').val(), 
                size: $('#size').val(), local_coord:$('#localCoord').val(), 
                direction: $('#direction').val(), modifiers:$('#distmod_list').val()},
            
        success: function(data) {
            //data = JSON.parse(data);
            //display update
             $.post('/loc_tree', function(data) {
	    		display_tree(data);
	    		$('#content').append(data.node);
	    		//load_landmark(data.xml);
			});
            if (data.status == 1) {
                alert(data.mesg);
            }
        }
    });
});
/*
{% for node_info in node_infos %}

	$('#node{{ node_info.nodeId }}').click(function(e) {
		e.preventDefault();
		console.log('click');	
		if(e.shiftKey){
			var nowVal = $('#locName').val();
			var clkVal = '{{ node_info.location }}';
			var comLoc = common(clkVal, nowVal);
			$('#locName').val(comLoc);
			$('#SensorId').val('');
			$('#nodeType').html("sensor or landmark")
		}else{
			nowSensorId = $(this).attr("id");
			$('#locName').val(' {{ node_info.location }} ');
			$('#SensorId').val(nowSensorId);	
			$('#nodeType').html("sensor");
		}
	});
	
	$('#node{{ node_info.nodeId }}').dblclick(function(e) {
		e.preventDefault();
		console.log('dblclick');
		$('#dispObj .modal-header').html('Node Info');
		$('#dispObj .modal-body').html("{% if node_info.isResponding() %}{% include "node-more.html" %}{% else %}<h4>Not responding</h4>{% end %}");
		object_show();
	})	

{% end %}
*/
function load_landmark(r)
{
	var xml = $.parseXML(r);
	console.log(xml);
	var funi = $(xml).find('landmark');
	for(var i=0; i<funi.length; i++){
		var f = $(funi[i]);
		landmark[f.attr("name")]=f.attr("location");
	};

	for(var l in landmark){
		$('#'+landmark[l]).children('ul',this).append('<li id="'+l+'" role=button class="btn">'+l+'</li>');
	}
}
function add_modifier(){
    var start_id = $('#distmod_start_id').val();
    var end_id = $('#distmod_end_id').val();
    var distance = $('#distmod_distance').val();
    $.ajax({
        url:'/loc_tree/modifier/0',
        data: {start:start_id, end:end_id, distance:distance},
        type:'PUT',
        success: function(data) {
            alert(data.message);
        }
    });
}
function del_modifier(){
    var start_id = $('#distmod_start_id').val();
    var end_id = $('#distmod_end_id').val();
    var distance = $('#distmod_distance').val();
    $.ajax({
        url:'/loc_tree/modifier/1',
        data: {start:start_id, end:end_id, distance:distance},
        type:'PUT',
        success: function(data) {
            alert(data.message);
        }
    });
}
function save_landmark()
{
	var landmark_xml = '<application name="test">\n';
	for(var l in landmark){
		landmark_xml += '	<landmark name="'+ l +'" location="'+landmark[l]+'" />\n';
	}
	landmark_xml += '</application>';	
	console.log(landmark_xml);
	
	$.ajax({
        url:'/loc_tree/save',
        data: {xml:landmark_xml},
        type:'POST',
        success: function(landmark_xml) {
        
        }
    });
}
