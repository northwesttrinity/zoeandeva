/* ===========================================================
   Zoe & Eva's Magic Music Box — player + Chromecast logic
   =========================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---- DOM references ----
const audio         = document.getElementById('audio');
const playBtn        = document.getElementById('playBtn');
const playIcon       = document.getElementById('playIcon');
const pauseIcon      = document.getElementById('pauseIcon');
const prevBtn         = document.getElementById('prevBtn');
const nextBtn         = document.getElementById('nextBtn');
const castBtn         = document.getElementById('castBtn');
const castStatus      = document.getElementById('castStatus');
const trackTitleEl    = document.getElementById('trackTitle');
const trackArtistEl   = document.getElementById('trackArtist');
const timeCurrentEl   = document.getElementById('timeCurrent');
const timeDurationEl  = document.getElementById('timeDuration');
const trackListEl     = document.getElementById('trackList');
const rainbowBandsG   = document.getElementById('rainbowBands');
const progressArc     = document.getElementById('progressArc');
const rainbowRunner   = document.getElementById('rainbowRunner');

let playlist = [];
let currentIndex = 0;
let isCasting = false;
let remotePlayer = null;
let remotePlayerController = null;

// ---- Build the rainbow arc ----
const ARC_CX = 200, ARC_CY = 185;

function arcPath(cx, cy, r){
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}

function buildRainbow(){
  const bandColors = ['#FF6B6B', '#FFA94D', '#FFD93D', '#4CE0B3', '#4FC3F7', '#8B6BE0'];
  const bandRadii  = [170, 156, 142, 128, 114, 100];

  bandColors.forEach((color, i) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', arcPath(ARC_CX, ARC_CY, bandRadii[i]));
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '13');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    rainbowBandsG.appendChild(path);
  });

  progressArc.setAttribute('d', arcPath(ARC_CX, ARC_CY, 182));
}

let progressArcLength = 0;

function primeProgressArc(){
  progressArcLength = progressArc.getTotalLength();
  progressArc.style.strokeDasharray = String(progressArcLength);
  progressArc.style.strokeDashoffset = String(progressArcLength); // start empty
  positionRunner(0);
}

function positionRunner(fraction){
  fraction = Math.max(0, Math.min(1, fraction || 0));
  const len = progressArcLength || progressArc.getTotalLength();
  const pt = progressArc.getPointAtLength(len * fraction);
  rainbowRunner.style.left = (pt.x / 400 * 100) + '%';
  rainbowRunner.style.top  = (pt.y / 190 * 100) + '%';
}

function updateProgressUI(currentTime, duration){
  const fraction = duration ? (currentTime / duration) : 0;
  const len = progressArcLength || progressArc.getTotalLength();
  progressArc.style.strokeDashoffset = String(len * (1 - fraction));
  positionRunner(fraction);
  timeCurrentEl.textContent = formatTime(currentTime);
  timeDurationEl.textContent = formatTime(duration);
}

function formatTime(seconds){
  if (!isFinite(seconds) || seconds == null || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function setPlayingUI(isPlaying){
  playIcon.style.display  = isPlaying ? 'none' : '';
  pauseIcon.style.display = isPlaying ? '' : 'none';
  playBtn.title = isPlaying ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

// ---- Load playlist ----
async function loadPlaylist(){
  try{
    const res = await fetch('music/playlist.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load playlist.json');
    playlist = await res.json();
  } catch (err){
    console.error(err);
    playlist = [];
  }

  renderTrackList();

  if (playlist.length){
    loadTrack(0, false);
  } else {
    trackTitleEl.textContent = 'No songs yet!';
    trackArtistEl.textContent = 'Add one to music/playlist.json ✨';
    trackListEl.innerHTML = '<li class="empty-state">No songs here yet — the music box is waiting to be filled! 🌈</li>';
    playBtn.disabled = true;
  }
}

function renderTrackList(){
  trackListEl.innerHTML = '';
  playlist.forEach((track, i) => {
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.className = 'track-card';
    card.type = 'button';
    card.innerHTML = `
      <span class="track-card__emoji">${track.emoji || '🎵'}</span>
      <span class="track-card__meta">
        <span class="track-card__title">${escapeHtml(track.title)}</span><br>
        <span class="track-card__artist">${escapeHtml(track.artist || '')}</span>
      </span>
      <span class="track-card__badge">Play</span>
    `;
    card.addEventListener('click', () => loadTrack(i, true));
    li.appendChild(card);
    trackListEl.appendChild(li);
  });
  highlightActiveCard();
}

function highlightActiveCard(){
  const cards = trackListEl.querySelectorAll('.track-card');
  cards.forEach((c, i) => c.classList.toggle('is-active', i === currentIndex));
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function resolvedTrackUrl(track){
  return new URL(track.file, window.location.href).href;
}

// ---- Load + play a track (locally or via cast) ----
function loadTrack(index, autoplay){
  if (!playlist.length) return;
  currentIndex = ((index % playlist.length) + playlist.length) % playlist.length;
  const track = playlist[currentIndex];

  trackTitleEl.textContent = track.title;
  trackArtistEl.textContent = track.artist || '';
  highlightActiveCard();
  playBtn.disabled = false;
  updateProgressUI(0, 0);
  castStatus.textContent = isCasting ? castStatus.textContent : '';

  if (isCasting){
    castCurrentTrack(autoplay);
  } else {
    audio.src = resolvedTrackUrl(track);
    audio.load();
    if (autoplay){
      audio.play().catch(() => {/* wait for user gesture */});
    }
  }
}

// ---- Local audio events ----
audio.addEventListener('loadedmetadata', () => {
  if (!isCasting) updateProgressUI(audio.currentTime, audio.duration);
});
audio.addEventListener('timeupdate', () => {
  if (!isCasting) updateProgressUI(audio.currentTime, audio.duration);
});
audio.addEventListener('play',  () => { if (!isCasting) setPlayingUI(true); });
audio.addEventListener('pause', () => { if (!isCasting) setPlayingUI(false); });
audio.addEventListener('ended', () => { if (!isCasting) loadTrack(currentIndex + 1, true); });
audio.addEventListener('error', () => {
  if (!playlist.length) return;
  trackArtistEl.textContent = "This song file hasn't been uploaded yet 🎶";
});

// ---- Controls ----
playBtn.addEventListener('click', () => {
  if (isCasting){
    if (remotePlayerController) remotePlayerController.playOrPause();
    return;
  }
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
});
prevBtn.addEventListener('click', () => loadTrack(currentIndex - 1, true));
nextBtn.addEventListener('click', () => loadTrack(currentIndex + 1, true));

buildRainbow();
primeProgressArc();
loadPlaylist();

// ===========================================================
// Chromecast (Google Cast Web Sender SDK)
// ===========================================================
window['__onGCastApiAvailable'] = function (isAvailable) {
  if (!isAvailable) return;
  let attempts = 0;
  (function waitForFramework(){
    if (window.cast && cast.framework){
      initializeCastApi();
    } else if (attempts++ < 20){
      setTimeout(waitForFramework, 100);
    } else {
      console.error('cast.framework never attached after __onGCastApiAvailable fired');
    }
  })();
};

function initializeCastApi(){
  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  remotePlayer = new cast.framework.RemotePlayer();
  remotePlayerController = new cast.framework.RemotePlayerController(remotePlayer);

  remotePlayerController.addEventListener(
    cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
    onCastConnectedChanged
  );
  remotePlayerController.addEventListener(
    cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
    onRemoteProgress
  );
  remotePlayerController.addEventListener(
    cast.framework.RemotePlayerEventType.DURATION_CHANGED,
    onRemoteProgress
  );
  remotePlayerController.addEventListener(
    cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED,
    onRemoteStateChanged
  );
}

function onCastConnectedChanged(){
  isCasting = !!(remotePlayer && remotePlayer.isConnected);
  castBtn.classList.toggle('is-connected', isCasting);

  if (isCasting){
    audio.pause();
    const device = remotePlayer.mediaInfo && cast.framework.CastContext.getInstance()
      .getCurrentSession() && cast.framework.CastContext.getInstance().getCurrentSession().getCastDevice();
    castStatus.textContent = '📺 Casting' + (device ? ' to ' + device.friendlyName : '');
    castCurrentTrack(true);
  } else {
    castStatus.textContent = '';
    updateProgressUI(0, 0);
    setPlayingUI(false);
  }
}

function onRemoteProgress(){
  if (!isCasting || !remotePlayer) return;
  updateProgressUI(remotePlayer.currentTime, remotePlayer.duration);
}

function onRemoteStateChanged(){
  if (!isCasting || !remotePlayer) return;
  setPlayingUI(remotePlayer.playerState === chrome.cast.media.PlayerState.PLAYING);
}

function castCurrentTrack(autoplay){
  const session = cast.framework.CastContext.getInstance().getCurrentSession();
  if (!session || !playlist.length) return;

  const track = playlist[currentIndex];
  const mediaInfo = new chrome.cast.media.MediaInfo(resolvedTrackUrl(track), 'audio/mpeg');
  mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
  mediaInfo.metadata.title = track.title;
  mediaInfo.metadata.artist = track.artist || "Zoe & Eva's Music Box";

  const request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = autoplay !== false;

  session.loadMedia(request).then(
    () => { /* loaded */ },
    (err) => {
      console.error('Cast load error', err);
      castStatus.textContent = "Couldn't cast that song 🥺 try again?";
    }
  );
}

castBtn.addEventListener('click', () => {
  if (!window.cast || !cast.framework){
    castStatus.textContent = 'Casting only works once this site is live on the web 🌐';
    return;
  }
  const context = cast.framework.CastContext.getInstance();
  if (remotePlayer && remotePlayer.isConnected){
    context.endCurrentSession(true);
  } else {
    context.requestSession().catch((err) => {
      if (err !== 'cancel') console.error('Cast session error', err);
    });
  }
});
