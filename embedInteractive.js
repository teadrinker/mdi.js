/*!
*
*  embedInteractive.js
*  (c) Martin Eklund 2015, MIT License
*
*/
(function () {
	'use strict';



	var isFillScreen = false;
	var isFullscreen = function() {
	/*
		'fullscreenEnabled',
		'msFullscreenEnabled',
		'webkitFullscreenEnabled',
		'mozFullScreenEnabled',

		msFullscreenElement

		'msFullscreenElement',
		'mozFullScreenElement',
		'webkitCurrentFullScreenElement',
		'webkitFullscreenElement',
		'fullscreenElement',
	*/
	//	return document.mozFullScreenEnabled ? true : false;

		return	isFillScreen ||
				document.fullscreenEnabled  ||  document.mozFullScreenElement  || 
				document.webkitIsFullScreen || (document.msFullscreenElement) ? true : false;
	}


var requestAnimFrame = (function() {
	//return function(callback, element) { window.setTimeout(callback, 1000/60); };
	return window.requestAnimationFrame ||
	         window.webkitRequestAnimationFrame ||
	         window.mozRequestAnimationFrame ||
	         window.oRequestAnimationFrame ||
	         window.msRequestAnimationFrame ||
	         function(callback, element) {
	           window.setTimeout(callback, 1000/60);
	         };
	})()	

var gCurrentFullScreenItem = undefined
var gFullScreenOffsetX = 0
var gFullScreenOffsetY = 0

var gIdCounter = 1

var embedInteractive = function(element_or_id, config_) {
	// copy
	var config = {} ; for(var k in config_) { config[k] = config_[k] }

	var el = typeof element_or_id == 'string' ? document.getElementById(element_or_id) : element_or_id
	if(el) {
		var id = typeof element_or_id == 'string' ? element_or_id : 'emb_'+(gIdCounter++)
		var item = { }

		var adaptToPage = config.adaptToPage
		var aspectRatio = config.aspectRatio
		var widthOnPage = config.widthOnPage
		var heightOnPage = config.heightOnPage
		var prevIW, prevIH, prevFs
		var fsroot, aspect, border, canvas, fshide, fsbutt
		var validContent
		var validCanvas
		var originalHTML 
		var allowFs = config.allowFullscreen
		var canvasQuality = config.quality
		var pageToCanvasX = 1
		var pageToCanvasY = 1

		var handleRescaleAndUpdate

		if(config.fillScreen) {
			gCurrentFullScreenItem = id
			isFillScreen = 1
		}

		var createOrUpdateContent = function() {
			var style    = 'margin:0; padding:0; -ms-touch-action: none;'
			var styleRel = 'margin:0; padding:0; position: relative;'
			var isImage = config.image ? true : false // || isPaused
			var embedtype = isImage ? 'img' : 'canvas'
			validContent = isImage ? false : true

			if(!allowFs) {
				if(canvas && border) { border.removeChild(canvas) }
				if(border && aspect) { aspect.removeChild(border) }
				if(fsroot && aspect) { fsroot.removeChild(aspect) }
				if(el     && fsroot) { el    .removeChild(fsroot) }

				fsroot = document.createElement('div')     ; fsroot.setAttribute('id', id+'_fsroot') ; fsroot.setAttribute('style', style)
				aspect = document.createElement('div')     ; aspect.setAttribute('id', id+'_aspect') ; aspect.setAttribute('style', styleRel)
				border = document.createElement('div')     ; border.setAttribute('id', id+'_border') ; border.setAttribute('style', style)
				canvas = document.createElement(embedtype) ; canvas.setAttribute('id', id+'_canvas') ; canvas.setAttribute('style', style)

				el.appendChild(fsroot);
				fsroot.appendChild(aspect);
				aspect.appendChild(border);
				border.appendChild(canvas);

			} else {
				var style    = 'style="' +style+ '"'
				var styleRel = 'style="' +styleRel+ '"'

				if(originalHTML == undefined) {
					originalHTML = el.innerHTML
				} 

				//alert('sill '+id)

				var html = ('<div id="'+id+'_fsroot" '+style+'>'+
								'<div id="'+id+'_aspect" '+styleRel+'>'+
									'<div id="'+id+'_border" '+style+'> <'+embedtype+' id="'+id+'_canvas" '+style+'> </div>'+
	//								'<div id="'+id+'_border" '+style+'> <'+embedtype+' id="'+id+'_canvas"  moz-opaque '+style+'> </div>'+
									(allowFs ?
									'<div id="'+id+'_fshide" '+style+'>'+
										'<div '+style+'><button id="'+id+'_fsbutt" class="embedInteractive"	>FULLSCREEN</button></div>'+
										originalHTML+
									'</div>' : originalHTML)+
								'</div>'+
							'</div>')

				el.innerHTML = html

				fsroot = document.getElementById(id+'_fsroot')
				aspect = document.getElementById(id+'_aspect')
				border = document.getElementById(id+'_border')
				canvas = document.getElementById(id+'_canvas')
				fshide = allowFs ? document.getElementById(id+'_fshide') : undefined
				fsbutt = allowFs ? document.getElementById(id+'_fsbutt') : undefined

			}

			if(allowFs && fsbutt) {
			    fsbutt.addEventListener("click", function () {
		        	gCurrentFullScreenItem = id;
			        if      (fsroot.requestFullscreen)       { fsroot.requestFullscreen(); }
			        else if (fsroot.msRequestFullscreen)     { fsroot.msRequestFullscreen(); }
			        else if (fsroot.mozRequestFullScreen)    { fsroot.mozRequestFullScreen();  }
			        else if (fsroot.webkitRequestFullScreen) { fsroot.webkitRequestFullScreen(); }
			        else {
			        	isFillScreen = true
			        	handleRescaleAndUpdate()
			        }
			    }, true)			
			}		

			var posMove = config.onInputMove || config.onInput || function(){}
			var posStart = config.onInputStart || config.onInput || function(){}
			var posEnd = config.onInputEnd || config.onInput || function(){}	
			if(posMove || posStart || posEnd) {
				var inputHandler = function(id, pos, a3) {
					var baseSize = typeof id == 'number' ? 30 : 5
					pos = {
						x: (pos.x - gFullScreenOffsetX) * pageToCanvasX,
						y: (pos.y - gFullScreenOffsetY) * pageToCanvasY,
						radiusX: pageToCanvasX * baseSize,
						radiusY: pageToCanvasY * baseSize
					}
					if(a3 == 'start') {
						posStart(id, pos, a3)						
					} else if(a3 == 'end') {
						posEnd(id, pos, a3)						
					} else {
//						var delta = {
//							x:(a3.x - gFullScreenOffsetX) * pageToCanvasX,
//							y:(a3.y - gFullScreenOffsetY) * pageToCanvasY 
//						}
						posMove(id, pos, undefined)	// delta)					
					}
				}				
				mdiBindInput(canvas, {onInput: inputHandler, wantMouseHover: !config.excludeMouseHover, isFullscreen: isFullscreen})
			}	
		}

		createOrUpdateContent()



		handleRescaleAndUpdate = function() {
			var fs = isFullscreen();
			if(fs && gCurrentFullScreenItem != id) {
				return
			}
			if(!validContent || (prevFs != fs && config.imageFullscreen)) {
				var newSrc = fs && config.imageFullscreen ? config.imageFullscreen : config.image
				if(newSrc != canvas.src) {
					var tmp = new Image();
					tmp.onload = function() {
						aspectRatio = tmp.width / tmp.height;
						canvas.src = newSrc
						canvas.style.setProperty('display', 'block', null)
						handleRescaleAndUpdate()
					}
					tmp.src = newSrc
					if(aspectRatio == undefined) {
						if(allowFs)  { fshide.style.setProperty('display', 'none', null) }
						canvas.style.setProperty('display', 'none', null)
						return // delay until we have loaded the image and know the dimensions
					}
				}
			}
			var w = Math.floor(window.innerWidth)
			var h = Math.floor(window.innerHeight)
			if( ! (prevIW == w && prevIH == h && prevFs == fs) ) {
				prevIW = w
				prevIH = h
				var canvasW, canvasH, frameW, frameH;
				var borderSize = 0
				if(fs || adaptToPage) {
					var size = fs ? 1 : adaptToPage
					if(config.anyAspect) {
						frameW = Math.floor(size * w)
						frameH = Math.floor(size * h)
					} else { 
						if(aspectRatio == undefined) {
							aspectRatio = widthOnPage && heightOnPage ? widthOnPage / heightOnPage : 1
						}
						var confBorder = config.border || 0
						var aspectWithBorder = (aspectRatio*(1+confBorder*2)) / (1*(1+confBorder*2))
		 				if(w/h > aspectWithBorder) {
							frameW = Math.floor(size * h * aspectWithBorder)
							frameH = Math.floor(size * h)
							borderSize = Math.floor((h - h/(1+confBorder*2)) / 2)
						} else {
							frameW = Math.floor(size * w              )
							frameH = Math.floor(size * w / aspectWithBorder)
							borderSize = Math.floor((w - w/(1+confBorder*2)) / 2)
						}					
					}
				} else if(config.anyAspect) {
					frameW = widthOnPage
					frameH = heightOnPage
				} else {
					frameW = w //??
					frameH = h
				}

				if(borderSize != 0) {
					canvasW = frameW - borderSize*2
					canvasH = frameH - borderSize*2
					border.style.setProperty('width', frameW+'px', null)
					border.style.setProperty('height', frameH+'px', null)
					border.style.setProperty('background-color', '#000', null)
			
					canvas.style.setProperty('position', 'relative', null)
					canvas.style.setProperty('left', borderSize+'px', null)
					canvas.style.setProperty('top', borderSize+'px', null)
				} else {
					canvasW = frameW
					canvasH = frameH					
				}

				var innerW, innerH, updateCanv = false, fixedPixels = config.pixelW && config.pixelH
				if(fixedPixels) {
					if(!validCanvas) {
						validCanvas = true;
						updateCanv = true
					}
					innerW = config.pixelW
					innerH = config.pixelH
				} else {
					updateCanv = true
					var quality = canvasQuality ? (canvasQuality || 1) * (window.devicePixelRatio || 1) : 1
					innerW = Math.floor(canvasW * quality)
					innerH = Math.floor(canvasH * quality)
				}
				if((!fixedPixels && !config.disableRetina) || (fixedPixels && config.enableRetina)) {
					var retina = window.devicePixelRatio // not proper detection...
					retina = retina < 1 ? 1 : (retina > 2 ? 2 : retina)
					innerW = Math.floor(innerW * retina)
					innerH = Math.floor(innerH * retina)
				}				
				pageToCanvasX = innerW / canvasW
				pageToCanvasY = innerH / canvasH		
				if(updateCanv) {
					canvas.width = innerW
					canvas.height = innerH
					if(config.onResize) { config.onResize(canvas, innerW, innerH) }
				}

				aspect.style.setProperty('width', frameW+'px', null)

				var useCSSTransform = false
				if(useCSSTransform) {
					canvas.style.setProperty('width', innerW+'px', null)
					canvas.style.setProperty('height', innerH+'px', null)				
					canvas.style.setProperty('transform-origin', 'top left', null)
					canvas.style.setProperty('transform', 'scale(' + (canvasW/innerW) +', ' + (canvasH/innerH) + ')', null)
				} else {
					canvas.style.setProperty('width', canvasW+'px', null)
					canvas.style.setProperty('height', canvasH+'px', null)
				}

				if(fs) {
					gFullScreenOffsetX = Math.floor((w-frameW)/2)
					gFullScreenOffsetY = Math.floor((h-frameH)/2)
					fsroot.style.setProperty('background-color', '#000', null)
					fsroot.style.setProperty('width', w+'px',  null)
					fsroot.style.setProperty('height', h+'px',  null)
					aspect.style.setProperty('height', canvasH+'px', null)
					aspect.style.setProperty('left', gFullScreenOffsetX+'px', null)
					aspect.style.setProperty('top',  gFullScreenOffsetY+'px', null)
					if(allowFs) { fshide.style.setProperty('display', 'none', null) }
					gFullScreenOffsetX += borderSize
					gFullScreenOffsetY += borderSize
				} else {
					gFullScreenOffsetX = 0
					gFullScreenOffsetY = 0
					fsroot.style.setProperty('background-color', null, null)
					fsroot.style.setProperty('width', null, null)
					fsroot.style.setProperty('height', null, null)					
					aspect.style.setProperty('height', null, null)
					aspect.style.setProperty('left', null, null)
					aspect.style.setProperty('top', null, null)
					if(allowFs) { fshide.style.setProperty('display', 'block', null) }
				}
			}
		}

		var animUpdate = function() {
			handleRescaleAndUpdate()
			if(config.onAnimFrame) { config.onAnimFrame(canvas) }
			requestAnimFrame(animUpdate)
		}		
		requestAnimFrame(animUpdate)
		return item
	}
}



window.embedInteractive = embedInteractive



})();	