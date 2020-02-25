const http = require('http');
const fs = require('fs');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Load the html and css fles
const indexHTML = fs.readFileSync(`${__dirname}/../client/client.html`);
const indexCSS = fs.readFileSync(`${__dirname}/../client/style.css`);

// TODO : Move helper stuff out

// Pre-built object for 404 responses
const notFoundObj = {
  message: 'Page not found',
  id: 'notFound',
};

// Map of all known users - { "username": { "password": password, ... }, ... }
const users = {};

// Array of all uploaded images - [ { "url": url, ... }, ... ]
const images = [];

// Generalized function for sending responses
function sendResponse(request, response, statusCode, contentType, data) {
  // Send data only if data is to be sent
  if (contentType && data) {
    response.writeHead(statusCode, { 'Content-Type': contentType });
    response.write(data);
  } else {
    response.writeHead(statusCode);
  }
  response.end();
}

// Handle POST request data extraction
function handlePOST(request, response, handler) {
  const body = [];

  // Call it a bad request if it errors out
  request.on('error', () => {
    sendResponse(request, response, 400, null, null);
  });

  // Collect the data
  request.on('data', (chunk) => {
    body.push(chunk);
  });

  // Handle the data once the stream finishes
  request.on('end', () => {
    // Put the data together
    const data = JSON.parse(Buffer.concat(body).toString());
    handler(request, response, data);
  });
}

function parseQuery(reqURL) {
  // Parse out the query
  const parsed = {};

  const requestSplit = reqURL.split('?');
  const requestURL = requestSplit[0];
  parsed.url = requestURL;
  parsed.params = {};

  // Extract query params
  if (requestSplit.length > 1) {
    const params = requestSplit[1].split('&');

    for (let i = 0; i < params.length; ++i) {
      const paramSplit = params[i].split('=');
      if (paramSplit.length === 2) {
        // Somehow this is considered preferable to doing it inline by airbnb
        const pKey = paramSplit[0];
        const pVal = paramSplit[1];
        parsed.params[pKey] = pVal;
      }
    }
  }

  return parsed;
}

// Get an array of all images matching the specified tag list
function matchImages(tagList) {
  let matches = [];
  for (let i = 0; i < images.length; ++i) {
    if (tagList.every((tag) => { return images[i].tags.indexOf(tag) > -1; })) {
      matches.push(images[i]);
    }
  }
  return matches;
}

// Create a new user
function createUser(request, response, data) {
  // Sanity check the data
  if (!data.username || !data.password) {
    sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Username or password missing',
      id: 'missingParams',
    }));
  }

  // Send a 204 if the user already exists; otherwise add it to the list
  if (users[data.username]) {
    sendResponse(request, response, 204, null, null);
  } else {
    users[data.username] = { password: data.password };
    sendResponse(request, response, 201, 'application/json', JSON.stringify({
      message: 'Created successfully',
    }));
  }
}

// Add an image to the database; allowing identical images is intentional
function addImage(request, response, data) {
  // Sanity check the data
  if (!data.image || !data.tags) {
    sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Image missing',
      id: 'missingParams',
    }));
  }

  images.push({ url: data.image, tags: data.tags });
  sendResponse(request, response, 201, 'application/json', JSON.stringify({
    message: 'Created successfully',
  }));
}

function onRequest(request, response) {
  const query = parseQuery(request.url);
  console.log(query.url);

  // Inline the functionality into the switch (sendResponse does all the heavy lifting)
  switch (query.url) {
    case '/':
      sendResponse(request, response, 200, 'text/html', indexHTML);
      break;
    case '/style.css':
      sendResponse(request, response, 200, 'text/css', indexCSS);
      break;
    case '/createUser':
      handlePOST(request, response, createUser);
      break;
    case '/addImage':
      handlePOST(request, response, addImage);
      break;
    case '/getImages':
      // TODO : Implement no-tag-query case in a cleaner way
      if (query.params.tags) {
        const matchedImages = matchImages(query.params.tags.split('~'));
        sendResponse(request, response, 200, 'application/json', JSON.stringify(matchedImages));
      } else {
        sendResponse(request, response, 200, 'application/json', JSON.stringify(images));
      }
      break;
    default:
      sendResponse(request, response, 404, 'application/json', JSON.stringify(notFoundObj));
      break;
  }
}

http.createServer(onRequest).listen(port);
console.log(`Listening on 127.0.0.1:${port}`);
