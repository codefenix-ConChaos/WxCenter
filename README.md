> ⚠️ **_NOTE:_**  This project is no longer being maintained. Please feel free to fork it, clone it, make your own version of it, or whatever you wish.



# WxCenter (wxcenter.js)

by Craig Hendricks
codefenix@conchaos.synchro.net  
 telnet://conchaos.synchro.net  
  https://conchaos.synchro.net  



## Description:

![main](https://github.com/codefenix-ConChaos/WxCenter/assets/12660452/47bef459-1683-483a-a8c8-c89024c5dec1)

This is a weather forecast viewer for Synchronet BBS. It makes use of several
different online APIs to retrieve weather forecast data for any specified
location and displays it to the user using an ANSI presentation.

![preview](https://github.com/codefenix-ConChaos/wxcenter.js/assets/12660452/700bf6c3-4db3-4e9c-8436-8ccbebdffbc0)

If there's an active alert in the forecast area, a brief description is
shown, with the option to display the details.

It's also capable of displaying regional weather maps in SIXEL, using the
optional SixelGallery module.

![wxmaps](https://github.com/codefenix-ConChaos/wxcenter.js/assets/12660452/955ede6b-55e3-4c38-a1bb-f4eeed7c891e)



This mod was inspired by [syncWXremix](https://github.com/KenDB3/syncWXremix),
which was rendered inert with the phasing out of the free Weather Underground
API.

WxCenter aims to be customizable and adaptable to any number of publicly
available APIs.


## How it works:

Out of the box, WxCenter retrieves a 7-day forecast from
[Weather.gov](http://Weather.gov) for US locations. For international 
locations, the One Call API from [OpenWeatherMap.org](http://OpenWeatherMap.org) 
is used instead, which requires either a free or paid API key. 

Both the Weather.gov and OpenWeatherMap.org APIs require a location's latitude
and longitude in order to query forecast data. This info is retrieved by IP
address or location name using public geocoding APIs using freeipapi.com using
the user's IP address, or nominatim.openstreetmap.org or OpenWeatherMap.og by 
location name (the latter if an API key has been obtained). This gives the user 
the option of letting WxCenter use their approximate location using their IP 
address, or freely entering the name of any location (i.e.: city and/or region). 
The user is presented with a daily forecast from either source, and can browse 
through each day of the forecast using the [N]ext and [P]revious options. The 
[A]lert Details option appears if there is an active weather alert in the area.

By default, WxCenter will automatically try to get forecast data from
OpenWeatherMap.org if the call to Weather.gov fails (e.g.: non-US location or
is offline). Either Weather.gov or OpenWeatherMap.org can be defined as the
preferred API by the sysop. WxCenter will optionally try to get forecast data
from the other API if the call to the preferred API fails.

![onecall](https://github.com/codefenix-ConChaos/WxCenter/assets/12660452/97f9a422-4c82-4c25-84af-20cc696ebc1e)

Imperial units are always used for US locations, and metric units are used for
international locations (with the opposite unit type always shown in
parentheses).


## Instructions:

 1. Extract the contents of the ZIP file to /sbbs/xtrn/wxcenter

 2. Add to SCFG -> External Programs-> Online Programs (Doors):

    ```
    Name                  WxCenter
    Internal Code         wxcenter
    Start-up Directory    ../xtrn/wxcenter
    Command Line          ?wxcenter.js
    ```

    At this point, WxCenter is ready to show forecast data for US locations.    

 4. To enable international forecasts (i.e. non-US locations), go to
    [OpenWeatherMap.org](http://OpenWeatherMap.org) and obtain a free (or paid)
    API key. At the time of this writing, a free key allows 1,000 API calls per
    day for 8-day forecasts.

    Once you have your key, edit the wxcenter.ini file and set the owmApiKey
    value accordingly. Example (fake key used):

    `owmApiKey = xx12x345678x90123456xx7x8xx901xx`

    Since the API key also allows access to OpenWeatherMap's geocoding APIs,
    this will let WxCenter get its location data from there instead of from
    nominatim.openstreetmap.org.

 5. OPTIONAL: To enable viewing regional weather maps in SIXEL, install
    [sixelgallery.js](https://github.com/codefenix-ConChaos/SixelGallery).
    Once it's installed, make sure to set the pathToSixelViewer in the
    wxcenter.ini file so it correctly points to the path where it's
    installed.

    `pathToSixelViewer = ../xtrn/sixelgallery/sixelgallery.js`

    If it was installed correctly, the "M" option will appear on the WxCenter
    main menu to let users access the weather map submenu.

    The wxmaps.json file comes pre-configured with a selection of publicly
    accessible map image resources. Image resources may be added or removed
    from this file as desired.

 6. Configure the following additional options to your liking:

    * `systemLocation`       This lets the sysop enter a valid location name
                             in case the system specified one in SCFG is
                             something invalid (e.g.: Anytown, USA). The
                             recommended format is "City, State, Country"
                             (e.g.: Canton, OH, USA). If this is left blank,
                             the system.location value is used by default.

    * `preferredSource`      This allows the sysop to specify whether which
                             API to use as the primary source. Acceptable
                             values are WDG for Weather.gov or OWM for
                             OpenWeatherMap.org. If this is left blank, WDG
                             is used by default.

    * `useOtherSourceOnFail` This tells wxcenter to call the other API in
                             the event that that an error is encountered
                             when calling the preferred one (e.g.:
                             temporarily offline). Acceptable values are
                             true or false. If his is left blank, the
                             default setting is true.

    * `verboseLogging`       This logs all informational messages (non-error
                             and non-warning) to the Terminal Server log.
                             Useful for troubleshooting, as it logs all API
                             calls and location data used at the time the
                             calls were made. Acceptable values are true or
                             false. The default setting is false if it's
                             left blank.

## Configuration and Customization:

WxCenter includes a few different ANSI themes located in the /gfx/themes
subdirectory. Pick the one you want by editing wxcenter.ini and setting the
value of theme to the name of the desired subdirectory. A preview PNG image
is given for each one. Of course, you can also add your own themes to suit
your BBS's personality. It may take some trial-and-error to get them to look
suitable in the terminal.

Edit the included wxcenter.msg, info.msg, and sixelmaps.msg files in the
/gfx subdirectory to your liking in PabloDraw.

* wxcenter.msg:  This is the main title screen, the first thing the user
                 sees on startup.

* info.msg:      This is shown to the user when the user presses "A" to
                 view information about WxCenter.

* sixelmaps.msg: This is the SIXEL weather map image submenu header.


## Future Plans

Aside from occasional bug fixes and code optimizations, I don't plan on adding
a lot of additional features. It already does quite a lot within a typical BBS
terminal.

The displayForecastPage function uses both Graphic and Frame objects to
display the different ANSI theme resource files. I'm not really sure why I did
this; I think I was just experimenting with each, and never settled on which
one was the better option. At a later point I might change this so it uses only
one type (probably Graphic). It might also be nice to contain all the graphic
resources in one file instead of have separate files for each digit, graphic
banner, template, etc.


## Other Notes

As has happened to the old Weather Underground API, we don't know what the
future holds for the APIs from Weather.gov and OpenWeatherMap.org. For this
reason, WxCenter will one day inevitably meet the same fate as syncWXremix.

One API formerly used by WxCenter, geocode.maps.co, was altered to require an 
API key. When that happened, I made modifications to get location data from 
nominatim.openstreetmap.org instead, in order to let option 2 (get forecast 
for city name) keep working without requiring an API key.

In similar scenarios in the future, an experienced Javascript programmer should 
be able to create a new function modeled after either the existing functions 
(getForecastFromWeatherGov or getForecastFromOneCallApi) to call an entirely 
different API if the need arose, and the rest of WxCenter would still work as 
it currently does.

It's worth mentioning that another nice free API at the time of this writing
is api.weatherapi.com. This API is nice because it has built-in geocoding,
which eliminates the need to use a separate API to obtain latitude and
longitude. However, its free usage is limited to 3 days instead of 8 as with
OpenWeatherMap.
