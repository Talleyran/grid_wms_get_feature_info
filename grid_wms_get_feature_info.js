/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the BSD license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = GridWmsFeatureInfo
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: GridWmsFeatureInfo(config)
 *
 *    This plugins provides an action which, when active, will issue a
 *    GetFeatureInfo request to the WMS of all layers on the map. The output
 *    will be displayed in a popup.
 */   
gxp.plugins.GridWmsFeatureInfo = Ext.extend(gxp.plugins.WMSGetFeatureInfo, {
    
    /** api: ptype = gxp_gridwmsgetfeatureinfo */
    ptype: "gxp_gridwmsgetfeatureinfo",
    
    /** api: config[outputTarget]
     *  ``String`` Popups created by this tool are added to the map by default.
     */
    outputTarget: "map",

    /** private: property[popupCache]
     *  ``Object``
     */
    popupCache: null,

    /** api: config[infoActionTip]
     *  ``String``
     *  Text for feature info action tooltip (i18n).
     */
    infoActionTip: "Get Feature Info",

    /** api: config[popupTitle]
     *  ``String``
     *  Title for info popup (i18n).
     */
    popupTitle: "Feature Info",
    
    /** api: config[vendorParams]
     *  ``Object``
     *  Optional object with properties to be serialized as vendor specific
     *  parameters in the requests (e.g. {buffer: 10}).
     */
    
    /** api: config[paramsFromLayer]
     *  ``Array`` List of param names that should be taken from the layer and
     *  added to the GetFeatureInfo request (e.g. ["CQL_FILTER"]).
     */

    /** api: method[addActions]
     */
    addActions: function() {
					this.popupCache = {};
        
					var actions = gxp.plugins.Tool.prototype.addActions.call(this, [{
						tooltip: this.infoActionTip,
						iconCls: "gxp-icon-getfeatureinfo",
						toggleGroup: this.toggleGroup,
						enableToggle: true,
						allowDepress: true,
            scope:this,




						toggleHandler: function(button, pressed) {
              for (var i = 0, len = info.controls.length; i < len; i++){
                  if (pressed) {
                     info.controls[i].activate() 
                  } else {
                     info.controls[i].deactivate() 
                  }
              }
              if (pressed) { this.activate() } else { this.deactivate() }
						}




					}]);
					var infoButton = this.actions[0].items[0];

					var info = {controls: []};
					var updateInfo = function() {
						var queryableLayers = this.target.mapPanel.layers.queryBy(function(x){
							return x.get("queryable");
						});
			
						var map = this.target.mapPanel.map;
						var control;
						for (var i = 0, len = info.controls.length; i < len; i++){
							control = info.controls[i];
							control.deactivate();  // TODO: remove when http://trac.openlayers.org/ticket/2130 is closed
							control.destroy();
						}

						info.controls = [];
						queryableLayers.each(function(x){
							var layer = x.getLayer();
				

							var vendorParams = Ext.apply({}, this.vendorParams), param;
							if (this.layerParams) {
								for (var i=this.layerParams.length-1; i>=0; --i) {
									param = this.layerParams[i].toUpperCase();
									vendorParams[param] = layer.params[param];
								}
							}
							var control = new OpenLayers.Control.WMSGetFeatureInfo({
								url: layer.url,
								queryVisible: true,
								layers: [layer],
								infoFormat: "text/plain",
								vendorParams: vendorParams,
								eventListeners: {
									getfeatureinfo: function(evt) {
										var match = evt.text.match(/<body[^>]*>([\s\S]*)<\/body>/);
										if (match && !match[1].match(/^\s*$/)) {

											this.displayPopup(
												evt, (x.get("title") || x.get("name")), match[1], false
											);
										} else {
											if(evt.text.match(/no.*features.*found/)){
												return;
										}
                                
										var lines = evt.text.split("\n");
										var ret = "";
										var dataArray = [];
										var j = 0;
										var group = 0;
										var wasGroup = false;
										var superGroup = "";
										var needPlusick = false;
                                
										for(i=0;i<lines.length;i++){
											var keyVal = lines[i].match(/([^=]+)=(.*)/);
											if(keyVal){
												keyVal[1] = keyVal[1].replace(/^\s+/g, "").replace(/\s+$/g, "");
												keyVal[2] = keyVal[2].replace(/^\s+/g, "").replace(/\s+$/g, "");
												dataArray[j] = [keyVal[1], keyVal[2], superGroup, group];
												maxGroup = group;
												j++;
												ret = ret + "key: " + lines[i][0] + ", val: " + lines[i][1] + "\n";
												wasGroup = false;
												if(group>1){
													needPlusick = true;
												}
											} else {
												if(!wasGroup){
													wasGroup = true;
													group++;
												}
												var supGrTry = lines[i].match(/FeatureType\s+[\"\']?([^\"\']+)[\"\']?/);
												if(supGrTry){
													if(superGroup != supGrTry[1]){
														group=1;
														if(superGroup!="")
															needPlusick = true;
													}
													superGroup = supGrTry[1] ;
												}
											}
										}
                                
                                // translate data
                                var layerNames = [];
                                var fieldNames = [];
                                for(var i=0;i<dataArray.length;i++){
                                    dataArray[i][2] = dataArray[i][2].toUpperCase();
                                    dataArray[i][0] = dataArray[i][0].toUpperCase();
                                    layerNames[i] = dataArray[i][2];
                                    fieldNames[i] = dataArray[i][0];
                                }
                                var translatedLayerNames = Gispro.Utils.translateSymbols("layer", layerNames);
                                var metadataFieldNames = Gispro.Utils.getMetaData("field", fieldNames);
                                // transform two last columns to one for grouping
                                
                                for(i=0;i<dataArray.length;i++){
                                    dataArray[i] = [
                                        metadataFieldNames[dataArray[i][0]]["Заголовок элемента"]?
                                            metadataFieldNames[dataArray[i][0]]["Заголовок элемента"]:
                                            dataArray[i][0], 
                                        (dataArray[i][1]!="null"?dataArray[i][1]:""), 
                                        dataArray[i][0],
                                        translatedLayerNames[dataArray[i][2]],
                                        dataArray[i][3],
                                        translatedLayerNames[dataArray[i][2]] + " grouping " + dataArray[i][3],
                                        metadataFieldNames[dataArray[i][0]]
                                    ];
                                };
                                
                                // ext grid
                                var myReader = new Ext.data.ArrayReader({}, [
                                    {name: 'FieldTranslated'},
                                    {name: 'Value'},
                                    {name: 'Field'},
                                    {name: 'LayerTranslated'},
                                    {name: 'NumOfLayerEntry'},
                                    {name: 'GroupingField'},
                                    {name: 'MetaData'}
                                ]);       
                                
                                var metaDataTemplate = "";
                                if(dataArray[0] && (!(typeof metadataFieldNames[dataArray[0][2]] == "string"))){
                                    //alert(typeof metadataFieldNames[dataArray[0][2]]);
                                    for(var metaFlds in metadataFieldNames[dataArray[0][2]]){
                                        metaDataTemplate = metaDataTemplate +
                                            "<b>"+metaFlds+"</b>" + ": {[values.MetaData['"+metaFlds+"']]}<br/>";
                                    }
                                }
                                
                                var expander;
                                if(metaDataTemplate==""){
                                //if(false){
                                    expander = null;
                                }else{
                                    expander = new Ext.grid.RowExpander({
                                        //tpl: new Ext.XTemplate("Layer: {[values.MetaData['Дата создания']]}")
                                        tpl: new Ext.XTemplate(metaDataTemplate)
                                        //,disabled: (metaDataTemplate=="")
                                    });
                                }

                                var store = needPlusick?
                                    new Ext.data.GroupingStore({
                                        data: dataArray,
                                        reader: myReader,
                                        groupField: 'GroupingField'
                                    })
                                    :
                                    new Ext.data.GroupingStore({
                                        data: dataArray,
                                        reader: myReader
                                    });

                                store.filterBy(function(record){
                                  var includeInqueryableFields = x.get('queryableFields') ? x.get('queryableFields').indexOf(record.get("Field")) != -1 : true
                                  return record.get("Field")!="THE_GEOM" && includeInqueryableFields
                                });

                                var groupingView = new Ext.grid.GroupingView({
                                        forceFit:true,
                                        groupTextTpl: "{[values.rs[values.rs.length-1].data.LayerTranslated]}"+
                                            " {[values.rs[values.rs.length-1].data.NumOfLayerEntry]}"
                                    });

                                var columns = [
                                    {
                                        header: 'Поле', 
                                        sortable: true, 
                                        dataIndex: 'FieldTranslated',
                                        groupable: false
                                    },
                                    {
                                        header: 'Значение', 
                                        sortable: true,
                                        dataIndex: 'Value',
                                        groupable: false
                                    },
                                    {
                                        header: 'Код поля', 
                                        sortable: true, 
                                        dataIndex: 'Field',
                                        groupable: false,
                                        hidden: true
                                    },
                                    {
                                        header: 'Слой', 
                                        sortable: true,
                                        dataIndex: 'LayerTranslated',
                                        groupable: false,
                                        hidden: true,
                                        hideable: false
                                    },
                                    {
                                        header: 'Номер в слое', 
                                        sortable: true,
                                        dataIndex: 'NumOfLayerEntry',
                                        groupable: false,
                                        hidden: true,
                                        hideable: false
                                    },
                                    {
                                        header: 'Группа', 
                                        sortable: true,
                                        dataIndex: 'GroupingField',
                                        groupable: false,
                                        hidden: true,
                                        hideable: false
                                    },
                                    {
                                        header: 'Метаданные', 
                                        sortable: true,
                                        dataIndex: 'MetaData',
                                        groupable: false,
                                        hidden: true,
                                        hideable: false
                                    }
                                    ];

                                var plugins;

                                if(expander){
                                    columns.unshift(expander);
                                    plugins = [expander];
                                }else{
                                    plugins = [];
                                }

                                var grid = new Ext.grid.GridPanel({
                                    plugins: plugins,                                    
                                    store: store,
                                    view: groupingView,
                                    columns: columns
                                });           
                                
                                this.displayPopup(
                                    evt, x.get("title") || x.get("name"), grid, true
                                );
                            }
                        },
                        scope: this
                    }
                });

				if (control)
				{
					map.addControl(control);
					info.controls.push(control);
					if(infoButton.pressed) {
						control.activate();
					}
				}
            }, this);
        };
       
        this.target.mapPanel.layers.on("update", updateInfo, this);
        this.target.mapPanel.layers.on("add"   , updateInfo, this);
        this.target.mapPanel.layers.on("remove", updateInfo, this);
        
        return actions;
    },

    /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     * :arg title: a String to use for the title of the results section 
     *     reporting the info to the user
     * :arg text: ``String`` Body text.
     */
    displayPopup: function(evt, title, toShow, isGrid) {
        this.addMarker(evt.xy)
						var popup;
						var popupKey = evt.xy.x + "." + evt.xy.y;
						if (!(popupKey in this.popupCache)) {
							popup = this.addOutput({
								xtype: "gx_popup",
								title: this.popupTitle,
								layout: "accordion",
								location: evt.xy,
								map: this.target.mapPanel,
								width: 350,
								height: 300,
								listeners: {
									close: (function(key) {
										return function(panel){
											delete this.popupCache[key];
										};
									})(popupKey),
									scope: this
								}
							});
							this.popupCache[popupKey] = popup;
							
						} else {
							popup = this.popupCache[popupKey];
						}
						// extract just the body content
						if(isGrid){
							popup.add({
//								title: title + " (xy:" + evt.xy.x + "," + evt.xy.y + ")",
								title: title,
								layout: "fit",
								autoScroll: true,
								autoWidth: true,
								collapsible: true,
								items: [toShow]
							});
						} else {
							popup.add({
								title: title,
								layout: "fit",
								html: toShow,
								autoScroll: true,
								autoWidth: true,
								collapsible: true
							});
						}
						popup.doLayout();
    }


});

Ext.preg(gxp.plugins.GridWmsFeatureInfo.prototype.ptype, gxp.plugins.GridWmsFeatureInfo);
