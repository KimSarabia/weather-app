"use strict";

$(document).ready(init);

var providedAddress, cityState, feelsLike, weather, dateTime, currentIcon;

var LOCALSTORAGE_LOCATIONS_KEY = "weather_locations";

// create, read, update, delete
var WeatherLocationCRUD = {
    get: function () {
        var existingLocations = [];
        try {
            existingLocations = JSON.parse(localStorage.getItem(LOCALSTORAGE_LOCATIONS_KEY)) || [];
        } catch (e) {}
        return existingLocations;
    },
    update: function (locations) {
        localStorage.setItem(LOCALSTORAGE_LOCATIONS_KEY, JSON.stringify(locations));
    },
    add: function (locationToAdd) {
        var existingLocations = this.get();
        if (~existingLocations.indexOf(locationToAdd)) {
            return;
        }
        existingLocations.push(locationToAdd);
        this.update(existingLocations);
    },
    remove: function (locationToDelete) {
        var existingLocations = this.get();
        var index = existingLocations.indexOf(locationToDelete);

        //   0 1
        // ~ ---
        //   1 0
        if (~index) {
            existingLocations.splice(index, 1);
        }
        this.update(existingLocations);
    },
    getAll: function () {
        return this.get().reverse();
    }
};

function init() {
  pullCurrentWeather();
  $("#quickFind").click(pullForecastInfo); //
}

$('input').keypress(function (event) {
   var key = event.which;
   if (key == 13) {
      pullForecastInfo(); //
    }
});

function pullCurrentWeather(callback){
  $.ajax({
    url: "https://api.wunderground.com/api/d8483e016960a875/geolookup/q/autoip.json",
    type: "GET",
    success: function(data){
      appendZip(data);
      pullForecastInfo(data); //
    },
    error: function(err){
      alert(err);
    }
  })
}

function appendZip(data){
  providedAddress = data.location.city + ", " + data.location.country_name;
  $("#location").val(providedAddress);
}

function getWeatherAndForecast(providedLocation, callback) {
    var weatherData = {
        conditions: null,
        forecast: null
    };

    var complete = 0;
    function check() {
        if (++complete == 2) {
            callback(null, weatherData);
        }
    }

    // Timeline:  |======================================>
    // Weather Req:  |-------------------> 2 == 2 ? true => callback()
    // Forecast Req: |-----------> 1 == 2 ? false

    $.ajax({
        url: "https://api.wunderground.com/api/d8483e016960a875/conditions/q/" + providedLocation + ".json",
        type: "GET",
        success: function(data){
            if (!data.current_observation && !data.response.error) {
                WeatherLocationCRUD.remove(providedLocation);
                return sweetAlert("Hmmm...", "There are too many results for this location: " + providedLocation + ". Enter a more specifc location.", "warning");
            }
            weatherData.conditions = data;
            check();
        },
        error: function(err){
          alert(err);
        }
    })

    $.ajax({
      url: "http://api.wunderground.com/api/d8483e016960a875/forecast/q/" + providedLocation + ".json",
      type: "GET",
      success: function(data){
          if (data.response.results) {
              return;
          }
          weatherData.forecast = data;
          check();
      },
      error: function(err){
          alert(err);
      }
    });
}

var $weatherItemTemplate = $(".templates > .location-weather");
var $locationList = $(".location-weather-list");

function renderWeatherItem(currentLocation) {
    var $newItem = $weatherItemTemplate.clone();
    getWeatherAndForecast(currentLocation, function (err, data) {
        parseWeatherData(data.conditions, $newItem);
        getForecast(data.forecast, $newItem);
    });
    $(".remove-location", $newItem).on("click", function () {
        swal({
            title: "Are you sure?",
            text: "You'll have to write it again...",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: false
        }, function() {
            $newItem.slideUp();
            WeatherLocationCRUD.remove(currentLocation);
            swal("Deleted!", "The location was removed from the list.", "success");
        });
    });
    $locationList.append($newItem.hide());
}

function pullForecastInfo(data){
  providedAddress = $("#location").val();
  WeatherLocationCRUD.add(providedAddress);
  var locations = WeatherLocationCRUD.getAll();
  $locationList.empty();
  locations.forEach(renderWeatherItem);
}

function getForecast(data, $weatherItem){ //
  oneDayForecast(data, 1, $weatherItem);
  oneDayForecast(data, 2, $weatherItem);
  oneDayForecast(data, 3, $weatherItem);
}

function oneDayForecast(data, day, $weatherItem){
  var dayOfWeek = data.forecast.simpleforecast.forecastday[day].date.weekday;
  var weather = data.forecast.simpleforecast.forecastday[day].conditions;
  var highF = data.forecast.simpleforecast.forecastday[day].high.fahrenheit;
  var highC = data.forecast.simpleforecast.forecastday[day].high.celsius;
  var lowF = data.forecast.simpleforecast.forecastday[day].low.fahrenheit;
  var lowC = data.forecast.simpleforecast.forecastday[day].low.celsius;
  var icon = data.forecast.simpleforecast.forecastday[day].icon_url;

  $(".day" + day + " .dayOfWeek", $weatherItem).text(dayOfWeek);
  $(".day" + day + " .typeWeather", $weatherItem).text(weather);
  $('.day' + day + ' img', $weatherItem).attr("src", icon);
  $(".day" + day + " .high", $weatherItem).text("High: " + highF + "F/ " + highC +"C");
  $(".day" + day + " .low", $weatherItem).text("Low: " + lowF + "F/ " + lowC + "C");
}

function parseWeatherData(data, $weatherItem){
  if (!data.current_observation) {
    return sweetAlert("Oops...", data.response.error.description, "error");
  }
  dateTime = moment(data.current_observation.local_time_rfc822).format('MMMM Do YYYY,   h:mma');
  cityState = data.current_observation.display_location.full;
  feelsLike = data.current_observation.feelslike_string;
  weather = data.current_observation.weather;
  currentIcon = data.current_observation.icon_url;

  $('.currentWeather h2', $weatherItem).text("Current Weather in " + cityState);
  $('h3', $weatherItem).text(dateTime);
  $('.weather p', $weatherItem).text(weather);
  $('.weather img', $weatherItem).attr('src', currentIcon);
  $('.temp', $weatherItem).text(feelsLike);
  $weatherItem.show();
}
