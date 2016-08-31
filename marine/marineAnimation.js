/*
Developed for SCDNR Marine Resources Division by SCDNR GIS staff. 
Date: 6/29/2016
Developer: Tanner Arrington

lower case comments are remarks about finished funcionality

UPPER CASE COMMENTS INDICATE IMPROVEMENTS OR CHANGES THAT NEED TO MADE
*/

var map;
require([
    "esri/map", "esri/layers/FeatureLayer", "dojo/dom", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/renderers/UniqueValueRenderer",
    "esri/TimeExtent", "esri/dijit/TimeSlider", "esri/tasks/query",
    "dojo/_base/array", "dojo/on", "dojo/domReady!"
], function(
    Map, FeatureLayer, dom, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Color, UniqueValueRenderer,
    TimeExtent, TimeSlider, FeatureLayerStatistics, Query,
    arrayUtils, on
) {
    map = new Map("mapDiv", {
        basemap: "hybrid",
        center: [-80.5, 32.5],
        slider: true,
        zoom: 8,
        maxZoom: 10,
        minZoom: 7
    });

    var speciesLayer = new FeatureLayer("http://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/marineSpecies/FeatureServer/0", {
        mode: FeatureLayer.MODE_SNAPSHOT,
        outFields: ["*"]
    });
    
    var sturgeon = [
        {display: "Atlantic sturgeon", value: "Atlantic sturgeon" }];

    var sharks = [
        {display: "Tiger shark", value: "Tiger shark" },
        {display: "Finetooth shark", value: "Finetooth shark" },
        {display: "White shark", value: "White shark" },
        {display: "Blacknose shark", value: "Blacknose shark" },
        {display: "Lemon shark", value: "Lemon shark" },
        {display: "Sand tiger shark", value: "Sand tiger shark" },
        {display: "Blacktip shark", value: "Blacktip shark" },
        {display: "Great hammerhead shark", value: "Great hammerhead shark" },
        {display: "Bonnethead shark", value: "Bonnethead shark" },
        {display: "Cownose shark", value: "Cownose shark" }
        ];
    var turtles = [
        {display: "Loggerhead sea turtle", value: "Loggerhead sea turtle" }];
    
    var other = [
        {display: "Red drum", value: "Red drum" }];

    //layer of just the array locations. only used for display
    var arrayLayer = new FeatureLayer("http://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/arrayReceivers/FeatureServer/0");
    map.addLayer(arrayLayer);

    //~~~~~~Styling options~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    var defaultSym = new SimpleMarkerSymbol().setOutline(new SimpleLineSymbol().setWidth(0.3).setColor(new Color([20, 20, 20, 0.7])));

    renderer = new UniqueValueRenderer(defaultSym, "tag_days");

    var colorViz = {
        "type": "colorInfo",
        "field": "Mo",
        "stops": [{
            "value": 1,
            "color": new Color([0, 102, 255, 0.8]),
        }, {
            "value": 2,
            "color": new Color([51, 153, 255, 0.8]),
        }, {
            "value": 3,
            "color": new Color([102, 204, 255, 0.8]),
        }, {
            "value": 4,
            "color": new Color([51, 153, 51, 0.8]),
        }, {
            "value": 5,
            "color": new Color([0, 204, 102, 0.8]),
        }, {
            "value": 6,
            "color": new Color([0, 255, 153, 0.8]),
        }, {
            "value": 7,
            "color": new Color([255, 51, 0, 0.8]),
        }, {
            "value": 8,
            "color": new Color([255, 102, 0, 0.8]),
        }, {
            "value": 9,
            "color": new Color([255, 153, 51, 0.8]),
        }, {
            "value": 10,
            "color": new Color([255, 255, 0, 0.8]),
        }, {
            "value": 11,
            "color": new Color([255, 255, 102, 0.8]),
        }, {
            "value": 12,
            "color": new Color([255, 255, 153, 0.8]),
        }, ]
    }

    var sizeViz = {
        "type": "sizeInfo",
        "field": "tag_days",
        "minDataValue": 1,
        "maxDataValue": 60,
        "valueUnit": "unknown",

        "minSize": {
            "type": "sizeInfo",
            "expression": "view.scale",
            "stops": [{
                "value": 1000,
                "size": 12
            }, {
                "value": 500000,
                "size": 10
            }, {
                "value": 2000000,
                "size": 8
            }]
        },

        "maxSize": {
            "type": "sizeInfo",
            "expression": "view.scale",
            "stops": [{
                "value": 1000,
                "size": 80
            }, {
                "value": 500000,
                "size": 70
            }, {
                "value": 2000000,
                "size": 60
            }]
        }
    }

    renderer.setVisualVariables([sizeViz, colorViz]);

    speciesLayer.setRenderer(renderer);

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     

    map.addLayer(speciesLayer);

    map.on("layer-add-result", initSlider);

    function initSlider() {
        var timeSlider = new TimeSlider({
            style: "width: 100%;",
            options: {
                excludeDataAtLeadingThumb: true
            }
        }, dom.byId("timeSliderDiv"));

        map.setTimeSlider(timeSlider);

        //GET DATE FROM FEATURE CLASS ATTRIBUTE TABLE... THAT WAY IT DOESN'T NEED TO BE MANUALLY UPDATED         
        var timeExtent = new TimeExtent();
        timeExtent.startTime = new Date("12/01/2013");
        timeExtent.endTime = new Date("06/01/2016");
        timeSlider.setThumbCount(2);
        timeSlider.createTimeStopsByTimeInterval(timeExtent, 1, "esriTimeUnitsMonths");
        timeSlider.setThumbIndexes([0, 1]);
        timeSlider.setThumbMovingRate(1300);
        timeSlider.setLoop(true);
        timeSlider.startup();

        var labels = dojo.map(timeSlider.timeStops, function(timeStop, i) {
            if (timeStop.getUTCMonth() == 0) {
                return "Jan<br>" + timeStop.getUTCFullYear();
            } else {
                return "";
            }
        });

        timeSlider.setLabels(labels);


        timeSlider.on("time-extent-change", function(evt) {
            
            var smonth = evt.startTime.toDateString().split(" ")[1]
            var sday = evt.startTime.toDateString().split(" ")[2]
            var syear = evt.startTime.toDateString().split(" ")[3]

            dom.byId("startdate").innerHTML = smonth + " " + sday + "<br>" + syear
            
            var emonth = evt.endTime.toDateString().split(" ")[1]
            var eday = evt.endTime.toDateString().split(" ")[2]
            var eyear = evt.endTime.toDateString().split(" ")[3]
            
            dom.byId("enddate").innerHTML = emonth + " " + eday + "<br>" + eyear

        });

        //SEE HOW THIS PERFORMS... MOVE THE TIME FORWARD THEN BACK SO THAT IT POPULATES THE STATS BOXES FOR THE FIRST TIME STOP        
        timeSlider.next();
        timeSlider.previous();

    }
    
//This stuff is used to populate the dropdowns and filter out the species.        
    $("#species").change(function(){
        speciesLayer.setDefinitionExpression("Species = '" + this.value + "'")    
    });
    
    function list(array){
        $("#species").html("");
        $(array).each(function(i){
            $("#species").append('<option value="'+array[i].value+'">'+array[i].display+'</option>');
        });
        $("#species").trigger("change");
    }
    
    list(sturgeon);
    
    $("#taxa").change(function(){
        var taxa = this.value;
        switch(taxa){
            case 'sturgeon':
                list(sturgeon);
                break;
            case 'sharks':
                list(sharks);
                break;
            case 'turtles':
                list(turtles);
                break;
            case 'other':
                list(other);
        }
    });
    
});