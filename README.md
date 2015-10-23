# mdi.js
 
### Minimalistic Drag Input (touch / mouse polyfill)
####Usage

    var config = { onInput : inputHandlerFunc }
    mdiBindInput(element, config) // Initiate drag input on a DOM element
   
####Config argument callbacks and options:
     
     	onMove			// function(id, data)     
     					//   * id, numbers for touch fingers, "mouse0", "mouse1" etc for mousebuttons
     					//   * data currently only holds position data (x and y), but can be expanded
     						
     	onStart			// function(id, data, info)
     					//   * id   (see above)
     					//   * data (see above)
     					//   * info is always 'start'
     
     	onEnd			// function(id, data, info)
     					//   * id   (see above)
     					//   * data (see above)
     					//   * info is always 'end'
     
     	onInput 		// function(id, data, info)  
     					//   if this is defined it will be used as a fallback for the above functions 
     					
     	getPageOffset	// function(element) { ... return {x: ... , y: ... } }
     					//   if you need more precise positioning 
     					
     	wantMouseHover	//  true or false (default is false)
     					
     	wantMouseWheel	//  true or false (default is false)
 
     	wantBrowserContextMenu	//  true or false (default is true)
                                //  note that this is globally, not just for the element
