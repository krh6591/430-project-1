const shortid = require('shortid');

const commonLib = require('./common.js');

// Map of all known users - { "username": { "password": password, ... }, ... }
const users = { admin: { password: 'password', admin: true } };

// Map of all active user sessions - { session-id: username, ... }
const sessions = {};

// Endpoints requiring a valid session - { endpoint: requires-admin (T/F), ... }
const authEndpoints = {
  '/addImage': false,
  '/deleteImage': true,
  '/deleteUser': true,
};

// Check for a valid session cookie, return session if valid, null otherwise
function validateSession(request) {
  if (!request.headers.cookie) { return null; }

  // Hunt for a valid session cookie
  const cookieSplit = request.headers.cookie.split('; ');
  for (let i = 0; i < cookieSplit.length; ++i) {
    if (cookieSplit[i].startsWith('session=')) {
      const session = cookieSplit[i].replace('session=', '');
      if (session in sessions) {
        return session;
      }
    }
  }

  return null;
}

// Block the user from performing requests they're not authorized for
function authorizeRequest(request, response, reqURL, session) {
  // Check if the endpoint requires authentication, and whether the user is authorized
  // Short-circuit evaluation is fun
  if (!(reqURL in authEndpoints)
     || (session && session in sessions
     && (!authEndpoints[reqURL]
     || users[sessions[session]].admin))) {
    return true;
  }

  // Send back a 403 if lacking authorization
  commonLib.sendResponse(request, response, 403, 'application/json', JSON.stringify({
    message: 'Unauthorized request',
    id: 'unauthorized',
  }));
  return false;
}

// Create a new user
function createUser(request, response, data) {
  // Sanity check the data
  if (!data.username || !data.password) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Username or password missing',
      id: 'missingParams',
    }));
    return;
  }

  // Send a 204 if the user already exists; otherwise add it to the list
  if (users[data.username]) {
    commonLib.sendResponse(request, response, 204, null, null);
  } else {
    users[data.username] = { password: data.password };
    commonLib.sendResponse(request, response, 201, 'application/json', JSON.stringify({
      message: 'Created successfully',
    }));
  }
}

// Authenticate a user for login
function authUser(request, response, data) {
  // Sanity check the data
  if (!data.username || !data.password) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Username or password missing',
      id: 'missingParams',
    }));
    return;
  }

  // Check the credentials - if the user exists, and the password matches, continue
  if (!(users[data.username]) || users[data.username].password !== data.password) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Invalid username or password',
      id: 'invalidParams',
    }));
    return;
  }

  // Generate a session token, and send it as a cookie
  const session = shortid.generate();
  sessions[session] = data.username;
  response.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `session=${session}` });
  response.write(JSON.stringify({ message: 'Authorized successfully' }));
  response.end();
}

// Delete a user from the database
function deleteUser(request, response, data) {
  // Sanity check the data
  if (!data.user) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Username missing',
      id: 'missingParams',
    }));
  }

  if (!(data.user in users)) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Invalid username',
      id: 'invalidParams',
    }));
  }

  // Delete the user, as well as any of their active sessions
  users[data.user] = null;
  for (let i = sessions.length - 1; i >= 1; --i) {
    if (sessions[i] === data.user) {
      sessions[i] = sessions[sessions.length - 1];
      sessions.length -= 1;
    }
  }

  commonLib.sendResponse(request, response, 204, null, null);
}

module.exports = {
  users,
  sessions,
  validateSession,
  authorizeRequest,
  createUser,
  authUser,
  deleteUser,
};
