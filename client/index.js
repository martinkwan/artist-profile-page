/**
 * Handlebar template function
 * Grabs template script
 * Then compiles template
 * Then passes data to template
 * Then adds compiled html to the page
 * @param  {object} obj              [object of data to render]
 * @param  {string} templateSelector [DOM location to select template and to render to]
 */
function populateTemplate(obj, templateSelector) {
  const theTemplateScript = $(`#${templateSelector}-template`).html();
  const theTemplate = Handlebars.compile(theTemplateScript);
  const theCompiledHtml = theTemplate(obj);
  $(`.${templateSelector}-placeholder`).html(theCompiledHtml);
}

/**
 * Add and remove classes to render artist profile page correctly
 * @param  {string} artistImg [url of artist image]
 */
function adjustCss(artistImg) {
  $('body').addClass('make-relative');
  $('.artist-profile-img').css('background-image', `url("${artistImg}")`);
  $('nav').removeClass('hide-this');
  $('.related-artist-container').removeClass('hide-this');
  $('.audio-bar').removeClass('hide-this');
  $('.footer-bar').removeClass('footer-position');
  $('.related-artist-header').removeClass('hide-this');
  $('.album-list-outer').addClass('album-list-container');
}


/**
 * Make a GET request to server to spotify api to grab artist information
 * Then render artist info using handlebars.js template
 * Then send artistObj to next step in promise
 * @param  {string} artist  [artist name from input value]
 * @param  {function} resolve [resolves promise and sends artistObj to then()]
 */
function getArtist(artist, resolve, reject) {
  $.get('/artist', { artist }, (artistResults) => {
    let artistObj = JSON.parse(artistResults).artists.items[0];
    if (artistObj) {
      artistObj = {
        artistName: artistObj.name,
        artistImg: artistObj.images[1].url,
        artistId: artistObj.id,
      };
      populateTemplate(artistObj, 'artist-profile');
      adjustCss(artistObj.artistImg);
      resolve(artistObj);
    } else {
      reject();
    }
  });
}

/**
 * Make a GET request to server to spotify api to grab popular songs
 * Then render tracklist using handlebars.js template
 * @param  {string} artistId              [id of artist]
 */
function getTracks(artistId) {
  $.get('/tracks', { artistId }, (trackResults) => {
    const trackList = JSON.parse(trackResults).tracks.map((track) => {
      return { trackName: track.name, trackPreview: track.preview_url };
    });
    populateTemplate({ trackList, albumName: 'Popular' }, 'track-list');
  });
}

/**
 * If artist has less than 8 albums, iterate through albums and add again to array
 * @param  {array} coverArtUrls [array of album art urls]
 */
function displayCoverArt(coverArtUrls) {
  let i = 0;
  while (coverArtUrls.length < 8) {
    if (!coverArtUrls[i]) {
      i = 0;
    }
    coverArtUrls.push(coverArtUrls[i]);
    i += 1;
  }
  const finalCoverArtUrls = coverArtUrls.slice(0, 8).join(', ');
  $('.cover-art-background').css('background-image', `linear-gradient(rgba(0, 0, 0, 0),rgba(0, 0, 0, 0.8)),${finalCoverArtUrls}`);
}

/**
 * Make a GET request to server to spotify api to grab artist's albums
 * Then render album list using handlebars.js template
 * Check if album image length > 1,
 * because 'kanye west' query had error with album image not showing
 * @param  {string} artistName [name of artist]
 * @param  {string} artistId   [id of artist]
 */
function getAlbums(artistName, artistId) {
  $.get('/albums', { artistName }, (albumResults) => {
    const coverArtUrls = JSON.parse(albumResults).albums.items.map((album) => {
      if (album.images.length > 1) {
        return `url('${album.images[1].url}')`
      }
    });
    const albumObj = JSON.parse(albumResults).albums.items.map((album) => {
      if (album.images.length > 1) {
        return { albumImg: album.images[1].url, albumId: album.id, albumName: album.name.replace(/\s/g, 'unique.combo.of.words') };
      }
    });
    displayCoverArt(coverArtUrls);
    populateTemplate({ albumObj, artistId }, 'album-list');
    $('.popular-album-image').addClass('active-album');
  });
}

/**
 * Make a GET request to server to spotify api to grab albums' tracks
 * Then render tracklist using handlebars.js template
 * @param  {string} artistId [id of artist]
 * @param  {string} albumName   [name of album]
 */
function getAlbumTracks(albumId, albumName) {
  $.get('/albumTracks', { albumId }, (albumTrackResults) => {
    const trackList = JSON.parse(albumTrackResults).items.map((track) => {
      return { trackName: track.name, trackPreview: track.preview_url };
    });
    populateTemplate({ trackList, albumName }, 'track-list');
  });
}

/**
 * Make a GET request to server to spotify api to grab related artists
 * Then render tracklist using handlebars.js template
 * @param  {string} artistId              [id of artist]
 */
function getRelatedArtists(artistId) {
  $.get('/relatedArtists', { artistId }, (artistResults) => {
    const relatedArtists = JSON.parse(artistResults).artists.map((artist) => {
      return { artistName: artist.name, artistImg: `background-image:url(${artist.images[1].url})` };
    });
    populateTemplate({ relatedArtists }, 'related-artists');
  });
}

/**
 * Adds bootstrap classes depending if artist search was success or fail
 * @param  {keyword} context [keyword 'this' passed in]
 * @param  {boolean} success [if artist search was success or failure]
 */
function formValidation(context, success) {
  if (success) {
    $(context).find('input').removeClass('form-control-danger');
    $(context).removeClass('has-danger');
    $(context).find('input').addClass('form-control-success');
    $(context).addClass('has-success');
  } else {
    $(context).find('input').removeClass('form-control-success');
    $(context).removeClass('has-success');
    $(context).find('input').addClass('form-control-danger');
    $(context).addClass('has-danger');
  }
}

/**
 * Completes all the api requests to load a new artist page
 * @param  {string} artist [artist name]
 */
function loadNewArtist(artist, context) {
  new Promise((resolve, reject) => {
    getArtist(artist, resolve, reject);
  }).then((artistObj) => {
    formValidation(context, true);
    getTracks(artistObj.artistId);
    getAlbums(artistObj.artistName, artistObj.artistId);
    getRelatedArtists(artistObj.artistId);
  }).catch(() => {
    formValidation(context, false);
  });
}

/**
* On submit form, get data from spotify API and render to page using handlebar templates
* Cannot be an arrow function because of the 'this' binding
*/
$('.search-form').submit(function (event) {
  event.preventDefault();
  $(this).blur();
  const artist = $(this).find('input').val();
  loadNewArtist(artist, this);
});

$('.related-artists-placeholder').on('click', 'span', function () {
  const artist = $(this).find('.card-text').text();
  loadNewArtist(artist, this);
})

/**
 * Changes tracklist when an album art is clicked
 * Cannot be an arrow function because of the 'this' binding
 */
$('.album-list-placeholder').on('click', 'img', function () {
  $('.active-album').removeClass('active-album');
  $(this).addClass('active-album');
  const albumId = $(this).data('album-id');
  const albumName = $(this).data('album-name').replace(/(unique.combo.of.words)/g, ' ');
  if (albumId === 'popularSongs') {
    const artistId = $(this).data('artist-id');
    getTracks(artistId);
  } else {
    getAlbumTracks(albumId, albumName);
  }
});

/**
 * Self invoking function sets up storage for audioObject so it doesn't need to be a global variable
 * @return {Object} [set and get methods to keep _audioObject as non-global variable]
 */
const currentAudio = (function () {
  let _audioObject = null;
  return {
    set: (newAudioObj) => {
      _audioObject = newAudioObj;
    },
    get: () => _audioObject,
  };
}());

/**
 * Play song at context DOM element,
 * Recursively play next song
 * @param  {keyword} context [dom element to play song]
 */
function playSong(context) {
  // Set up audioObject for song to be played
  const previewUrl = $(context).data('track-preview');
  if (!previewUrl) {
    $(context).addClass('list-group-item-danger has-danger');
    // $(context).text()
    return;
  }
  const audioObject = new Audio(previewUrl);
  currentAudio.set(audioObject);
  audioObject.play();
  $(context).removeClass('selected');
  $(context).addClass('playing');
  audioObject.addEventListener('ended', () => {
    $('.play-pause').addClass('fa-play-circle-o');
    $('.play-pause').removeClass('fa-pause-circle-o');
    $(context).removeClass('playing');
    $(context).removeClass('selected');
    playSong($(context).next());
  });
  audioObject.addEventListener('pause', () => {
    $('.play-pause').addClass('fa-play-circle-o');
    $('.play-pause').removeClass('fa-pause-circle-o');
    $(context).removeClass('playing');
    $(context).addClass('selected');
  });
  audioObject.addEventListener('play', () => {
    $('.play-pause').addClass('fa-pause-circle-o');
    $('.play-pause').removeClass('fa-play-circle-o');
    $('.selected').removeClass('selected');
    $(context).addClass('playing');
  });
}

/**
 * Plays song when clicked
 */
$('.track-list-placeholder').on('click', 'li', function () {
  const audioObject = currentAudio.get();
  // If this song is playing, pause it
  if ($(this).hasClass('playing')) {
    audioObject.pause();
  } else {
    // If there is currently an audio object, pause it
    if (audioObject) {
      audioObject.pause();
    }
    playSong(this);
  }
});
/**
 * Plays or pause song
 */
$('.play-pause').on('click', function () {
  const audioObject = currentAudio.get();
  if ($(this).hasClass('fa-play-circle-o')) {
    if (!$('.selected').hasClass('selected')) {
      const firstSong = $('.list-group-item:first-child');
      playSong(firstSong)
      return;
    }
    audioObject.play();
  } else {
    audioObject.pause();
  }
});
/**
 * Plays next song
 */
$('.fa-step-forward').on('click', () => {
  const nextSong = $('.selected, .playing').next();
  const audioObject = currentAudio.get();
  audioObject.pause();
  playSong(nextSong);
})

/**
 * Plays previous song
 */
$('.fa-step-backward').on('click', () => {
  const previousSong = $('.selected, .playing').prev();
  const audioObject = currentAudio.get();
  audioObject.pause();
  playSong(previousSong);
})

/**
 * Scroll listener to make audio bar stick to footer
 * just before it collides
 */
$(window).scroll(() => {
  let scrollBottom = $(document).height() - $(window).height() - $(window).scrollTop();
  if (scrollBottom < 29) {
    $('.audio-bar').addClass('scroll-spy-position');
  } else {
    $('.audio-bar').removeClass('scroll-spy-position');
  }
});
