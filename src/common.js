// Parse URL and params out from a query
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

// Generalized function for sending http responses
function sendResponse(request, response, statusCode, contentType, data) {
  // Send data only if data is to be sent
  if (request.method !== 'HEAD' && contentType && data) {
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
    // Put the data together and continue on to the handler
    const data = JSON.parse(Buffer.concat(body).toString());
    handler(request, response, data);
  });
}

module.exports = {
  parseQuery,
  sendResponse,
  handlePOST,
};
