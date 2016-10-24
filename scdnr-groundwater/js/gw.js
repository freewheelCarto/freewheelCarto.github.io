var map = L.map('map',{zoomControl:false}).setView([33.6, -81.4], 7);

L.tileLayer("https://api.mapbox.com/styles/v1/scearthsci/cimqk9frc00bnb8m7uvbwek58/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoic2NlYXJ0aHNjaSIsImEiOiI3NTg0NGM0ZTMzNjI5N2Q5ZDRmMWQ0YjI5MjczNTlhYSJ9.36fX8a8aHxH7ZouF3KqMqQ", {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 20
}).addTo(map);

L.control.zoom({position:'topright'}).addTo(map);

var data = "https://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/gwnetwork/FeatureServer/0"

var clusterPoly = L.geoJSON(clusters, {
    style: {
        fillColor:"orange",
        fillOpacity: 0.1,
        color:"#555",
        weight:1
    },
    onEachFeature: function(feature,layer){
        layer.bindTooltip("Cluster Site: " + feature.properties.Site_Name,{
            direction:'right',
            offset: [40,0]
        });
    }
}).addTo(map);

var wellID

function aqColor(a){
    return a == "Shallow Aquifer System" ? "#357f59":
           a == "Tertiary Sand" ? "#3e77ad":
           a == "Floridan" ? "#edc2eb":
           a == "Middendorf" ? "#f9d140":
           a == "Black Creek" ? "#ba0000":
           a == "Cape Fear" ? "#62ef93":
           a == "Crystalline Rock" ? "#62e1ef":
                                    "#ff7800";
}

function style(feature){
    return {
        color:aqColor(feature.properties.AQUIFER),
        radius:5,
        fillColor:aqColor(feature.properties.AQUIFER),
        fillOpacity:0.7,
        opacity:1
    }
}

//start the highlight marker at 0,0 so it's out of site. Then when a marker is clicked, all you have to do is setLatLng... def a workaround.
var highlight = L.circleMarker([0,0],{
            color:"#ff1d00",
            radius:9,
            fillOpacity:0,
            weight:5
        }).addTo(map);

//Custom radius and icon create function
function oef(feature,layer){
    layer.bindTooltip(feature.properties.COUNTYNUMB)
    
    layer.on('click',function(){
        $('#id').text(feature.properties.COUNTYNUMB);
        $('#aq').text(feature.properties.AQUIFER);
        $('#nm').text(feature.properties.Site_Name);
        $('#status').text(feature.properties.Status);
        $('#type').text(feature.properties.TYPE);
        ll = layer.getLatLng();
        highlight.setLatLng(ll);
        
        wellID = feature.properties.COUNTYNUMB
        $("#getdata").css("color","aqua");
        $("#getdata").css("border-color","aqua");
    });
};

var wellsC = L.esri.Cluster.featureLayer({
    url: data,
    where: "CLUSTER = 'YES'",
    pointToLayer:function(feature,latlng){
        return L.circleMarker(latlng, style(feature))
    },
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    maxClusterRadius: 5,
    iconCreateFunction:function () {
        return L.divIcon({html: "C",className: 'cluster', iconSize: L.point(18, 18)});
    },
    onEachFeature: oef
}).addTo(map);

var wellsInd = L.esri.featureLayer({
    url: data,
    where: "CLUSTER <> 'YES'",
    pointToLayer:function(feature,latlng){
        return L.circleMarker(latlng, style(feature))
    },
    onEachFeature: oef
}).addTo(map);

wellsC.on('clusterclick',function(a){
    a.layer.spiderfy();
});

//pass a date object
function formatDate(d){
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth()+1)).slice(-2);
    var dy = ('0' + d.getDate()).slice(-2);

    return [y,m,dy].join('-');
}

function getData(wellID){
    var url = "http://usgswells.dnr.sc.gov/api/WaterLevel/GetWaterLevel?WellId="+wellID
    $.ajax({
        type: "GET",
        url:url,
        dataType:"xml",
        success:wellParse
    });
}

var dataArray = []
var valmin = 1000
var valmax = -1000
//use the values to start min and max, when iterating will compare to these values and replace if higher or lower.

//create an empty dy graph that will be updated when data is fetched
hg = new Dygraph(document.getElementById("chart"),[[0]]);

    //when the get data button is clicked, get data from server by calling well ID... 

$("#getdata").click(function(){
    //clear data array
    dataArray = []
    valmin = 1000
    valmax = -1000
    $(this).css("color","#555");
    $(this).css("border-color","#555");
    $('#wellTitle').text(wellID);
    getData(wellID);                
});

function wellParse(xml){
    var data = $.parseXML(xml),
        $xml = $(xml),
        $record = $xml.find("WATER_LEVEL")
    $($record).each(function(){
        var level = $(this).find("WATER_DEPTH").text();
        var date = $(this).find("DATE_TIME").text();
        
    //you could pad the min and max with some percent of the range    
        if (parseFloat(level) < valmin){
            valmin = parseFloat(level)-(parseFloat(level)*0.1)
        }
        if (parseFloat(level) > valmax) {
            valmax = parseFloat(level)+(parseFloat(level)*0.1)
        }
        
        var insert = [new Date(date),level]
        dataArray.push(insert);
    });
    
    hg.updateOptions({
            file:dataArray,
            labels:["Date","Water Level"],
            rollPeriod:0,
        //Need to set this programatically so that it will always be reversed. This will be done as the data are pulled in and parsed before sending to this constructor. 
            valueRange:[valmax,valmin], 
            ylabel: "ft below land surface",
            zoomCallback:function(minDate,maxDate){
                var min = new Date(minDate);
                var max = new Date(maxDate);
                $("#startdate").val(formatDate(min));
                $("#enddate").val(formatDate(max));
            }
        });
    
    //sets the input date boxes to the dates at end of range
    var start = new Date(hg.xAxisRange()[0])
    $("#startdate").val(formatDate(start))
    var end = new Date(hg.xAxisRange()[1])
    $("#enddate").val(formatDate(end));
    
};

$("#filter").click(function(){
    var st = new Date($("#startdate").val()).getTime();
    var end = new Date($("#enddate").val()).getTime();
    hg.updateOptions({
        dateWindow:[st,end]
    });
});

$("#reset").click(function(){
    hg.resetZoom();
});

//TOGGLE DROPDOWN STUFF

$('.question').click(function() {
    $(this).next('.answer').slideToggle();
    $(this).toggleClass("closed open");
});
