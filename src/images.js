const http = require('http');
const https = require('https');

const commonLib = require('./common.js');

// Array of all uploaded images - [ { "url": url, ... }, ... ]
const images = [
  {
    url: 'https://api.time.com/wp-content/uploads/2019/11/fish-with-human-face-tik-tok-video.jpg',
    tags: ['test', 'fish'],
    uploader: 'admin',
  },
  {
    url: 'https://www.rd.com/wp-content/uploads/2018/01/01_Common-Myths-About-Airplanes-You-Need-to-Stop-Believing_559714906_motive56-760x506.jpg',
    tags: ['test', 'airplane'],
    uploader: 'admin',
  },
];

// Add an image to the database; allowing identical images is intentional
function addImage(request, response, data) {
  images.push({ url: data.image, tags: data.tags, uploader: data.uploader });
  commonLib.sendResponse(request, response, 201, 'application/json', JSON.stringify({
    message: 'Created successfully',
  }));
}

function validateImage(request, response, imageData) {
  // Use either http or https, depending on the provided URL
  let httpx = http;
  if (imageData.image.startsWith('https')) { httpx = https; }

  httpx.request(imageData.image, { method: 'HEAD' }, (resp) => {
    // Pretend to care about the data so we can have the headers
    resp.on('data', () => {});

    resp.on('end', () => {
      const contentType = resp.headers['content-type'] || resp.headers['Content-Type'];

      // Sanity check the data
      if (!imageData.image || !imageData.tags || !imageData.uploader) {
        commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
          message: 'Image or metadata missing',
          id: 'missingParams',
        }));

        return;
      }

      if (contentType.startsWith('image/')) {
        addImage(request, response, imageData);
      } else {
        commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
          message: 'Invalid image URL',
          id: 'invalidParams',
        }));
      }
    });
  }).end();
}

// Get an array of all images matching the specified tag list
function matchImages(tagList) {
  const matches = [];
  for (let i = 0; i < images.length; ++i) {
    // If all requested tags are found in the image's tag list, consider it a match
    if (tagList.every((tag) => images[i].tags.indexOf(tag) > -1)) {
      matches.push(images[i]);
    }
  }
  return matches;
}

// Get an array of all images uploaded by a specific user
function matchUploads(username) {
  const matches = [];
  for (let i = 0; i < images.length; ++i) {
    // Match all images uploaded by the given user
    if (images[i].uploader === username) {
      matches.push(images[i]);
    }
  }
  return matches;
}

// Delete an image from the database
function deleteImage(request, response, data) {
  let hit = false;

  // Sanity check the data
  if (!data.url) {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Image URL missing',
      id: 'missingParams',
    }));
  }

  // Iterate through the images, and delete any matching the requested URL
  for (let i = images.length - 1; i >= 1; --i) {
    if (images[i].url === data.url) {
      images[i] = images[images.length - 1];
      images.length -= 1;
      hit = true;
    }
  }

  if (hit) {
    commonLib.sendResponse(request, response, 204, null, null);
  } else {
    commonLib.sendResponse(request, response, 400, 'application/json', JSON.stringify({
      message: 'Invalid image URL',
      id: 'invalidParams',
    }));
  }
}

module.exports = {
  images,
  validateImage,
  matchImages,
  matchUploads,
  addImage,
  deleteImage,
};
