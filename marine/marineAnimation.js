 var map;
 require([
     "esri/map", "esri/layers/FeatureLayer", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleFillSymbol",
     "esri/symbols/SimpleLineSymbol",
     "esri/Color",
     "esri/renderers/UniqueValueRenderer",
     "esri/TimeExtent", "esri/dijit/TimeSlider", "esri/plugins/FeatureLayerStatistics", "esri/tasks/query", 
     "dojo/_base/array", "dojo/dom", "dojo/domReady!"
 ], function(
     Map, FeatureLayer, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Color, UniqueValueRenderer,
     TimeExtent, TimeSlider, FeatureLayerStatistics, Query, 
     arrayUtils, dom
 ) {
     map = new Map("mapDiv", {
         basemap: "satellite",
         center: [-80.5, 31.5],
         slider:false,
         zoom: 8,
         maxZoom: 10,
         minZoom:7
     });

     var speciesLayer = new FeatureLayer("http://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/marineSpecies/FeatureServer/0", {
         mode: FeatureLayer.MODE_SNAPSHOT,
         outFields: ["*"]
     });
     
     speciesLayer.setDefinitionExpression("Species = '" + speciesName + "'")
     
     var speciesLayerNo = new FeatureLayer("http://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/marineSpecies/FeatureServer/0", {
         mode: FeatureLayer.MODE_SNAPSHOT,
         outFields: ["*"]
     });
     speciesLayerNo.setDefinitionExpression("Species = '" + speciesName + "'")
     

     var arrayLayer = new FeatureLayer("http://services.arcgis.com/acgZYxoN5Oj8pDLa/arcgis/rest/services/arrayReceivers/FeatureServer/0");
     map.addLayer(arrayLayer);

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

         var timeExtent = new TimeExtent();
         timeExtent.startTime = new Date("12/01/2013 UTC");
         timeExtent.endTime = new Date("06/01/2016 UTC");
         timeSlider.setThumbCount(2);
         timeSlider.createTimeStopsByTimeInterval(timeExtent, 1, "esriTimeUnitsMonths");
         timeSlider.setThumbIndexes([0, 1]);
         timeSlider.setThumbMovingRate(1300);
         timeSlider.setLoop(true);
         timeSlider.startup();

         //add labels for every other time stop
         var labels = arrayUtils.map(timeSlider.timeStops, function(timeStop, i) {
             if (i > 0 && (i == 1 || i % 13 == 0)) {
                 return "Jan<br>" + timeStop.getUTCFullYear();
             } else {
                 return ""
             }
         });

         timeSlider.setLabels(labels);
         
//NEED A WAY TO GET AUTO DATE AND AUTO STATS FILTERED FOR FIRST TIME INTERVAL BEFORE ANYONE PRESSES PLAY. 
         dom.byId("date").innerHTML = "Dec<br>2013"
         
         var featureLayerStats = new FeatureLayerStatistics({ layer: speciesLayerNo });
         var featureLayerStatsParams = {field: "tag_days"};
         
         timeSlider.on("time-extent-change", function(evt) {
             var month = evt.endTime.toDateString().split(" ")[1]
             var year = evt.endTime.toDateString().split(" ")[3]

             dom.byId("date").innerHTML = month + "<br>" + year
             
             speciesLayerNo.setTimeDefinition(evt);
             
//GET THE FEATURE STATS EACH TIME THAT THE TIME EXTENT CHANGES              
             featureLayerStats.getFieldStatistics(featureLayerStatsParams).then(function(result){
                 function total (){
                     if (result.sum > 0){
                         return  result.sum
                     } else {
                         return "0"
                     }
                 };
                 
                 dom.byId("total").innerHTML = total();
                 dom.byId("stations").innerHTML = result.count;
             });
         });
     }

 });