chrome.runtime.onMessage.addListener(gotMessage);

/* Reciever function for recieving onclick messages from background.js */
function gotMessage(request, sender, sendResponse) {

  if (request.txt == "are you there?") {

  // Will respond to messages asking if this script has already been injected in a webpage
    sendResponse({message: "yes!"});

  } else if (request.txt == "onClicked") {

    addToCalendar();

  }
}

/* Adds event information onto google calendar event and registers API calls? */
function addToCalendar() {
    // FB tag variables
    var titleTagFb = "seo_h1_tag";
    var timeTagFb = "_2ycp _5xhk";
    var locationTagFbFull = "_5xhp fsm fwn fcg";
    var locationTagFbShort = "_5xhk";
    var locationTagFbAlternate = "u_0_18";
    var detailsTagFb = "_63ew";

  if (window.location.href.includes("/calendar.google.com")) {
    // Don't do anything if we are on the google calendar page. This triggers because the url
    // has the facebook event link in it, making the icon active.
    return;
  }
  // Do some crude webscraping to avoid needing user permissions to access event info.
  try {
    var title = document.getElementById(titleTagFb).textContent;
  } catch (e) {
    alert("Please wait for the title to load. - AddToCalendar Bot");
    return;
  }

  try {
    var time = document.getElementsByClassName(timeTagFb)[0].getAttribute("content");
  } catch (e) {
    alert("Please wait for the time to load. - AddToCalendar Bot");
    return;
  }

  try {
    // Second senario for location is for event pages with multiple dates (bugs out when there is no location as u_0_18 gets replaced by something else)
    var location = document.getElementsByClassName(locationTagFbFull)[1].textContent ||
      document.getElementsByClassName(locationTagFbShort)[1].textContent ||
      document.getElementsByClassName(locationTagFbFull)[2].textContent ||
      document.getElementById(locationTagFbAlternate).textContent;

    // Check if we accidentally got the wrong value for location (e.g. location = OCT12Fri8:00 PMOCT13Sat8:00 PMOCT14Sun5:00 PM 3)
    if (location.includes(":")) {
      location = document.getElementsByClassName(locationTagFbFull)[2].textContent ||
      document.getElementById(locationTagFbAlternate).textContent;
    }

  } catch (e) {
    var location = "";
  }

  try {
  	var details = document.getElementsByClassName(detailsTagFb) ? document.getElementsByClassName(detailsTagFb)[0].innerText : null;
  } catch (e) {
  	alert('Please click the "About" tab on this event page if you want to add event details to your calendar. - AddToCalendar Bot');
  	var details = "";
  }

  /* //For debugging purposes
  console.log("Title: " + title);
  console.log("Time: " + time);
  console.log("Location: " + location);
  console.log("Description: " + details); */

  // Parse the time to a readable format for Google Calendar

  // If end time exists, add both start and end times.
  if (time.indexOf('to') != -1) { // if there is a "to" in the time string

    // based on this input format from Facebook: time = "2018-10-04T12:00:00-07:00 to 2018-10-04T14:00:00-07:00"

    var startTime = new Date(time.substring(0, time.indexOf('to') - 1));
    //console.log("Start time: " + startTime);

    var endTime = new Date(time.substring(time.indexOf('to') + 3, time.length));
    //console.log("End time: " + endTime);

  } else {
    // Set end time equal to start time + 1 hour
    var startTime = new Date(time);
    var endTime = new Date(startTime.getTime());
    endTime.addHours(1);
  }

  // Form time string that Google can parse
  time = startTime.toISOString().replace(/-|:|\.\d\d\d/g,"") + "/" + endTime.toISOString().replace(/-|:|\.\d\d\d/g,"");


  /* Put information into a google calendar url and launch in new window (modified code from: https://github.com/borismasis/send-to-calendar)*/
  /* Reference info from https://stackoverflow.com/questions/10488831/link-to-add-to-google-calendar
    href="http://www.google.com/calendar/event?
    action=TEMPLATE
    &text=[event-title]
    &dates=[start-custom format='Ymd\\THi00\\Z']/[end-custom format='Ymd\\THi00\\Z']
    &details=[description]
    &location=[location]
    &trp=false
    &sprop=
    &sprop=name:"

    To convert to the datetime format: (new Date()).toISOString().replace(/-|:|\.\d\d\d/g,"");
  */

  // Max URI length is 2000 chars, but we will keep under 1850
  // to also allow a buffer for google login/redirect urls etc.
  // (This limit is not a hard limit in the code,
  // but won't surpass it by more than a few tens of chars.)
  var maxLength = 1850;

  // Start building the URL
	var url = "http://www.google.com/calendar/event?action=TEMPLATE";

  // Make sure the &, +, and + characters in the title don't mess up the url encoding.
  title = cleanStringForURL(title);

  // Page title to event title
  url += "&text=" + TrimURITo(title, maxLength);

  // Add time to event
  url += "&dates=" + time;

  // Check if the selected text contains a US formatted address
  // and it its first 100 chars to URI if so
  if (location) {
      // Location goes to location
      url += "&location=" + TrimURITo(location, maxLength - url.length);
  }

  // Make sure the & and # characters in the description don't mess up the url encoding.
  details = cleanStringForURL(details);

  // Store and clean url of Facebook event page
  var fbURL = window.location.href;
  if (fbURL.indexOf("?") != -1) {
    fbURL = fbURL.substring(0, fbURL.indexOf("?"));
  }
  // URL goes to star of details (event description) as well as a link to the event.
  url += "&details=" + "Event link: " + fbURL + "%0A%0A" + TrimURITo(details, maxLength - url.length);


  // Send message back to background.js with constructed url to open in new tabs
  chrome.runtime.sendMessage({url: url});

}

// Replaces all instances of a string with another string. Code from:
// https://stackoverflow.com/questions/2116558/fastest-method-to-replace-all-instances-of-a-character-in-a-string
String.prototype.replaceAll = function(str1, str2, ignore)
{
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
}


// Adds hours to date object. Code from: https://stackoverflow.com/questions/1050720/adding-hours-to-javascript-date-object
Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
}

/* Function from modified code from: https://github.com/borismasis/send-to-calendar) */
// Trim text so that its URI encoding fits into the length limit
// and return its URI encoding
function TrimURITo(text, length) {
    var textURI = encodeURI(text);
    if (textURI.length > length) {
        // Different charsets can lead to a different blow-up after passing the
        // text through encodeURI, so let's estimate the blow up first,
        // and then trim the text so that it fits the limit...
        var blowUp = textURI.length/text.length;
        var newLength = Math.floor(length / blowUp) - 3;  // -3 for "..."
        do {
            // trim the text & show that it was trimmed...
            text = text.substring(0, newLength) + "...";
            textURI = encodeURI(text);
            newLength = Math.floor(0.9 * newLength);
        } while (textURI.length > length);
    }

    return textURI;
}

// Makes sure a string doesn't mess with the url encoding
function cleanStringForURL(str) {
  str = str.replaceAll("&", "and");
  str = str.replaceAll("+", "and");
  str = str.replaceAll("#", "number ");
  return str;
}
