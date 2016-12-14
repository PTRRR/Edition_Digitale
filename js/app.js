(function(){

	// add event cross browser

	function addEvent(elem, event, fn) {

	    // avoid memory overhead of new anonymous functions for every event handler that's installed
	    // by using local functions

	    function listenHandler(e) {
	        var ret = fn.apply(this, arguments);
	        if (ret === false) {
	            e.stopPropagation();
	            e.preventDefault();
	        }
	        return(ret);
	    }

	    function attachHandler() {

	        // set the this pointer same as addEventListener when fn is called
	        // and make sure the event is passed to the fn also so that works the same too

	        var ret = fn.call(elem, window.event);   
	        if (ret === false) {
	            window.event.returnValue = false;
	            window.event.cancelBubble = true;
	        }
	        return(ret);
	    }

	    if (elem.addEventListener) {
	        elem.addEventListener(event, listenHandler, false);
	        return {elem: elem, handler: listenHandler, event: event};
	    } else {
	        elem.attachEvent("on" + event, attachHandler);
	        return {elem: elem, handler: attachHandler, event: event};
	    }
	}

	function removeEvent(token) {
	    if (token.elem.removeEventListener) {
	        token.elem.removeEventListener(token.event, token.handler);
	    } else {
	        token.elem.detachEvent("on" + token.event, token.handler);
	    }
	}

	window.HELP_IMPROVE_VIDEOJS = false;

	//DomElements

	var loadingScreen = document.querySelector('#loading-screen');
	var loadingBar = loadingScreen.querySelector('#loading-bar');
	var progressBar = loadingBar.querySelector('#progress-bar');

	var setHeight = document.querySelector('#set-height');
	var video = document.querySelector('#main-video');

	//Overlays items
	var overlays = document.querySelectorAll('.overlay-item');

	overlays.forEach(function(item){

		var frames = item.getAttribute("frames").split("-");
		var begin = 0;
		var end = 0;

		frames.forEach(function(val, index){
			frames[index] = parseInt(val);
		});

		item.displayRange = frames;

	});

	var overlayTimer = null;
	//Animation variables

	var isScrolling = false;
	var isLoaded = false;
	var frameRate = 25;
	var frameCount = 0;
	var currentTime = 0;
	var currentFrame = 0;
	var videoPlayBackIncrementMultiplier = 0.0002;

	transformSideBar();
	transformVideo();

	video.playbackRate = 10;

	addEvent(video, 'progress', function() {

	    if(!isLoaded){
	    	var loadedPercentage = video.buffered.end(0) / video.duration;
	    	progressBar.style.width = (loadedPercentage * 100) + "%"
	    }

	    //Fully loaded

	    if(loadedPercentage == 1 && !isLoaded){

	    	video.pause();
	    	video.currentTime = 0;
	    	video.style.opacity = 1;
	    	animate();
	    	isLoaded = true;
	    	transformVideo();
	    	loadingScreen.style.pointerEvent = "none";
	    	document.querySelector('#scroll-indicator').style.opacity = 1;
	    	frameCount = video.duration * frameRate;

	    }

	});

	//Bind the wheel events (cross-browser)

	addEvent(wrapper, "mousewheel", MouseWheelHandler);
	addEvent(wrapper, "DOMMouseScroll", MouseWheelHandler);
	addEvent(wrapper, "onmousewheel", MouseWheelHandler);

	function MouseWheelHandler(e) {

		// cross-browser wheel delta

		var e = window.event || e; // old IE support
		var deltaY = e.wheelDeltaY || -e.detailY;

		//Check for NaN values

		
		if(deltaY === deltaY && isLoaded){

			currentTime -= deltaY * videoPlayBackIncrementMultiplier;
			currentTime = currentTime.clamp(0, video.duration);

		}

		currentFrame = Math.floor(currentTime * frameRate);

		if(currentFrame == 0){

			loadingScreen.style.transform = "translate3d(0, 0, 0)";

		}else{

			loadingScreen.style.transform = "translate3d(0, -100%, 0)";

		}

		var barOffset = 190;
		document.querySelector('.background-bar').style.height = ((currentFrame + barOffset) / (frameCount + barOffset * 2) * 100) + "%";
		document.querySelector('.bar').style.height = (currentFrame / frameCount * 100) + "%";

		window.clearTimeout(overlayTimer);

		overlayTimer = setTimeout(function(){

			overlays.forEach(function(item){

				if(currentFrame >= item.displayRange[0] && currentFrame <= item.displayRange[1]){
					item.style.opacity = 1;
				}

			});

			isScrolling = false;

		}, 300);

		if(!isScrolling){
			overlays.forEach(function(item){
				item.style.opacity = 0;
			});
		}

		isScrolling = true;

	}

	//Animate

	function updateCurrentFrame(){
		
  		video.currentTime = currentTime;

	}

	function animate(){

		updateCurrentFrame();

		setTimeout(function(){

			animate();

		}, 50);

	}

	function transformVideo(){

		var ratio = window.innerWidth / window.innerHeight;
		var videoRatio = video.videoWidth / video.videoHeight;

		if(ratio > videoRatio){

			video.style.width = 105 + "%";
			video.style.height = "auto";

		}else{

			video.style.width = "auto";
			video.style.height = 100 + "%";

		}

	}

	function transformSideBar(){

		var interactiveMap = document.querySelector('.interactive-map');
		var backgroundBar = interactiveMap.querySelector('.background-bar');
		var map = interactiveMap.querySelector('img');

		interactiveMap.style.width = map.width + 'px';
		backgroundBar.style.width = map.width + 'px';

	}

	window.onresize = function(){

		transformVideo();
		transformSideBar();

	}

})();

//Prototypes utilities

Number.prototype.clamp = function(min, max) {

  	return Math.min(Math.max(this, min), max);

};

Array.prototype.clamp = function(callback){
	for(var i = 0; i < this.length; i++){
		callback(this[i], i);
	}
}