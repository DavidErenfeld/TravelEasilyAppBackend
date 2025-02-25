import { ITrips } from "../types/tripsTypes";

export const renderTripsAsHtml = (trips: ITrips[]): string => {
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
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="description" content="List of all trips on Travel Easily" />
        <title>Travel Easily - All Trips</title>
      </head>
      <body>
        <h1>Trip List</h1>
        <ul>
          ${listItems}
        </ul>
      </body>
    </html>
  `;
};

export const renderSingleTripAsHtml = (trip: ITrips): string => {
  const title = `Trip to ${trip.country} - ${trip.typeTrip}`;
  const description =
    trip.tripDescription?.[0] || "A wonderful trip description!";
  const imageUrl = trip.tripPhotos?.[0] || "/images/Logo.png";

  return `
    <!DOCTYPE html>
    <html lang="en">
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
        <img src="${imageUrl}" alt="Trip photo" />
        <p>Type of Traveler: ${trip.typeTraveler}</p>
        <p>Likes: ${trip.numOfLikes}</p>
        <p>${description}</p>
      </body>
    </html>
  `;
};
