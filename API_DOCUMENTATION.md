# Bannquet API Documentation

Complete breakdown of all API endpoints called, their responses, and which attributes are used.

---

## 1. NWS Point API

**Endpoint:** `GET https://api.weather.gov/points/{lat},{lon}`

**Called from:** `src/lib/weather.ts:111-112`

**Full Response Structure:**
```json
{
  "@context": [...],
  "id": "https://api.weather.gov/points/44.1128,-73.9237",
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-73.9237, 44.1128]
  },
  "properties": {
    "@id": "...",
    "@type": "wx:Point",
    "cwa": "BTV",                    // Forecast office code
    "type": "land",
    "forecastOffice": "https://api.weather.gov/offices/BTV",
    "gridId": "BTV",                 // ✅ USED
    "gridX": 68,                     // ✅ USED
    "gridY": 36,                     // ✅ USED
    "forecast": "https://api.weather.gov/gridpoints/BTV/68,36/forecast",
    "forecastHourly": "https://...", // ✅ USED (URL extracted)
    "forecastGridData": "https://...",
    "observationStations": "https://...",
    "relativeLocation": {
      "type": "Feature",
      "geometry": {...},
      "properties": {
        "city": "Keene Valley",
        "state": "NY",
        "distance": {...},
        "bearing": {...}
      }
    }
  }
}
```

**Attributes Used:**
- ✅ `properties.gridId` - Used to construct gridpoint URL
- ✅ `properties.gridX` - Used to construct gridpoint URL
- ✅ `properties.gridY` - Used to construct gridpoint URL
- ✅ `properties.forecastHourly` - URL for hourly forecast
- ✅ `properties.forecast` - URL for daily forecast

**Attributes NOT Used:**
- `cwa`, `type`, `forecastOffice`, `forecastGridData`, `observationStations`, `relativeLocation`

---

## 2. NWS Hourly Forecast API

**Endpoint:** `GET {forecastHourly}` (from point API)

**Called from:** `src/lib/weather.ts:118`

**Full Response Structure:**
```json
{
  "@context": [...],
  "type": "Feature",
  "geometry": {...},
  "properties": {
    "@id": "...",
    "@type": "wx:ForecastHourly",
    "updateTime": "2026-03-11T18:00:00+00:00",
    "validTimes": "2026-03-11T12:00:00+00:00/PT156H",
    "elevation": {
      "unitCode": "wmoUnit:m",
      "value": 1452.9816
    },
    "periods": [
      {
        "number": 1,
        "name": "This Afternoon",
        "startTime": "2026-03-11T16:00:00-04:00",  // ✅ USED (as timestamp)
        "endTime": "2026-03-11T18:00:00-04:00",
        "isDaytime": true,                          // ✅ USED (for daily forecast)
        "temperature": 45,                          // ✅ USED (current temp)
        "temperatureUnit": "F",
        "temperatureTrend": null,
        "windSpeed": "5 to 10 mph",                 // ✅ USED
        "windDirection": "SW",                      // ✅ USED
        "icon": "https://api.weather.gov/icons/...", // ✅ USED
        "shortForecast": "Partly Sunny",            // ✅ USED (as conditions)
        "detailedForecast": "Partly sunny...",
        "probabilityOfPrecipitation": {             // ✅ USED
          "unitCode": "wmoUnit:percent",
          "value": 20
        },
        "dewpoint": {
          "unitCode": "wmoUnit:degC",
          "value": -2.2
        },
        "relativeHumidity": {
          "unitCode": "wmoUnit:percent",
          "value": 45
        }
      }
    ]
  }
}
```

**Attributes Used from First Period (current):**
- ✅ `periods[0].temperature` → `weather.temperature`
- ✅ `periods[0].windSpeed` → `weather.windSpeed`
- ✅ `periods[0].windDirection` → `weather.windDirection`
- ✅ `periods[0].shortForecast` → `weather.conditions[0]`
- ✅ `periods[0].probabilityOfPrecipitation.value` → `weather.precipitation`
- ✅ `periods[0].startTime` → `weather.timestamp`
- ✅ `periods[0].icon` → `weather.icon`

**Attributes Used from All Periods (for hourly forecast):**
- ✅ `periods[].name` → `hourlyForecast[].name`
- ✅ `periods[].startTime` → `hourlyForecast[].startTime`
- ✅ `periods[].temperature` → `hourlyForecast[].temperature`
- ✅ `periods[].windSpeed` → `hourlyForecast[].windSpeed`
- ✅ `periods[].shortForecast` → `hourlyForecast[].shortForecast`
- ✅ `periods[].isDaytime` → `hourlyForecast[].isDaytime`
- ✅ `periods[].icon` → `hourlyForecast[].icon`

**Attributes NOT Used:**
- `number`, `endTime`, `temperatureUnit`, `temperatureTrend`, `detailedForecast`, `dewpoint`, `relativeHumidity`, `updateTime`, `validTimes`, `elevation`

---

## 3. NWS Daily Forecast API

**Endpoint:** `GET {forecast}` (from point API)

**Called from:** `src/lib/weather.ts:119`

**Full Response Structure:**
```json
{
  "@context": [...],
  "type": "Feature",
  "properties": {
    "@id": "...",
    "@type": "wx:Forecast",
    "updateTime": "2026-03-11T18:00:00+00:00",
    "validTimes": "2026-03-11T12:00:00+00:00/PT156H",
    "elevation": {...},
    "periods": [
      {
        "number": 1,
        "name": "Today",                             // ✅ USED (for matching day/night pairs)
        "startTime": "2026-03-11T07:00:00-04:00",  // ✅ USED
        "endTime": "2026-03-11T19:00:00-04:00",
        "isDaytime": true,                          // ✅ USED (to find companion period)
        "temperature": 50,                          // ✅ USED (high or low)
        "temperatureUnit": "F",
        "temperatureTrend": null,
        "windSpeed": "5 to 10 mph",                 // ✅ USED
        "windDirection": "SW",
        "icon": "https://...",                      // ✅ USED
        "shortForecast": "Partly Sunny",            // ✅ USED
        "detailedForecast": "...",
        "probabilityOfPrecipitation": {...}
      }
    ]
  }
}
```

**Attributes Used:**
- ✅ `periods[].name` - Used to match day/night pairs
- ✅ `periods[].startTime` → `dailyForecast[].startTime`
- ✅ `periods[].isDaytime` - Used to determine if period is day or night
- ✅ `periods[].temperature` - Used as high (if daytime) or low (if nighttime)
- ✅ `periods[].windSpeed` → `dailyForecast[].windSpeed`
- ✅ `periods[].shortForecast` → `dailyForecast[].shortForecast` or `secondaryForecast`
- ✅ `periods[].icon` → `dailyForecast[].icon`

**Attributes NOT Used:**
- `number`, `endTime`, `temperatureUnit`, `temperatureTrend`, `detailedForecast`, `windDirection`, `probabilityOfPrecipitation`, `updateTime`, `validTimes`, `elevation`

---

## 4. NWS Gridpoint API

**Endpoint:** `GET https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}`

**Called from:** `src/lib/weather.ts:120`

**Full Response Structure:**
```json
{
  "@context": [...],
  "type": "Feature",
  "geometry": {...},
  "properties": {
    "@id": "...",
    "@type": "wx:Gridpoint",
    "updateTime": "2026-03-11T18:00:00+00:00",
    "validTimes": "2026-03-11T12:00:00+00:00/PT156H",
    "elevation": {
      "unitCode": "wmoUnit:m",
      "value": 1452.9816
    },
    "forecastOffice": "https://api.weather.gov/offices/BTV",
    "gridId": "BTV",
    "gridX": 68,
    "gridY": 36,
    
    // All below are GridSeries (time series with values array):
    "apparentTemperature": {                        // ✅ USED
      "uom": "wmoUnit:degC",
      "values": [
        {
          "validTime": "2026-03-11T12:00:00+00:00/PT1H",
          "value": 2.2
        }
      ]
    },
    "windSpeed": {                                  // ✅ USED (as summitWind)
      "uom": "wmoUnit:m_s-1",
      "values": [...]
    },
    "windGust": {                                   // ✅ USED
      "uom": "wmoUnit:m_s-1",
      "values": [...]
    },
    "snowLevel": {                                  // ✅ USED
      "uom": "wmoUnit:m",
      "values": [...]
    },
    "snowfallAmount": {                             // ✅ USED (as snowAmount)
      "uom": "wmoUnit:mm",
      "values": [...]
    },
    "iceAccumulation": {                            // ✅ USED
      "uom": "wmoUnit:mm",
      "values": [...]
    },
    "visibility": {                                 // ✅ USED
      "uom": "wmoUnit:m",
      "values": [...]
    },
    "ceilingHeight": {                              // ✅ USED
      "uom": "wmoUnit:m",
      "values": [...]
    },
    
    // NOT USED (but available):
    "atmosphericDispersionIndex": {...},
    "davisStabilityIndex": {...},
    "dispersionIndex": {...},
    "grasslandFireDangerIndex": {...},
    "hainesIndex": {...},
    "hazards": {...},
    "heatIndex": {...},
    "heatRisk": {...},
    "lightningActivityLevel": {...},
    "lowVisibilityOccurrenceRiskIndex": {...},
    "maxTemperature": {...},
    "minTemperature": {...},
    "mixingHeight": {...},
    "potentialOf15mphWinds": {...},
    "potentialOf20mphWindGusts": {...},
    "potentialOf25mphWinds": {...},
    "potentialOf30mphWindGusts": {...},
    "potentialOf35mphWinds": {...},
    "potentialOf40mphWindGusts": {...},
    "potentialOf45mphWinds": {...},
    "potentialOf50mphWindGusts": {...},
    "potentialOf60mphWindGusts": {...},
    "pressure": {...},
    "primarySwellDirection": {...},
    "primarySwellHeight": {...},
    "probabilityOfHurricaneWinds": {...},
    "probabilityOfPrecipitation": {...},
    "probabilityOfThunder": {...},
    "probabilityOfTropicalStormWinds": {...},
    "quantitativePrecipitation": {...},
    "redFlagThreatIndex": {...},
    "relativeHumidity": {...},
    "secondarySwellDirection": {...},
    "secondarySwellHeight": {...},
    "skyCover": {...},
    "stability": {...},
    "temperature": {...},
    "transportWindDirection": {...},
    "transportWindSpeed": {...},
    "twentyFootWindDirection": {...},
    "twentyFootWindSpeed": {...},
    "waveDirection": {...},
    "waveHeight": {...},
    "wavePeriod": {...},
    "wavePeriod2": {...},
    "weather": {...},
    "wetBulbGlobeTemperature": {...},
    "windChill": {...},
    "windDirection": {...},
    "windWaveHeight": {...}
  }
}
```

**Attributes Used:**
- ✅ `apparentTemperature` → `weather.apparentTemperature` (converted from °C to °F)
- ✅ `windSpeed` → `weather.summitWind` (converted from m/s to mph)
- ✅ `windGust` → `weather.windGust` (converted from m/s to mph)
- ✅ `snowLevel` → `weather.snowLevel` (converted from m to ft)
- ✅ `snowfallAmount` → `weather.snowAmount` (converted from mm to inches)
- ✅ `iceAccumulation` → `weather.iceAccumulation` (converted from mm to inches)
- ✅ `visibility` → `weather.visibility` (converted from m to miles)
- ✅ `ceilingHeight` → `weather.ceilingHeight` (converted from m to ft)

**Attributes NOT Used:**
- All other GridSeries properties (60+ available but unused)
- `elevation`, `forecastOffice`, `updateTime`, `validTimes`

**Note:** GridSeries values are time series. The `normalizeValue()` function extracts the first non-null value from the series.

---

## 5. NWS Alerts API

**Endpoint:** `GET https://api.weather.gov/alerts/active?point={lat},{lon}`

**Called from:** `src/lib/weather.ts:69` (via `fetchAlerts()`)

**Full Response Structure:**
```json
{
  "@context": [...],
  "type": "FeatureCollection",
  "features": [
    {
      "id": "https://api.weather.gov/alerts/urn:oid:...",
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "properties": {
        "@id": "...",
        "@type": "wx:Alert",
        "id": "urn:oid:...",                        // ✅ USED
        "areaDesc": "Northern St. Lawrence...",     // ✅ USED
        "geocode": {
          "SAME": ["036089", ...],
          "UGC": ["NYZ026", ...]
        },
        "affectedZones": ["https://api.weather.gov/zones/forecast/NYZ026", ...],
        "category": "Met",
        "certainty": "Possible",
        "code": "IPAWSv1.0",
        "description": "Warm temperatures may melt...", // ✅ USED
        "effective": "2026-03-11T13:49:00-04:00",
        "ends": "2026-03-12T14:00:00-04:00",
        "event": "Flood Watch",                    // ✅ USED
        "eventCode": {
          "SAME": ["FFA"],
          "NationalWeatherService": ["FAA"]
        },
        "expires": "2026-03-12T05:15:00-04:00",
        "headline": "Flood Watch issued...",        // ✅ USED
        "instruction": "You should monitor...",    // ✅ USED
        "language": "en-US",
        "messageType": "Update",
        "onset": "2026-03-11T13:49:00-04:00",
        "parameters": {
          "AWIPSidentifier": ["FFABTV"],
          "WMOidentifier": ["WGUS61 KBTV 111749"],
          "NWSheadline": ["FLOOD WATCH REMAINS IN EFFECT..."],
          "BLOCKCHANNEL": ["EAS", "NWEM", "CMAS"],
          "EAS-ORG": ["WXR"],
          "VTEC": ["/O.CON.KBTV.FA.A.0001..."],
          "eventEndingTime": ["2026-03-12T14:00:00-04:00"],
          "expiredReferences": [...]
        },
        "references": [...],
        "response": "Prepare",
        "scope": "Public",
        "sender": "w-nws.webmaster@noaa.gov",
        "senderName": "NWS Burlington VT",
        "sent": "2026-03-11T13:49:00-04:00",
        "severity": "Severe",                       // ✅ USED
        "status": "Actual",
        "urgency": "Future",
        "web": "http://www.weather.gov"
      }
    }
  ]
}
```

**Attributes Used:**
- ✅ `features[].id` → `hazard.id`
- ✅ `features[].properties.event` → `hazard.event`
- ✅ `features[].properties.headline` → `hazard.headline`
- ✅ `features[].properties.description` → `hazard.description`
- ✅ `features[].properties.severity` → `hazard.severity`
- ✅ `features[].properties.instruction` → `hazard.instruction`
- ✅ `features[].properties.areaDesc` → `hazard.areaDesc`

**Attributes NOT Used:**
- `geometry`, `geocode`, `affectedZones`, `category`, `certainty`, `code`, `effective`, `ends`, `eventCode`, `expires`, `language`, `messageType`, `onset`, `parameters`, `references`, `response`, `scope`, `sender`, `senderName`, `sent`, `status`, `urgency`, `web`

---

## 6. Internal API: Weather Extremes

**Endpoint:** `GET /api/weather/extremes`

**Called from:** `src/components/ui/WeatherTicker.tsx:19`

**Implementation:** `src/app/api/weather/extremes/route.ts`

**What it does:**
- Calls `getWeather()` for first 20 mountain locations
- Extracts: `temperature`, `windSpeed`, `windGust`, `precipitation`
- Calculates `windChill` from temperature and wind speed
- Determines `isSnowing` (precipitation > 50% and temp < 32°F)
- Finds extremes: highest wind, lowest temp, lowest wind chill
- Returns formatted stats for banner ticker

**Response:**
```json
{
  "success": true,
  "stats": [
    {
      "label": "HIGHEST WIND",
      "value": "45mph",
      "location": "Mount Washington, NH"
    },
    {
      "label": "LOWEST TEMP",
      "value": "15°F",
      "location": "Mount Katahdin, ME"
    },
    {
      "label": "LOWEST WIND CHILL",
      "value": "-5°F",
      "location": "Mount Washington, NH"
    },
    {
      "label": "SNOWING NOW",
      "value": "Mount Marcy, Mount Mansfield, Killington Peak +2 more",
      "location": "VT"
    }
  ],
  "attempted": 20,
  "succeeded": 18,
  "failed": 2
}
```

---

## 7. Sanity CMS API (Trip Reports)

**Base URL:** `https://{projectId}.api.sanity.io/v{apiVersion}/data/query/{dataset}`

**Called from:** Multiple files in `src/app/api/trip-reports/`

**Endpoints Used:**

### 7a. Query Trip Reports
**GROQ Query:** `*[_type == "tripReport" && published == true] | order(publishedAt desc)`
**Called from:** `src/app/api/trip-reports/route.ts:85`

**Returns:**
```json
[
  {
    "_id": "trip-report-123",              // ✅ USED
    "_type": "tripReport",
    "_createdAt": "2026-03-01T10:00:00Z",  // ✅ USED
    "_updatedAt": "2026-03-01T10:00:00Z",  // ✅ USED
    "title": "Mount Marcy Winter Ascent",  // ✅ USED
    "authorName": "Jake",                   // ✅ USED
    "authorEmail": "jake@example.com",    // ✅ USED
    "tripDate": "2026-02-15",              // ✅ USED
    "locationPin": {                        // ✅ USED
      "_type": "geopoint",
      "lat": 44.1128,
      "lng": -73.9237,
      "alt": 5344
    },
    "body": [...],                         // ✅ USED (Portable Text)
    "tags": ["hiking", "winter"],          // ✅ USED
    "published": true,                      // ✅ USED
    "publishedAt": "2026-03-01T10:00:00Z"  // ✅ USED
  }
]
```

**All attributes are used** - full trip report data structure.

### 7b. Query Single Trip Report
**GROQ Query:** `*[_type == "tripReport" && _id == $id && published == true][0]`
**Called from:** `src/app/api/trip-reports/[id]/route.ts:49`

**Returns:** Same structure as above, single object.

### 7c. Query by Author
**GROQ Query:** `*[_type == "tripReport" && authorName == $author && published == true]`
**Called from:** `src/app/api/trip-reports/route.ts:27`

**Returns:** Array of trip reports filtered by author.

### 7d. Query by Tag
**GROQ Query:** `*[_type == "tripReport" && $tag in tags && published == true]`
**Called from:** `src/app/api/trip-reports/route.ts:46`

**Returns:** Array of trip reports filtered by tag.

### 7e. Query Verification Record
**GROQ Query:** `*[_type == "tripReportVerification" && token == $token][0]`
**Called from:** `src/app/api/trip-reports/verify/route.ts:27`

**Returns:**
```json
{
  "_id": "verification-123",
  "_type": "tripReportVerification",
  "token": "abc123...",                    // ✅ USED
  "tripReportId": "trip-report-123",      // ✅ USED
  "expiresAt": "2026-03-12T10:00:00Z",   // ✅ USED
  "createdAt": "2026-03-11T10:00:00Z"
}
```

### 7f. Create/Update Trip Report (Write)
**Method:** `POST` or `PATCH` to Sanity API
**Called from:** `src/app/api/trip-reports/submit/route.ts` and `edit/route.ts`

**Writes:**
- New trip report documents
- Verification records
- Updates to existing trip reports

**All Sanity attributes are used** - full document structure is stored and retrieved.

---

## 8. Resend Email API

**Base URL:** `https://api.resend.com`

**Called from:** `src/app/api/trip-reports/submit/route.ts:149`

**Endpoint:** `POST https://api.resend.com/emails`

**Request Body:**
```json
{
  "from": "onboarding@resend.dev" or "{EMAIL_FROM}",
  "to": ["user@example.com"],
  "subject": "Your Trip Report: {title}",
  "html": "<html>...</html>"
}
```

**Response:**
```json
{
  "id": "email-id-123",  // ✅ USED (for logging)
  "from": "onboarding@resend.dev",
  "to": ["user@example.com"],
  "created_at": "2026-03-11T18:00:00.000Z"
}
```

**Or Error:**
```json
{
  "error": {
    "message": "...",
    "name": "validation_error"
  }
}
```

**Attributes Used:**
- ✅ `id` - Logged for success tracking
- ✅ `error` - Logged for error handling

**Purpose:** Sends verification emails with publish/edit links when trip reports are submitted.

---

## Summary: Data Flow

```
1. getWeather(lat, lon) called
   ↓
2. GET /points/{lat},{lon}
   → Extract: gridId, gridX, gridY, forecastHourly URL, forecast URL
   ↓
3. Parallel fetch:
   ├─ GET {forecastHourly}
   │  → Extract: periods[0].temperature, windSpeed, windDirection, 
   │             shortForecast, probabilityOfPrecipitation, startTime, icon
   │  → Extract: periods[0-7] for hourlyForecast
   │
   ├─ GET {forecast}
   │  → Extract: periods[] for dailyForecast (matched day/night pairs)
   │
   ├─ GET /gridpoints/{gridId}/{gridX},{gridY}
   │  → Extract: apparentTemperature, windSpeed, windGust, snowLevel,
   │             snowfallAmount, iceAccumulation, visibility, ceilingHeight
   │
   └─ GET /alerts/active?point={lat},{lon}
      → Extract: features[].id, event, headline, description, 
                 severity, instruction, areaDesc
   ↓
4. Return WeatherData object with all extracted values
```

---

## Quick Reference: All API Endpoints

| # | API | Endpoint | Method | Used For |
|---|-----|----------|--------|----------|
| 1 | NWS Point | `/points/{lat},{lon}` | GET | Get gridpoint info for coordinates |
| 2 | NWS Hourly Forecast | `/gridpoints/{id}/{x},{y}/forecast/hourly` | GET | Current conditions + hourly forecast |
| 3 | NWS Daily Forecast | `/gridpoints/{id}/{x},{y}/forecast` | GET | 7-day forecast |
| 4 | NWS Gridpoint | `/gridpoints/{id}/{x},{y}` | GET | Detailed weather metrics (wind, snow, etc.) |
| 5 | NWS Alerts | `/alerts/active?point={lat},{lon}` | GET | Weather warnings/hazards |
| 6 | Internal | `/api/weather/extremes` | GET | Banner ticker stats |
| 7a | Sanity | Query trip reports | GET | List all published reports |
| 7b | Sanity | Query single report | GET | Get one trip report |
| 7c | Sanity | Query by author/tag | GET | Filtered trip reports |
| 7d | Sanity | Query verification | GET | Email verification tokens |
| 7e | Sanity | Create/update | POST/PATCH | Submit/edit trip reports |
| 7f | Sanity | Upload asset | POST | Image uploads |
| 8 | Resend | `/emails` | POST | Send verification emails |

---

## Unused but Available Data

**From Gridpoint API (60+ unused properties):**
- Fire danger indices (hainesIndex, redFlagThreatIndex, grasslandFireDangerIndex)
- Heat metrics (heatIndex, heatRisk, wetBulbGlobeTemperature)
- Wind probabilities (potentialOf15mphWinds, potentialOf25mphWinds, etc.)
- Wave/swell data (waveHeight, waveDirection, primarySwellHeight, etc.)
- Atmospheric stability (stability, davisStabilityIndex, mixingHeight)
- Lightning activity
- Pressure
- And many more...

**From Forecast Periods:**
- `detailedForecast` (longer text descriptions)
- `dewpoint` and `relativeHumidity`
- `temperatureTrend`
- `endTime`

**From Alerts:**
- Timing data (effective, expires, onset, sent)
- Geographic codes (SAME, UGC)
- Alert parameters and references
- Certainty and urgency levels
