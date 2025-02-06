import { ITrips } from "../entity/trips_model";

export function renderTripsAsHtml(trips: ITrips[]): string {
  const listItems = trips
    .map(
      (trip) => `
      <li>
        <a href="/trips/FullTrip/${trip._id}">
          ${trip.country} - ${trip.typeTrip}
        </a>
      </li>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="he">
      <head>
        <meta charset="utf-8" />
        <meta name="description" content="רשימת כל הטיולים באתר Travel Easily" />
        <title>Travel Easily - All Trips</title>
      </head>
      <body>
        <h1>רשימת טיולים</h1>
        <ul>
          ${listItems}
        </ul>
      </body>
    </html>
  `;
}

export function renderSingleTripAsHtml(trip: ITrips): string {
  // כאן נוסיף OG tags (חשוב לשיתוף ברשתות חברתיות) + title + description
  // שימוש בשדות trip.country, trip.typeTrip, tripPhotos[0], וכו'.
  const title = `טיול ל${trip.country} - ${trip.typeTrip}`;
  const description = trip.tripDescription?.[0] || "תיאור טיול נפלא!";
  const imageUrl = trip.tripPhotos?.[0] || "/images/Logo.png"; // ברירת מחדל

  return `
    <!DOCTYPE html>
    <html lang="he">
      <head>
        <meta charset="utf-8" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:type" content="article" />
        <title>${title}</title>
      </head>
      <body>
        <h1>${title}</h1>
        <img src="${imageUrl}" alt="trip photo" />
        <p>Type of Traveler: ${trip.typeTraveler}</p>
        <p>Likes: ${trip.numOfLikes}</p>
        <p>${description}</p>
      </body>
    </html>
  `;
}
