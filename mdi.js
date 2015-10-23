
/*         
 *  mdi / Minimalistic Drag Input (touch / mouse polyfill)
 *    
 *  use mdiBindInput(element, config) to initiate drag input on a DOM element
 *    
 *      config argument callbacks and options:
 *    
 *    	onMove			// function(id, data)     
 *    					//	 * id for inputtype, numbers for touch fingers, "mouse0", "mouse1" etc for mousebuttons
 *    					//	 * data currently only holds position data (x and y), but can be expanded
 *    						
 *    	onStart			// function(id, data, info)
 *    					//	 * id   (see above)
 *    					//	 * data (see above)
 *    					//   * info is always 'start'
 *    
 *    	onEnd			// function(id, data, info)
 *    					//	 * id   (see above)
 *    					//	 * data (see above)
 *    					//   * info is always 'end'
 *    
 *    	onInput 		// function(id, data, diff_or_info)  
 *    					//   if this is defined it will be used as a fallback for the above functions 
 *    					
 *    	getPageOffset	// function(element) { ... return {x: ... , y: ... } }
 *    					//   if you need more precise positioning 
 *    					
 *    	wantMouseHover	//  true or false (default is false)
 *    					
 *    	wantMouseWheel	//  true or false (default is false)
 *
 *    	wantBrowserContextMenu	//  true or false (default is false)
 *                              //  note that this is globally, not just for the element
 */
 (function() {
 	'use strict';

	var mdiMouseButtons = {}
	var mdiMouseMove = false

	self.mdiBindInput = function(element, config) {	

		var posMove  = config.onMove  || config.onInput || function() { }
		var posStart = config.onStart || config.onInput || function() { }
		var posEnd   = config.onEnd   || config.onInput || function() { }
		var wantMouseHover = config.wantMouseHover
		var wantMouseWheel = config.wantMouseWheel
		var wantBrowserContextMenu = config.wantBrowserContextMenu
		var isFullscreen = config.isFullscreen
		var getPageOffset = getPageOffset || function(obj) {
			if(isFullscreen && isFullscreen()) { 
				return {x:0, y:0}
			}
			var xpos = 0, ypos = 0
			if (obj.nodeName == "TR") { // TR is not reliable. Need to get TD.
				obj = obj.getElementsByTagName("td")[0]
			}
			while (obj) {
				xpos += obj.offsetLeft
				ypos += obj.offsetTop
				obj = obj.offsetParent
			}
			return {x:xpos, y:ypos}
		}

		
//		var prevMPos = [0,0]
		var preventDefault = function(e) {
			if(e.preventDefault) e.preventDefault(); else e.returnValue = false
		}
		var getMousePos = function(e) { return {x:e.clientX + (window.pageXOffset || window.scrollX || window.document.body.scrollLeft),  
												y:e.clientY + (window.pageYOffset || window.scrollY || window.document.body.scrollTop) } }

		var getScroll   = function()  { return {x:window.pageXOffset || window.scrollX || window.document.body.scrollLeft,  
												y:window.pageYOffset || window.scrollY || window.document.body.scrollTop } }
//		var offset = function(pos,useScroll) { var o = getPageOffset(element); if(useScroll) { var s = getScroll(); o.x+=s.x; o.y+=s.y } return {x:pos.x - o.x, y:pos.y - o.y} }
		var offset = function(pos) { var o = getPageOffset(element); pos.x -= o.x; pos.y -= o.y; return pos }
	
		if(wantMouseWheel) {
			var wheelCallback = function(e){
			  	var delta = 0;
			  	if (e.wheelDelta) {
			  		delta = e.wheelDelta/120;
			  	} else if (e.detail) {
			  		delta = -e.detail/3;
			  	}
				var mp = getMousePos(e)
			  	if(delta != 0) {
			    	posMove('mouseWheel', offset({x:mp.x, y:mp.y, mouseWheelY:delta}) )
			  	}
			    if(e.preventDefault) {
			    	e.preventDefault();
			    }
			    return false;
			}
			element.addEventListener('mousewheel',wheelCallback, false);			
			element.addEventListener('DOMMouseScroll',wheelCallback, false);			
			//if(window.addEventListener) {
			//	window.addEventListener('DOMMouseScroll', wheelCallback, false);
			//}
			//window.onmousewheel = document.onmousewheel = wheelCallback;
		}

		if(!wantBrowserContextMenu) {
			window.oncontextmenu = function () { return false; }	
		}


		var activeFingers = {}
		if(!window.navigator.msPointerEnabled) {


			var mousehover, mousehoverStart, mousehoverEnd
			var hoverActive = false
			if(wantMouseHover) {
				var prevHoverPos = [0,0]  
				mousehover = function(e, status) {
					preventDefault(e)
					var mp = getMousePos(e)
					if(status == 'start') {
						hoverActive = true
						if(!mdiMouseMove) { posStart('mouseHover', offset({x:mp.x, y:mp.y},true), status) }
					} else if(status == 'end') {
						hoverActive = false
						if(!mdiMouseMove) { posEnd  ('mouseHover', offset({x:mp.x, y:mp.y},true), status) }
					} else if(hoverActive) {
						if(!mdiMouseMove) {
							var diff ={x:mp.x - prevHoverPos[0], y:mp.y - prevHoverPos[1]}
							if(!(diff.x == 0 && diff.y == 0)) {
								posMove ('mouseHover', offset({x:mp.x, y:mp.y}, true) ) //support diff? , diff)
							}
						}
					}
					prevHoverPos = [mp.x, mp.y]
				}
				mousehoverStart = function(e) { mousehover(e, 'start') }
				mousehoverEnd   = function(e) { mousehover(e, 'end'  ) }
				element.addEventListener('mouseenter', mousehoverStart, false)
				element.addEventListener('mouseleave', mousehoverEnd, false)
				element.addEventListener('mousemove', mousehover, false)
			}
		
			var mousemove = function(e) {
				var k, v, mp = getMousePos(e)
				for(k in mdiMouseButtons) {
					v = mdiMouseButtons[k]
					if(v) {
						posMove(k, offset({x:mp.x, y:mp.y},true) ) //support diff? , {x:mp.x - prevMPos[0], y:mp.y - prevMPos[1]})
					}					
				}
	//			prevMPos = [mp.x, mp.y]
				preventDefault(e)
			}
			
			var mouseup = function(e) {
				preventDefault(e)
				var k, i = 0, mp = getMousePos(e)
				var id = 'mouse' + (e.button || '0')
				var pos = offset({x:mp.x, y:mp.y},true)
				if(mdiMouseButtons[id]) {
					posEnd(id, pos, 'end')
					mdiMouseButtons[id] = undefined
				}
				for(k in mdiMouseButtons) { if(k !== '__id__' && mdiMouseButtons[k]) { i++; break } }
				if(i == 0 && mdiMouseMove) {
					document.removeEventListener('mousemove', mousemove, false)
					document.removeEventListener('mouseup', mouseup, false)
					mdiMouseMove = false
					if(wantMouseHover && hoverActive) {
						posStart('mouseHover', pos, 'start')
					}
				}
			}

			var mdiMouseButtons = {}
			var mousedown = function(e) {
				preventDefault(e)
				var id = 'mouse' + (e.button || '0'), mp = getMousePos(e)
				var pos = offset({x:mp.x, y:mp.y},true)
				if(mdiMouseButtons[id]) {
					posEnd(id, pos, 'end')  // mouseup was lost, this happens in chrome (rightdown -> leftdown -> rightrelease)
				}
				if(wantMouseHover && hoverActive && !mdiMouseMove) {
					posEnd('mouseHover', pos, 'end')
				}
				mdiMouseButtons[id] = true
				posStart(id, pos, 'start')
				if(!mdiMouseMove) {
					//prevMPos = [mp.x, mp.y]
					document.addEventListener('mousemove', mousemove, false)	// we want "mousecapture" as default, this is why we need this global stuff
					document.addEventListener('mouseup', mouseup, false)
					mdiMouseMove = true
				}	
			}
			element.addEventListener('mousedown', mousedown, false);
						
			var touchUpdate
			touchUpdate = function(e) {
				preventDefault(e)
				var processed = {}
				for(var i = 0; i < e.targetTouches.length; i++) { var v = e.targetTouches[i]
					var id = v.identifier
					var af = activeFingers[id]
					if(!af) {
						activeFingers[id] = af = {x: v.pageX, y: v.pageY}
						posStart(id, offset({x:af.x, y:af.y}), 'start')			
					} else {
						if(!(af.x == v.pageX && af.y == v.pageY)) {
							var p = {x: v.pageX, y: v.pageY}
							posMove(id, offset({x:p.x, y:p.y})) // support diff? , {x: p.x - af.x, y: p.y - af.y })
							af = p
						}
					}
					processed[id] = 1
				}
				for(var id_ in activeFingers) {
					var id = parseFloat(id_)
					var af = activeFingers[id]
					if(af && !processed[id]) {
						posEnd(id, offset({x:af.x, y:af.y}), 'end') // end
						activeFingers[id] = undefined
					}
				}
			}
			element.addEventListener('touchstart', touchUpdate, false);
			element.addEventListener('touchmove', touchUpdate, false);
			element.addEventListener('touchend', touchUpdate, false);	


			return {
				remove: function() {
						element.removeEventListener('mousedown', mousedown, false);
						if(touchUpdate) {
							element.removeEventListener('touchstart', touchUpdate, false);
							element.removeEventListener('touchmove', touchUpdate, false);
							element.removeEventListener('touchend', touchUpdate, false);						
						}
						if(wantMouseHover) {
							element.addEventListener('mouseenter', mousehoverStart, false)
							element.addEventListener('mouseleave', mousehoverEnd, false)
							element.addEventListener('mousemove', mousehover, false)
						}				
					}
				}

		} else {

			var mousehover, mousehoverStart, mousehoverEnd
			var hoverActive = false
			if(wantMouseHover) {
				mousehover = function(e, status) {
					preventDefault(e)
					var mp = getMousePos(e)
				//	if(status == 'start') {
				//		if(!hoverActive) {
				//			hoverActive = true
				//			if(!mdiMouseMove) { posStart('mouseHover', offset({x:mp.x, y:mp.y},true), status) }							
				//		}
				//	} else if(status == 'end') {
						if(hoverActive) {
							hoverActive = false
							if(!mdiMouseMove) { posEnd  ('mouseHover', offset({x:mp.x, y:mp.y},true), status) }							
						}
				//	}
				}
				//mousehoverStart = function(e) { mousehover(e, 'start') }
				mousehoverEnd   = function(e) { mousehover(e, 'end'  ) }
				// element.addEventListener('mouseenter', mousehoverStart, false)  // this event cannot be used, it seem to be injected on touch start!
				element.addEventListener('mouseleave', mousehoverEnd,   false)
			}


			var msPointerUpdate = function (v) {
				var id = v.pointerId;
				var clientId = id

				var isMouse = v.pointerType == 'mouse' 
				//trace('ms '+v.pointerType+' '+v.type+' '+v.pageX+' '+v.pageY)
				if(isMouse) {
					clientId = 'mouse' + v.button
				}				
			
				// the following is needed in developer preview to stop implicit pan/zoom
				if (v.preventManipulation)
					v.preventManipulation();

				preventDefault(v) 

				var pos = offset({x: v.pageX, y: v.pageY})

				if (v.type == "pointerdown") {
					//trace('ms '+v.pointerType+' '+v.type+' '+clientId+' '+v.pageX+' '+v.pageY)
					if(mousehover && isMouse && hoverActive) {
						posMove('mouseHover', pos, 'end');
						hoverActive = false;
					}					
					activeFingers[id] = true;
					v.target.msSetPointerCapture(id);
					posStart(clientId, pos, 'start')			
				} else if (v.type == "pointermove") {
					if (activeFingers[id]) {
						posMove(clientId, pos, undefined);
					} else if(mousehover && isMouse) {
						if(!hoverActive) {
							posMove('mouseHover', pos, 'start'); // fix for unusable mouseenter event, see above
							hoverActive = true
						} else {
							posMove('mouseHover', pos, undefined);
						}
					}
				} else if (v.type == "pointerup") {
					//trace('ms '+v.pointerType+' '+v.type+' '+clientId+' '+v.pageX+' '+v.pageY)
					delete activeFingers[id];
					posEnd(clientId, pos, 'end');
					if(mousehover && isMouse && !hoverActive) {
						posMove('mouseHover', pos, 'start');
						hoverActive = true;
					}
				}

			}			
			element.addEventListener("MSPointerDown",  msPointerUpdate, false);			
			element.addEventListener("MSPointerMove",  msPointerUpdate, false);			
			element.addEventListener("MSPointerUp",    msPointerUpdate, false);	

			return {
					remove: function() {
						element.removeEventListener('MSPointerDown',  msPointerUpdate, false);
						element.removeEventListener('MSPointerMove',  msPointerUpdate, false);
						element.removeEventListener('MSPointerUp',    msPointerUpdate, false);
						if(mousehoverEnd) {
							element.removeEventListener('mouseleave', mousehoverEnd, false);						
						}		
					}
				}						
		}
	}


})()