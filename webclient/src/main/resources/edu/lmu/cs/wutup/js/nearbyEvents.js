var loadPageFunctionality = function(baseUrl, user) {
	"use strict";

	jQuery.fn.getHtmlString = function() {
	    return $(this).get()[0].outerHTML;
	}

    var map, infowindow,
        calculateRadius = function (bounds) {
            if (Number.prototype.toRad === undefined) {
                Number.prototype.toRad = function () {
                    return this * Math.PI / 180;
                };
            }
            var R = 3959, // Statute Mile
                center = bounds.getCenter(),
                corner = bounds.getNorthEast(),
                lat1 = center.lat().toRad(),
                lat2 = corner.lat().toRad(),
                dLat = (lat2 - lat1).toRad(),
                dLon = (corner.lng() - center.lng()).toRad(),
                a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2),
                c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        },
        
        generateEventfulURL = function (center,radius, start, end) {
        	var parseDate = function (date) {
        		var month = (date.getMonth() < 10 ? '0' + (date.getMonth() + 1): (date.getMonth() + 1) + ''),
        			day = (date.getDate() < 10 ? '0' + date.getDate(): date.getDate());
        			return date.getFullYear() + month + day + '00';
        	};
        	return	'http://api.eventful.com/json/events/search?app_key=mf6JvWZ6Ss8MGZBM&where=' + center.lat() + ',' + center.lng() + '&within=' + (radius <= 100 ? radius : 100) + 
        	'&page_number=0&page_size=50&sort_order=popularity&date=' + parseDate(start) + '-'+ parseDate(end);
        },

        generateOccurrenceURL = function (center, radius, start, end) {
            return baseUrl + ':8080/wutup/occurrences?page=0&pageSize=20&center=' + center.lat() + ',' + center.lng() + '&radius=' + (radius <= 100 ? radius : 100) + '&start=' + start.getTime() +
                '&end=' + end.getTime();
        },
        
	    generateAttendeeByOccurrenceUrl = function (occurrence) {
	    	return baseUrl + ':8080/wutup/occurrences/' + occurrence.id + '/attendees';
	    },

        generateAttendingButton = function (occurrence, attendingStatus) {
        	var attendingButton = $('<button id="marker-attend-btn" class="btn btn-success">')
        			.text("Attend Event!") ;
        	if(attendingStatus) { attendingButton.addClass("hidden"); }
        	return $(attendingButton).getHtmlString();
        },
        
        generateDeclineButton = function (occurrence, attendingStatus) {
        	var declineButton = $('<button id="marker-decline-btn" class="btn btn-danger">')
        			.text("Decline Event") ;
        	if(!attendingStatus) { declineButton.addClass("hidden"); }
        	return $(declineButton).getHtmlString();
        },
        
        generateAttendAndDeclineButtons = function (occurrence, infowindow) {
        	var attendingEvent = false, buttons;
        	var checkAttendance = $.getJSON(generateAttendeeByOccurrenceUrl(occurrence), function(attendees) {
        		if ($.grep(attendees, function (attendee) { return attendee.id === user.id }).length > 0) {
        			attendingEvent = true;
        		}
        	});
        	
        	$.when(checkAttendance).done(function() {
        		buttons = generateAttendingButton(occurrence, attendingEvent) + generateDeclineButton(occurrence, attendingEvent);
        		setTimeout(function() {
            		infowindow.setContent(infowindow.content + buttons);
            		armMarkerButtons(occurrence);
            	},100);
        	});
        },
        

        armMarkerAttendButton = function (occurrence) {
            $("#marker-attend-btn").click(function () {
                $.ajax({
                    type: "POST",
                    url: baseUrl + ':8080/wutup/occurrences/' + occurrence.id + '/attendees',
                    data: JSON.stringify(user.id),
                    contentType:"application/json"
                });
                $("#marker-attend-btn").toggleClass("hidden");
                $("#marker-decline-btn").toggleClass("hidden");
            });
        },
        
        armMarkerDeclineButton = function (occurrence) {
        	$("#marker-decline-btn").click(function () {
                $.ajax({
                    type: "DELETE",
                    url: baseUrl + ':8080/wutup/occurrences/' + occurrence.id + '/attendees/' + user.id,
                    contentType:"application/json"
                });
                $("#marker-attend-btn").toggleClass("hidden");
                $("#marker-decline-btn").toggleClass("hidden");
        	});
        },
        
        armMarkerButtons = function (occurrence) {
        	armMarkerAttendButton(occurrence);
        	armMarkerDeclineButton(occurrence);
        },

        displayInfoWindow = function (occurrence) {
        	var start = occurrence.start, end = occurrence.end, event = occurrence.event, venue = occurrence.venue;
            if (infowindow) {
                infowindow.close();
            }
            infowindow = new google.maps.InfoWindow({
                content: event.name + '</br>' + start.toLocaleDateString() + ': ' + start.toLocaleTimeString() + ' - ' + end.toLocaleTimeString() + '</br>' + (user != undefined ? "<div id='buttons'></span>" : ''),
                position: new google.maps.LatLng(occurrence.venue.latitude, occurrence.venue.longitude)
            });
            infowindow.setOptions({maxHeight:400});
            generateAttendAndDeclineButtons(occurrence, infowindow);
            infowindow.open(map);
        },

        displayEventInfo = function (occurrence) {
            $("#result").html(function () {
                return "<h3>" + occurrence.event.name + "</h3>" + "<p>" + occurrence.event.description + "</p>" + "<h4>" + occurrence.venue.name + "</h4>" + "<p><b>Address:</b> " + occurrence.venue.address + "</p>" + "<p><b>Start:</b> " + occurrence.start + "</p>" + "<p><b>End:</b> " + occurrence.end + "</p>";
            });

        },

        createMarker = function (occurrence) {
            var marker = new google.maps.Marker({
                map: map,
                position: new google.maps.LatLng(occurrence.venue.latitude, occurrence.venue.longitude),
                title: occurrence.event.name,
                animation: google.maps.Animation.DROP
            });
            google.maps.event.addListener(marker, 'click', function () {
                displayInfoWindow(occurrence);
                displayEventInfo(occurrence);
            });
            return marker;
        },

        populateMap = function (gMap, events, mapMarkers) {
            var i,
                deleteOverlays = function () {
                    if (mapMarkers) {
                        for (i = 0; i < mapMarkers.length; i += 1) {
                            mapMarkers[i].setMap(null);
                        }
                    }
                    mapMarkers.length = 0;
                };
            deleteOverlays();
            for (i = 0; i < events.length; i += 1) {
                mapMarkers.push(createMarker(events[i]));
            }
        },
        
        parseOccurrencesForCalendar = function (occurrences) {
            var calendarEvents = [],
                i;
            for (i = 0; i < occurrences.length; i += 1) {
                calendarEvents.push({
                	id: occurrences[i].id,
                	title: occurrences[i].event.name,
                	start: new Date(occurrences[i].start),
                	end: new Date(occurrences[i].end),
                	event: occurrences[i].event,
                	venue: occurrences[i].venue,
                	allDay: false
                });
            }
            return calendarEvents;
        },

        parseEventfulResponseForCalendar = function (response) {
            var calendarEvents = [],
                i, startDate, endDate;
                
            for (i = 0; i < response.events.event.length; i += 1) {
            	startDate = new Date(response.events.event[i].start_time);
            	startDate.setHours(startDate.getHours() + 1);
            	endDate = startDate;
                calendarEvents.push({
                    id: response.events.event[i].id,
                    title: response.events.event[i].title,
                    start: new Date(response.events.event[i].start_time),
                    end: (response.events.event[i].stop_time === null ? endDate : new Date(response.events.event[i].stop_time)),
                    event: { name: response.events.event[i].title, description: response.events.event[i].description },
                    venue: { name: response.events.event[i].venue_name, address: response.events.event[i].venue_address, latitude: response.events.event[i].latitude, longitude: response.events.event[i].longitude},
                    allDay: false
                });
            }
            return calendarEvents;
        },

        populateCalendar = function (calendarEvents) {
        	var eventSourceObject = { events: calendarEvents};
            $('#calendar').fullCalendar('removeEventSource', calendarEvents);
            $('#calendar').fullCalendar('removeEvents');
            $('#calendar').fullCalendar('addEventSource', eventSourceObject);
        },

        createCalendar = function (calendarEvents, map, mapMarkers) {
            var calendar = $('#calendar').fullCalendar({
                header: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'month,agendaWeek,agendaDay'
                },
                theme: true,
                editable: false,
                disableDragging: true,
                dayClick: function (date, allDay) {
                    if (allDay) {
                        calendar.fullCalendar('gotoDate', date.getFullYear(), date.getMonth(), date.getDate());
                        calendar.fullCalendar('changeView', 'agendaDay');
                    }
                },
                viewDisplay: function (view) { // This function controls behavior when the calendar view is changed
                    var bounds = map.getBounds(),
                        radius = calculateRadius(bounds),
                        allOccurrences;
                    $.getJSON(generateOccurrenceURL(bounds.getCenter(), radius, view.start, view.end), function (occurrences) {
                    	$.getJSON(generateEventfulURL(bounds.getCenter(), radius, view.start, view.end), function (response) {
	                        occurrences = parseOccurrencesForCalendar(occurrences);
	                    	response = parseEventfulResponseForCalendar(response);
	                    	allOccurrences = occurrences.concat(response)
	                        populateCalendar(allOccurrences);
	                        populateMap(map, allOccurrences, mapMarkers);
                    	});
                    });
                },
                eventClick: function (event) { //'event' is used here instead of 'occurrence' due to fullcalendar.js documentation
                    displayInfoWindow(event);
                    displayEventInfo(event);
                },
                events: calendarEvents,
                eventRender: function(event, element) {
                }
            });
        },

        getCalendarView = function () {
            return $('#calendar').fullCalendar('getView');
        },

        instantiateMapAndCalendar = function () {
            var initialLocation, siberia = new google.maps.LatLng(60, 105),
                newyork = new google.maps.LatLng(40.69847032728747, -73.9514422416687),
                browserSupportFlag = false,
                calendarEvents = null,
                mapOptions = {
                    zoom: 15,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                },
                mapMarkers = [],
                handleNoGeolocation = function (errorFlag) {
                    if (errorFlag === true) {
                        alert("Geolocation service failed.");
                        initialLocation = newyork;
                    } else {
                        alert("Your browser doesn't support geolocation. We've placed you in Siberia.");
                        initialLocation = siberia;
                        infowindow = new google.maps.InfoWindow({
                            map: map,
                            position: initialLocation,
                            content: 'Here\'s what\'s going on in Siberia...'
                        });
                    }
                    map.setCenter(initialLocation);
                };
            map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

            // Trying W3C Geolocation
            if (navigator.geolocation) {
                browserSupportFlag = true;
                navigator.geolocation.getCurrentPosition(function (position) {
                    initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    map.setCenter(initialLocation);
                    google.maps.event.addListenerOnce(map, 'idle', function () {
                        createCalendar(null, map, mapMarkers);
                    });
                    var bounds, radius, center, allOccurrences;
                    google.maps.event.addListener(map, 'idle', function () {
                        bounds = map.getBounds();
                        center = bounds.getCenter();
                        radius = calculateRadius(bounds);
                        $.getJSON(generateOccurrenceURL(bounds.getCenter(), radius, getCalendarView().start, getCalendarView().end), function (occurrences) {
                        	$.getJSON(generateEventfulURL(bounds.getCenter(), radius, getCalendarView().start, getCalendarView().end), function (response) {
    	                        occurrences = parseOccurrencesForCalendar(occurrences);
    	                    	response = parseEventfulResponseForCalendar(response);
    	                    	allOccurrences = occurrences.concat(response)
    	                        populateCalendar(allOccurrences);
    	                        populateMap(map, allOccurrences, mapMarkers);
                        	});
                        });

                    });

                }, function () {
                    handleNoGeolocation(browserSupportFlag);
                });

                // Browser doesn't support Geolocation
            } else {
                browserSupportFlag = false;
                handleNoGeolocation(browserSupportFlag);
            }

        };

    instantiateMapAndCalendar();
    //Start your Engines!

};