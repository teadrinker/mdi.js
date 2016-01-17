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
			//	document.fullscreenEnabled  ||  
				document.mozFullScreenElement  || 
				document.webkitIsFullScreen || 
				document.msFullscreenElement ? true : false;
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

var appendChildFirst = function(parent, childNode){
    if(parent.firstChild)parent.insertBefore(childNode,parent.firstChild);
    else parent.appendChild(childNode);
};

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

		var bgColor      = config.bgColor || '#000'
		var adaptToPage  = config.adaptToPage
		var aspectRatio  = config.aspectRatio
		var widthOnPage  = config.widthOnPage
		var heightOnPage = config.heightOnPage
		var anyAspect    = config.anyAspect || !config.image && !( widthOnPage && heightOnPage || config.pixelW && config.pixelH || aspectRatio )
		var prevIW, prevIH, prevFs
		var fsroot, aspect, border, canvas, fshide, fsbutt
		var validContent
		var validCanvas
		var hasPixelCanvas
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
			var isImage = config.image ? true : false
			var embedtype = isImage ? 'img' : config.elementId ? 'div' : 'canvas'
			validContent = isImage ? false : true
			hasPixelCanvas = !isImage && ! config.elementId

			if(!allowFs) {
				if(canvas && border) { border.removeChild(canvas) }
				if(border && aspect) { aspect.removeChild(border) }
				if(fsroot && aspect) { fsroot.removeChild(aspect) }
				if(el     && fsroot) { el    .removeChild(fsroot) }

				fsroot = document.createElement('div')     ; fsroot.setAttribute('id', id+'_fsroot') ; fsroot.setAttribute('style', style)
				aspect = document.createElement('div')     ; aspect.setAttribute('id', id+'_aspect') ; aspect.setAttribute('style', styleRel)
				border = document.createElement('div')     ; border.setAttribute('id', id+'_border') ; border.setAttribute('style', style)
				canvas = document.createElement(embedtype) ; canvas.setAttribute('id', id+'_canvas') ; canvas.setAttribute('style', style)

				appendChildFirst(el,fsroot);
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

				var html = ('<div id="'+id+'_fsroot" '+style+'>\n'+
								'<div id="'+id+'_aspect" '+styleRel+'>\n'+
									'<div id="'+id+'_border" '+style+'> <'+embedtype+' id="'+id+'_canvas" '+style+'> </'+embedtype+'> </div>\n'+
	//								'<div id="'+id+'_border" '+style+'> <'+embedtype+' id="'+id+'_canvas"  moz-opaque '+style+'> </div>'+
									(allowFs ?
									'<div id="'+id+'_fshide" '+style+'>\n'+
										'<div '+style+'><button id="'+id+'_fsbutt" class="embedInteractive"	>FULLSCREEN</button></div>\n'+
										originalHTML+
									'</div>\n' : originalHTML)+
								'</div>\n'+
							'</div>\n')
				//alert(html)
				el.innerHTML = html

				fsroot = document.getElementById(id+'_fsroot')
				aspect = document.getElementById(id+'_aspect')
				border = document.getElementById(id+'_border')
				canvas = document.getElementById(id+'_canvas')
				fshide = allowFs ? document.getElementById(id+'_fshide') : undefined
				fsbutt = allowFs ? document.getElementById(id+'_fsbutt') : undefined

			}

			if(config.elementId && document.getElementById(config.elementId)) {
				canvas.appendChild(document.getElementById(config.elementId))
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

			var posMove  = config.onInputMove  || config.onInput
			var posStart = config.onInputStart || config.onInput
			var posEnd   = config.onInputEnd   || config.onInput

			if(posMove || posStart || posEnd) {

				posMove  = posMove  || function(){}
				posStart = posStart || function(){}
				posEnd   = posEnd   || function(){}			

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
					if(anyAspect) {
						frameW = Math.floor(size * w)
						frameH = Math.floor(size * h)
						if(config.border) borderSize = Math.floor((frameW + frameH)*config.border / 2)
					} else { 
						if(aspectRatio == undefined) { // this can be moved to precalc?
							if(widthOnPage && heightOnPage) {
								aspectRatio = widthOnPage / heightOnPage
							} else if(config.pixelW && config.pixelH) {
								aspectRatio = config.pixelW / config.pixelH
							} else {
							//  this no longer happens, anyAspect is turned on if the others are missing
							//	throw('embedInteractive.js error: You must specify one of the following: aspectRatio, anyAspect, pixelW/pixelH or widthOnPage/heightOnPage')
							}
						}
						var confBorder = config.border || 0
						var aspectRat = aspectRatio
						if(typeof aspectRat == 'object') {
							var requestAspectAngle = Math.atan(w/h)
							var angles = aspectRat.map(Math.atan);
							aspectRat = angles.reduce(function(p, cur) { return Math.abs(cur - requestAspectAngle) < Math.abs(p - requestAspectAngle) ? cur : p }) 
							aspectRat = Math.tan(aspectRat)
						}
						var aspectWithBorder = (aspectRat*(1+confBorder*2)) / (1*(1+confBorder*2))
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
				} else if(widthOnPage && heightOnPage) {
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
					border.style.setProperty('background-color', bgColor, null)
			
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
					if(hasPixelCanvas) {
						canvas.width = innerW
						canvas.height = innerH
					}
					if(config.onResize) { config.onResize(canvas, innerW, innerH, canvasW, canvasH) }
				}

				aspect.style.setProperty('width', frameW+'px', null)

				//var useCSSTransform = false
				//if(useCSSTransform) {
				//	canvas.style.setProperty('width', innerW+'px', null)
				//	canvas.style.setProperty('height', innerH+'px', null)				
				//	canvas.style.setProperty('transform-origin', 'top left', null)
				//	canvas.style.setProperty('transform', 'scale(' + (canvasW/innerW) +', ' + (canvasH/innerH) + ')', null)
				//} else {
					canvas.style.setProperty('width', canvasW+'px', null)
					canvas.style.setProperty('height', canvasH+'px', null)
				//}

				if(fs) {
					gFullScreenOffsetX = Math.floor((w-frameW)/2)
					gFullScreenOffsetY = Math.floor((h-frameH)/2)
					fsroot.style.setProperty('background-color', bgColor, null)
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


	// zooming a div correctly seems impossible in firefox unfortunately...

/*
				if(config.elementId && !config.noContentZoom) {
					var scalEl = document.getElementById(config.elementId)

				//	var scal = (((canvasW) + (canvasH)) / 2) / 800
					var scal = Math.sqrt(canvasW * canvasH) / 400
				//	scal *= (window.devicePixelRatio || 1)
					scal *= (config.zoom || 1)
					scalEl.style.setProperty('zoom', scal, null)
					scalEl.style.setProperty('-ms-zoom', scal, null)
					scalEl.style.setProperty('-webkit-zoom', scal, null)
				//	scalEl.style.setProperty('-moz-zoom', scal, null)
					scalEl.style.setProperty('-moz-transform', 'scale('+scal+','+scal+')', null)
					scalEl.style.setProperty('-moz-transform-origin', 'left top', null)

			//		var scal = Math.sqrt(canvasW * canvasH) / 400				
			//		scal *= (config.zoom || 1)
			//		scalEl.style.setProperty('transform', 'scale('+scal+','+scal+')', null)
			//		scalEl.style.setProperty('transform-origin', 'left top', null)
				}
*/			
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