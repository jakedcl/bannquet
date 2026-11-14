# Mountain weather — final pass notes

Items to resolve after milestone ingest (do not block M1–M16 delivery).

- **bald-mountain (VT southern-greens):** Catalog coordinates `41.1326, -73.3618` look like the wrong Bald Mountain (Connecticut), not a Rutland/Windsor peak. NWS points lookup is skipped; office left unchanged until coordinates are fixed. Verify name, county, and coordinates before using for map pins or “nearest” logic.
- **mtn-points.xml office vs CWA:** Some peaks keep BTV/A LY `mtn-points.json` office for XML loc lookup when the product file differs from `api.weather.gov/points` cwa (e.g. `lyon-mountain` stays BTV XML under KALY cwa).