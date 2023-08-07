Wistia.plugin("interactivator", function (video, options) {
  var courseCode = options.courseCode;
  var chapters = options.chapters;
  var functionList = options.functions;
  var WistiaId = options.id;
  var outro = options.outro;
  let startPlay = true;
  let production = false;

  // Top and bottom (outside of 'cut here') are only used outisde of Interactivator tool, i.e. Review page and in embed code on OLC.
  // Middle part used in Interactivator tool from Flask server, with different arguments passed in.
  // -- cut here --

  if (options.bypassLowerThird == true) {
    let lwrThirdData = true;
  }

  let iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  let iOSSafe = false;

  // If the iFrame is for a different video than the WistiaId argument passed to the Interactivator function,
  // we assume that this video is an intro, and we need to add the main video to the playlist.
  if (video.hashedId() != WistiaId) {
    iOSSafe = true;
    video.addToPlaylist(WistiaId, {
      transition: "none",
      autoPlay: false,
      fakeFullscreen: iOS,
      plugin: {
        interactivator: {
          courseCode: options.courseCode,
          chapters: options.chapters,
          functions: options.functions,
          id: options.id,
          intro: options.intro,
          outro: options.outro,
          src: "https://videos.getsmarter.com/Interactive+Video+Content/interactivator.js",
        },
      },
    });
    return;
  }

  let up = courseCode.split("-")[0];
  console.log("interactivator plugin loaded");

  // Coursecode is used to determine some style elements
  let courseDataFile =
    "https://videos.getsmarter.com/Interactive+Video+Content/courseData/" +
    courseCode +
    ".js";
  let UPDataFile =
    "https://videos.getsmarter.com/Interactive+Video+Content/" +
    up +
    "/" +
    up +
    ".js";
  let UPcss =
    "https://videos.getsmarter.com/Interactive+Video+Content/" +
    up +
    "/" +
    up +
    ".css";

  let cssFile =
    "https://videos.getsmarter.com/Interactive+Video+Content/generic.css";
  let standard_generators =
    "https://videos.getsmarter.com/Interactive+Video+Content/standard_generators.js";

  // First some helper functions

  function makeiOSSafe() {
    // iOS doesn't support fullscreen Wistia player
    if (!iOSSafe && iOS) {
      video.cancelFullscreen();
    }
  }

  function loadCSS(url) {
    let link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    video.grid.left_inside.appendChild(link);
  }

  function setSize(elem) {
    elem.style.transform = "scale(" + video.width() / 1920 + ")";
  }

  function addScript(src, id) {
    // load javascript files by adding script elements to the DOM
    var s = document.createElement("script");
    s.src = src;
    s.id = id;
    // If element with that ID doesn't exist append it to the end of the document body and wait until it is loaded.
    if (document.getElementById(id) == null) {
      video.grid.left_inside.appendChild(s);
      // wait half a second
      setTimeout(function () {}, 500);
    }
  }

  addScript(
    "https://getsmartervideos.s3.eu-west-1.amazonaws.com/Interactive+Video+Content/standard+generators/lottie.js",
    "lottie"
  );
  addScript(standard_generators, "standard_generators");
  addScript(courseDataFile, "courseDataFile");
  addScript(UPDataFile, "UPDataFile");

  function killSwitch(element) {
    // This is only for the Interactovator tool page. It cleans up lottie and event listeners to refresh the viewer.
    if (!production) {
      return;
    }
    video.unbind;
    var functionListElem = document.getElementById("functionList");
    if (functionListElem) {
      functionListElem.addEventListener(
        "DOMSubtreeModified",
        function () {
          console.log("killswitch triggered");
          if (lottie) {
            lottie.destroy();
          }
          if (element != undefined) {
            element.remove();
          }
          // remove all elements in class "eternal"
          var meta_plugin_elem = document.getElementsByClassName("eternal");
          for (var i = 0; i < meta_plugin_elem.length; i++) {
            meta_plugin_elem[i].remove();
          }
        },
        false
      );
    }
  }

  function addFrame() {
    //  The frame element is the container for all the interactive elements.
    var elem = document.createElement("span");
    elem.id = "b4ckgr0un6";
    elem.className = "meta_plugin_elem eternal";
    elem.style.pointerEvents = "none";
    elem.style.position = "absolute";
    elem.style.width = "1920px";
    elem.style.height = "1080px";
    elem.innerHTML =
      '<span  id="frame" style="background-color: black; pointer-events: auto;">';
    elem.style.transformOrigin = "top left";
    graphicsContainer = document.createElement("div");
    graphicsContainer.className = "graphicsContainer";
    graphicsContainer.style.pointerEvents = "none";
    rightsideOffset = 0;
    elem.appendChild(graphicsContainer);
    video.grid.left_inside.appendChild(elem);

    setSize(elem);
    // Changes the size of the frame element when the video is resized.
    video.bind("heightchange", function () {
      setSize(elem);
    });
    var frame = document.getElementById("frame");
    loadCSS(cssFile);
    loadCSS(UPcss);

    // protect captions from being obscured
    if (document.getElementsByClassName("w-captions").length > 0) {
      document.getElementsByClassName("w-captions")[0].style.zIndex = "3";
    }
    video.bind("timechange", function (time) {
      if (document.getElementsByClassName("w-captions").length > 0) {
        document.getElementsByClassName("w-captions")[0].style.zIndex = "3";
      }
      document.getElementsByClassName("w-bottom-bar")[0].style.zIndex = "3";
    });
  }

  function lottieAnim(element, data) {
    // Initialises lottie animations
    var animation = bodymovin.loadAnimation({
      container: element,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: data,
    });
    animation.goToAndStop(video.time() * 1000);
    return animation;
  }

  function timeAnimation(animation, start) {
    // binds lottie animations to sync with video time and play within their start and end times.
    // Note I can't figure out how to prevent an issue where the animation will play at the wrong time in the video after seeking and playing the video
    if (animation.isLoaded) {
      if (start < 0) {
        start = 0;
      }
      var end = start + animation.getDuration();
      animation.setSpeed(video.playbackRate());
      video.bind("betweentimes", start, end, function (withinInterval) {
        video.bind("play", function () {
          if (withinInterval && animation.isLoaded) {
            animation.play();
          }
        });

        if (withinInterval && animation.isLoaded) {
          animation.wrapper.style.display = "block";

          makeiOSSafe();
          let lottieTime = (video.time() - start) * 1000;
          if (video.state() === "playing") {
            animation.goToAndPlay(lottieTime);
          } else {
            animation.goToAndStop(lottieTime);
          }
        } else {
          animation.wrapper.style.display = "none";
          animation.goToAndStop(animation.totalFrames, true);
        }
        killSwitch();
      });

      video.bind("timechange", function (timeNow) {
        let lottieTime = (timeNow - start) * 1000;
        if (
          video.state() === "paused" &&
          animation.isLoaded &&
          lottieTime > 0
        ) {
          animation.goToAndStop(lottieTime);
        }
        killSwitch();
      });

      video.bind("seek", function (currentTime, lastTime) {
        let lottieTime = (currentTime - start) * 1000;
        if (video.state() === "playing" && animation.isLoaded) {
          animation.goToAndPlay(lottieTime);
        }
        killSwitch();
      });
    } else {
      setTimeout(function () {
        timeAnimation(animation, start);
      }, 100);
    }
  }

  played = false;
  function generalLottie() {
    // Some global lottie settings not tied to any particular animation
    video.bind("pause", function () {
      lottie.pause();
    });
    // video.bind("play", function () {
    // 	if (played) {
    // 		lottie.play();
    // 	} else {
    // 		played = true
    // 	}
    // })
    video.bind("playbackratechange", function (playbackRate) {
      lottie.setSpeed(playbackRate);
    });
  }

  function uniqueID(elem) {
    // IDs are set for lottie animations in After Effects but this does not work if the same lottie file is invoked multiple times.
    elem.className = elem.id + "s";
    let oldID = elem.id;
    elem.id = oldID + document.getElementsByClassName(elem.id + "s").length + 1;
    if (document.getElementById(oldID)) {
      uniqueID(document.getElementById(oldID));
    } else {
      return elem;
    }
  }

  function Video_Interactivity_Timestamp(enterTime, endTime) {
    let timer = setInterval(() => {
      console.log(parseInt(video.time()), parseInt(enterTime));
      if (parseInt(video.time()) == parseInt(enterTime)) {
        video.pause();
        console.log("stopped");
        clearInterval(timer);
      }
    }, 1000);
  }

  function Add_Quiz(...args) {
    // Chapter automatically creates a background and transition animation.
    const textQuestion = args[2];
    const CorrectOption = args.pop();
    const optionQuestions = args.filter((data) => data !== "").slice(3);
    console.log(args);
    let enterTime = args[0];
    console.log(enterTime);
    var startChap = parseFloat(enterTime) - 0.625;
    // Make sure it doesn't try to start before the video starts
    if (startChap < 0) {
      startChap = 0;
    }
    if (startChap == 0) {
      startPlay = false;
    }
    endTime = parseFloat(enterTime) + 0.625;
    var generator_background = backgroundAndTrans(startChap, endTime);
    generator_background.style.display = "none";
    generator_background.classList.add("chapter_background");
    generator_background.style.pointerEvents = "none";
    generator_background.id = "chapter_background/" + enterTime;
    chapterText = document.createElement("div");

    generator_background.appendChild(chapterText);
    chapterText.innerHTML += `<h1 id="results"></h1><br>`;
    chapterText.innerHTML += textQuestion;
    for (let i = 0; i < optionQuestions.length; i++) {
      chapterText.innerHTML += `<br><button id='Option ${
        i + 1
      }' class="buttonQuiz option ${
        i + 1 == CorrectOption[CorrectOption.length - 1] ? "correct" : ""
      }" onclick="let btnOpts = document.querySelectorAll('.buttonQuiz');
    for(let i = 0; i < btnOpts.length; i++){
      btnOpts[i].classList.remove('correct')
    }
    this.classList.add('correct')
    ">${optionQuestions[i]}</button>`;
    }
    chapterText.innerHTML += `<br><button class="button" id="submit" onclick="let options = document.querySelectorAll('.buttonQuiz');
  let results = document.getElementById('results');
  for(let i = 0; i < options.length; i++){
    if(options[i].classList.contains('correct')){
      if(options[i].id === 'Option 2'){
        results.innerHTML = ('Correct')
        break;
      }
      else{
        results.innerHTML = ('Incorrect please try again.')
        break;
      }
    }
  }" tabindex="0"> <strong>Submit</strong></button>`;
    document.body.insertAdjacentHTML(
      "beforebegin",
      '<link rel="stylesheet" href="https://kaleem99.github.io/hostingContents/css/Interactivator.css"/>'
    );
    document.body.insertAdjacentHTML(
      "beforebegin",
      '<script src="https://kaleem99.github.io/hostingContents/content/QuizFunctionality.js"></script>'
    );

    chapterText.style.pointerEvents = "all";
    chapterText.classList.add("chapterText");

    chapterText.setAttribute("id", "QuizValue");
    chapterLine = document.createElement("div");
    chapterLine.classList.add("chapterLine");

    // Line must be slightly longer than the text
    // for (let i = 0; i < optionQuestions.length; i++) {
    //   const button = document.createElement("button");
    //   button.innerHTML = optionQuestions[i];
    //   document.getElementById("QuizValue").appendChild(button)
    // }
    function addLine(chapterText) {
      if (chapterText.offsetWidth > 0) {
        chapterLine.style.width = chapterText.offsetWidth + 100 + "px";
        chapterText.appendChild(chapterLine);
      } else {
        setTimeout(function () {
          addLine(chapterText);
        }, 500);
      }
    }
    addLine(chapterText);

    // Bind the chapter animation to the video
    video.bind("betweentimes", startChap, endTime, function (withinInterval) {
      if (withinInterval) {
        makeiOSSafe();
        generator_background = document.getElementById(
          "chapter_background/" + enterTime
        );
        generator_background.style.display = "flex";
        // hide all other generator_backgrounds
        for (
          var i = 0;
          i < document.getElementsByClassName("generator_background").length;
          i++
        ) {
          if (
            document.getElementsByClassName("generator_background")[i] !=
            generator_background
          ) {
            document.getElementsByClassName("generator_background")[
              i
            ].style.display = "none";
          }
        }
      } else {
        generator_background = document.getElementById(
          "chapter_background/" + enterTime
        );
        if (generator_background) {
          generator_background.style.display = "none";
        }
      }
      if (generator_background) {
        killSwitch(generator_background.parentElement);
      }
    });

    // The chapter takes up no real time in the video, so we have to pause and play again after a few seconds
    // Note, this is a little buggy
    video.bind(
      "betweentimes",
      parseFloat(enterTime),
      endTime,
      function (withinInterval) {
        if (withinInterval && video.state() == "playing") {
          video.pause();
          // setTimeout(function () {
          //   if (withinInterval) {
          //     video.play();
          //   }
          // }, 10000);
        }
        if (generator_background) {
          killSwitch(generator_background.parentElement);
        }
      }
    );
    console.log(document.querySelectorAll(".buttonQuiz"));
  }

  function addClassToFillPath(id) {
    // Adds a class to the fill path of a lottie animation so that it can be styled in CSS
    var elem = document.getElementById(id);
    if (elem) {
      elem.id = "";
      var path = elem.getElementsByTagName("path")[0];
      path.classList.add(id);
    }
  }

  // Interactive Functions start here

  function playbuzz(enterTime, endTime, link, scale, yAxis) {
    // Legacy function, needs some work. Haven't got this to work properly in the new Interactivator yet
    let frame = document.getElementById("frame");
    let moveMe = (document = document.getElementsByClassName("moveMe")[0]);
    enterTime = parseFloat(enterTime);
    endTime = parseFloat(enterTime) + 0.1;

    var js = document.createElement("script");
    js.innerHTML =
      "(function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(d.getElementById(id))return;js=d.createElement(s);js.id=id;js.src='https://embed.ex.co/sdk.js';fjs.parentNode.insertBefore(js,fjs);}(document,'script','exco-sdk'));console.log('added!');";
    frame.appendChild(js);

    if (scale == "") {
      scale = 1;
    }
    // if link ends with 'edit' remove it
    if (link.split("/")[link.split("/").length - 1] == "edit") {
      link = link.split("/").slice(0, -1).join("/");
    }
    var id = link.split("/")[link.split("/").length - 1];
    if (id == "") {
      id = link.split("/")[link.split("/").length - 2];
    }

    moveMe = document.createElement("div");
    // moveMe.style.height = "1%"
    moveMe.className = "moveMe";
    // moveMe.hidden = true
    moveMe.style.display = "none";
    moveMe.style.pointerEvents = "none";
    moveMe.style.justifyContent = "center";
    moveMe.style.alignItems = "center";

    if (yAxis == undefined) {
      yAxis = 25;
    }
    // let yAxis = 25
    // let scale = 1

    var div = document.createElement("div");
    // div.style.transformOrigin = "50% " + yAxis + "%"
    div.style.transform = "scale(" + scale + ")";
    div.setAttribute("data-id", id);
    div.setAttribute("data-show-share", "false");
    div.setAttribute("data-show-info", "false");
    div.className = "exco";
    div.style.width = "50%";
    div.style.margin = "auto";
    div.style.top = yAxis + "px";
    div.style.position = "absolute";

    // div.style.height = "20px"
    // div.style.backgroundColor = "red"
    // div.innerHTML = 'MOVE ME'

    moveMe.append(div);
    moveMe.hidden = true;

    frame.append(moveMe);
    let app;
    // check for element with id 'app' with interval
    video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
      if (withinInterval) {
        video.pause();
        makeiOSSafe();

        moveMe.style.display = "flex";
        moveMe.style.pointerEvents = "all";
      } else {
        moveMe.style.display = "none";
        moveMe.style.pointerEvents = "none";
      }
    });
    killSwitch();
  }

  function FlipCard(enterTime, endTime, question, answer, prompt) {
    // Legacy function, needs some work. Haven't got this to work properly in the new Interactivator yet
    enterTime = parseFloat(enterTime);
    endTime = parseFloat(enterTime) + 0.1;
    video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
      if (withinInterval) {
        makeiOSSafe();
        elem = createb4ckgr0un6();
        video.grid.left_inside.appendChild(elem);
        var frame = document.getElementById("frame");
        video.bind("heightchange", function () {
          setSize(elem);
        });
        video.pause();
        var event = document.getElementById("b4ckgr0un6");
        event.innerHTML =
          `
						  <div id="background">
							  <div id="flipCardBackground">
							  <input hidden type="checkbox" id="toggle">
							  <label for="toggle">
								  <div id="flip-card-container" class="flip-card-container">
								  <div class="flip-card">
									  <div class="flip-card-front">
									  <p id="question">` +
          question +
          `</p>
									  <span id="showAnswer" class="invisible">
										  <div></div>
										  <p>
										  Show answer
										  </p>
									  </span>
									  </div>
									  <div class="flip-card-back">
									  <p id="answer">` +
          answer +
          `</p>
									  </div>
								  </div>
								  </div>
							  </label>
							  <div id="textContainer">
								  <p id="FlipCardPrompt">Type your answer here</p>
								  <textarea autofocus id="studentInput">` +
          prompt +
          `</textarea>
							  </div>
							  </div>
						  </div>
					  `;
        var studentInput = document.getElementById("studentInput");
        studentInput.setSelectionRange(
          studentInput.value.length,
          studentInput.value.length
        );

        studentInput.addEventListener("input", function () {
          if (studentInput.value.length > prompt.length) {
            document.getElementById("flip-card-container").style.pointerEvents =
              "auto";
            document.getElementById("showAnswer").className = "";
          }
          var currentSize = parseFloat(
            window
              .getComputedStyle(studentInput, null)
              .getPropertyValue("font-size")
              .replace("px", "")
          );
          if (studentInput.clientHeight < studentInput.scrollHeight) {
            studentInput.style.fontSize = currentSize - 3 + "px";
          }
        });
        studentInput.focus();
      } else {
        video.grid.left_inside.removeChild(elem);
      }
    });
  }

  function lowerThird(enterTime, endTime, speaker, Left_or_Right, ltAnim) {
    // Interactive function with arguments sent by user
    if (ltAnim == undefined) {
      lt = document.createElement("div");
      lt.id = "bodyMovin";
      lt.style.width = "1000px";
      lt.style.height = "192px";
      lt.style.position = "absolute";
      lt.style.bottom = "108px";
      lt.style.pointerEvents = "all";
      if (Left_or_Right == "left") {
        lt.style.left = "94px";
        var ltAnim = lottieAnim(lt, lower3rdLeft);
      } else {
        lt.style.right = "94px";
        var ltAnim = lottieAnim(lt, lower3rdRight);
      }
      frame.appendChild(lt);
    }
    if (
      ltAnim.isLoaded &&
      document.getElementById("Name").getElementsByTagName("tspan").length > 0
    ) {
      // try {
      for (var i = 0; i < lwrThirdData.length; i++) {
        if (lwrThirdData[i][0] === speaker) {
          d1 = lwrThirdData[i][1];
          d2 = lwrThirdData[i][2];
          url = lwrThirdData[i][3];
        }
      }

      timeAnimation(ltAnim, parseFloat(enterTime));

      let nameElement = document.getElementById("Name");
      let Designation1 = document.getElementById("Designation1");
      let Designation2 = document.getElementById("Designation2");
      addClassToFillPath("strip1");
      addClassToFillPath("strip2");
      addClassToFillPath("strip3");
      uniqueID(nameElement);
      uniqueID(Designation1);
      uniqueID(Designation2);
      let nameTextEl = nameElement.getElementsByTagName("tspan")[0];
      let des1TextEl = Designation1.getElementsByTagName("tspan")[0];
      let des2TextEl = Designation2.getElementsByTagName("tspan")[0];
      nameTextEl.innerHTML = speaker;
      des1TextEl.innerHTML = d1;
      des2TextEl.innerHTML = d2;

      // adjust box size
      function displayTextWidth(text, font) {
        let canvas =
          displayTextWidth.canvas ||
          (displayTextWidth.canvas = document.createElement("canvas"));
        let context = canvas.getContext("2d");
        context.font = font;
        let metrics = context.measureText(text);
        return metrics.width;
      }

      // get longest text width for each text element
      let textElements = [nameTextEl, des1TextEl, des2TextEl];
      let textWidths = [];
      for (let i = 0; i < textElements.length; i++) {
        let fontSize = window
          .getComputedStyle(textElements[i], null)
          .getPropertyValue("font-size");
        let textWidth = displayTextWidth(textElements[i].textContent, fontSize);
        textWidths.push(textWidth);
      }
      let longestTextWidth = Math.max(...textWidths);
      if (longestTextWidth > 150) {
        let boxRatio = (longestTextWidth / 150) * 2;
        let holdingShape =
          document.getElementById("holdingShape").firstChild.firstChild;
        holdingShape.style.transform = "scaleX(" + boxRatio + ")";
      }

      if (url) {
        nameElement.style.cursor = "pointer";
        nameElement.onclick = function () {
          window.open(url, "_blank");
          video.pause();
        };
      }
      killSwitch(lt);
    } else {
      setTimeout(function () {
        lowerThird(enterTime, endTime, speaker, Left_or_Right, ltAnim);
      }, 100);
    }
  }

  function backgroundAndTrans(start, end) {
    // Background and into and outro transition animations
    // This is used for Chapters, Headings, and Bullets

    // WideEnterTime is to start the animation before the actual in point
    WideEnterTime = start - 0.5;
    graphicsContainer = document.getElementsByClassName("graphicsContainer")[0];
    var generator_background = document.createElement("div");
    generator_background.id = start + "/" + end;
    generator_background.className = "generator_background";
    generator_background.style.zIndex = "2";

    graphicsContainer.appendChild(generator_background);
    trans = document.createElement("div");
    trans2 = document.createElement("div");
    trans.className = "trans";
    trans2.className = "trans";
    graphicsContainer.appendChild(trans);
    graphicsContainer.appendChild(trans2);
    transAnim = lottieAnim(trans, transtition1Data, WideEnterTime);
    if (WideEnterTime > 0) {
      timeAnimation(transAnim, WideEnterTime);
    }
    timeAnimation(transAnim, end - 0.5);
    document.getElementsByClassName("w-bottom-bar")[0].style.zIndex = "3";
    if (!transAnim.isLoaded) {
      setTimeout(function () {
        backgroundAndTrans(start, end);
      }, 100);
    } else {
      addClassToFillPath("Colour1");
      addClassToFillPath("Colour2");
      addClassToFillPath("Colour3");
      addClassToFillPath("Colour1");
      addClassToFillPath("Colour2");
      addClassToFillPath("Colour3");
      return generator_background;
    }
  }

  function heading(enterTime, endTime, text, offset, Left_or_Right) {
    // Heading automatically creates a background and transition animation.
    // Necessary for bullets
    text = text.split("\n");
    enterTime = parseFloat(enterTime);
    endTime = parseFloat(endTime);

    var generator_background = backgroundAndTrans(enterTime, endTime);

    if (Left_or_Right == "right") {
      generator_background.style.right = "0px";
      generator_background.style.left = "auto";
      rightsideOffset = -50;
    }

    document.getElementsByTagName("video")[0].style.position = "absolute";
    var logo = document.getElementById("logo");
    video.bind("betweentimes", enterTime, endTime, function (withinInterval) {
      if (withinInterval) {
        makeiOSSafe();
        generator_background.style.display = "flex";
        document.getElementsByTagName("video")[0].style.left =
          25 + parseInt(offset) + rightsideOffset + "%";
        if (logo) {
          logo.style.display = "none";
        }
        for (
          var i = 0;
          i < document.getElementsByClassName("generator_background").length;
          i++
        ) {
          if (
            document.getElementsByClassName("generator_background")[i] !=
            generator_background
          ) {
            document.getElementsByClassName("generator_background")[
              i
            ].style.display = "none";
          }
        }
      } else {
        generator_background.style.display = "none";
        document.getElementsByTagName("video")[0].style.left = "0%";
        if (logo) {
          logo.style.display = "block";
        }
      }
      if (generator_background) {
        killSwitch(generator_background.parentElement);
      }
    });
    if (text != "") {
      var heading1 = document.createElement("div");
      heading1.innerHTML =
        '<div class="headingtext">' + text[0].toUpperCase() + "</div>";
      var heading2 = document.createElement("div");
      if (text.length > 1) {
        heading2.innerHTML =
          '<div class="headingtext">' + text[1].toUpperCase() + "</div>";
      } else {
        heading2.innerHTML = '<div class="headingtext"></div>';
      }

      function addHeading(heading, enterTime, endTime, className) {
        video.bind(
          "betweentimes",
          enterTime,
          endTime,
          function (withinInterval) {
            if (withinInterval) {
              if (
                (video.time() > enterTime &&
                  video.time() < enterTime + 0.8 &&
                  video.state() == "playing") ||
                (video.time() == enterTime && video.state() == "paused")
              ) {
                heading.className = className + " transition";
              } else {
                heading.className = className;
              }
              if (
                Array.from(generator_background.children).indexOf(heading) == -1
              ) {
                generator_background.appendChild(heading);
              }
            } else {
              if (
                Array.from(generator_background.children).indexOf(heading) > -1
              ) {
                generator_background.removeChild(heading);
              }
            }
          }
        );
      }
      addHeading(heading1, enterTime + 0.5, endTime, "heading");
      addHeading(heading2, enterTime + 0.8, endTime, "heading line2");
    }
  }

  function chapter(enterTime, text) {
    // Chapter automatically creates a background and transition animation.
    var startChap = parseFloat(enterTime) - 0.625;
    // Make sure it doesn't try to start before the video starts
    if (startChap < 0) {
      startChap = 0;
    }
    if (startChap == 0) {
      startPlay = false;
    }
    endTime = parseFloat(enterTime) + 0.625;

    var generator_background = backgroundAndTrans(startChap, endTime);
    generator_background.style.display = "none";
    generator_background.classList.add("chapter_background");
    generator_background.style.pointerEvents = "none";
    generator_background.id = "chapter_background/" + enterTime;
    chapterText = document.createElement("div");
    generator_background.appendChild(chapterText);
    chapterText.innerHTML = text;
    chapterText.style.pointerEvents = "all";
    chapterText.classList.add("chapterText");
    chapterLine = document.createElement("div");
    chapterLine.classList.add("chapterLine");

    // Line must be slightly longer than the text
    function addLine(chapterText) {
      if (chapterText.offsetWidth > 0) {
        chapterLine.style.width = chapterText.offsetWidth + 100 + "px";
        chapterText.appendChild(chapterLine);
      } else {
        setTimeout(function () {
          addLine(chapterText);
        }, 500);
      }
    }
    addLine(chapterText);

    // Bind the chapter animation to the video
    video.bind("betweentimes", startChap, endTime, function (withinInterval) {
      if (withinInterval) {
        makeiOSSafe();
        generator_background = document.getElementById(
          "chapter_background/" + enterTime
        );
        generator_background.style.display = "flex";
        // hide all other generator_backgrounds
        for (
          var i = 0;
          i < document.getElementsByClassName("generator_background").length;
          i++
        ) {
          if (
            document.getElementsByClassName("generator_background")[i] !=
            generator_background
          ) {
            document.getElementsByClassName("generator_background")[
              i
            ].style.display = "none";
          }
        }
      } else {
        generator_background = document.getElementById(
          "chapter_background/" + enterTime
        );
        if (generator_background) {
          generator_background.style.display = "none";
        }
      }
      if (generator_background) {
        killSwitch(generator_background.parentElement);
      }
    });

    // The chapter takes up no real time in the video, so we have to pause and play again after a few seconds
    // Note, this is a little buggy
    video.bind(
      "betweentimes",
      parseFloat(enterTime),
      endTime,
      function (withinInterval) {
        if (withinInterval && video.state() == "playing") {
          video.pause();
          setTimeout(function () {
            if (withinInterval) {
              video.play();
            }
          }, 10000);
        }
        if (generator_background) {
          killSwitch(generator_background.parentElement);
        }
      }
    );
  }

  function bullet(enterTime, endTime, text) {
    // Bullets must happen during a heading. endTime input is meaningless because it will last as long as the heading.
    // CSS determines animations and positioning of the bullets.
    enterTime = parseFloat(enterTime);
    endTime = video.duration() + 1;
    var generator_backgrounds = document.getElementsByClassName(
      "generator_background"
    );
    if (generator_backgrounds.length > 0) {
      var generator_background = false;
      for (var i = 0; i < generator_backgrounds.length; i++) {
        var scope = generator_backgrounds[i].id.split("/");
        if (
          parseFloat(scope[0]) <= enterTime &&
          parseFloat(scope[1]) >= enterTime
        ) {
          generator_background = generator_backgrounds[i];
        }
      }
      if (generator_background) {
        var bullets = generator_background.getElementsByClassName("bullets")[0];
        if (bullets == null) {
          bullets = document.createElement("div");
          bullets.className = "bullets";
          generator_background.appendChild(bullets);
        }
        var bullet = document.createElement("div");
        bullet.innerHTML =
          `<div class="bulletpoint">&bull;</div><div class="bullettext">` +
          text +
          `</div>`;
        bullet.firstChild.onclick = function () {
          video.time(enterTime);
        };
        bullet.id = "bullet" + enterTime + text;
        video.bind(
          "betweentimes",
          enterTime,
          endTime,
          function (withinInterval) {
            if (withinInterval) {
              if (
                (video.time() > enterTime &&
                  video.time() < enterTime + 0.4 &&
                  video.state() == "playing") ||
                (video.time() == enterTime && video.state() == "paused")
              ) {
                bullet.className = "bullet transition";
                bullets.appendChild(bullet);
              } else {
                bullet.className = "bullet";
                var bulletsList = Array.from(bullets.children);
                bulletsList.push(bullet);
                bulletsList.sort((a, b) => {
                  return a.id - b.id;
                });
                bullets.innerHTML = "";
                for (var i = 0; i < bulletsList.length; i++) {
                  bulletsList[i].className = "bullet";
                  bullets.appendChild(bulletsList[i]);
                }
              }
            } else {
              if (Array.from(bullets.children).indexOf(bullet) > -1) {
                bullets.removeChild(bullet);
              }
            }
          }
        );
      }
    }
  }

  function logo(start, end, url) {
    // Logo function added by default bt can be edited.
    // URL set by user to choose variations.
    if (end == video.duration()) {
      end = video.duration() + 1;
    }
    video.bind("betweentimes", start, end, function (withinInterval) {
      if (withinInterval) {
        var logo = document.createElement("img");
        logo.src = url;
        logo.id = "logo";
        logo.style.pointerEvents = "none";
        logo.style.position = "absolute";
        logo.height = "1080";
        logo.width = "1920";
        logo.className = "eternal";
        frame.appendChild(logo);
        killSwitch(logo);
      } else {
        var logo = document.getElementById("logo");
        if (logo) {
          logo.remove();
        }
      }
    });
  }

  function execute(chapters, functions) {
    // This is what actually executes the interactive functions set by user
    // We have to keep trying until all the prerequisites are loaded
    try {
      var b4ckgr0un6 = document.getElementById("b4ckgr0un6");
      // Some cleanup
      if (b4ckgr0un6) {
        b4ckgr0un6.remove();
      }
      addFrame();
      chapters = eval(chapters);
      var proceed = false;

      // Make sure everything is loaded
      if (
        lwrThirdData &&
        transtition1Data &&
        lottie &&
        bodymovin &&
        graphicsContainer
      ) {
        proceed = true;
      }
    } catch (err) {
      setTimeout(function () {
        execute(chapters, functions);
      }, 100);
    }
    if (proceed) {
      generalLottie();
      for (var i = 0; i < chapters.length; i++) {
        chapter(chapters[i][0], chapters[i][1]);
      }
      eval(functions);
      // StartPlay is set based on if there is an intro or not, so user doesn't click play twice
      if (startPlay) {
        video.play();
      } else {
        setTimeout(function () {
          if (video.time() == 0) {
            video.play();
          }
        }, 10000);
      }
    }
    if (outro != "") {
      video.addToPlaylist(outro, { transition: "none" });
    }
  }

  // -- cut here --
  // Below only runs when pulling from Interactivator.js on AWS
  window._wq = window._wq || [];
  _wq.push({
    id: WistiaId,
    onReady: function (video) {
      execute(chapters, functionList);
    },
  });
});
