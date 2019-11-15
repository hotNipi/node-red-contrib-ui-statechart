/*
MIT License

Copyright (c) 2019 hotNipi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

module.exports = function (RED) {
	function HTML(config) {
		var scopeconf = JSON.stringify(config.scope);	
		var styles = String.raw`
		<style>
			.sc_txt-{{unique}} {	
				font-size:`+config.fontoptions.normal+`em;			
				fill: ${config.fontoptions.color};											
			}
			.sc_txt-{{unique}}.val{
				font-size:`+config.fontoptions.val+`em;								
			}						
			.sc_txt-{{unique}}.small{
				font-size:`+config.fontoptions.ser+`em;
			}
			.scb-{{unique}}{
				fill: ${config.onColor};
				focusable="false";
				outline: none !important;
			}	
			.scb-{{unique}}.curr{
				filter: url(#brigth-{{unique}})
			}
			.scb-{{unique}}.off{
				fill: ${config.offColor};				
			}		
		</style>`
			
		var layout = String.raw`
					
			<svg preserveAspectRatio="xMidYMid meet" id="statechart_svg_{{unique}}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" ng-init='init(`+scopeconf+`)'>
				<defs>
				<filter id="brigth-{{unique}}">
					<feComponentTransfer>
					<feFuncR type="linear" slope="3"/>
					<feFuncG type="linear" slope="3"/>
					<feFuncB type="linear" slope="3"/>
					</feComponentTransfer>
					</filter>
				</defs>
				<text ng-if="${config.label != ''}" id=sc_label_{{unique}}>
					<tspan class="sc_txt-{{unique}}" text-anchor="middle" dominant-baseline="hanging" x=`+config.exactwidth/2+` y="0">
						`+config.label+`
					</tspan>
				</text>	
				<g id="sc_{{unique}}_{{$index}}" ng-repeat="n in [].constructor(`+config.count+`) track by $index">
					<rect class="scb-{{unique}}" id="scb_{{unique}}_{{$index}}" ng-attr-x="{{$index * `+config.scope.shape.step+`}}px" 
						y="0"
						width="`+config.scope.shape.width+`" 
						height="0"
						transform="scale(1,-1) translate(0,`+((config.scope.shape.height+config.scope.shape.top)*-1)+`)">
					</rect>
					<text class="sc_txt-{{unique}} small" id=ser_{{unique}}_{{$index}} text-anchor="middle" dominant-baseline="baseline" 
						ng-attr-x="{{$index * `+(config.scope.shape.step)+`}}px" dx="`+(config.scope.shape.width/2)+`" y=${config.exactheight}>
					</text>
					<text ng-if="${config.showvalues == true}" class="sc_txt-{{unique}} val" id=v_{{unique}}_{{$index}} text-anchor="middle" dominant-baseline="hanging"
					ng-attr-x="{{$index * `+(config.scope.shape.step)+`}}px" dx="`+(config.scope.shape.width/2)+`" y=${config.exactheight}> 
					</text>															
				</g>
				
				
			</svg>`			
		
		return String.raw`${styles}${layout}`;
	}

	function checkConfig(node, conf) {
		if (!conf || !conf.hasOwnProperty("group")) {
			node.error(RED._("ui_statechart.error.no-group"));
			return false;
		}
		return true;
	}

	var ui = undefined;

	function StateChartNode(config) {
		try {
			var node = this;			
			if (ui === undefined) {
				ui = RED.require("node-red-dashboard")(RED);
			}			
			RED.nodes.createNode(this, config);			
			var done = null;
			var range = null;
			var site = null;		
			var ensureNumber = null;
			var ensureBoolean = null;
			var getSiteProperties = null;
			var getCount = null;
			var calculateShape = null;
			var updateData = null;
			var calcualteValue = null;
			var formatSeries = null;
			
			
			if (checkConfig(node, config)) {				
				ensureNumber = function (input) {
					if (input === undefined) {
						return config.min;
					}
					if (typeof input !== "number") {
						var inputString = input.toString();
						input =  parseFloat(inputString)
						if(isNaN(input)){
							node.warn("value is not numeric")
							return config.min
						}						
					}
					if(isNaN(input)){
						node.warn("no numeric value")
						input = config.min;
					}					
					return input;
				}
				ensureBoolean = function (input) {
					if (input === undefined) {
						node.warn("state expected to be some boolean type value")
						return true;
					}
					if (typeof input == "boolean") {
						return input		
					}
					if (typeof input == "number") {
						return input == 0 ? false : true		
					}
					node.warn("state expected to be boolean")			
					return true;
				}
				getSiteProperties = function(){
					var opts = null;					
					if (typeof ui.getSizes === "function") {			
						opts = {};
						opts.sizes = ui.getSizes();
						opts.theme = ui.getTheme();
					}	
					if(opts === null){
						node.log("Couldn't reach to the site parameters. Using hardcoded default parameters!")
						opts = {}
						opts.sizes = { sx: 48, sy: 48, gx: 4, gy: 4, cx: 4, cy: 4, px: 4, py: 4 }
						opts.theme = {'widget-backgroundColor':{value:"#097479"}}						
					}									
					return opts
				}
				range = function (n,p,r){					
					var divisor = p.maxin - p.minin;							
					n = n > p.maxin ? p.maxin - 0.00001 : n;
					n = n < p.minin ? p.minin : n;
					n = ((n - p.minin) % divisor + divisor) % divisor + p.minin;
					n = ((n - p.minin) / (p.maxin - p.minin) * (p.maxout - p.minout)) + p.minout;										
					if(!r){
						return Math.round(n);
					}				
					return n					
				}

				getCount = function(){				
					return config.scope.series.length
				}
				
				calculateShape = function(){
					var ret = {}
					var gap = 2
					var reservedBottom = (config.fontoptions.ser*10) + 5 
					var reservedTop = config.label == '' ? 0 : (config.fontoptions.normal*10) + 16 
					var gaps = (config.count - 1) * gap
					var total = config.exactwidth - gaps;
					var one = total/config.count;
					ret.width = one;
					ret.step = one + gap;
					ret.height = config.exactheight - reservedBottom - reservedTop
					ret.top = reservedTop
					ret.bottom = reservedBottom
					return ret					
				}
				
				calcualteValue = function(val){
					var p =  {minin:config.min, maxin:config.max+0.00001, minout:3, maxout: config.scope.shape.height}
					return range(val,p,true)
				}
			
				updateData = function(values){
					var i
					var ob
					var prf = '_|'
					if(!values){												
						for (i = 0; i < config.count; i++) {
							ob = {}
							ob.value = 0													
							ob.height = calcualteValue(0)
							ob.state = true						
							config.data[prf+config.scope.series[i]] = ob
						}
					}
					else{											
						var len = values.length
						if(len > config.count){
							len = config.count
						}
						for (i = 0; i < len; i++) {
							if(config.scope.series.indexOf(values[i].series) == -1){
								node.warn('Series "'+values[i].series+'" does not exist. Check your input!')
								continue
							}														
							config.data[prf+values[i].series].state = ensureBoolean(values[i].state) 
							config.data[prf+values[i].series].value = ensureNumber(values[i].value)										
						}
						config.min = Number.MAX_VALUE
						config.max = Number.MIN_VALUE					
						for (i = 0; i < config.count; i++) {
							ob = config.data[prf+config.scope.series[i]].value							
							if(ob > config.max){
								config.max = ob
							}
							if(ob < config.min){
								config.min = ob
							}
						}
						var ret = []
						for (i = 0; i < config.count; i++) {
							ob = config.data[prf+config.scope.series[i]]
							ob.height = calcualteValue(ob.value)
							ret.push({value:ob.value,height:ob.height,state:ob.state})																							
						}		
					}
					return ret					
				}
				
				var formatSeries = function(ser){
					config.scope.timermode = false
					var sera = ser.split('|')
					if(sera[0] === '24H'){
						ser = '00,01,02,03,04,05,06,07,08,09,10,11,12,03,14,15,16,17,18,19,20,21,22,23'
					}
					else if(sera[0] === '24h'){
						ser = '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23'						
					}
					else{
						ser = sera[0]
					}
					if(sera.length > 1 && sera[1] === 'L'){
						config.scope.timermode = true
					}					
					return ser.split(',')
				}
				
				var group = RED.nodes.getNode(config.group);
				var site = getSiteProperties();				
				if(config.width == 0){ config.width = parseInt(group.config.width) || 6}
				if(config.height == 0) {config.height = parseInt(group.config.height) || 2}
				
				config.onColor = site.theme['widget-backgroundColor'].value	
				config.offColor = 'gray'			
				if(config.colorFromTheme == false){
					config.onColor = config.colorON
					config.offColor = config.colorOFF
				}
				config.fontoptions = {normal:1,ser:0.65,val:0.5,color:'currentColor'}
				if(config.textoptions !== 'default'){
					var opt = parseFloat(config.fontLabel);
					if(!isNaN(opt)){
						config.fontoptions.normal = opt;
					}
					opt = parseFloat(config.fontValue);
					if(!isNaN(opt)){
						config.fontoptions.val = opt;
					}
					opt = parseFloat(config.fontSeries);
					if(!isNaN(opt)){
						config.fontoptions.ser = opt;
					}
					if(config.fontColorFromTheme == false){
						opt = config.colorText;
						if(opt != ""){
							config.fontoptions.color = opt;
						}
					}					
				}
				
				config.scope = {}
				config.data = []
				config.width = parseInt(config.width)
				config.height = parseInt(config.height)
				config.exactwidth = parseInt(site.sizes.sx * config.width + site.sizes.cx * (config.width-1)) - 12;		
				config.exactheight = parseInt(site.sizes.sy * config.height + site.sizes.cy * (config.height-1)) - 12;				
				config.scope.series = formatSeries(config.series)
				config.count = getCount()				
				config.scope.shape = calculateShape()
				config.scope.showvalues = config.showvalues	
				config.scope.fontsize = config.fontoptions.val * 18	
					
				config.min = Number.MAX_VALUE
				config.max = Number.MIN_VALUE
				
				updateData()				
				
				var html = HTML(config);		
				
				done = ui.addWidget({
					node: node,
					order: config.order, 
					group: config.group,
					width: config.width,
					height: config.height,									
					format: html,					
					templateScope: "local",
					emitOnlyNewValues: false,
					forwardInputMessages: false,
					storeFrontEndInputAsState: false,					
					beforeEmit: function (msg) {
						if(msg === undefined){
							return 
						}						
						if(msg.payload && msg.payload.length > 0){
							msg.payload = updateData(msg.payload)						
						}						
						return { msg: msg };
					},										
					initController: function ($scope) {																		
						$scope.unique = $scope.$eval('$id')
						$scope.time = undefined
						$scope.timer = null
						$scope.data = undefined	
						$scope.series = undefined
						$scope.init = function(config){
							$scope.shape = config.shape
							$scope.series = config.series
							$scope.showvalues = config.showvalues	
							$scope.fontsize = config.fontsize
							$scope.timermode = config.timermode						
							pollInit()
						}
						var pollInit = function(){
							var stateCheck = setInterval(function() {
								if (updateSeries() == true) {
									clearInterval(stateCheck);
									clearValues()
									updateBars()
									if($scope.timermode === true){
										startTimer()
									}												
								}
							}, 40);
						}
						var startTimer = function(){
							$scope.timer = setInterval(function(){
								updateTime(new Date().getHours())
							},1000)
						}						
						var updateSeries = function (){							
							var target
							var found = false							
							for (let i = 0; i < $scope.series.length; i++) {
								target = document.getElementById("ser_"+$scope.unique+"_"+i);								
								if(target){
									$(target).text($scope.series[i])
									$scope.inited = true
									found = true
								}
							}
							return found
						}						
						var updateTime = function (t){
							if(t == $scope.time){
								return
							}
							var c
							var target = document.getElementById("scb_"+$scope.unique+"_"+$scope.time);							
							if(target){
								c = target.getAttribute('class').replace(' curr','')																																			
								target.setAttribute("class", c );								
							}	
							$scope.time = t							
							target = document.getElementById("scb_"+$scope.unique+"_"+$scope.time);														
							if(target){	
								c = target.getAttribute('class') + ' curr'												
								target.setAttribute("class",  c);
							}	
						}
						var updateBars = function (data){							
							if(data){
								$scope.data = data
							}
							if($scope.series == undefined){
								return
							}
							if($scope.data == undefined){
								return
							}																					
							var c
							var sci
							var len = $scope.series.length
							var target
							for (let i = 0; i < len; i++) {								
								target = document.getElementById("scb_"+$scope.unique+"_"+i);
								if(target){									
									sci = target.getAttribute('class').indexOf('off')
									if(sci == -1 && $scope.data[i].state == false){										
										c = target.getAttribute('class') + ' off'												
										target.setAttribute("class",  c);										
									}
									else if(sci != -1 && $scope.data[i].state == true){
										c = target.getAttribute('class').replace(' off','')																																			
										target.setAttribute("class", c );			
									}
									target.setAttribute('height',$scope.data[i].height)					
								}															
							}
							if($scope.showvalues == true){
								updateValues()
							}							
						}
						var clearValues = function (){
							var len = $scope.series.length
							var target
							for (let i = 0; i < len; i++) {	
								target = document.getElementById("v_"+$scope.unique+"_"+i);
								if(target){								
									$(target).text('')
								}
							}							
						}
						var updateValues = function (){							
							var len = $scope.series.length
							var target
							var yp
							var tl
							var d
							for (let i = 0; i < len; i++) {	
								target = document.getElementById("v_"+$scope.unique+"_"+i);
								if(target){																		
									yp = $scope.shape.height + $scope.shape.top - $scope.data[i].height - $scope.fontsize  

									if(yp < $scope.shape.top){
										yp += $scope.fontsize + 2
										
										
									}	 							
									d = $scope.data[i].value
									tl = Math.ceil(Math.log(d + 1) / Math.LN10);							
									if(tl > 3){
										d = parseFloat(d/1000).toFixed(1)+'k'
									}
									else{
										d = d.toFixed(3-tl)
									}													
									target.setAttributeNS(null,'y',yp)							
									$(target).text(d)
								}
							}							
						}						
						/* $scope.onClick = function(id){
							if($scope.data === undefined){
								return
							}							
						} */														
						$scope.$watch('msg', function (msg) {
							if (!msg) {								
								return;
							}
							if(msg.payload){								
								updateBars(msg.payload)
							}
							//updateTime(new Date().getHours())																											
						});
						$scope.$on('$destroy', function() {
							if($scope.timer != null) {
								clearInterval($scope.timer)
								$scope.timer = null															
							}
						}); 
					}
				});
			}
		}
		catch (e) {
			console.log(e);
		}
		node.on("close", function () {
			if (done) {
				done();
			}
		});
	}
	RED.nodes.registerType("ui_statechart", StateChartNode);
};