load("sbbsdefs.js");
load("http.js");
load("frame.js");
load("graphic.js");

const DEGREE_SYMBOL = ascii(248);
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // milliseconds
const BOTTOM = 23; // where to place the next/previous options at the bottom of the screen
const MENU_ITEM_FORMAT = " \x01c\x01h%2d\x01k\x01h)\x01n %s\x010\x01n\r\n";
const MENU_ITEM_FORMAT_S = " \x01c\x01h%2s\x01k\x01h)\x01n %s\x010\x01n\r\n";
const SCREEN_RESET = "\x01q\x01l\x01n";
const DONE = "\x01h\x01gdone!\x01n";

const GEO_API_URL = "https://geocode.maps.co/search?q=%s"; // Free geocoding API
// There's also https://geocode.xyz, but the one above seems more accurate.

const IP_API_URL = "https://freeipapi.com/api/json/"; // Free geocoding API that outputs location data for an IP address
// There's also http://ip-api.com/json/, but the one above seems more accurate.

// National Weather Service APIs:
const WDG_SVC_NAME = "Weather.gov";
const WDG_API_URL = "https://api.weather.gov/points/%s,%s";
const WDG_API_ALERT_URL = "https://api.weather.gov/alerts/active?area=%s";

// International Weather API:
const OWM_SVC_NAME = "OpenWeatherMap.org";
const OWM_API_URL = "https://api.openweathermap.org/data/2.5/onecall?lat=%s&lon=%s&units=%s&appid=%s&exclude=minutely,hourly";
const OWM_REV_GEO_API_URL = "http://api.openweathermap.org/geo/1.0/reverse?lat=%s&lon=%s&limit=1&appid=%s";
var gOwmApiKey = ""; // Get a free (or paid) API key from https://openweathermap.org/api/one-call-api

var gPathToSixelViewer = "";
var gIpAddy;
var gWxMaps;
var gThemePath;

function mainMenu() {
    var mainSelect = "";
    var prompt = "";
    var mapOption = "";
    var fIni = new File(js.startup_dir + 'wxcenter.ini');
    fIni.open('r');
    const wxSettings = { root: fIni.iniGetObject() };
    fIni.close();
    fIni = undefined;
    gOwmApiKey = wxSettings.root.owmApiKey;
    gPathToSixelViewer = wxSettings.root.pathToSixelViewer;
    gThemePath = backslash(backslash(backslash(js.startup_dir) + "gfx") + "themes") + wxSettings.root.theme;
    gIpAddy = bbs.atcode("IP"); // user.ip_address;
    var jsonMaps = new File(js.startup_dir + "wxmaps.json");
    if (jsonMaps.open("r")) {
        gWxMaps = JSON.parse(jsonMaps.read());
        jsonMaps.close();
    }
    if (console.cterm_version >= 1189 && gPathToSixelViewer !== "" && file_exists(gPathToSixelViewer)) {
        mapOption = "M";
    }
    while (bbs.online && mainSelect !== "Q") {
        console.clear();
        console.home();
        console.printfile(backslash(js.startup_dir + "gfx") + "wxcenter.msg", P_NOABORT);
        console.center("\x01k\x01h-= \x01b\x01h Welcome to the " + system.name + " Weather Center! \x01k\x01h=-");
        printf("\r\n");
        printf(MENU_ITEM_FORMAT, 1, "Get forecast by \x01hlatitude & longitude");
        printf(MENU_ITEM_FORMAT, 2, "Get forecast for \x01hcity name");
        printf(MENU_ITEM_FORMAT, 3, "Get forecast for \x01hyour approximate location \x01k\x01h(for IP: \x01n\x01c" + gIpAddy + "\x01k\x01h)");
        printf(MENU_ITEM_FORMAT, 4, "Get forecast for the \x01hBBS location");
        if (mapOption === "M") {
            printf(MENU_ITEM_FORMAT_S, mapOption, "Current \x01k\x01hS\x01nI\x01w\x01hX\x01nE\x01k\x01hL \x01nweather maps");
        }
        printf(MENU_ITEM_FORMAT_S, "A", "About...");
        printf("\r\n Select: \x01h1\x01n-\x01h%d" + (mapOption !== "" ? "\x01n, \x01h" + mapOption : "") + "\x01n, \x01hA\x01n or \x01hQ\x01n to quit\x01h> ", 4);
        mainSelect = console.getkeys("QA" + mapOption, 4, K_UPPER);
        if (mainSelect === "") {
            mainSelect = "Q"; // defaults to quit if no selection made
        }
        switch (mainSelect) {
            case 1:
                const locObj = { lat: "", lon: "", name: "", units: "metric" }; // Is metric an OK default?
                print("\r\n  \x01w\x01hEnter approximate latitude and longitude.");
                print("\x01k\x01h   Numeric values only, up to 4 decimal places.");
                do {
                    printf("\x01n    Latitude \x01k\x01h(\x01n-90 \x01k\x01h... \x01n90\x01h\x01k)\x01n: \x01h");
                    locObj.lat = console.getstr(20).trim();
                } while (isNaN(locObj.lat));
                do {
                    printf("\x01n    Longitude \x01k\x01h(\x01n-180 \x01k\x01h... \x01n180\x01k\x01h)\x01n: \x01h");
                    locObj.lon = console.getstr(20).trim();
                } while (isNaN(locObj.lon));
                locObj.lat = toFloatStr(locObj.lat, 4);
                locObj.lon = toFloatStr(locObj.lon, 4);
                if (!isNaN(locObj.lat) && !isNaN(locObj.lon)) {
                    showForecast(getForecastFromWeatherGov(locObj));
                }
                break;
            case 2:
                printf("\r\n\x01n  Enter city name (e.g.: %s): \x01h", system.location);
                prompt = console.getstr(60).trim().toUpperCase();
                if (prompt !== "") {
                    const locObj2 = getLocationByName(prompt);
                    if (locObj2.name === "") {
                        printf("\r\n\x01y\x01h   Could not validate \"%s\".", prompt);
                        console.pause();
                    } else {
                        showForecast(getForecastFromWeatherGov(locObj2));
                    }
                }
                break;
            case 3:
                showForecast(getForecastFromWeatherGov(getLocationByIp(gIpAddy)));
                break;
            case 4:
                showForecast(getForecastFromWeatherGov(getLocationByName(system.location)));
                break;
            case mapOption:
                console.clear();
                console.home();
                mapMenu();
                printf(SCREEN_RESET);
                break;
            case "A":
                console.clear();
                console.home();
                console.printfile(backslash(js.startup_dir + "gfx") + "info.msg");
                console.pause();
                printf(SCREEN_RESET);
                break;
        }
    }
}

function getLocationByName(locName) {
    const locObj = { lat: "", lon: "", name: "", units: "" };
    var jsonObj;
    var selection;
    var opts = [];
    printf("\x01n Retrieving location data for \x01h%s\x01n...", locName);
    jsonObj = JSON.parse(tryRequest(format(GEO_API_URL, locName.replace(/ /g, "+")), MAX_RETRIES));
    if (jsonObj.length > 1) {
        for (var i = 0; i < jsonObj.length; i++) {
            // "class" changed to "category" ... some time around 5/2-5/3/2023
            if (/*jsonObj[i]["category"] === "boundary" ||*/
                (jsonObj[i]["type"] === "administrative" || jsonObj[i]["type"] === "city" || jsonObj[i]["type"] === "town" || jsonObj[i]["type"] === "village")) {
                opts.push(jsonObj[i]);
            }
        }
        if (opts.length > 1) {
            print("\r\n\r\n\x01w\x01hPlease specify...\x01n");
            for (var i = 0; i < opts.length; i++) {
                printf(MENU_ITEM_FORMAT, (i + 1),
                    word_wrap(utf8_decode(opts[i]["display_name"]) + " \x01k\x01h(" + toFloatStr(opts[i]["lat"], 2) + "," + toFloatStr(opts[i]["lon"], 2) + ")", 70, 70, true, true).replace(/\n/g, "\r\n    ").trim());
            }
            printf("\r\nSelect: \x01h1\x01n-\x01h%d\x01n> ", opts.length);
            selection = console.getnum(opts.length, 1);
            locObj.lat = toFloatStr(opts[selection - 1]["lat"], 4);
            locObj.lon = toFloatStr(opts[selection - 1]["lon"], 4);
            locObj.name = utf8_decode(opts[selection - 1]["display_name"]);
        } else if (opts.length === 1) {
            locObj.lat = toFloatStr(opts[0]["lat"], 4);
            locObj.lon = toFloatStr(opts[0]["lon"], 4);
            locObj.name = utf8_decode(opts[0]["display_name"]);
            print(DONE);
        }
    } else if (jsonObj.length === 1) {
        locObj.lat = toFloatStr(jsonObj[0]["lat"], 4);
        locObj.lon = toFloatStr(jsonObj[0]["lon"], 4);
        locObj.name = utf8_decode(jsonObj[0]["display_name"]);
        print(DONE);
    }
    if (locObj.name !== "") {
        var nameParts = locObj.name.split(",");
        locObj.name = nameParts[0] + "," + (isNaN(nameParts[nameParts.length - 2]) ? nameParts[nameParts.length - 2] : nameParts[nameParts.length - 3]) + "," + nameParts[nameParts.length - 1];
        locObj.units = locObj.name.indexOf("United States") >= 0 ? "imperial" : "metric";
    }
    return locObj;
}

function getLocationByIp(ip_addr) {
    const locObj = { lat: "", lon: "", name: "", units: "" };
    var jsonObj = JSON.parse(tryRequest(IP_API_URL + ip_addr, MAX_RETRIES));
    if (jsonObj.hasOwnProperty("latitude")) {
        locObj.lat = toFloatStr(jsonObj["latitude"], 4);
        locObj.lon = toFloatStr(jsonObj["longitude"], 4);
        locObj.name = utf8_decode(jsonObj["cityName"]) + ", " + utf8_decode(jsonObj["regionName"]);
        locObj.units = jsonObj["countryCode"] === "US" ? "imperial" : "metric";
    }
    return locObj;
}

function displayForecastPage(temp, tempUnit, location, date, isDayTime, forecastShort, forecastDetails, alertInfo, source, asOf) {
    printf(SCREEN_RESET);
    var tempstr = toFloatStr(temp, 1) + (DEGREE_SYMBOL + tempUnit);
    console.printfile(backslash(gThemePath) + "template.msg", P_NOABORT);

    var frmHdr = new Frame(2, 1, 77, 3, BG_BLACK);
    frmHdr.open();
    frmHdr.load(forecastGfx(forecastShort, isDayTime));
    frmHdr.cycle();

    var digit = new Graphic(3, 5);
    for (var i = 0; i < tempstr.length; i++) {
        digit.clear();
        digit.load(backslash(gThemePath) + "digit_" + (tempstr.charAt(i) === DEGREE_SYMBOL ? "deg" : tempstr.charAt(i) === "." ? "pnt" : tempstr.charAt(i)) + ".ans");
        digit.draw(3 + (i * 3), 5, 3, 5);
    }

    console.gotoxy(3, 8);
    printf("\x01n\x01k\x01h(\x01n%s\x01n\x01k\x01h)", convertTemp(temp, tempUnit));
    console.gotoxy(26, 5);
    printf("\x01n\x01h%s", location);
    console.gotoxy(26, 6);
    printf("\x01n%s", date);
    console.gotoxy(26, 7);
    printf("\x01w\x01h%s", forecastShort);

    var frmForc = new Frame(3, 10, 75, 5);
    frmForc.open();
    frmForc.putmsg("\x01w" + lfexpand(word_wrap(forecastDetails, 75, 75, true, true)).trim());
    frmForc.cycle();
    var frmAlert = new Frame(3, 16, 75, 4);
    frmAlert.open();
    frmAlert.putmsg("\x01w" + lfexpand(word_wrap(alertInfo, 75, 75, true, true)).trim());
    frmAlert.cycle();
    console.gotoxy(3, 21);
    printf("\x01nSource: \x01h%s \x01nas of\x01n\x01k\x01h \x01w\x01h%s", source, asOf);
}

function showForecast(wxObj) {
    //log(LOG_INFO, "Viewing forecast from " + wxObj[0].source + " for " + wxObj[0].location + ".");
    var perSelect = "";
    var period = 0;
    var opts = "";
    var keys = "";
    if (wxObj) {
        while (bbs.online && perSelect !== "Q") {
            opts = "";
            keys = "";
            alertSummary = "";
            if (wxObj.alerts) {
                for (var ia = 0; ia < wxObj.alerts.length; ia++) {
                    // We want to display the first alert summary and prompt for detail
                    // if there are alerts in effect for the period shown.
                    if (wxObj[period].dateObj >= wxObj.alerts[ia].effective && wxObj[period].dateObj <= wxObj.alerts[ia].ends) {
                        alertSummary = format("\x01rALERT: \x01y\x01h%s\r\n", wxObj.alerts[ia].event + (wxObj.alerts[ia].severity != undefined ? " (" + wxObj.alerts[ia].severity + ")" : "")) + format("\x01w\x01h%s\r\n", wxObj.alerts[ia].headline);
                        opts = "\x01n\x01r[\x01y\x01hA\x01n\x01r]\x01y\x01hlert Details\x01n ";
                        keys = "A";
                        break;
                    }
                }
            }
    
            displayForecastPage(
                wxObj[period].temp,
                wxObj[period].tempUnit,
                wxObj[period].location,
                wxObj[period].dateName,
                wxObj[period].isDayTime,
                wxObj[period].forecastShort,
                wxObj[period].forecastDetails,
                alertSummary,
                wxObj[period].source,
                wxObj[period].asOf
            );
    
            if (period < wxObj.length - 1) {
                opts = opts + "\x01k\x01h[\x01w\x01hN\x01k\x01h]\x01next\x01n ";
                keys = keys + "N";
            }
            if (period > 0) {
                opts = opts + "\x01k\x01h[\x01w\x01hP\x01k\x01h]\x01nrevious\x01n ";
                keys = keys + "P";
            }
            opts = opts + "\x01k\x01h[\x01w\x01hQ\x01k\x01h]\x01nuit";
            console.gotoxy(1, BOTTOM);
            printf("%s\x01w\x01h >\x01n ", opts);
            perSelect = console.getkeys("Q" + keys, K_UPPER);
            switch (perSelect) {
                case "N":
                    period = period + 1;
                    break;
                case "P":
                    period = period - 1;
                    break;
                case "A":
                    for (var ia = 0; ia < wxObj.alerts.length; ia++) {
                        printf("\x01q\x01l\x01r. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .\r\n");
                        printf("\x01r\x01hAlert \x01w%d \x01kof \x01w%d\r\n", ia + 1, wxObj.alerts.length);
                        printf("\x01w\x01h%s\x01n", lfexpand(word_wrap(wxObj.alerts[ia].headline)));
                        printf("\x01y\x01h%s\r\n", wxObj.alerts[ia].event + (wxObj.alerts[ia].severity != undefined ? " (" + wxObj.alerts[ia].severity + ")" : ""));
                        printf("\x01n%s\x01n", lfexpand(word_wrap(wxObj.alerts[ia].description)));
                        printf("\x01r. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .\r\n");
                        console.pause();
                        printf(SCREEN_RESET);
                    }
                    break;
            }
        }
    } else {
        print("\x01y\x01hNo results returned.\r\n");
        log(LOG_WARNING, "No results returned. wxObj object is empty!");
    }
}

function getForecastFromWeatherGov(locObj) {
    log(LOG_INFO, "locObj.name: " + locObj.name);
    log(LOG_INFO, "locObj.lat: " + locObj.lat);
    log(LOG_INFO, "locObj.lon: " + locObj.lon);
    log(LOG_INFO, "locObj.units: " + locObj.units);
    var wxObj = [];
    var jsonObj;
    var jsonAlert;
    var state = "";
    var zoneUrl = "";
    var forecastUrl = "";
    var office = "";
    var updatedTime;
    var success = false;
    var lastError = "";
    printf("\x01n Finding forecast office for \x01h%s,%s\x01n...", locObj.lat, locObj.lon);
    jsonObj = JSON.parse(tryRequest(format(WDG_API_URL, locObj.lat, locObj.lon), MAX_RETRIES));
    if (jsonObj.hasOwnProperty("properties")) {
        forecastUrl = jsonObj["properties"]["forecast"];
        state = jsonObj["properties"]["relativeLocation"]["properties"]["state"];
        locObj.name = jsonObj["properties"]["relativeLocation"]["properties"]["city"] + ", " + state;
        office = jsonObj["properties"]["gridId"];
        zoneUrl = jsonObj["properties"]["forecastZone"];
        print(DONE);
        printf("\x01n Getting \x01h%s\x01n forecast data...", office);
        jsonObj = JSON.parse(tryRequest(forecastUrl, MAX_RETRIES));
        if (jsonObj["properties"] !== undefined) {
            updatedTime = new Date(jsonObj["properties"]["updated"]);
            print(DONE);
            success = true;
        } else if (jsonObj["status"] !== undefined) {
            if (jsonObj["status"] === 503) {
                lastError = jsonObj["detail"];
            }
        }
    }
    if (success) {
        jsonAlert = JSON.parse(tryRequest(format(WDG_API_ALERT_URL, state), MAX_RETRIES));
        //log(LOG_INFO, "There are " + jsonAlert["features"].length + " warning(s) in " + state + ".");
        for (var ia = 0; ia < jsonAlert["features"].length; ia++) {
            var properties = jsonAlert["features"][ia]["properties"];
            if (properties["affectedZones"].indexOf(zoneUrl) > -1) { //if (properties["affectedZones"].indexOf(countyUrl) > -1) {
                if (!wxObj.alerts) {
                    wxObj.alerts = [];
                }
                wxObj.alerts.push({
                    "severity": properties["severity"],
                    "event": properties["event"],
                    "headline": properties["headline"],
                    "effective": new Date(properties["effective"]),
                    "ends": properties["ends"] !== null ? new Date(properties["ends"]) : new Date(properties["expires"]),
                    "description": properties["description"]
                });

            }
        }
        for (var iw = 0; iw < jsonObj["properties"]["periods"].length; iw++) {
            wxObj.push({
                "temp": jsonObj["properties"]["periods"][iw]["temperature"],
                "tempUnit": jsonObj["properties"]["periods"][iw]["temperatureUnit"],
                "location": locObj.name,
                "dateName": jsonObj["properties"]["periods"][iw]["name"] + ", " + (new Date(jsonObj["properties"]["periods"][iw]["startTime"])).toLocaleDateString().split(' ').slice(1).join(' '),
                "dateObj": new Date(jsonObj["properties"]["periods"][iw]["startTime"]),
                "isDayTime": jsonObj["properties"]["periods"][iw]["isDaytime"],
                "forecastShort": jsonObj["properties"]["periods"][iw]["shortForecast"].length > 50 ? jsonObj["properties"]["periods"][iw]["shortForecast"].slice(0, 47) + "..." : jsonObj["properties"]["periods"][iw]["shortForecast"],
                "forecastDetails": jsonObj["properties"]["periods"][iw]["detailedForecast"],
                "source": WDG_SVC_NAME + " \x01n(\x01g" + office + "\x01n)",
                "asOf": updatedTime.toLocaleTimeString() + " " + system.zonestr()
            });
        }
        return wxObj;
    } else {
        if (lastError !== "") {
            log(LOG_ERR, "lastError: " + lastError);
        }
        // use another API as a fallback option in case the NWS is
        // unavailable or can't get results for the queried area.
        return getForecastFromOneCallApi(locObj);
    }
}

function getForecastFromOneCallApi(locObj) {
    log(LOG_INFO, "locObj.name: " + locObj.name);
    log(LOG_INFO, "locObj.lat: " + locObj.lat);
    log(LOG_INFO, "locObj.lon: " + locObj.lon);
    log(LOG_INFO, "locObj.units: " + locObj.units);
    var wxObj = [];
    var jsonObj;
    var forecastDate;
    var updatedTime;
    var tzOffset = 0;
    var tempUnit = "";
    if (gOwmApiKey === "" || gOwmApiKey === undefined) {
        printf("\r\n\x01nCannot retrieve forecast until the sysop obtains an %s API key!\r\n", OWM_SVC_NAME);
        console.pause();
        printf(SCREEN_RESET);
        return;
    }
    printf("\r\n\x01n Contacting %s for \x01h%s,%s\x01n...", OWM_SVC_NAME, locObj.lat, locObj.lon);
    jsonObj = JSON.parse(tryRequest(format(OWM_API_URL, locObj.lat, locObj.lon, locObj.units, gOwmApiKey), MAX_RETRIES));
    if (jsonObj.hasOwnProperty("daily")) {
        tzOffset = Number(jsonObj["timezone_offset"]) + (new Date().getTimezoneOffset() * 60);
        if (locObj.name === "") {
            locObj.name = Math.abs(Number(locObj.lat)) + DEGREE_SYMBOL + (Number(locObj.lat) < 0 ? "S" : "N") + " " + Math.abs(Number(locObj.lon)) + DEGREE_SYMBOL + (Number(locObj.lon) < 0 ? "W" : "E");
            var jsonLoc = JSON.parse(tryRequest(format(OWM_REV_GEO_API_URL, locObj.lat, locObj.lon, gOwmApiKey), MAX_RETRIES));
            if (jsonLoc[0]) {
                if (jsonLoc[0].hasOwnProperty("name")) {
                    locObj.name = jsonLoc[0].name;
                }
            }
        }
        updatedTime = new Date((jsonObj["current"]["dt"] + tzOffset) * 1000);
        print(DONE);
        if (jsonObj.hasOwnProperty("alerts")) {
            for (var ia = 0; ia < jsonObj["alerts"].length; ia++) {
                if (!wxObj.alerts) {
                    wxObj.alerts = [];
                }
                wxObj.alerts.push({
                    "severity": jsonObj["alerts"][ia]["severity"],
                    "event": lfexpand(word_wrap(utf8_decode(jsonObj["alerts"][ia]["event"]).toUpperCase())),
                    "headline": lfexpand(word_wrap(utf8_decode(jsonObj["alerts"][ia]["sender_name"]))),
                    "effective": new Date((jsonObj["alerts"][ia]["start"] + tzOffset) * 1000),
                    "ends": new Date((jsonObj["alerts"][ia]["end"] + tzOffset) * 1000),
                    "description": lfexpand(word_wrap(utf8_decode(jsonObj["alerts"][ia]["description"])))
                });
            }
        }
        for (var iw = 0; iw < jsonObj["daily"].length; iw++) {
            forecastDate = new Date((jsonObj["daily"][iw]["dt"] + tzOffset) * 1000);
            tempUnit = locObj.units === "imperial" ? "F" : "C";
            wxObj.push({
                "temp": jsonObj["daily"][iw]["temp"]["day"],
                "tempUnit": tempUnit,
                "location": locObj.name,
                "dateName": forecastDate.toLocaleDateString(),
                "dateObj": forecastDate,
                "isDayTime": iw === 0 ? ((jsonObj["current"]["dt"] > jsonObj["daily"][iw]["sunset"] || jsonObj["current"]["dt"] < jsonObj["daily"][iw]["sunrise"]) ? false : true) : true,
                "forecastShort": toTitleCase(jsonObj["daily"][iw]["weather"][0]["description"]),
                "forecastDetails": (format("\x01n\x01rHigh: \x01h%s\x01n\x01c \x01n\x01k\x01h(\x01n\x01r%s\x01n\x01k\x01h)\x01n\x01c Low: \x01h%s\x01n \x01n\x01k\x01h(\x01n\x01c%s\x01n\x01k\x01h) \x01n\x01wWind: \x01h%s\x01n\x01w Gusts: \x01h%s " + (locObj.units === "imperial" ? "mph" : "m/s") + "\x01n\x01w\r\n" +
                    "Humidity: \x01w\x01h%s%%\x01n\x01w  Rain: \x01h%smm\x01n\x01w  Snow: \x01h%smm\x01n\x01w  UVI: \x01h%s\x01n\x01w\r\n",
                    toFloatStr(jsonObj["daily"][iw]["temp"]["max"], 1) + DEGREE_SYMBOL + tempUnit,
                    convertTemp(jsonObj["daily"][iw]["temp"]["max"], tempUnit),
                    toFloatStr(jsonObj["daily"][iw]["temp"]["min"], 1) + DEGREE_SYMBOL + tempUnit,
                    convertTemp(jsonObj["daily"][iw]["temp"]["min"], tempUnit),
                    jsonObj["daily"][iw]["wind_speed"] + (locObj.units === "imperial" ? "mph" : "m/s") + " " + windDir(jsonObj["daily"][iw]["wind_deg"]),
                    jsonObj["daily"][iw]["wind_gust"] !== undefined ? toFloatStr(jsonObj["daily"][iw]["wind_gust"], 2) : "--",
                    toFloatStr(jsonObj["daily"][iw]["humidity"], 1),
                    jsonObj["daily"][iw]["rain"] !== undefined ? toFloatStr(jsonObj["daily"][iw]["rain"], 2) : "--",
                    jsonObj["daily"][iw]["snow"] !== undefined ? toFloatStr(jsonObj["daily"][iw]["snow"], 2) : "--",
                    toFloatStr(jsonObj["daily"][iw]["uvi"], 2)) +
                    format("\x01n\x01wSunrise: \x01h%s\x01n\x01w  Sunset: \x01h%s\x01n\x01w\r\n",
                        new Date((jsonObj["daily"][iw]["sunrise"] + tzOffset) * 1000).toLocaleTimeString(),
                        new Date((jsonObj["daily"][iw]["sunset"] + tzOffset) * 1000).toLocaleTimeString()) +
                    format("\x01n\x01wMoon Phase: \x01h%s\x01n\x01w\r\n",
                        moonPhase(jsonObj["daily"][iw]["moon_phase"]))),
                "source": OWM_SVC_NAME,
                "asOf": updatedTime.toLocaleTimeString() + " \x01k\x01h(" + jsonObj["timezone"] + ")"
            });
        }
    } else {
        print("\x01y\x01hFailed.\r\n\x01nThe sysop has been informed of the error.\r\n");
    }
    return wxObj;
}

function forecastGfx(shortDesc, isDaytime) {
    var graphic = "";
    if (shortDesc.toLowerCase().indexOf("sunny") >= 0 ||
        shortDesc.toLowerCase().indexOf("clear") >= 0) {
        graphic = "clear";
    } else if (shortDesc.toLowerCase().indexOf("snow") >= 0) {
        graphic = "snow";
    } else if (shortDesc.toLowerCase().indexOf("thunder") >= 0 ||
        shortDesc.toLowerCase().indexOf("storm") >= 0) {
        graphic = "storm";
    } else if (shortDesc.toLowerCase().indexOf("mix") >= 0 ||
        shortDesc.toLowerCase().indexOf("wintry") >= 0 ||
        shortDesc.toLowerCase().indexOf("frost") >= 0 ||
        shortDesc.toLowerCase().indexOf("sleet") >= 0) {
        graphic = "mix";
    } else if (shortDesc.toLowerCase().indexOf("rain") >= 0 ||
        shortDesc.toLowerCase().indexOf("drizzle") >= 0) {
        graphic = "rain";
    } else if (shortDesc.toLowerCase().indexOf("wind") >= 0) {
        graphic = "wind";
    } else if (shortDesc.toLowerCase().indexOf("fog") >= 0 ||
        shortDesc.toLowerCase().indexOf("overcast") >= 0) {
        graphic = "fog";
    } else if (shortDesc.toLowerCase().indexOf("cloud") >= 0) {
        graphic = "cloud";
    } else {
        graphic = "dunno";
        log(LOG_WARNING, "no weather banner for \"" + shortDesc + "\"");
    }
    return backslash(gThemePath) + (isDaytime === true ? "day" : "eve") + "_" + graphic + ".ans";
}

function mapMenu() {
    var mapSelect = "";
    while (bbs.online && mapSelect !== "Q") {
        console.clear();
        console.home();
        console.printfile(backslash(js.startup_dir + "gfx") + "sixelmaps.msg", P_NOABORT);
        printf("\r\n");
        for (var m = 0; m < Object.keys(gWxMaps).length; m++) {
            printf(MENU_ITEM_FORMAT, m + 1, gWxMaps[m].name);
        }
        printf("\r\n Select: \x01h1\x01n-\x01h%d\x01n or \x01hQ\x01n to quit\x01h> ", Object.keys(gWxMaps).length);
        mapSelect = console.getkeys("Q", Object.keys(gWxMaps).length, K_UPPER);
        if (mapSelect === "" || mapSelect === undefined) {
            mapSelect = "Q";
        }
        if (!isNaN(mapSelect) && mapSelect !== "") {
            getWxMap(gWxMaps[mapSelect - 1].url);
            console.pause();
        }
    }
}

function getWxMap(url) {
    var filename = file_getname(url);
    var dl_dir = backslash(backslash(js.startup_dir) + "maps");
    console.clear(false);
    printf("Downloading \x01b\x01h%s \x01w\x01h. . . ", filename);
    var imgData = tryRequest(url, MAX_RETRIES);
    if (imgData !== "" && imgData !== undefined) {
        print("done!");
        var tempImg = new File(dl_dir + filename);
        tempImg.open("wb");
        tempImg.write(imgData);
        tempImg.close();
        bbs.exec("?" + gPathToSixelViewer + " " + dl_dir + filename, 0, js.startup_dir);
    } else {
        print("\x01rfailed!\x01n");
        log(LOG_ERR, "Couldn't get map from " + url + ".");
    }
}

function tryRequest(url, max_retries) {
    var retries = 0;
    var response;
    var success = false;
    log(LOG_INFO, "url: " + url);
    while (bbs.online && !success && retries < max_retries) {
        try {
            response = (new HTTPRequest()).Get(url);
            success = true;
        } catch (err) {
            log(LOG_WARNING, "Exception calling " + url + " ... Error: " + err + " ... Attempt " + (retries + 1) + " of " + max_retries);
            printf(".");
            mswait(RETRY_DELAY);
            retries = retries + 1;
        }
    }
    return response;
}

function convertTemp(fromTemp, fromUnit) {
    return fromUnit === "F" ? (Math.round((fromTemp - 32) / 1.8) + DEGREE_SYMBOL + "C") : (Math.round((fromTemp * 1.8) + 32) + DEGREE_SYMBOL + "F");
}

function toFloatStr(fVal, decPrec) {
    return parseFloat(parseFloat(fVal).toFixed(decPrec)).toString();
}

function moonPhase(phaseNum) {
    if (phaseNum === 0 || phaseNum === 1) {
        return "New Moon";
    } else if (phaseNum === 0.25) {
        return "First Quarter Moon";
    } else if (phaseNum === 0.5) {
        return "Full Moon";
    } else if (phaseNum === 0.75) {
        return "Last Quarter Moon";
    } else if (phaseNum > 0 && phaseNum < 0.25) {
        return "Waxing Crescent";
    } else if (phaseNum > 0.25 && phaseNum < 0.5) {
        return "Waxing Gibbous";
    } else if (phaseNum > 0.5 && phaseNum < 0.75) {
        return "Waining Gibbous";
    } else if (phaseNum > 0.75 && phaseNum < 1) {
        return "Waining Crescent";
    } else {
        return phaseNum; // shouldn't need this...
    }
}

function windDir(windNum) {
    if (windNum >= 348.75 || windNum < 11.25) {
        return "N";
    } else if (windNum >= 11.25 && windNum < 33.75) {
        return "NNE";
    } else if (windNum >= 33.75 && windNum < 56.25) {
        return "NE";
    } else if (windNum >= 56.75 && windNum < 78.75) {
        return "ENE";
    } else if (windNum >= 78.75 && windNum < 101.25) {
        return "E";
    } else if (windNum >= 101.25 && windNum < 123.75) {
        return "ESE";
    } else if (windNum >= 123.75 && windNum < 146.25) {
        return "SE";
    } else if (windNum >= 146.25 && windNum < 168.75) {
        return "SSE";
    } else if (windNum >= 168.75 && windNum < 191.25) {
        return "S";
    } else if (windNum >= 191.25 && windNum < 213.75) {
        return "SSW";
    } else if (windNum >= 213.75 && windNum < 236.25) {
        return "SW";
    } else if (windNum >= 236.25 && windNum < 258.75) {
        return "WSW";
    } else if (windNum >= 258.75 && windNum < 281.25) {
        return "W";
    } else if (windNum >= 281.25 && windNum < 303.75) {
        return "WNW";
    } else if (windNum >= 303.75 && windNum < 326.25) {
        return "NW";
    } else if (windNum >= 326.25 && windNum < 348.75) {
        return "NNW";
    } else {
        return windNum; // shouldn't need this...
    }
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

mainMenu();
