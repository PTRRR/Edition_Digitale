window.onload = function(){

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
	var progressBar = loadingBar.querySelector('#map .progress-indicator');

	var setHeight = document.querySelector('#set-height');
	var video = document.querySelector('#main-video');

	//Overlays items
	var overlayIsLoading = false;
	var overlayContainer = document.querySelector('#overlays');
	var overlays = document.querySelectorAll('.overlay-item');
	var overlayList = [];

	overlays.forEach(function(item, index){

		var frames = item.getAttribute("frames").split("-");
		var begin = 0;
		var end = 0;

		frames.forEach(function(val, index){
			frames[index] = parseInt(val);
		});

		var newOverlay = {

			src: item.src,
			displayRange: frames,

		}

		overlayList.push(newOverlay);

	});

	removeAllOverlays();

	var overlayTimer = null;

	//Make sure it's loaded before applying changes

	var sideBarImg = document.querySelector('#side-bar img');
	if(sideBarImg.complete){
		transformSideBar();
	}else{
		sideBarImg.onload = function(){
			transformSideBar();
		}
	}

	var initialMap = document.querySelector('#map img');
	if(initialMap.complete){
		transformInitialMap();
	}else{
		initialMap.onload = function(){
			transformInitialMap();
		}
	}

	//Animation variables

	var isScrolling = false;
	var isStopped = true;
	var lastTime = 0;
	var lastFrame = 0;
	var isLoaded = false;
	var frameRate = 25;
	var frameCount = 0;
	var duration = 0;
	var currentTime = 0;
	var currentFrame = 0;
	var targetTime = 0;
	var videoPlayBackIncrementMultiplier = 0.0002;

	var url = "videos/MAIN.mp4";

	var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function(oEvent) {

        var blob = new Blob([oEvent.target.response], {type: "video/mp4"});

        video.src = URL.createObjectURL(blob);
        
		addEvent(video, 'loadedmetadata', function(){

			duration = video.duration;

			transformSideBar();
			transformVideo();
			fullyLoaded();

			document.querySelector('.scroll-down').style.opacity = 1;
			document.querySelector('.chargement').style.opacity = 0;

		});

    };

    xhr.onprogress = function(oEvent){

      	if(oEvent.lengthComputable) {

        	var percentComplete = oEvent.loaded/oEvent.total;
        	document.querySelector('#map .progress-indicator').style.width = map_range(percentComplete, 0, 1, 5, 96) + "%";
        	document.querySelector('.chargement').innerHTML = Math.floor(percentComplete * 100) + "%";

       	}
    }

    xhr.send();

    //Click event

    addEvent(document.querySelector('.interactive-map'), 'click', function(e){

    	var percentHeight = e.clientY / window.innerHeight;

    	targetTime = percentHeight * duration;
    	
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

			targetTime -= deltaY * videoPlayBackIncrementMultiplier;
			targetTime = targetTime.clamp(0, video.duration);

		}

		if(currentFrame == 0){

			loadingScreen.style.transform = "translate3d(0, 0, 0)";
			loadingScreen.style.opacity = 1;

		}else{

			loadingScreen.style.transform = "translate3d(0, -100%, 0)";
			loadingScreen.style.opacity = 0;

		}

		if(currentFrame >= frameCount - 10){

			document.querySelector('#colophon').style.transform = "translate3d(0, 0, 0)";
			document.querySelector('#colophon').style.opacity = 1;

		}else if(currentFrame < frameCount - 10){

			document.querySelector('#colophon').style.transform = "translate3d(0, 100%, 0)";
			document.querySelector('#colophon').style.opacity = 0;

		}

		isScrolling = true;

	}

	//Animate

	function launchOverlayTimer(){

		window.clearTimeout(overlayTimer);

		overlayTimer = setTimeout(function(){

			overlayList.forEach(function(item){

				if(currentFrame >= item.displayRange[0] && currentFrame < item.displayRange[1]){

					//Erase all overlays before loading one new

					overlayIsLoading = true;

					removeAllOverlays();

					loadOverlay(item, function(src){

						var newOverlay = createOverlay(src);

						(function(newOverlay){

							setTimeout(function(){
								newOverlay.style.opacity = 1;
								overlayIsLoading = false;
							}, 20);

						})(newOverlay);

					});

				}

			});

			isScrolling = false;

		}, 600);

	}

	function updateCurrentFrame(){
		
  		if(typeof targetTime !== 'undefined') {

  			//Avoid double load
  			if(!overlayIsLoading) video.currentTime += (targetTime - video.currentTime) * 0.1; //Interpolate currentTime
  			else targetTime = video.currentTime;

  			currentFrame = Math.floor(video.currentTime * frameRate);
  			document.querySelector('#frame').innerHTML = "frame: " + currentFrame;
  		}

	}

	function animate(){

		updateCurrentFrame();

		if(currentFrame != lastFrame){
			
			isScrolling = true;

			var barOffset = 190;
			document.querySelector('.background-bar').style.height = ((currentFrame + barOffset) / (frameCount + barOffset * 2) * 100) + "%";

			document.querySelectorAll('.overlay-item').forEach(function(item){
				item.style.opacity = 0;
			});

			launchOverlayTimer();

		}else{
			
			isScrolling = false;

		}

		lastTime = video.currentTime;
		lastFrame = currentFrame;

		// requestAnimationFrame(animate); --> lag.... je sais pas pourquoi.... :(

		setTimeout(function(){ //Hacky method... but works

			animate();

		}, 40);

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

		document.querySelectorAll('.overlay-item').forEach(function(item){
			item.style.width = video.offsetWidth;
			item.style.height = video.offsetHeight;
		});

	}

	function loadOverlay(overlay, callback){

		var url = overlay.src;

		var xhr = new XMLHttpRequest();
	    xhr.open("GET", url, true);
	    xhr.responseType = "arraybuffer";

	    xhr.onload = function(oEvent) {

	        var blob = new Blob([oEvent.target.response], {type: "video/webm"});
	        
			callback(URL.createObjectURL(blob));

	    };

	    xhr.send();

	}

	function createOverlay(src){

		var newVideo = document.createElement("video");
		newVideo.src = src;
		newVideo.className = "overlay-item opacity-transition-05s center";
		newVideo.setAttribute("autoplay", "true");
		newVideo.setAttribute("loop", "true");
		overlayContainer.appendChild(newVideo);

		return newVideo;

	}

	function removeAllOverlays(){

		document.querySelectorAll('.overlay-item').forEach(function(item){
			overlayContainer.removeChild(item);
		});

	}

	function transformInitialMap(){

		var initialMap = document.querySelector('#map');
		var img = initialMap.querySelector('img');
		var progressBar = initialMap.querySelector('.progress-indicator');

		initialMap.style.height = img.offsetHeight + "px";
		progressBar.style.height = (img.offsetHeight - 2) + "px";

	}

	function transformSideBar(){

		var interactiveMap = document.querySelector('.interactive-map');
		var backgroundBar = interactiveMap.querySelector('.background-bar');
		var map = interactiveMap.querySelector('img');
		var shadow = interactiveMap.querySelector('.shadow');

		interactiveMap.style.width = map.width + 'px';
		backgroundBar.style.width = map.width + 'px';
		shadow.style.width = map.width + 'px';

	}

	function fullyLoaded(){

		video.currentTime = 0;
	    video.style.opacity = 1;
	    animate();
	    isLoaded = true;
	    transformVideo();
	    loadingScreen.style.pointerEvent = "none";
	    frameCount = video.duration * frameRate;

	}

	window.onresize = function(){

		transformVideo();
		transformSideBar();
		transformInitialMap();

	}

};

function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

//Prototypes utilities

Number.prototype.clamp = function(min, max) {

  	return Math.min(Math.max(this, min), max);

};

Array.prototype.forEach = function(callback){
	for(var i = 0; i < this.length; i++){
		callback(this[i], i);
	}
}

//Scroll animation

$(function() {
    $('.scroll-down').click (function() {
      	$('html, body').animate({scrollTop: $('section.ok').offset().top }, 'slow');
     	return false;
    });
});