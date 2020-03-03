const http = require('http');
const fs = require('fs');

const commonLib = require('./common.js');
const imageLib = require('./images.js');
const userLib = require('./users.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Load the html and css fles
const indexHTML = fs.readFileSync(`${__dirname}/../client/client.html`);
const indexCSS = fs.readFileSync(`${__dirname}/../client/style.css`);

// Handle incoming requests
function onRequest(request, response) {
  const query = commonLib.parseQuery(request.url);
  const session = userLib.validateSession(request);
  const authed = userLib.authorizeRequest(request, response, query.url, session);
  if (!authed) { return; }

  // Say no to content requests other than thosenthe server actually cares about
  if (request.headers.accept
     && request.headers.accept.includes('application/json')
     && request.headers.accept.includes('text/html')
     && request.headers.accept.includes('text/css')) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Invalid content request',
      id: 'invalidParams',
    }));
  }

  // Inline the functionality into the switch (sendResponse does all the heavy lifting)
  switch (query.url) {
    case '/':
      commonLib.sendResponse(request, response, 200, 'text/html', indexHTML);
      break;
    case '/style.css':
      commonLib.sendResponse(request, response, 200, 'text/css', indexCSS);
      break;
    case '/createUser':
      commonLib.handlePOST(request, response, userLib.createUser);
      break;
    case '/authUser':
      commonLib.handlePOST(request, response, userLib.authUser);
      break;
    case '/getSessionUser':
      commonLib.sendResponse(request, response, 200, 'application/json', JSON.stringify({
        user: userLib.sessions[session],
      }));
      break;
    case '/addImage':
      commonLib.handlePOST(request, response, imageLib.validateImage);
      break;
    case '/getImages':
      // Sanity check the data
      if (query.params.tags) {
        const matchedImages = imageLib.matchImages(query.params.tags.split('~'));
        commonLib.sendResponse(request, response, 200, 'application/json', JSON.stringify(matchedImages));
      } else {
        commonLib.sendResponse(request, response, 200, 'application/json', JSON.stringify(imageLib.images));
      }
      break;
    case '/getUploads':
      // Sanity check the data
      if (query.params.user) {
        const matchedImages = imageLib.matchUploads(query.params.user);
        commonLib.sendResponse(request, response, 200, 'application/json', JSON.stringify(matchedImages));
      } else {
        commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
          message: 'Image or metadata missing',
          id: 'missingParams',
        }));
      }
      break;
    case '/deleteImage':
      commonLib.handlePOST(request, response, imageLib.deleteImage);
      break;
    case '/deleteUser':
      commonLib.handlePOST(request, response, userLib.deleteUser);
      break;
    default:
      commonLib.sendResponse(request, response, 404, 'application/json', JSON.stringify({
        message: 'Page not found',
        id: 'notFound',
      }));
      break;
  }
}

http.createServer(onRequest).listen(port);
console.log(`Listening on 127.0.0.1:${port}`);
