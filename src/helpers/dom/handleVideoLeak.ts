import {IS_CHROMIUM} from '../../environment/userAgent';
import deferredPromise from '../cancellablePromise';
import noop from '../noop';
import deepEqual from '../object/deepEqual';
import onMediaLoad from '../onMediaLoad';
import safePlay from './safePlay';
import setCurrentTime from './setCurrentTime';

export async function onVideoLeak(video: HTMLVideoElement) {
  // console.error('video is stuck', video.src, video, video.paused, videoPlaybackQuality);
  const firstElementChild = video.firstElementChild as HTMLSourceElement;
  if(!firstElementChild) {
    video.src = '';
    video.load();
    throw new Error('leak');
  }

  const paused = video.paused;
  firstElementChild.remove();
  video.load();

  if(!video.childElementCount && !video.src) {
    throw new Error('leak');
  }

  if(!paused) safePlay(video);
  else setCurrentTime(video, 0.0001);

  return handleVideoLeak(video, onMediaLoad(video));
}

export async function testVideoLeak(
  video: HTMLVideoElement,
  isLeak = !video.getVideoPlaybackQuality().totalVideoFrames
) {
  if(!isLeak) {
    return;
  }

  return onVideoLeak(video);
}

// * fix new memory leak of chrome
export default async function handleVideoLeak(video: HTMLVideoElement, loadPromise?: Promise<any>) {
  if(!IS_CHROMIUM) {
    return loadPromise;
  }

  const onTimeUpdate = () => {
    testVideoLeak(video).then(
      deferred.resolve.bind(deferred),
      deferred.reject.bind(deferred)
    );
  };

  const deferred = deferredPromise<void>();
  try {
    await loadPromise;
  } catch(err) {
    onTimeUpdate();
    return;
  }

  if(video.getVideoPlaybackQuality().totalVideoFrames) {
    return;
  }

  video.addEventListener('timeupdate', onTimeUpdate, {once: true});
  return deferred;
}

const eventsOrder = [
  // 'timeupdate',
  'seeked',
  'canplay',
  'canplaythrough',
  'seeking'
  // 'play'
];
const eventsOrderLength = eventsOrder.length;

const sawEvents = new WeakMap<HTMLElement, {events: Set<string>}>();
export const leakVideoFallbacks = new WeakMap<HTMLElement, () => void>();
IS_CHROMIUM && eventsOrder.forEach((event) => {
  document.addEventListener(event, (e) => {
    const target = e.target;
    if(
      !(target instanceof HTMLVideoElement) ||
      target.readyState > target.HAVE_METADATA ||
      target.isSeeking
    ) {
      return;
    }

    // const needLog = target.parentElement.dataset.docId === '';
    // if(needLog) {
    //   console.log('video event', event/* , target */, target.currentTime, target.duration);
    // }

    let cache = sawEvents.get(target);
    if(!cache) {
      sawEvents.set(target, cache = {events: new Set()});
    }

    if(cache.events.has(event)) {
      return;
    }

    cache.events.add(event);

    if(cache.events.size === eventsOrderLength/*  && event == eventsOrder[eventsOrderLength - 1] */) {
      const events = Array.from(cache.events);
      const index = eventsOrder.indexOf(events[0]);
      const normalized = eventsOrder.slice(index).concat(eventsOrder.slice(0, index));
      if(!deepEqual(events, normalized)) {
        return;
      }

      // console.log('bad video', target.currentTime, target.duration);

      const fallbackCallback = leakVideoFallbacks.get(target);
      if(fallbackCallback) {
        fallbackCallback();
        leakVideoFallbacks.delete(target);
      } else {
        onVideoLeak(target).catch(noop);
      }
    }

    // const lastEvent = sawEvents.get(target);
    // if(!lastEvent) {
    //   if(eventsOrder[0] === event) {
    //     sawEvents.set(target, event);
    //   }
    // } else if(lastEvent !== event) {
    //   const lastEventIndex = eventsOrder.indexOf(lastEvent);
    //   const shouldBeEvent = eventsOrder[lastEventIndex + 1];
    //   if(shouldBeEvent === event) { // save event for next check
    //     sawEvents.set(target, event);
    //   } else if(!shouldBeEvent) { // saw all events
    //     onVideoLeak(target).catch(noop);
    //   } else { // wrong event
    //     sawEvents.delete(target);
    //   }
    // }
  }, true);
});
