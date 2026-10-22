Station names and three-letter CRS codes in `nationalRailStations.json` were
downloaded on 21 October 2026 from National Rail's public Stations XML feed:
https://internal.nationalrail.co.uk/xml/4.0/stations.xml

Directory: https://www.nationalrail.co.uk/stations/
Feed documentation: https://www.nationalrail.co.uk/developers/knowledgebase-data-feeds/

This is a bundled snapshot, so report search does not depend on a third-party
request while the user is typing. National Rail covers Great Britain, rather
than the whole United Kingdom. Northern Ireland is not included in this feed.
Existing local map stations are merged in `../lib/reportStations.js`.

To refresh, download the XML and extract each Station's Name and CrsCode in the
`http://nationalrail.co.uk/xml/station` namespace. Sort by name, replace the JSON
stations array and update retrievedOn. Keep source and directory metadata.
Run `node --test tests/reportStations.test.js` and `npm run build` afterwards.
