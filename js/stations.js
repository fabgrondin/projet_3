var stationsMarkers = [],
    station, intervalID, counter;


class Booking {
    constructor(number, name) {
        this.number = number;
        this.name = name;
        this.time = Date.now();
    }
}

function stationStatus(number) {

    // API REST JCDecaux
    var reqUrl = "https://api.jcdecaux.com/vls/v1/stations/" + number + "?contract=lyon&apiKey=a077fde6a261a60b1653cd0462c51eb664a29501";
    var reqStation = new XMLHttpRequest();
    reqStation.open("get", reqUrl, true);
    reqStation.send();
    reqStation.onload = function () {
        station = JSON.parse(reqStation.response);

        // Update station informations
        $('#info_station').css('display', 'block');

        var index = station.name.indexOf('-');
        station.name = station.name.slice(index + 1);
        $('#name_station').text(station.name);
        $('#address_station').text(station['address']);

        var status = (station.status === 'OPEN') ? 'ouvert' : 'fermé';
        $('#status').text('État : ' + status);

        var banking = (station.banking) ? 'oui' : 'non';
        $('#banking').text('Terminal de paiement : ' + banking);

        $('#bike_stands').text(station.bike_stands + ' places');
        $('#available_bikes').text(station.available_bikes + ' vélos disponibles');

        var lastUpdate = new Date(station.last_update);
        $('#last_update').text('Mise à jour à : ' + lastUpdate.getHours() + 'h' + lastUpdate.getMinutes() + 'min' + lastUpdate.getSeconds() + 's');
    };
}

function bookingStatus() {
    var minutes = Math.floor(sessionStorage.counter / 60);
    var seconds = sessionStorage.counter - minutes * 60;

    $('#booking_panel p').html('1 vélo réservé à la station ' + sessionStorage.name + ' pour ');
    $('#booking_panel p').append('<span id="counter">' +
        minutes + ' min ' + seconds + ' s</span>');
}

function updateStatus() {
    sessionStorage.counter--;
    var minutes = Math.floor(sessionStorage.counter / 60);
    var seconds = sessionStorage.counter - minutes * 60;
    $('#counter').text(minutes + ' min ' + seconds + ' s');
    if (sessionStorage.counter <= 0) {
        clearInterval(intervalID);
        $('#booking_panel p').html('Votre réservation à la station ' + sessionStorage.name + ' a expirée.');
        setTimeout(function () {
            $('#booking_panel p').html('');
        }, 4000);
    }
}

window.onload = function () {
    // Recovery of the last booking
    if (sessionStorage.length > 0) {
        sessionStorage.counter = 1200 - Math.floor((Date.now() - sessionStorage.time) / 1000);
        if (sessionStorage.counter > 0) {
            bookingStatus();
            intervalID = setInterval("updateStatus();", 1000);
        }
    }

    var stations;
    // Recovery of the stations list
    var request = new XMLHttpRequest();
    request.open('get', 'data/Lyon.json', true);
    request.send();
    request.onload = function () {
        stations = JSON.parse(this.responseText);
        var bikeIcon = {
            url: 'data/bike.png',
            size: new google.maps.Size(40, 52),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 52)
        };
        // Add stations markers to the map
        stations.forEach(function (station) {
            var latLng = new google.maps.LatLng(station['latitude'], station['longitude']);
            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                visible: false,
                icon: bikeIcon
            });
            google.maps.event.addListener(marker, 'click', function () {
                stationStatus(this.number);
            });
            marker.number = station['number'];
            stationsMarkers.push(marker);
        });

        // Add markers clusterer
        var clusterStyles = [
            {
                url: 'data/bike.png',
                height: 52,
                width: 40,
                anchor: [27, 0],
                textSize: 12
            }
        ]

        var mcOptions = {
            gridSize: 100,
            styles: clusterStyles,
            maxZoom: 15
        }

        var markerCluster = new MarkerClusterer(map, stationsMarkers, mcOptions);

    };

    // Change markers on zoom
    google.maps.event.addListener(map, 'zoom_changed', function () {
        var zoom = map.getZoom();
        stationsMarkers.forEach(function (marker) {
            marker.setVisible(zoom >= 14);
        });
    });

    // Booking button
    $('#booking_btn').click(function () {
        $('#canvas_container').slideDown(400);
    });

    // Confirm button
    $('#confirm_btn').click(function () {
        var booking = new Booking(station.number, station.name);
        sessionStorage.name = booking.name;
        sessionStorage.time = booking.time;
        sessionStorage.counter = 1200;
        bookingStatus();
        clearInterval(intervalID);
        intervalID = setInterval("updateStatus();", 1000);
    });

    // Canvas confirmation
    var context = document.getElementById('canvas').getContext("2d");

    var clickX = new Array();
    var clickY = new Array();
    var clickDrag = new Array();
    var paint;

    function addClick(x, y, dragging) {
        clickX.push(x);
        clickY.push(y);
        clickDrag.push(dragging);
    }

    function redraw() {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.stokeStyle = "#df4b26";
        context.lineJoin = "round";
        context.lineWidth = 5;

        for (var i = 0; i < clickX.length; i++) {
            context.beginPath();

            if (clickDrag[i] && i) {
                context.moveTo(clickX[i - 1], clickY[i - 1]);
            } else {
                context.moveTo(clickX[i] - 1, clickY[i] - 1);
            }
            context.lineTo(clickX[i], clickY[i]);
            context.closePath();
            context.stroke();
        }
    }

    $('#canvas').mousedown(function (e) {
        var mouseX = e.pageX - this.offsetLeft;
        var mouseY = e.pageY - this.offsetTop;
        paint = true;
        addClick(mouseX, mouseY);
        redraw();
    });

    $('#canvas').mousemove(function (e) {
        if (paint) {
            addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
            redraw();
        }
    });

    $('#canvas').mouseup(function (e) {
        paint = false;
    });

    $('#canvas').mouseleave(function (e) {
        paint = false;
    });
};
