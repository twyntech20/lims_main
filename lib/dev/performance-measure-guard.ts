/**
 * Guard for React's Server Components performance track.
 *
 * React 19.2 (via the Next-bundled flight client) reports server render
 * timings to the browser as `performance.measure(name, { start, end })`
 * entries so they show up on the "Server Components ⚛" DevTools track.
 * Those calls clamp `start` to zero but never clamp `end`, so a server
 * timestamp that lands before the browser's `performance.timeOrigin` —
 * clock skew between the dev server and the browser will do it — reaches
 * the platform as a negative `end` and throws:
 *
 *   Failed to execute 'measure' on 'Performance':
 *   '<ComponentName>' cannot have a negative time stamp.
 *
 * The throw happens inside React's own instrumentation while it is
 * processing the flight stream, which surfaces as a page-level runtime
 * error. The measurement is diagnostic only, so it must never be able to
 * take a page down.
 *
 * This wrapper tries the real call first, so valid measures are recorded
 * exactly as before. Only if the platform rejects it does it retry with
 * non-negative, correctly ordered timestamps, and if that still fails it
 * gives up silently.
 *
 * Shipped as an inline script rather than an effect because the flight
 * client emits these measures while the stream is being parsed, which is
 * before any React effect has run. Development only: the production
 * flight client contains no `performance.measure` calls at all.
 */
export const PERFORMANCE_MEASURE_GUARD_SOURCE = `(function(){
try{
  var p = typeof performance !== 'undefined' ? performance : null;
  if(!p || typeof p.measure !== 'function' || p.__fqlabsMeasureGuard){ return; }
  p.__fqlabsMeasureGuard = true;
  var original = p.measure.bind(p);
  p.measure = function(name, startOrOptions, endMark){
    try{
      return original(name, startOrOptions, endMark);
    }catch(err){
      try{
        if(startOrOptions && typeof startOrOptions === 'object'){
          var o = {}, k;
          for(k in startOrOptions){ o[k] = startOrOptions[k]; }
          if(typeof o.start === 'number' && !(o.start >= 0)){ o.start = 0; }
          if(typeof o.end === 'number' && !(o.end >= 0)){ o.end = 0; }
          if(typeof o.duration === 'number' && !(o.duration >= 0)){ o.duration = 0; }
          if(typeof o.start === 'number' && typeof o.end === 'number' && o.end < o.start){ o.end = o.start; }
          return original(name, o);
        }
      }catch(ignored){}
      return undefined;
    }
  };
}catch(outer){}
})();`
