# Mountain weather — final pass notes

Items to resolve after milestone ingest (do not block M1–M16 delivery).

- **bald-mountain (VT southern-greens):** Coords resolved via GNIS `1460546` (Bennington) cross-checked with ALY `mtnFcst` (`42.9219, -73.1436`).
- **mtn-points.xml office vs CWA:** Some peaks keep BTV/A LY `mtn-points.json` office for XML loc lookup when the product file differs from `api.weather.gov/points` cwa (e.g. `lyon-mountain` stays BTV XML under KALY cwa).