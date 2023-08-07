// The following are legacy functions that still need to be adapted to work in the new Interactivator system.

//This is beta

function setSize(elem) {
	elem.style.transform = "scale(" + (video.width() / 1920) + ")";
};

function lottieAnim(element, data, start) {
	// video.bind("betweentimes", start, end, function (withinInterval) {
	// 	if (withinInterval) {

	var animation = bodymovin.loadAnimation({
		container: element, // the dom element that will contain the animation
		renderer: 'svg',
		loop: false,
		autoplay: false,
		animationData: data,
	});

	var end = start + animation.getDuration()
	animation.setSpeed(video.playbackRate())
	video.bind("betweentimes", start, end, function (withinInterval) {
		if (withinInterval) {
			lottieTime = (video.time() - start) * 1000
			if (video.state() === "playing") {
				animation.goToAndPlay(lottieTime)
			} else {
				animation.goToAndStop(lottieTime)
			}
		}
	})
	video.bind("timechange", function (t) {
		if ((video.state() === "paused") && animation) {
			lottieTime = (t - start) * 1000
			animation.goToAndStop(lottieTime)
		}
	});

	video.bind("seek", function (currentTime, lastTime) {
		lottieTime = (currentTime - start) * 1000
		if ((video.state() === "playing") && animation) {
			animation.goToAndPlay(lottieTime)
		}
	});
}

function generalLottie() {
	video.bind("pause", function () {
		lottie.pause();
	})
	video.bind("play", function () {
		lottie.play();
	})
	video.bind("playbackratechange", function (playbackRate) {
		lottie.setSpeed(playbackRate);
	});
}

function cleanHype() {
	var event = document.getElementById("b4ckgr0un6")
	var existing = event.getElementsByClassName('HYPE_document')
	for (let q = 0; q < existing.length; q++) {
		event.removeChild(existing[q])
	}
}

function EditHype(selector, callback) {
	var startTimeInMs = Date.now();
	(function loopSearch() {
		if (document.querySelector('#' + selector) != null) {
			callback();
			return;
		}
		else {
			setTimeout(function () {
				if (9000 && Date.now() - startTimeInMs > 9000)
					return;
				loopSearch();
			}, 1);
		}
	})();
}

function Discussion_Prompt(enterTime, endTime, prompt) {
    endTime = parseFloat(enterTime) + 0.1
	video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
		if (withinInterval) {
			video.bind("heightchange", function () { setSize(elem); });
			elem = createb4ckgr0un6()
			video.grid.left_inside.appendChild(elem)

			// Unique code

			video.pause()
			cleanHype()
			var event = document.getElementById("b4ckgr0un6")
			var div = document.createElement('div')
			div.id = 'default_hype_container'
			div.className = 'HYPE_document'
			event.firstElementChild.append(div)
			var js = document.createElement("script");
			js.type = "text/javascript";
			js.src = 'https://getsmartervideos.s3.eu-west-1.amazonaws.com/Interactive+Video+Content/IMD/Default.hyperesources/default_hype_generated_script.js?11135';
			event.appendChild(js);
			var play = document.createElement('div')
			play.style.transformOrigin = "top left"
			play.style.pointerEvents = 'auto'
			play.id = 'getInFront'
			play.style.position = 'absolute'
			play.style.width = '1700px'
			play.style.height = '1080px'
			play.style.top = '0px'
			play.onclick = function () { video.play() };
			play.style.zIndex = '1'
			event.firstElementChild.append(play)
			EditHype('hypeText', function () {
				var texts = document.getElementsByClassName('hypeText')

				const checkHypeStarted = setInterval(() => {
					if (window.hypeStarted) {
						document.getElementById('hypeText').innerHTML = prompt
						document.getElementById('UPcolour').style.backgroundColor = "#4E2A84";
						clearInterval(checkHypeStarted)
					}
				}, 500)
			})

		} else {
			video.grid.left_inside.removeChild(elem)
		}
	});
};

function title(enterTime, endTime, text) {
	enterTime = parseFloat(enterTime)
	endTime = parseFloat(enterTime) + 0.1
	video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
		if (withinInterval) {
			video.bind("heightchange", function () {setSize(elem);});
			elem = createb4ckgr0un6()
			video.grid.left_inside.appendChild(elem)
			var frame = document.getElementById("frame");

			// Unique code
			frame.innerHTML = `
			<div id="titleBackground"><div id="titleFunction"></div></div><a id='resumeVideo'>Resume video</a>
			`;
			video.pause();
			var titleFunction = document.getElementById("titleFunction");
			document.getElementById("resumeVideo").onclick = function () {
				video.play();
			}
			titleFunction.innerHTML = text;
			setTimeout(() => titleFunction.classList.add("fade-in"), 200);
			video.bind('play', function () {
				getLink.classList.remove('fade-in')
			});

		} else {
			video.grid.left_inside.removeChild(elem)
		}
	});
};

function External_Link(enterTime, endTime, text, url) {
    endTime = parseFloat(enterTime) + 0.1
	enterTime = parseFloat(enterTime)
	video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
		if (withinInterval) {
			video.bind("heightchange", function () { setSize(elem); });
			elem = createb4ckgr0un6()
			video.grid.left_inside.appendChild(elem)
			var frame = document.getElementById("b4ckgr0un6");

			// Unique code
            video.pause()
			const link = document.createElement('a')
			link.id = 'link'
			link.innerHTML = text
			link.target = "_blank"
			link.href = url
			link.style.setProperty("background-color", "#012461", "important");
			frame.firstElementChild.append(link)

			const getLink = document.querySelector('#link')
			setTimeout(() => getLink.classList.add('fade-in'), 200)
			video.pause()
			video.bind('play', function () {
				getLink.classList.remove('fade-in')
			});
		} else {
			video.grid.left_inside.removeChild(elem)
		}
	});
};

function HTML(tag, location, attributes, html) {
	    var element = document.createElement(tag)
	    if (html != undefined) { element.innerHTML = html }
	    if (attributes != undefined) {
	        for (let a = 0; a < attributes.length; a++) {
	            for (let b = 0; b < attributes[a].length; b++) {
	                element.setAttribute(attributes[a][0], attributes[a][1])
	            }
	        }
	    }
	    location.append(element)
	    return element
	}
	
function carousel(enterTime, endTime, src, alt) {
    endTime = parseFloat(endTime)
    enterTime = parseFloat(enterTime)
    video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
        if (withinInterval) {

            video.bind("heightchange", function () { setSize(elem); });
            elem = createb4ckgr0un6()
            video.grid.left_inside.appendChild(elem)
            var frame = document.getElementById("b4ckgr0un6");

            // Unique code
            var images = document.getElementsByClassName('image')
            var container = HTML('div', frame.firstElementChild)
            if (document.getElementById('myCarousel') == null) {

                var myCarousel = HTML('div', container, [['id', 'myCarousel']])
                var image = HTML('img', myCarousel, [['src', src], ['alt', alt], ['class', 'image'], ['id', 'img' + 1]])
                var hide = HTML('button', container, [['id', 'hide'], ['class', 'button']], 'Hide')

            } else {
                var myCarousel = document.getElementById('myCarousel')
                var image = HTML('img', myCarousel, [['src', src], ['alt', alt], ['class', 'image'], ['id', 'img' + (images.length + 1)]])
                image.hidden = true
                image.onclick = function () { image.hidden = true }
                if ((document.getElementById('left') == null) && (images.length > 0)) {
                    var left = HTML('button', container, [['id', 'left'], ['class', 'button']], '<')
                    var right = HTML('button', container, [['id', 'right'], ['class', 'button']], '>')
                    function rotate(plusOrMinus) {
                        for (let a = 0; a < images.length; a++) {
                            if (images[a].hidden == false) {
                                images[a].hidden = true
                                var next = (parseInt(images[a].id.replace('img', '')) + plusOrMinus)
                                if (next > images.length) { next = 1 }
                                if (next == 0) { next = images.length }
                                document.getElementById('img' + next).hidden = false
                                break
                            }
                        }
                    }
                    right.onclick = function () { rotate(1) }
                    left.onclick = function () { rotate(-1) }
                }
            }
            var left = document.getElementById("left")
            var right = document.getElementById("right")
            var hide = document.getElementById("hide")
            hide.onclick = function () {
                if (myCarousel.hidden == true) {
                    myCarousel.hidden = false
                    hide.innerHTML = 'Hide'
                    left.hidden = false
                    right.hidden = false
                } else {
                    myCarousel.hidden = true
                    hide.innerHTML = 'Show'
                    left.hidden = true
                    right.hidden = true
                }
            }

        }
        else {
            frame.removeChild(image)
            images = document.getElementsByClassName('image')
            if (images.length == 0) {
                frame.removeChild(container)
            }
            
        }

    });
};
	
